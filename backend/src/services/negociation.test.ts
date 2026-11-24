import { describe, it, expect } from 'vitest';
import { derniereOffrePro, montantValide, ongletPro, etatCliente, doitRelancer, ajouterOffre, prixCliente, offreProEnAttente, negoDe, DemandeNego } from './negociation.js';

const maintenant = new Date('2026-11-24T12:00:00Z');
const demande = (extra: Partial<DemandeNego> = {}): DemandeNego => ({
  statut: 'ouverte',
  expires_at: new Date('2026-12-01T00:00:00Z'),
  created_at: new Date('2026-11-24T10:00:00Z'),
  modele_id: 7,
  prix_propose: 20000,
  negociations: [],
  accord: null,
  ...extra,
});

describe('montantValide', () => {
  it('accepte un montant saisi avec espaces et l’arrondit', () => {
    expect(montantValide('20 000')).toBe(20000);
    expect(montantValide(12345.6)).toBe(12346);
  });
  it('refuse hors bornes et non numérique', () => {
    expect(montantValide(100)).toBeNull();
    expect(montantValide(5_000_000)).toBeNull();
    expect(montantValide('abc')).toBeNull();
  });
});

describe('négociation', () => {
  it('une contre-proposition de la pro ouvre le fil avec le prix de la cliente', () => {
    const d = demande();
    expect(ajouterOffre(d, 3, 'pro', 24000, maintenant)).toBeNull();
    const n = negoDe(d, 3)!;
    expect(n.offres.map(o => [o.auteur, o.montant])).toEqual([['cliente', 20000], ['pro', 24000]]);
    expect(offreProEnAttente(n)).toBe(24000);
    expect(ongletPro(d, 3, maintenant)).toBe('en_discussion');
    expect(ongletPro(d, 4, maintenant)).toBe('nouvelles');
    expect(etatCliente(d, maintenant)).toBe('en_discussion');
  });

  it('la cliente monte : son prix pour cette pro devient le plus haut, plus d’offre pro en attente', () => {
    const d = demande();
    ajouterOffre(d, 3, 'pro', 24000, maintenant);
    expect(ajouterOffre(d, 3, 'cliente', 22000, maintenant)).toBeNull();
    const n = negoDe(d, 3)!;
    expect(prixCliente(d, n)).toBe(22000);
    expect(offreProEnAttente(n)).toBeNull();
    expect(derniereOffrePro(n)).toBe(24000); // la cliente ne peut pas proposer plus que ça
  });

  it('refuse de répéter le même montant et un fil refusé', () => {
    const d = demande();
    ajouterOffre(d, 3, 'pro', 24000, maintenant);
    expect(ajouterOffre(d, 3, 'pro', 24000, maintenant)).toMatch(/déjà proposé/);
    negoDe(d, 3)!.statut = 'refusee';
    expect(ajouterOffre(d, 3, 'pro', 23000, maintenant)).toMatch(/terminée/);
    expect(ongletPro(d, 3, maintenant)).toBeNull();
  });

  it('après un accord, seule la pro retenue la voit (onglet Acceptées)', () => {
    const d = demande({ statut: 'pourvue', accord: { prestataire_id: 3, prix: 22000 } });
    expect(ongletPro(d, 3, maintenant)).toBe('acceptees');
    expect(ongletPro(d, 4, maintenant)).toBeNull();
    expect(etatCliente(d, maintenant)).toBe('acceptee');
  });
});

describe('relance « Augmente ton montant »', () => {
  it('pas avant 24 h, puis une seule fois', () => {
    expect(doitRelancer(demande(), maintenant)).toBe(false);
    const tard = new Date('2026-11-25T11:00:00Z');
    expect(doitRelancer(demande(), tard)).toBe(true);
    expect(doitRelancer(demande({ relance_envoyee: true }), tard)).toBe(false);
    expect(doitRelancer(demande({ accord: { prestataire_id: 3, prix: 1 } }), tard)).toBe(false);
    expect(doitRelancer(demande({ modele_id: null }), tard)).toBe(false);
  });
});

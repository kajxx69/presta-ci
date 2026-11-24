// Règles de la demande sur un modèle et de la négociation du prix.
// Fonctions pures (pas d'accès base) : testées dans negociation.test.ts.

export const PRIX_MIN = 500;
export const PRIX_MAX = 2_000_000;
/** Sans accord au bout de ce délai, la cliente est invitée à augmenter son montant. */
export const RELANCE_HEURES = 24;
/** Nombre d'offres max dans un fil (évite une négociation sans fin). */
export const MAX_OFFRES_PAR_FIL = 12;

export type Auteur = 'cliente' | 'pro';

export interface OffreFil { auteur: Auteur; montant: number; created_at?: Date | string }
export interface Negociation {
  prestataire_id: number;
  statut: 'en_discussion' | 'refusee';
  refusee_par?: Auteur | null;
  offres: OffreFil[];
  updated_at?: Date | string;
}
export interface DemandeNego {
  statut: 'ouverte' | 'pourvue' | 'annulee';
  expires_at: Date | string;
  created_at: Date | string;
  modele_id?: number | null;
  prix_propose?: number | null;
  relance_envoyee?: boolean;
  negociations?: Negociation[];
  accord?: { prestataire_id: number; prix: number; reservation_id?: number | null } | null;
}

/** Montant en F CFA entier dans les bornes, sinon null. */
export function montantValide(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v.replace(/[\s.]/g, '')) : Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= PRIX_MIN && r <= PRIX_MAX ? r : null;
}

export const ouverte = (d: DemandeNego, now = new Date()) =>
  d.statut === 'ouverte' && new Date(d.expires_at) > now;

export const negoDe = (d: DemandeNego, prestataireId: number) =>
  (d.negociations || []).find(n => n.prestataire_id === prestataireId) || null;

const derniere = (n: Negociation | null, auteur?: Auteur) => {
  const offres = (n?.offres || []).filter(o => !auteur || o.auteur === auteur);
  return offres.length ? offres[offres.length - 1] : null;
};

/** Ce que la cliente propose à cette pro : son prix général ou sa dernière offre dans le fil, le plus haut. */
export function prixCliente(d: DemandeNego, n: Negociation | null): number {
  return Math.max(d.prix_propose || 0, derniere(n, 'cliente')?.montant || 0);
}

/** Dernière contre-proposition de la pro, si c'est elle qui a parlé en dernier (sinon null). */
export function offreProEnAttente(n: Negociation | null): number | null {
  const d = derniere(n);
  return d && d.auteur === 'pro' && n?.statut === 'en_discussion' ? d.montant : null;
}

/** Dernier montant demandé par la pro dans le fil (même si la cliente a répondu depuis). */
export const derniereOffrePro = (n: Negociation | null): number | null => derniere(n, 'pro')?.montant ?? null;

/** Dernière offre du fil, toutes parties confondues (bandeau « Dernière offre »). */
export const derniereOffre = (d: DemandeNego, n: Negociation | null) =>
  derniere(n)?.montant ?? d.prix_propose ?? null;

/** Onglet de la demande dans le menu « Demandes » de la pro (null : ne pas l'afficher). */
export function ongletPro(d: DemandeNego, prestataireId: number, now = new Date()): 'nouvelles' | 'en_discussion' | 'acceptees' | null {
  if (d.accord) return d.accord.prestataire_id === prestataireId ? 'acceptees' : null;
  if (!ouverte(d, now)) return null;
  const n = negoDe(d, prestataireId);
  if (!n) return 'nouvelles';
  return n.statut === 'en_discussion' ? 'en_discussion' : null;
}

/** État affiché à la cliente pour sa demande. */
export function etatCliente(d: DemandeNego, now = new Date()): 'sans_reponse' | 'en_discussion' | 'acceptee' | 'annulee' | 'expiree' {
  if (d.accord || d.statut === 'pourvue') return 'acceptee';
  if (d.statut === 'annulee') return 'annulee';
  if (!ouverte(d, now)) return 'expiree';
  return (d.negociations || []).some(n => n.statut === 'en_discussion') ? 'en_discussion' : 'sans_reponse';
}

/** La relance « Augmente ton montant » est-elle due ? */
export function doitRelancer(d: DemandeNego, now = new Date()): boolean {
  if (!d.modele_id || d.relance_envoyee || d.accord || !ouverte(d, now)) return false;
  return now.getTime() - new Date(d.created_at).getTime() >= RELANCE_HEURES * 3600_000;
}

/**
 * Ajoute une offre au fil (crée le fil s'il n'existe pas). Renvoie une erreur lisible
 * si l'offre n'a pas de sens (fil refusé, montant identique, fil trop long).
 */
export function ajouterOffre(d: DemandeNego, prestataireId: number, auteur: Auteur, montant: number, now = new Date()): string | null {
  d.negociations = d.negociations || [];
  let n = negoDe(d, prestataireId);
  if (n?.statut === 'refusee') return 'Cette discussion est terminée';
  if (!n) {
    n = { prestataire_id: prestataireId, statut: 'en_discussion', offres: [], updated_at: now };
    // Le fil commence par le prix de la cliente, pour que la pro voie de quoi on part
    if (auteur === 'pro' && d.prix_propose) n.offres.push({ auteur: 'cliente', montant: d.prix_propose, created_at: now });
    d.negociations.push(n);
    // Mongoose copie l'objet en sous-document : on travaille sur la copie réellement enregistrée
    n = negoDe(d, prestataireId)!;
  }
  if (n.offres.length >= MAX_OFFRES_PAR_FIL) return 'Vous avez beaucoup échangé : acceptez ou refusez la dernière offre';
  const derniereDuMeme = derniere(n, auteur);
  if (derniereDuMeme && derniereDuMeme.montant === montant && derniere(n)?.auteur === auteur) return 'Ce montant est déjà proposé';
  n.offres.push({ auteur, montant, created_at: now });
  n.statut = 'en_discussion';
  n.updated_at = now;
  return null;
}

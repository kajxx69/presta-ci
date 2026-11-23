import { describe, it, expect } from 'vitest';
import { vuePubliquePrestataire, positionApprox, lienItineraire, adresseVisible } from './confidentialite.js';

describe('confidentialité des adresses', () => {
  const pro = {
    _id: 7, user_id: 42, nom_commercial: 'Awa Braids', commune: 'Cocody', ville: 'Cocody',
    adresse: 'Riviera 2, près du carrefour Duncan', latitude: 5.3599, longitude: -3.9612,
    location: { type: 'Point', coordinates: [-3.9612, 5.3599] },
    verification_document: '/uploads/cni-awa.jpg', relance_j3_pour: new Date(), telephone_pro: '0700000000',
  };

  it('la fiche publique ne contient ni adresse, ni GPS exact, ni pièce d’identité', () => {
    const v: any = vuePubliquePrestataire(pro);
    const json = JSON.stringify(v);
    expect(json).not.toContain('Riviera');
    expect(json).not.toContain('cni-awa');
    expect(v.user_id).toBeUndefined();
    expect(v.location).toBeUndefined();
    expect(v.relance_j3_pour).toBeUndefined();
    expect(v.latitude).not.toBe(5.3599);
    expect(v.position_approx).toBe(true);
    expect(v.id).toBe(7);
    expect(v.commune).toBe('Cocody');
  });

  it('position approximative : centre de la commune, sinon ~1 km', () => {
    expect(positionApprox({ commune: 'Cocody', latitude: 5.3599, longitude: -3.9612 })).toEqual({ latitude: 5.354, longitude: -3.987 });
    expect(positionApprox({ latitude: 6.12345, longitude: -5.98765 })).toEqual({ latitude: 6.12, longitude: -5.99 });
    expect(positionApprox({})).toBeNull();
  });

  it('adresse visible seulement une fois confirmé', () => {
    expect(adresseVisible('en_attente')).toBe(false);
    expect(adresseVisible('refusee')).toBe(false);
    expect(adresseVisible('confirmee')).toBe(true);
    expect(adresseVisible('acceptee')).toBe(true);
    expect(adresseVisible('terminee')).toBe(true);
  });

  it('lien d’itinéraire Google Maps', () => {
    expect(lienItineraire(5.36, -3.96)).toBe('https://www.google.com/maps/dir/?api=1&destination=5.36,-3.96');
    expect(lienItineraire(null, null, 'Riviera 2')).toContain(encodeURIComponent("Riviera 2, Côte d'Ivoire"));
    expect(lienItineraire(null, null, '')).toBeNull();
  });
});

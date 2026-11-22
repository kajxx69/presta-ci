import { describe, it, expect } from 'vitest';
import { photoPertinente } from './filtre-photos.js';

// Filtre appliqué aux descriptions des épingles Pinterest importées automatiquement
describe('photoPertinente', () => {
  it('garde une épingle de coiffure', () => {
    expect(photoPertinente('Knotless braids boho, coiffure femme tendance')).toBe(true);
    expect(photoPertinente('')).toBe(true); // beaucoup d'épingles n'ont pas de description
  });
  it("écarte les hommes sans confondre « woman » avec « man »", () => {
    expect(photoPertinente('cornrows for men, barber fade')).toBe(false);
    expect(photoPertinente('black woman cornrows')).toBe(true);
  });
  it('écarte nudité, enfants et animaux', () => {
    expect(photoPertinente('naked woman skin care')).toBe(false);
    expect(photoPertinente('braids for kids, little girl')).toBe(false);
    expect(photoPertinente('horse eyelashes')).toBe(false);
  });
  it('vérifie les groupes de mots requis (préfixe)', () => {
    expect(photoPertinente('ebony, braided, beauty', [['braid']])).toBe(true);
    expect(photoPertinente('ebony, beauty', [['braid']])).toBe(false);
  });
});

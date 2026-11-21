import { describe, it, expect } from 'vitest';
import { categorieModelePour, normaliser } from './modeles-sync.js';

describe('categorieModelePour', () => {
  it('classe les sous-catégories beauté femme', () => {
    expect(categorieModelePour('Coiffure Femme', 'Tresses & Nattes')).toBe('coiffure');
    expect(categorieModelePour('Ongles', 'Pose de gel & résine')).toBe('ongles');
    expect(categorieModelePour('Beauté & Esthétique', 'Sourcils & Cils')).toBe('cils');
    expect(categorieModelePour('Beauté & Esthétique', 'Maquillage permanent')).toBe('maquillage');
    expect(categorieModelePour('Bien-être', 'Spa & Hammam')).toBe('soins');
  });
  it('ignore le reste (homme, imprimerie, traiteur…)', () => {
    expect(categorieModelePour('Coiffure Homme', 'Tresses & Locks homme')).toBeNull();
    expect(categorieModelePour('Beauté Masculine', 'Soins visage')).toBeNull();
    expect(categorieModelePour('Imprimerie & Design', 'Bâches & Enseignes')).toBeNull();
  });
});

describe('normaliser', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normaliser('Nattes collées — Élégance !')).toBe('nattes collees elegance');
  });
});

import { describe, it, expect } from 'vitest';
import {
  normalize,
  tokenize,
  levenshtein,
  scoreTokenAgainstWords,
  scoreDocument,
  expandTokens,
  buildTokenGroups,
  haversineKm,
  proximityBoost,
} from './search-engine.js';

describe('normalize', () => {
  it('supprime les accents et met en minuscules', () => {
    expect(normalize('Réparation Électroménager')).toBe('reparation electromenager');
    expect(normalize('CÔTE D\'IVOIRE')).toBe('cote d ivoire');
    expect(normalize('  Beauté   &  Esthétique ')).toBe('beaute esthetique');
  });
});

describe('tokenize', () => {
  it('découpe en mots de 2+ caractères', () => {
    expect(tokenize('Coiffure à Abidjan')).toEqual(['coiffure', 'abidjan']);
  });
});

describe('levenshtein', () => {
  it('calcule la distance d\'édition', () => {
    expect(levenshtein('coiffure', 'coiffure')).toBe(0);
    expect(levenshtein('coifure', 'coiffure')).toBe(1);  // lettre manquante
    expect(levenshtein('coiffur', 'coiffure')).toBe(1);  // tronqué
    expect(levenshtein('massage', 'massange', 2)).toBe(1);
  });

  it('sort tôt au-delà du max', () => {
    expect(levenshtein('abc', 'xyzxyz', 2)).toBeGreaterThan(2);
  });
});

describe('scoreTokenAgainstWords', () => {
  const words = ['coiffure', 'femme', 'tresses'];

  it('classe exact > préfixe > sous-chaîne > fuzzy', () => {
    const exact = scoreTokenAgainstWords('coiffure', words);
    const prefix = scoreTokenAgainstWords('coif', words);
    const fuzzy = scoreTokenAgainstWords('coifure', words); // faute de frappe
    const none = scoreTokenAgainstWords('plomberie', words);
    expect(exact).toBe(10);
    expect(prefix).toBe(7);
    expect(fuzzy).toBeGreaterThan(0);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(fuzzy);
    expect(none).toBe(0);
  });

  it('les mots courts ne sont pas fuzzy (évite les faux positifs)', () => {
    expect(scoreTokenAgainstWords('spa', ['sac'])).toBe(0);
  });
});

describe('scoreDocument (multi-mots ET)', () => {
  const fields = [
    { words: tokenize('Coiffure femme tresses'), weight: 3 },
    { words: tokenize('Abidjan Cocody'), weight: 1.8 },
    { words: tokenize('Salon spécialisé dans les tresses africaines'), weight: 1 },
  ];
  const g = buildTokenGroups;

  it('tous les mots doivent matcher', () => {
    expect(scoreDocument(g(['coiffure', 'abidjan']), fields)).toBeGreaterThan(0);
    expect(scoreDocument(g(['coiffure', 'plomberie']), fields)).toBe(0);
  });

  it('tolère les fautes dans une requête multi-mots', () => {
    expect(scoreDocument(g(['coifure', 'abidjan']), fields)).toBeGreaterThan(0);
  });

  it('pondère le champ nom plus fort que la description', () => {
    const scoreNom = scoreDocument(g(['tresses']), [fields[0]]);
    const scoreDesc = scoreDocument(g(['tresses']), [fields[2]]);
    expect(scoreNom).toBeGreaterThan(scoreDesc);
  });

  it("un synonyme pur satisfait le mot ('cheveux' trouve la coiffure)", () => {
    expect(scoreDocument(g(['cheveux']), fields)).toBeGreaterThan(0);
    // …mais compte moins qu'un match direct
    expect(scoreDocument(g(['cheveux']), fields)).toBeLessThan(scoreDocument(g(['coiffure']), fields));
  });
});

describe('haversineKm', () => {
  it('calcule des distances réalistes', () => {
    // Plateau → Cocody (Abidjan) : ~5-8 km
    const d = haversineKm(5.3252, -4.0217, 5.3599, -3.9810);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(9);
    // Même point = 0
    expect(haversineKm(5.35, -4.02, 5.35, -4.02)).toBe(0);
    // Abidjan → Yamoussoukro : ~210-240 km
    const loin = haversineKm(5.3599, -4.0082, 6.8276, -5.2893);
    expect(loin).toBeGreaterThan(180);
    expect(loin).toBeLessThan(260);
  });
});

describe('proximityBoost', () => {
  it('décroît avec la distance', () => {
    expect(proximityBoost(0)).toBeCloseTo(8, 1);
    expect(proximityBoost(5)).toBeGreaterThan(proximityBoost(10));
    expect(proximityBoost(10)).toBeGreaterThan(proximityBoost(25));
    expect(proximityBoost(50)).toBeLessThan(0.01);
  });
});

describe('expandTokens (synonymes)', () => {
  it('étend les termes courants vers le vocabulaire du catalogue', () => {
    expect(expandTokens(['menage']).extra).toContain('nettoyage');
    expect(expandTokens(['cheveux']).extra).toContain('coiffure');
    expect(expandTokens(['flyer']).extra).toContain('imprimerie');
  });

  it('ne duplique pas les tokens déjà présents', () => {
    const { extra } = expandTokens(['coiffure', 'coupe']);
    expect(extra.filter(t => t === 'coiffure')).toHaveLength(0);
  });
});

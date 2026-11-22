import { describe, it, expect } from 'vitest';
import { photoPertinente, ETHNIE } from './filtre-photos.js';

const TRESSES = [['braid'], ETHNIE];

describe('photoPertinente', () => {
  it('garde une femme noire avec des tresses', () => {
    expect(photoPertinente('black woman, african, box braids, portrait', TRESSES)).toBe(true);
  });
  it('écarte des tresses sans étiquette afro', () => {
    expect(photoPertinente('woman, braided hair, window', TRESSES)).toBe(false);
  });
  it('écarte les hommes sans confondre « woman » avec « man »', () => {
    expect(photoPertinente('fashion, iranian man, cornrows', [['cornrow']])).toBe(false);
    expect(photoPertinente('woman, african, cornrows', [['cornrow'], ETHNIE])).toBe(true);
  });
  it('écarte nudité, enfants et animaux même si le style correspond', () => {
    expect(photoPertinente('portrait, young women, naked woman, skin', [['skin']])).toBe(false);
    expect(photoPertinente('africa, girl, child, braids', TRESSES)).toBe(false);
    expect(photoPertinente('horse, eye, eyelashes', [['eyelash']])).toBe(false);
  });
  it('accepte les variantes (braid → braids, braided)', () => {
    expect(photoPertinente('ebony, braided, beauty', TRESSES)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { lienInspirationValide, tableauPinterestValide } from './liens.js';

describe('lienInspirationValide', () => {
  it('accepte Pinterest, pin.it, Instagram, TikTok en https', () => {
    expect(lienInspirationValide('https://pin.it/3xYz')).toBe('https://pin.it/3xYz');
    expect(lienInspirationValide('https://fr.pinterest.com/pin/12345/')).toBeTruthy();
    expect(lienInspirationValide('https://www.instagram.com/p/abc/')).toBeTruthy();
    expect(lienInspirationValide('https://vm.tiktok.com/xyz/')).toBeTruthy();
  });
  it('refuse le reste', () => {
    expect(lienInspirationValide('http://pin.it/3xYz')).toBeNull();
    expect(lienInspirationValide('https://pinterest.com.arnaque.net/pin/1')).toBeNull();
    expect(lienInspirationValide('javascript:alert(1)')).toBeNull();
    expect(lienInspirationValide('https://evil.com/?u=pinterest.com')).toBeNull();
  });
});

describe('tableauPinterestValide', () => {
  it('normalise un tableau', () => {
    expect(tableauPinterestValide('https://fr.pinterest.com/prestaci/tresses-knotless/')).toBe('https://www.pinterest.com/prestaci/tresses-knotless/');
  });
  it("refuse une épingle ou une recherche", () => {
    expect(tableauPinterestValide('https://www.pinterest.com/pin/123/')).toBeNull();
    expect(tableauPinterestValide('https://www.pinterest.com/search/pins/?q=braids')).toBeNull();
    expect(tableauPinterestValide('https://www.pinterest.com/prestaci/')).toBeNull();
  });
});

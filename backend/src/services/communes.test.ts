import { describe, it, expect } from 'vitest';
import { communeDepuisTexte, communeParNom, positionPrestataire, positionDepuisRequete, distanceKm, communeLaPlusProche, zonesEffectives, communesValides } from './communes.js';
import { comparerProximite, bonusProximite, infoDomicile } from './offres.js';

describe('communes', () => {
  it('reconnaît les communes dans un texte libre', () => {
    expect(communeDepuisTexte('Yop Maroc')?.nom).toBe('Yopougon');
    expect(communeDepuisTexte('Cocody Angré 8e tranche')?.nom).toBe('Cocody');
    expect(communeDepuisTexte('Riviera 2')?.nom).toBe('Cocody');
    expect(communeDepuisTexte('zone 4')?.nom).toBe('Marcory');
    expect(communeDepuisTexte('PORT BOUET')?.nom).toBe('Port-Bouët');
    expect(communeDepuisTexte('2 Plateaux Vallons')?.nom).toBe('Cocody');
    expect(communeDepuisTexte('Le Plateau')?.nom).toBe('Plateau');
    expect(communeDepuisTexte('Paris')).toBeNull();
    expect(communeDepuisTexte('')).toBeNull();
  });

  it('valide un nom exact de la liste', () => {
    expect(communeParNom('yopougon')?.nom).toBe('Yopougon');
    expect(communeParNom('Port-Bouet')?.nom).toBe('Port-Bouët');
    expect(communeParNom('Yop')).toBeNull();
    expect(communeParNom(42)).toBeNull();
  });

  it('position : GPS précis, sinon centre de la commune', () => {
    expect(positionPrestataire({ latitude: 5.3, longitude: -4.0 })).toEqual({ lat: 5.3, lng: -4.0, approx: false });
    expect(positionPrestataire({ ville: 'Yop' })?.approx).toBe(true);
    expect(positionPrestataire({ latitude: 0, longitude: 0, ville: 'nulle part' })).toBeNull();
    expect(positionDepuisRequete({ lat: '5.35', lng: '-3.99' })?.approx).toBe(false);
    expect(positionDepuisRequete({ commune: 'Cocody' })?.approx).toBe(true);
    expect(positionDepuisRequete({ lat: 'abc', lng: '1' })).toBeNull();
  });

  it('distance Yopougon ↔ Cocody ≈ 10 km', () => {
    const y = communeParNom('Yopougon')!, c = communeParNom('Cocody')!;
    const d = distanceKm(y.lat, y.lng, c.lat, c.lng);
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(12);
  });

  it('tri : plus proche d’abord, Pro départage à km égal, sans distance en dernier', () => {
    const l = [
      { id: 'loin', pro: true, note: 5, d: 9.2 },
      { id: 'sans', pro: true, note: 5, d: null },
      { id: 'proche', pro: false, note: 3, d: 1.4 },
      { id: 'procheProA', pro: true, note: 4, d: 1.8 },
    ].sort(comparerProximite).map(x => x.id);
    expect(l).toEqual(['procheProA', 'proche', 'loin', 'sans']);
  });

  it('fil : plus la pro est proche, plus le bonus est fort', () => {
    expect(bonusProximite(0.8)).toBe(1.5);
    expect(bonusProximite(6)).toBe(1);
    expect(bonusProximite(14)).toBe(0.5);
    // Un modèle réservable tout près (1 + 1,5) bat toujours un modèle réservable loin (1 + hasard ≤ 0,9)
    expect(1 + bonusProximite(2)).toBeGreaterThan(1 + 0.9);
  });

  it('à domicile : zones, commune GPS, vient chez moi', () => {
    expect(communeLaPlusProche(5.29, -3.98)?.nom).toBe('Marcory');
    expect(communeLaPlusProche(48.85, 2.35)).toBeNull();
    expect(positionDepuisRequete({ lat: '5.345', lng: '-4.075' })?.commune).toBe('Yopougon');
    expect(zonesEffectives({ zones_deplacement: [], commune: 'Cocody' })).toEqual(['Cocody']);
    expect(zonesEffectives({ zones_deplacement: ['Bingerville', 'Cocody'], commune: 'Cocody' })).toEqual(['Bingerville', 'Cocody']);
    expect(communesValides(['cocody', 'Cocody', 'Paris', 'yopougon', 3])).toEqual(['Cocody', 'Yopougon']);
    const pro = { commune: 'Cocody', zones_deplacement: ['Cocody', 'Bingerville'], frais_deplacement: 1000 };
    const pos = (commune: string) => ({ lat: 0, lng: 0, approx: true, commune });
    expect(infoDomicile(pro, { is_domicile: true }, pos('Bingerville'))).toMatchObject({ vient_chez_moi: true, frais_deplacement: 1000 });
    expect(infoDomicile(pro, { is_domicile: true }, pos('Yopougon')).vient_chez_moi).toBe(false);
    expect(infoDomicile(pro, { is_domicile: true }, null).vient_chez_moi).toBeNull();
    expect(infoDomicile(pro, { is_domicile: false }, pos('Cocody')).vient_chez_moi).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  toMinutes,
  toTimeString,
  rangesOverlap,
  buildDaySlots,
  getHorairesForDate,
} from './availability.js';

describe('toMinutes / toTimeString', () => {
  it('convertit les heures en minutes et inversement', () => {
    expect(toMinutes('09:00')).toBe(540);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('00:00')).toBe(0);
    expect(toTimeString(540)).toBe('09:00');
    expect(toTimeString(570)).toBe('09:30');
    expect(toTimeString(1439)).toBe('23:59');
  });
});

describe('rangesOverlap', () => {
  it('détecte les chevauchements', () => {
    expect(rangesOverlap(540, 600, 570, 630)).toBe(true);  // 9h-10h vs 9h30-10h30
    expect(rangesOverlap(540, 600, 540, 600)).toBe(true);  // identiques
    expect(rangesOverlap(540, 600, 590, 595)).toBe(true);  // inclus
  });

  it('accepte les créneaux adjacents (fin = début)', () => {
    expect(rangesOverlap(540, 600, 600, 660)).toBe(false); // 9h-10h puis 10h-11h
    expect(rangesOverlap(600, 660, 540, 600)).toBe(false);
  });

  it('rejette les créneaux disjoints', () => {
    expect(rangesOverlap(540, 600, 700, 760)).toBe(false);
  });
});

describe('getHorairesForDate', () => {
  const horaires = {
    lundi: { debut: '09:00', fin: '18:00' },
    mardi: null, // fermé
    dimanche: { debut: '10:00', fin: '13:00' },
  };

  it('retourne les horaires du bon jour de semaine', () => {
    // Le 6 juillet 2026 est un lundi
    expect(getHorairesForDate(horaires as any, new Date('2026-07-06T12:00:00'))).toEqual({ debut: '09:00', fin: '18:00' });
    // Le 5 juillet 2026 est un dimanche
    expect(getHorairesForDate(horaires as any, new Date('2026-07-05T12:00:00'))).toEqual({ debut: '10:00', fin: '13:00' });
  });

  it('retourne null pour un jour fermé ou non défini', () => {
    // Mardi 7 juillet 2026 : fermé explicitement
    expect(getHorairesForDate(horaires as any, new Date('2026-07-07T12:00:00'))).toBeNull();
    // Mercredi : non défini
    expect(getHorairesForDate(horaires as any, new Date('2026-07-08T12:00:00'))).toBeNull();
  });

  it('retourne null pour des horaires absents ou invalides', () => {
    expect(getHorairesForDate(null, new Date())).toBeNull();
    expect(getHorairesForDate(undefined, new Date())).toBeNull();
    expect(getHorairesForDate({} as any, new Date())).toBeNull();
    expect(getHorairesForDate({ lundi: { debut: '', fin: '' } } as any, new Date('2026-07-06T12:00:00'))).toBeNull();
  });
});

describe('buildDaySlots', () => {
  const jour = { debut: '09:00', fin: '12:00' };

  it('génère des créneaux couvrant les horaires avec la durée du service', () => {
    const slots = buildDaySlots(jour, 60, []);
    expect(slots.map(s => s.heure_debut)).toEqual(['09:00', '10:00', '11:00']);
    expect(slots.every(s => s.disponible)).toBe(true);
    expect(slots[0].heure_fin).toBe('10:00');
  });

  it('ne dépasse jamais l\'heure de fermeture', () => {
    const slots = buildDaySlots(jour, 90, []); // 1h30 dans 9h-12h
    // 9h-10h30, 10h30-12h (pas de 12h-13h30)
    const last = slots[slots.length - 1];
    expect(toMinutes(last.heure_fin)).toBeLessThanOrEqual(toMinutes(jour.fin));
  });

  it('marque indisponibles les créneaux en conflit avec une réservation', () => {
    const occupied = [{ start: toMinutes('10:00'), end: toMinutes('11:00') }];
    const slots = buildDaySlots(jour, 60, occupied);
    const byStart = Object.fromEntries(slots.map(s => [s.heure_debut, s.disponible]));
    expect(byStart['09:00']).toBe(true);
    expect(byStart['10:00']).toBe(false);
    expect(byStart['11:00']).toBe(true);
  });

  it('marque indisponibles les créneaux passés aujourd\'hui', () => {
    const slots = buildDaySlots(jour, 60, [], { nowMinutes: toMinutes('10:15') });
    const byStart = Object.fromEntries(slots.map(s => [s.heure_debut, s.disponible]));
    expect(byStart['09:00']).toBe(false);
    expect(byStart['10:00']).toBe(false); // 10:00 <= 10:15
    expect(byStart['11:00']).toBe(true);
  });

  it('un chevauchement partiel bloque le créneau', () => {
    // Réservation 09:30-10:30 avec des créneaux d'une heure
    const occupied = [{ start: toMinutes('09:30'), end: toMinutes('10:30') }];
    const slots = buildDaySlots(jour, 60, occupied);
    const byStart = Object.fromEntries(slots.map(s => [s.heure_debut, s.disponible]));
    expect(byStart['09:00']).toBe(false); // 9h-10h chevauche 9h30
    expect(byStart['10:00']).toBe(false); // 10h-11h chevauche 10h30
    expect(byStart['11:00']).toBe(true);
  });

  it('retourne [] si le service ne rentre pas dans les horaires', () => {
    expect(buildDaySlots({ debut: '09:00', fin: '09:30' }, 60, [])).toEqual([]);
  });
});

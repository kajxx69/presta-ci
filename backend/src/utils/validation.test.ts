import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword, isValidPhone, isValidDayString, isPastDay } from './validation.js';

function dayString(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

describe('isValidDayString', () => {
  it('accepte une date YYYY-MM-DD valide', () => {
    expect(isValidDayString('2026-07-12')).toBe(true);
  });

  it('rejette les formats et valeurs invalides', () => {
    expect(isValidDayString('12/07/2026')).toBe(false);
    expect(isValidDayString('2026-13-40')).toBe(false);
    expect(isValidDayString('')).toBe(false);
    expect(isValidDayString(null)).toBe(false);
    expect(isValidDayString(20260712)).toBe(false);
  });
});

describe('isPastDay', () => {
  it("hier est passé, aujourd'hui et demain ne le sont pas", () => {
    expect(isPastDay(dayString(-1))).toBe(true);
    expect(isPastDay(dayString(0))).toBe(false);
    expect(isPastDay(dayString(1))).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepte les emails valides', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('prenom.nom@sous.domaine.ci')).toBe(true);
  });

  it('rejette les emails invalides', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('pas-un-email')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@domaine.com')).toBe(false);
    expect(isValidEmail('user @domaine.com')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('exige au moins 6 caractères', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('123456')).toBe(true);
  });
});

describe('isValidPhone', () => {
  it('accepte les numéros ivoiriens courants', () => {
    expect(isValidPhone('+2250701020304')).toBe(true);
    expect(isValidPhone('0701020304')).toBe(true);
    expect(isValidPhone('07 01 02 03 04')).toBe(true);
  });

  it('rejette les valeurs invalides', () => {
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('123')).toBe(false);
  });
});

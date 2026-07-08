import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPassword, isValidPhone } from './validation.js';

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

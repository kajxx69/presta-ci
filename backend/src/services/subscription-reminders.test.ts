import { describe, it, expect } from 'vitest';
import { relanceAEnvoyer } from './subscription-reminders.js';

const DAY = 86400000;
const now = Date.UTC(2026, 11, 10, 12);
const fin = (deltaJours: number) => new Date(now + deltaJours * DAY);

describe('relanceAEnvoyer', () => {
  it('J-3 : relance quand le plan payant expire dans moins de 3 jours', () => {
    expect(relanceAEnvoyer({ plan_actuel_id: 2, abonnement_expires_at: fin(2) }, now)).toBe('j3');
  });
  it('pas de relance trop tôt ni pour le plan gratuit', () => {
    expect(relanceAEnvoyer({ plan_actuel_id: 2, abonnement_expires_at: fin(10) }, now)).toBeNull();
    expect(relanceAEnvoyer({ plan_actuel_id: 1, abonnement_expires_at: fin(1) }, now)).toBeNull();
  });
  it('pas de doublon pour la même date de fin', () => {
    const f = fin(2);
    expect(relanceAEnvoyer({ plan_actuel_id: 2, abonnement_expires_at: f, relance_j3_pour: new Date(f) }, now)).toBeNull();
  });
  it('un renouvellement (nouvelle date de fin) relance à nouveau', () => {
    expect(relanceAEnvoyer({ plan_actuel_id: 2, abonnement_expires_at: fin(2), relance_j3_pour: fin(-28) }, now)).toBe('j3');
  });
  it("relance d'expiration pendant 3 jours puis on n'insiste plus", () => {
    expect(relanceAEnvoyer({ plan_actuel_id: 3, abonnement_expires_at: fin(-1) }, now)).toBe('expire');
    expect(relanceAEnvoyer({ plan_actuel_id: 3, abonnement_expires_at: fin(-1), relance_expire_pour: fin(-1) }, now)).toBeNull();
    expect(relanceAEnvoyer({ plan_actuel_id: 3, abonnement_expires_at: fin(-5) }, now)).toBeNull();
  });
});

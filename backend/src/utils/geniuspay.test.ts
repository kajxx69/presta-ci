import { describe, it, expect, beforeAll, vi } from 'vitest';
import crypto from 'crypto';

const SECRET = 'whsec_test_123';
let verify: typeof import('./geniuspay.js').verifyWebhookSignature;
let montantPour: typeof import('./geniuspay.js').montantPour;

beforeAll(async () => {
  vi.stubEnv('GENIUSPAY_WEBHOOK_SECRET', SECRET);
  ({ verifyWebhookSignature: verify, montantPour } = await import('./geniuspay.js'));
});

const sign = (ts: string, body: string) =>
  crypto.createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ event: 'payment.success', data: { reference: 'MTX-1' } });

  it('accepte une signature valide et récente', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verify(body, ts, sign(ts, body))).toBe(true);
  });

  it('rejette un corps modifié', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verify(body.replace('MTX-1', 'MTX-2'), ts, sign(ts, body))).toBe(false);
  });

  it('rejette un horodatage trop ancien (rejeu)', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 600);
    expect(verify(body, ts, sign(ts, body))).toBe(false);
  });

  it('rejette les en-têtes manquants', () => {
    expect(verify(body, undefined, undefined)).toBe(false);
  });
});

describe('montantPour', () => {
  it('applique la promo seulement si elle est inférieure au prix', () => {
    expect(montantPour({ prix: 5000, prix_promo: 3000 }, 30)).toBe(3000);
    expect(montantPour({ prix: 5000, prix_promo: 8000 }, 30)).toBe(5000);
    expect(montantPour({ prix: 5000, prix_promo: null }, 90)).toBe(15000);
    expect(montantPour({ prix: 9900, prix_promo: 5900 }, 365)).toBe(59000); // 1 an = 10 mois (2 mois offerts)
  });
});

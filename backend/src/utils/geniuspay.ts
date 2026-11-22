import crypto from 'crypto';

// Client minimal de l'API marchande GeniusPay (https://geniuspay.ci/docs/api).
// Sandbox / live : même URL, l'environnement est déterminé par le préfixe des
// clés (pk_sandbox_… / pk_live_…).

const BASE_URL = (process.env.GENIUSPAY_BASE_URL || 'https://pay.genius.ci/api/v1/merchant').replace(/\/+$/, '');
const API_KEY = process.env.GENIUSPAY_API_KEY || '';
const API_SECRET = process.env.GENIUSPAY_API_SECRET || '';
const WEBHOOK_SECRET = process.env.GENIUSPAY_WEBHOOK_SECRET || '';

export const MONTANT_MINIMUM = 200; // XOF, imposé par GeniusPay


/** Prix affiché sur la carte du plan (promo si elle est réellement inférieure). */
export function prixMensuelEffectif(plan: { prix: number; prix_promo?: number | null }): number {
  const promo = plan.prix_promo;
  return typeof promo === 'number' && promo > 0 && promo < plan.prix ? promo : plan.prix;
}

/** Nombre de mois facturés : 1 an = 10 mois (2 mois offerts). */
export function moisFactures(jours: number): number {
  return jours === 365 ? 10 : jours / 30;
}

export function montantPour(plan: { prix: number; prix_promo?: number | null }, jours: number): number {
  return Math.round(prixMensuelEffectif(plan) * moisFactures(jours));
}

export function isGeniusPayConfigured(): boolean {
  return Boolean(API_KEY && API_SECRET);
}

/** État de la configuration pour l'admin (sans jamais exposer les clés). */
export function etatGeniusPay() {
  return {
    configure: isGeniusPayConfigured(),
    // Les clés de production commencent par pk_live_ ; tout le reste est un mode d'essai
    mode: !API_KEY ? null : /^pk_live_/i.test(API_KEY) ? 'live' : 'sandbox',
    webhook: Boolean(WEBHOOK_SECRET),
  };
}

export interface GeniusPayPayment {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string; // pending | processing | completed | failed | cancelled | expired | refunded
  checkout_url?: string;
  payment_url?: string;
  payment_method?: string;
  payment_provider?: string;
  environment?: string;
  fees?: number;
  net_amount?: number;
  metadata?: Record<string, any>;
  completed_at?: string | null;
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000); // GeniusPay répond en ~12 s
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'X-API-Key': API_KEY,
        'X-API-Secret': API_SECRET,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* réponse non-JSON */ }
    if (!res.ok || !json?.success) {
      const code = json?.error?.code || `HTTP_${res.status}`;
      const message = json?.error?.message || json?.message || text.slice(0, 200);
      const err: any = new Error(`GeniusPay ${code}: ${message}`);
      err.status = res.status;
      err.code = code;
      throw err;
    }
    return json.data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function createPayment(input: {
  amount: number;
  description: string;
  customer?: { name?: string; email?: string; phone?: string; country?: string };
  success_url: string;
  error_url: string;
  metadata?: Record<string, string | number>;
}): Promise<GeniusPayPayment> {
  // Pas de payment_method → GeniusPay renvoie une page de checkout hébergée où
  // le client choisit Wave, Orange Money, MTN, Moov ou carte.
  return call<GeniusPayPayment>('POST', '/payments', { currency: 'XOF', ...input });
}

export function getPayment(reference: string): Promise<GeniusPayPayment> {
  return call<GeniusPayPayment>('GET', `/payments/${encodeURIComponent(reference)}`);
}

/**
 * Vérifie la signature d'un webhook : HMAC-SHA256(timestamp + "." + corps, secret).
 * Le webhook n'est de toute façon qu'un déclencheur : l'activation re-vérifie
 * toujours le paiement auprès de l'API (getPayment). Cette vérification sert
 * à rejeter le bruit, pas à faire foi.
 */
export function verifyWebhookSignature(rawBody: string, timestamp: string | undefined, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return true; // pas de secret configuré : on s'appuie uniquement sur la re-vérification API
  if (!timestamp || !signature) return false;
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${timestamp}.${rawBody}`).digest('hex');
  const given = signature.replace(/^sha256=/, '').trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

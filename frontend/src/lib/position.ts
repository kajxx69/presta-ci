import { create } from 'zustand';
import { api } from './api';
import { useAuthStore } from '../store/authStore';

// Où se trouve la cliente, pour classer les pros « les plus proches d'abord ».
// Soit la position GPS (demandée seulement quand elle appuie sur « Ma position »),
// soit la commune choisie dans la liste. Mémorisé sur ce téléphone uniquement.

const CLE = 'chicly-position';

interface EtatPosition {
  commune: string | null;
  /** A déjà fait un choix sur ce téléphone (y compris « Partout ») */
  choisi: boolean;
  gps: { lat: number; lng: number } | null;
  enCours: boolean;
  choisirCommune: (c: string | null) => void;
  utiliserGPS: () => Promise<boolean>;
  oublierGPS: () => void;
}

type Gps = { lat: number; lng: number } | null;
function lire(): { commune: string | null; gps: Gps; choisi: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (v && typeof v === 'object') return {
      commune: typeof v.commune === 'string' ? v.commune : null,
      gps: v.gps && Number.isFinite(v.gps.lat) && Number.isFinite(v.gps.lng) ? v.gps : null,
      choisi: v.choisi !== false,
    };
  } catch { /* stockage indisponible */ }
  return { commune: null, gps: null, choisi: false };
}
function ecrire(commune: string | null, gps: Gps) {
  try { localStorage.setItem(CLE, JSON.stringify({ commune, gps, choisi: true })); } catch { /* stockage indisponible */ }
}

export const usePosition = create<EtatPosition>((set, get) => ({
  ...lire(),
  enCours: false,
  choisirCommune: (commune) => {
    // Choisir une commune remplace la position GPS
    set({ commune, gps: null, choisi: true });
    ecrire(commune, null);
    const auth = useAuthStore.getState();
    // « Partout » ne touche pas à la commune du compte
    if (commune && auth.isAuthenticated && auth.user) {
      useAuthStore.setState({ user: { ...auth.user, commune } as any });
      api.users.updateMe({ commune }).catch(() => {});
    }
  },
  utiliserGPS: () => new Promise<boolean>((resolve) => {
    if (!('geolocation' in navigator)) { resolve(false); return; }
    set({ enCours: true });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const gps = { lat: Math.round(p.coords.latitude * 1e4) / 1e4, lng: Math.round(p.coords.longitude * 1e4) / 1e4 };
        set({ gps, enCours: false, choisi: true });
        ecrire(get().commune, gps);
        resolve(true);
      },
      () => { set({ enCours: false }); resolve(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }),
  oublierGPS: () => { set({ gps: null }); ecrire(get().commune, null); },
}));

/** Commune du compte, si rien n'est encore choisi sur ce téléphone. */
export function communeParDefaut(): string | null {
  const u: any = useAuthStore.getState().user;
  return u?.commune || null;
}

/** Paramètres à envoyer à l'API (GPS prioritaire, sinon commune ; rien si « Partout »). */
export function paramsPosition(etat: { commune: string | null; gps: Gps; choisi?: boolean }): { lat?: number; lng?: number; commune?: string } {
  if (etat.gps) return { lat: etat.gps.lat, lng: etat.gps.lng };
  const commune = etat.commune || (etat.choisi ? null : communeParDefaut());
  return commune ? { commune } : {};
}

/** Libellé court de la position actuelle (« Ma position », « Cocody », null = partout). */
export function libellePosition(etat: { commune: string | null; gps: Gps; choisi?: boolean }): string | null {
  if (etat.gps) return 'Ma position';
  return etat.commune || (etat.choisi ? null : communeParDefaut());
}

// Swipes des visiteuses non connectées, gardés sur le téléphone puis rattachés
// au compte à la connexion (api.modeles.sync). Tolère un stockage indisponible.
const CLE = 'prestaci-swipes';

interface Swipes { likes: number[]; passes: number[] }

function lire(): Swipes {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || '{}');
    return { likes: Array.isArray(v.likes) ? v.likes : [], passes: Array.isArray(v.passes) ? v.passes : [] };
  } catch {
    return { likes: [], passes: [] };
  }
}

function ecrire(s: Swipes) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ likes: s.likes.slice(-500), passes: s.passes.slice(-2000) }));
  } catch { /* stockage plein ou bloqué */ }
}

export const swipesLocaux = {
  lire,
  ajouter(id: number, action: 'like' | 'pass') {
    const s = lire();
    s.likes = s.likes.filter((x) => x !== id);
    s.passes = s.passes.filter((x) => x !== id);
    (action === 'like' ? s.likes : s.passes).push(id);
    ecrire(s);
  },
  retirerLike(id: number) {
    const s = lire();
    s.likes = s.likes.filter((x) => x !== id);
    ecrire(s);
  },
  tousLesVus(): number[] {
    const s = lire();
    return [...s.likes, ...s.passes];
  },
  vider() {
    try { localStorage.removeItem(CLE); } catch { /* ignore */ }
  },
};

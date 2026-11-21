import { useCallback, useEffect, useState } from 'react';
import { api, Modele } from './api';
import { swipesLocaux } from './swipesLocaux';
import { useAuthStore } from '../store/authStore';

/** Modèles aimés : sur le compte si connectée, sinon sur le téléphone. */
export function useFavoris() {
  const { isAuthenticated } = useAuthStore();
  const [favoris, setFavoris] = useState<Modele[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = useCallback(async () => {
    setChargement(true);
    try {
      if (isAuthenticated) setFavoris((await api.modeles.mesLikes()).modeles);
      else {
        const ids = swipesLocaux.lire().likes.slice().reverse();
        setFavoris(ids.length ? (await api.modeles.parIds(ids)).modeles : []);
      }
    } catch {
      /* réseau : on garde la liste actuelle */
    } finally {
      setChargement(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { recharger(); }, [recharger]);
  // Les favoris faits avant connexion viennent d'être rattachés au compte
  useEffect(() => {
    window.addEventListener('prestaci-favoris-sync', recharger);
    return () => window.removeEventListener('prestaci-favoris-sync', recharger);
  }, [recharger]);

  const aimes = new Set(favoris.map((m) => m.id));

  const basculer = useCallback(async (m: Modele) => {
    const dejaAime = favoris.some((f) => f.id === m.id);
    setFavoris((f) => (dejaAime ? f.filter((x) => x.id !== m.id) : [m, ...f]));
    try {
      if (isAuthenticated) await (dejaAime ? api.modeles.unlike(m.id) : api.modeles.swipe(m.id, 'like'));
      else if (dejaAime) swipesLocaux.retirerLike(m.id);
      else swipesLocaux.ajouter(m.id, 'like');
    } catch {
      recharger();
    }
  }, [favoris, isAuthenticated, recharger]);

  return { favoris, aimes, chargement, basculer, recharger };
}

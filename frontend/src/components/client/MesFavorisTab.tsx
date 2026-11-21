import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Modele } from '../../lib/api';
import { useFavoris } from '../../lib/useFavoris';
import { useAuthStore } from '../../store/authStore';
import ModeleGrid from './ModeleGrid';
import ModeleDetailSheet from './ModeleDetailSheet';

/** Les modèles swipés à droite. */
export default function MesFavorisTab() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { favoris, aimes, chargement, basculer } = useFavoris();
  const [ouvert, setOuvert] = useState<Modele | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes favoris</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Touche un modèle pour trouver où le faire.</p>
      </div>

      {!isAuthenticated && favoris.length > 0 && (
        <button onClick={() => navigate('/register')} className="w-full text-left rounded-2xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 p-3 text-sm text-pink-800 dark:text-pink-200">
          💡 <strong>Crée ton compte</strong> pour garder tes favoris sur tous tes appareils.
        </button>
      )}

      {chargement && favoris.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : favoris.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-pink-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-900 dark:text-white">Pas encore de favoris</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Swipe à droite les modèles qui te plaisent.</p>
          <button onClick={() => navigate('/app/home')} className="mt-4 px-5 py-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm">
            Découvrir des modèles
          </button>
        </div>
      ) : (
        <ModeleGrid modeles={favoris} onOuvrir={setOuvert} aimes={aimes} onToggleLike={basculer} />
      )}

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} aime={ouvert ? aimes.has(ouvert.id) : false} onToggleLike={basculer} />
    </div>
  );
}

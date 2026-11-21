import { Heart } from 'lucide-react';
import { Modele } from '../../lib/api';

/** Grille 2 colonnes de modèles (Recherche, Mes favoris). */
export default function ModeleGrid({ modeles, onOuvrir, aimes, onToggleLike }: {
  modeles: Modele[];
  onOuvrir: (m: Modele) => void;
  aimes?: Set<number>;
  onToggleLike?: (m: Modele) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {modeles.map((m) => (
        <div key={m.id} className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[3/4]">
          <button onClick={() => onOuvrir(m)} className="absolute inset-0 w-full h-full" aria-label={m.titre}>
            <img src={m.photo_url} alt={m.titre} loading="lazy" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 to-transparent text-left">
              <p className="text-white text-xs font-semibold line-clamp-2 first-letter:uppercase">{m.titre}</p>
              {m.prix ? <p className="text-white/85 text-[11px]">{m.prix.toLocaleString('fr-FR')} FCFA</p> : null}
            </div>
          </button>
          {onToggleLike && (
            <button
              onClick={() => onToggleLike(m)}
              aria-label={aimes?.has(m.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/85 shadow"
            >
              <Heart className={`w-4 h-4 ${aimes?.has(m.id) ? 'fill-pink-500 text-pink-500' : 'text-gray-700'}`} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

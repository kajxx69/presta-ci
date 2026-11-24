import { Heart } from 'lucide-react';
import { Modele } from '../../lib/api';
import ModeleVisuel from './ModeleVisuel';

// Mosaïque à hauteurs variées (maquette « Rechercher ») : rythme régulier, pas aléatoire
const FORMATS = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[3/4]', 'aspect-[5/6]'];

/** Mosaïque 2 colonnes de modèles (Recherche). */
export default function ModeleGrid({ modeles, onOuvrir, aimes, onToggleLike }: {
  modeles: Modele[];
  onOuvrir: (m: Modele) => void;
  aimes?: Set<number>;
  onToggleLike?: (m: Modele) => void;
}) {
  return (
    <div className="columns-2 sm:columns-3 gap-4 [column-fill:_balance]">
      {modeles.map((m, i) => (
        <div key={m.id} className={`relative mb-4 break-inside-avoid rounded-[22px] overflow-hidden bg-sable dark:bg-gray-800 ${FORMATS[i % FORMATS.length]}`}>
          <button onClick={() => onOuvrir(m)} className="absolute inset-0 w-full h-full text-left" aria-label={m.titre}>
            <ModeleVisuel modele={m} compact className="w-full h-full" />
            <span className="absolute left-3 bottom-3 right-3 flex flex-col items-start gap-1">
              {!!m.nb_offres && (
                <span className="px-2.5 py-1 rounded-full bg-encre/80 text-white text-[11px] font-medium">dès {(m.prix_min || 0).toLocaleString('fr-FR')} F</span>
              )}
              <span className="max-w-full px-3 py-1.5 rounded-xl bg-creme/95 text-encre text-sm font-medium truncate first-letter:uppercase">{m.titre}</span>
            </span>
          </button>
          {onToggleLike && (
            <button
              onClick={() => onToggleLike(m)}
              aria-label={aimes?.has(m.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-creme/95 flex items-center justify-center"
            >
              <Heart className={`w-[18px] h-[18px] ${aimes?.has(m.id) ? 'fill-vin-600 text-vin-600' : 'text-encre'}`} strokeWidth={1.8} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

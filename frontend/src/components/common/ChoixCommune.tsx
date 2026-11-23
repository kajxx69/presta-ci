import { MapPin, ChevronDown } from 'lucide-react';
import { COMMUNES_ABIDJAN, AUTRES_VILLES } from '../../lib/communes';

interface Props {
  valeur: string | null;
  onChange: (commune: string | null) => void;
  /** Texte de l'option vide (« Toutes les communes », « Choisis ta commune »…) */
  vide?: string;
  className?: string;
  compact?: boolean;
  id?: string;
}

/** Liste déroulante des communes (natif : confortable sur téléphone). */
export default function ChoixCommune({ valeur, onChange, vide = 'Choisis ta commune', className = '', compact, id }: Props) {
  return (
    <div className={`relative ${className}`}>
      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 text-pink-600 pointer-events-none ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      <select
        id={id}
        value={valeur || ''}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Commune"
        className={`w-full appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
          compact ? 'pl-8 pr-7 py-1.5 rounded-full text-sm font-medium' : 'pl-9 pr-9 py-2.5 rounded-xl text-sm'
        }`}
      >
        <option value="">{vide}</option>
        <optgroup label="Abidjan">
          {COMMUNES_ABIDJAN.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
        <optgroup label="Autres villes">
          {AUTRES_VILLES.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      </select>
      <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
    </div>
  );
}

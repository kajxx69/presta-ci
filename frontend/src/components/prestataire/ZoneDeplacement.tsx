import { useEffect, useState } from 'react';
import { Home, Loader2, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { COMMUNES_ABIDJAN, AUTRES_VILLES } from '../../lib/communes';
import { useAppStore } from '../../store/appStore';

interface Props {
  commune?: string | null;
  zones?: string[] | null;
  frais?: number | null;
  onEnregistre?: (v: { zones_deplacement: string[]; frais_deplacement: number }) => void;
}

/** Pro : communes où elle se déplace à domicile + supplément de déplacement. */
export default function ZoneDeplacement({ commune, zones, frais, onEnregistre }: Props) {
  const { showToast } = useAppStore();
  const [choix, setChoix] = useState<string[]>([]);
  const [montant, setMontant] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [autres, setAutres] = useState(false);

  useEffect(() => {
    const z = zones && zones.length ? zones : commune ? [commune] : [];
    setChoix(z);
    setMontant(frais ? String(frais) : '');
    setAutres(z.some((c) => (AUTRES_VILLES as readonly string[]).includes(c)));
  }, [commune, zones, frais]);

  const basculer = (c: string) => setChoix((z) => (z.includes(c) ? z.filter((x) => x !== c) : [...z, c]));

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      const r = await api.prestataires.majDeplacement({ zones_deplacement: choix, frais_deplacement: Number(montant) || 0 });
      showToast('Zone de déplacement enregistrée 🏠', 'success');
      onEnregistre?.(r);
    } catch {
      showToast("Impossible d'enregistrer ta zone", 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const puce = (c: string) => {
    const actif = choix.includes(c);
    return (
      <button key={c} type="button" onClick={() => basculer(c)} aria-pressed={actif}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
          actif ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
        }`}>
        {actif && <Check className="w-3.5 h-3.5" />}{c}{c === commune && <span className="text-[10px] opacity-80">(ta commune)</span>}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
          <Home className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Je me déplace à domicile</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pour tes modèles « à domicile » : les clientes de ces communes te verront dans « Elle vient chez moi ».</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Abidjan</p>
        <div className="flex flex-wrap gap-2">{COMMUNES_ABIDJAN.map(puce)}</div>
        {autres ? (
          <>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-3 mb-2">Autres villes</p>
            <div className="flex flex-wrap gap-2">{AUTRES_VILLES.map(puce)}</div>
          </>
        ) : (
          <button type="button" onClick={() => setAutres(true)} className="mt-2 text-sm font-semibold text-pink-600">+ Autres villes</button>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Frais de déplacement (facultatif)</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 max-w-xs">
          <span className="text-gray-500">+</span>
          <input value={montant} onChange={(e) => setMontant(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="0" inputMode="numeric"
            className="flex-1 bg-transparent text-lg font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none" />
          <span className="text-gray-500 font-semibold">FCFA</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ajoutés au prix quand la cliente choisit « à domicile ». Laisse vide si c'est compris.</p>
      </div>

      <button onClick={enregistrer} disabled={envoi || choix.length === 0}
        className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {envoi && <Loader2 className="w-4 h-4 animate-spin" />}Enregistrer ma zone
      </button>
      {choix.length === 0 && <p className="text-xs text-amber-600">Choisis au moins une commune.</p>}
    </div>
  );
}

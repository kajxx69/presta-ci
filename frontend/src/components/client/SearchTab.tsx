import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { api, Modele, CategorieModele } from '../../lib/api';
import { useFavoris } from '../../lib/useFavoris';
import { CATEGORIES } from './DiscoverTab';
import ModeleGrid from './ModeleGrid';
import ModeleDetailSheet from './ModeleDetailSheet';
import ChoixCommune from '../common/ChoixCommune';

const SUGGESTIONS = ['Knotless', 'Nattes collées', 'Locks', 'Tissage', 'Perruque', 'Box braids', 'Twists', 'Nail art', 'French', 'Gel', 'Maquillage mariée', 'Faux cils'];

export default function SearchTab() {
  const [params, setParams] = useSearchParams();
  const [saisie, setSaisie] = useState(params.get('q') || '');
  const [q, setQ] = useState(params.get('q') || '');
  const [categorie, setCategorie] = useState<CategorieModele | ''>('');
  // « Ma commune » : seulement les modèles réservables chez une pro de cette commune
  const [commune, setCommune] = useState<string | null>(null);
  const [resultats, setResultats] = useState<Modele[]>([]);
  const [page, setPage] = useState(1);
  const [plus, setPlus] = useState(false);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [ouvert, setOuvert] = useState<Modele | null>(null);
  const { aimes, basculer } = useFavoris();
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Recherche au fil de la frappe (300 ms)
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setQ(saisie.trim()), 300);
    return () => clearTimeout(debounce.current);
  }, [saisie]);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    api.modeles.recherche({ q: q || undefined, categorie: categorie || undefined, commune: commune || undefined, page: 1 })
      .then((r) => { if (!annule) { setResultats(r.modeles); setTotal(r.total); setPlus(r.hasMore); setPage(1); } })
      .catch(() => {})
      .finally(() => { if (!annule) setChargement(false); });
    if (q) setParams({ q }, { replace: true }); else if (params.get('q')) setParams({}, { replace: true });
    return () => { annule = true; };
  }, [q, categorie, commune]); // eslint-disable-line react-hooks/exhaustive-deps

  const suite = async () => {
    const r = await api.modeles.recherche({ q: q || undefined, categorie: categorie || undefined, commune: commune || undefined, page: page + 1 });
    setResultats((x) => [...x, ...r.modeles]);
    setPlus(r.hasMore);
    setPage(page + 1);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-3 pb-6 space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Knotless, nail art, Cocody…"
          className="w-full pl-11 pr-10 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          enterKeyHint="search"
        />
        {saisie && (
          <button onClick={() => setSaisie('')} aria-label="Effacer" className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ChoixCommune compact valeur={commune} onChange={setCommune} vide="📍 Partout" className="w-44" />
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button key={c.id || 'tout'} onClick={() => setCategorie(c.id)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium ${
              categorie === c.id ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {!q && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setSaisie(s)} className="px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300">
              {s}
            </button>
          ))}
        </div>
      )}

      {(q || commune) && !chargement && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{total} modèle{total > 1 ? 's' : ''}{q ? ` pour « ${q} »` : ''}{commune ? ` à ${commune}` : ''}</p>
      )}

      {chargement && resultats.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : resultats.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>{commune ? `Aucun modèle réservable à ${commune} pour l'instant.` : 'Aucun modèle trouvé. Essaie un autre mot.'}</p>
          {commune && <button onClick={() => setCommune(null)} className="mt-3 text-sm font-semibold text-pink-600">Voir partout</button>}
        </div>
      ) : (
        <>
          <ModeleGrid modeles={resultats} onOuvrir={setOuvert} aimes={aimes} onToggleLike={basculer} />
          {plus && (
            <button onClick={suite} className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-200">
              Voir plus
            </button>
          )}
        </>
      )}

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} aime={ouvert ? aimes.has(ouvert.id) : false} onToggleLike={basculer} />
    </div>
  );
}

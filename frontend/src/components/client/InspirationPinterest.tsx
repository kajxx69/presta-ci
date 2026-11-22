import { useEffect, useRef, useState } from 'react';
import { api, TableauPinterest } from '../../lib/api';

// Tableaux Pinterest du compte PrestaCI, affichés via le widget OFFICIEL
// Pinterest (pinit.js / embedBoard) : les photos sont servies par Pinterest,
// avec ses crédits et ses liens. Rien n'est copié.

declare global {
  interface Window { PinUtils?: { build: (el?: HTMLElement) => void } }
}

let chargement: Promise<void> | null = null;
function chargerPinit(): Promise<void> {
  if (window.PinUtils) return Promise.resolve();
  if (!chargement) {
    chargement = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = 'https://assets.pinterest.com/js/pinit.js';
      s.async = true;
      s.defer = true;
      s.dataset.pinBuild = 'prestaciPinBuild';
      s.onload = () => ok();
      s.onerror = () => { chargement = null; ko(new Error('pinit.js')); };
      document.body.appendChild(s);
    });
  }
  return chargement;
}

function Tableau({ t }: { t: TableauPinterest }) {
  const ref = useRef<HTMLDivElement>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const a = document.createElement('a');
    a.dataset.pinDo = 'embedBoard';
    a.dataset.pinScaleWidth = '110';
    a.dataset.pinScaleHeight = '520';
    a.href = t.url;
    el.appendChild(a);
    chargerPinit()
      .then(() => {
        if (!actif) return;
        const build = (window as any).prestaciPinBuild || window.PinUtils?.build;
        build?.(el);
      })
      .catch(() => actif && setErreur(true));
    return () => { actif = false; };
  }, [t.url]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 overflow-hidden">
      <p className="font-semibold text-gray-900 dark:text-white mb-2">{t.titre}</p>
      {erreur ? (
        <a href={t.url} target="_blank" rel="noreferrer" className="text-sm text-red-600 underline">Ouvrir le tableau sur Pinterest</a>
      ) : (
        <div ref={ref} className="flex justify-center min-h-[200px]" />
      )}
    </div>
  );
}

/** Section « Inspiration Pinterest » — n'affiche rien tant qu'aucun tableau n'est configuré. */
export default function InspirationPinterest({ categorie, onJaiMonModele }: { categorie?: string; onJaiMonModele: () => void }) {
  const [tableaux, setTableaux] = useState<TableauPinterest[]>([]);

  useEffect(() => {
    api.modeles.pinterest(categorie || undefined).then((r) => setTableaux(r.tableaux)).catch(() => setTableaux([]));
  }, [categorie]);

  if (!tableaux.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Inspiration Pinterest</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Un modèle te plaît ? Fais une capture et envoie-la aux salons.</p>
        </div>
        <button onClick={onJaiMonModele} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-pink-500 text-white text-sm font-semibold">📸 J'ai mon modèle</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {tableaux.map((t) => <Tableau key={t.id} t={t} />)}
      </div>
    </section>
  );
}

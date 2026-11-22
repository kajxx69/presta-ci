import { useState } from 'react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { FilterSelect } from './AdminShared';

const CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'ongles', label: 'Ongles' },
  { value: 'maquillage', label: 'Maquillage' },
  { value: 'cils', label: 'Cils & sourcils' },
  { value: 'soins', label: 'Soins' },
];

/** Ajout d'épingles Pinterest dans le fil « Découvrir » (widget officiel, rien n'est copié). */
export default function AdminEpinglesPinterest({ onAjout }: { onAjout?: () => void }) {
  const { showToast } = useAppStore();
  const [f, setF] = useState({ urls: '', titre: '', categorie: 'coiffure', tags: '' });
  const [envoi, setEnvoi] = useState(false);
  const nb = f.urls.split(/[\s,]+/).filter(Boolean).length;

  const importer = async () => {
    setEnvoi(true);
    try {
      const r = await api.modeles.admin.importerEpingles(f);
      showToast(`${r.ajoutees} épingle(s) ajoutée(s) au fil${r.doublons ? `, ${r.doublons} déjà présente(s)` : ''}${r.refusees.length ? `, ${r.refusees.length} lien(s) non reconnu(s)` : ''}`, r.refusees.length ? 'info' : 'success');
      setF({ ...f, urls: '' });
      onAjout?.();
    } catch (e: any) {
      let msg = 'Import impossible';
      try { msg = JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || msg; } catch { /* brut */ }
      showToast(msg, 'error');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900 p-5 bg-white dark:bg-gray-800 space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">📌 Ou ajouter des épingles une par une</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Sur Pinterest, ouvre une épingle → <strong>Partager</strong> → <strong>Copier le lien</strong>, puis colle les liens ici (un par ligne).
        Elles s'affichent dans les cartes à swiper via le widget officiel Pinterest.
      </p>
      <textarea value={f.urls} onChange={(e) => setF({ ...f, urls: e.target.value })} rows={4}
        placeholder={'https://pin.it/xxxxxx\nhttps://www.pinterest.com/pin/123456789/'}
        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm" />
      <div className="grid sm:grid-cols-3 gap-2">
        <input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Titre affiché (ex. Knotless braids)"
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        <FilterSelect value={f.categorie} onChange={(v) => setF({ ...f, categorie: v })} options={CATEGORIES} />
        <input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="Mots-clés (tresses longues…)"
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      </div>
      <button onClick={importer} disabled={envoi || !nb || !f.titre.trim()}
        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
        {envoi ? 'Ajout…' : `Ajouter ${nb || ''} épingle${nb > 1 ? 's' : ''} au fil`}
      </button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Trash2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api, TableauPinterest } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

const CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'ongles', label: 'Ongles' },
  { value: 'maquillage', label: 'Maquillage' },
  { value: 'cils', label: 'Cils & sourcils' },
  { value: 'soins', label: 'Soins' },
];

const depuis = (d?: string | null) => {
  if (!d) return 'jamais';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  return min < 1 ? "à l'instant" : min < 60 ? `il y a ${min} min` : min < 1440 ? `il y a ${Math.round(min / 60)} h` : `il y a ${Math.round(min / 1440)} j`;
};

/**
 * Tableaux Pinterest suivis : leurs épingles arrivent AUTOMATIQUEMENT dans le
 * fil Découvrir (à l'ajout, puis toutes les 6 h). Widget officiel, rien n'est copié.
 */
export default function AdminTableauxPinterest({ onSynchro }: { onSynchro?: () => void }) {
  const { showToast } = useAppStore();
  const [tableaux, setTableaux] = useState<TableauPinterest[]>([]);
  const [form, setForm] = useState({ url: '', titre: '', categorie: 'coiffure' });
  const [envoi, setEnvoi] = useState(false);
  const [synchro, setSynchro] = useState(false);

  const charger = () => api.modeles.pinterest().then((r) => setTableaux(r.tableaux)).catch(() => {});
  useEffect(() => { charger(); }, []);

  const erreurDe = (e: any, d: string) => { try { return JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || d; } catch { return d; } };

  const ajouter = async () => {
    setEnvoi(true);
    try {
      const r = await api.modeles.admin.lienPinterest(form);
      showToast(r.message, r.ok ? 'success' : 'error');
      setForm({ ...form, url: '', titre: '' });
      charger(); onSynchro?.();
    } catch (e: any) {
      showToast(erreurDe(e, 'Ajout impossible'), 'error');
    } finally {
      setEnvoi(false);
    }
  };

  const toutSynchroniser = async () => {
    setSynchro(true);
    try {
      const r = await api.modeles.admin.synchroniserPinterest();
      setTableaux(r.tableaux);
      showToast('Synchronisation terminée', 'success');
      onSynchro?.();
    } catch (e: any) {
      showToast(erreurDe(e, 'Synchronisation impossible'), 'error');
    } finally {
      setSynchro(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-900 p-5 bg-white dark:bg-gray-800 space-y-3">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">📌 Ajouter des photos Pinterest</h3>
      <ol className="text-[15px] text-gray-700 dark:text-gray-200 space-y-1.5">
        <li><strong>1.</strong> Sur Pinterest, <strong>clique sur la photo</strong> qui te plaît pour l'ouvrir en grand <span className="text-gray-500">(une page de recherche ne marche pas)</span>.</li>
        <li><strong>2.</strong> Copie l'adresse tout en haut du navigateur <span className="text-gray-500">(elle commence par https://…pinterest.com/…)</span>.</li>
        <li><strong>3.</strong> Colle-la ci-dessous, choisis la catégorie, clique sur <strong>Ajouter</strong>. C'est tout.</li>
      </ol>
      <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Colle ici le lien Pinterest"
        className="w-full px-4 py-3.5 text-base border-2 border-red-300 dark:border-red-800 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setForm({ ...form, categorie: c.value })}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${form.categorie === c.value ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Nom du style (facultatif, ex. Tresses bohème)"
        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
      <button onClick={ajouter} disabled={envoi || !form.url.trim()}
        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-base font-bold disabled:opacity-50">
        {envoi ? 'Ajout…' : 'Ajouter'}
      </button>
      <p className="text-xs text-gray-500">
        💡 Astuce : si tu colles le lien d'un <strong>tableau</strong> Pinterest, toutes ses photos sont ajoutées, et les nouvelles que tu y enregistreras arriveront toutes seules (toutes les 6 h).
      </p>

      {tableaux.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tableaux suivis automatiquement</p>
          <button onClick={toutSynchroniser} disabled={synchro}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${synchro ? 'animate-spin' : ''}`} /> Synchroniser maintenant
          </button>
        </div>
      )}
      {tableaux.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {tableaux.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
              {t.derniere_erreur ? <AlertTriangle className="w-4 h-4 text-orange-500" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
              <span className="font-medium text-gray-900 dark:text-white">{t.titre}</span>
              <span className="text-gray-500">{t.categorie} · {t.nb_importees || 0} épingle(s) · synchro {depuis(t.derniere_synchro)}</span>
              {t.derniere_erreur && <span className="text-orange-600">({t.derniere_erreur})</span>}
              <a href={t.url} target="_blank" rel="noreferrer" className="flex-1 min-w-[120px] truncate text-blue-600 underline">{t.url}</a>
              <button title="Ne plus suivre" onClick={async () => { if (confirm('Ne plus suivre ce tableau ? Ses épingles quitteront le fil.')) { await api.modeles.admin.retirerPinterest(t.id); charger(); onSynchro?.(); } }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

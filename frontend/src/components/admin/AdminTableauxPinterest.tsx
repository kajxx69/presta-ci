import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, TableauPinterest } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { FilterSelect } from './AdminShared';

const CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'ongles', label: 'Ongles' },
  { value: 'maquillage', label: 'Maquillage' },
  { value: 'cils', label: 'Cils & sourcils' },
  { value: 'soins', label: 'Soins' },
];

/** Tableaux Pinterest affichés dans Recherche via le widget officiel Pinterest. */
export default function AdminTableauxPinterest() {
  const { showToast } = useAppStore();
  const [tableaux, setTableaux] = useState<TableauPinterest[]>([]);
  const [form, setForm] = useState({ url: '', titre: '', categorie: 'coiffure' });
  const [envoi, setEnvoi] = useState(false);

  const charger = () => api.modeles.pinterest().then((r) => setTableaux(r.tableaux)).catch(() => {});
  useEffect(() => { charger(); }, []);

  const ajouter = async () => {
    setEnvoi(true);
    try {
      await api.modeles.admin.ajouterPinterest(form);
      showToast('Tableau ajouté — il apparaît dans Recherche', 'success');
      setForm({ ...form, url: '', titre: '' });
      charger();
    } catch (e: any) {
      let msg = 'Ajout impossible';
      try { msg = JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || msg; } catch { /* brut */ }
      showToast(msg, 'error');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 space-y-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">📌 Tableaux Pinterest (section « Inspiration Pinterest »)</h3>
      <ol className="text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside space-y-0.5">
        <li>Sur le compte Pinterest de PrestaCI, crée un tableau par style (ex. « Knotless », « Nattes collées », « Nail art »).</li>
        <li>Enregistre-y les épingles qui te plaisent (bouton « Enregistrer » de Pinterest).</li>
        <li>Colle ici le lien du tableau : il s'affiche dans l'app via le widget officiel Pinterest, avec les crédits.</li>
      </ol>
      <div className="grid sm:grid-cols-4 gap-2">
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://www.pinterest.com/prestaci/knotless/"
          className="sm:col-span-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Titre (ex. Knotless)"
          className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        <FilterSelect value={form.categorie} onChange={(v) => setForm({ ...form, categorie: v })} options={CATEGORIES} />
      </div>
      <button onClick={ajouter} disabled={envoi || !form.url.trim() || !form.titre.trim()}
        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
        {envoi ? 'Ajout…' : 'Ajouter le tableau'}
      </button>
      {tableaux.length > 0 && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {tableaux.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="font-medium text-gray-900 dark:text-white">{t.titre}</span>
              <span className="text-gray-500">{t.categorie}</span>
              <a href={t.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 underline">{t.url}</a>
              <button title="Retirer" onClick={async () => { await api.modeles.admin.retirerPinterest(t.id); charger(); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, EyeOff, Trash2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { SectionHeader, RefreshButton, FilterSelect, Pagination, LoadingSpinner, EmptyState } from './AdminShared';

// Contenu du fil « Découvrir » : import de photos libres de droits (Pexels)
// pour le lancement + suivi des modèles issus des vrais services prestataires.

const CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'ongles', label: 'Ongles' },
  { value: 'maquillage', label: 'Maquillage' },
  { value: 'cils', label: 'Cils & sourcils' },
  { value: 'soins', label: 'Soins' },
];

// Recherches conseillées (Pexels répond mieux en anglais)
const IDEES: Record<string, string[]> = {
  coiffure: ['knotless braids', 'box braids', 'cornrows', 'locs hairstyle', 'twists natural hair', 'afro puff', 'braided bun', 'wig black woman', 'bantu knots'],
  ongles: ['nail art', 'french manicure', 'acrylic nails', 'gel nails', 'stiletto nails'],
  maquillage: ['makeup black woman', 'bridal makeup african', 'glam makeup'],
  cils: ['eyelash extensions', 'eyebrows'],
  soins: ['skincare black woman', 'facial spa', 'hair care'],
};

export default function AdminModeles() {
  const { showToast } = useAppStore();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.modeles.admin.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [page, setPage] = useState(1);
  const [imp, setImp] = useState({ query: 'knotless braids', categorie: 'coiffure', nombre: 40, titre: 'Knotless braids', tags: 'knotless tresses' });
  const [packEnCours, setPackEnCours] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.modeles.admin.list({ source, categorie: filtreCat, page })); } catch { setData(null); } finally { setLoading(false); }
  }, [source, filtreCat, page]);
  useEffect(() => { load(); }, [load]);

  const importer = async () => {
    setImporting(true);
    try {
      const r = await api.modeles.admin.importPexels(imp);
      showToast(`${r.importes} photo(s) importée(s)${r.doublons ? `, ${r.doublons} déjà présente(s)` : ''}`, 'success');
      load();
    } catch (e: any) {
      showToast(String(e.message).replace(/^HTTP \d+: /, ''), 'error');
    } finally {
      setImporting(false);
    }
  };

  const importerPack = async () => {
    setPackEnCours(true);
    try {
      const r = await api.modeles.admin.importPack();
      showToast(`Pack de lancement : ${r.importes} photos ajoutées sur ${r.styles} styles${r.erreurs.length ? ` (${r.erreurs.length} style(s) en échec)` : ''}`, r.erreurs.length ? 'info' : 'success');
      load();
    } catch (e: any) {
      showToast(String(e.message).replace(/^HTTP \d+: /, ''), 'error');
    } finally {
      setPackEnCours(false);
    }
  };

  const compte = (src: string) => (data?.stats || []).filter((s) => s._id.source === src).reduce((n, s) => n + s.n, 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Modèles (fil Découvrir)" subtitle="Photos d'inspiration à swiper : vrais services des prestataires + photos libres de droits">
        <RefreshButton onClick={load} loading={loading} />
      </SectionHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <p className="text-xs uppercase text-gray-500">Issus des prestataires</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{compte('prestataire')}</p>
          <p className="text-xs text-gray-500">Réservables · prioritaires dans le fil · ajoutés automatiquement</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <p className="text-xs uppercase text-gray-500">Inspiration importée</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{compte('curation')}</p>
          <p className="text-xs text-gray-500">Photos Pexels (licence libre, crédit affiché)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 space-y-3">
        <div className="rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-pink-900 dark:text-pink-100">🚀 Pack de lancement</p>
            <p className="text-sm text-pink-800/80 dark:text-pink-200/80">~300 vraies photos en un clic : knotless, nattes collées, locks, perruques, nail art, maquillage mariée, cils… Titres en français. Prend 1 à 2 minutes.</p>
          </div>
          <button onClick={importerPack} disabled={packEnCours || (data ? !data.pexels : false)}
            className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold disabled:opacity-50 whitespace-nowrap">
            {packEnCours ? 'Import en cours…' : 'Importer le pack'}
          </button>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pt-2"><Download className="w-4 h-4" /> Ou importer un style précis</h3>
        {data && !data.pexels && (
          <p className="text-sm text-orange-600">Ajoutez la variable <code>PEXELS_API_KEY</code> sur le serveur (clé gratuite sur pexels.com/api).</p>
        )}
        <div className="grid sm:grid-cols-4 gap-2">
          <input value={imp.query} onChange={(e) => setImp({ ...imp, query: e.target.value })} placeholder="Mot-clé (anglais conseillé)"
            className="sm:col-span-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <FilterSelect value={imp.categorie} onChange={(v) => setImp({ ...imp, categorie: v })} options={CATEGORIES} />
          <input type="number" min={1} max={80} value={imp.nombre} onChange={(e) => setImp({ ...imp, nombre: Number(e.target.value) })}
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={imp.titre} onChange={(e) => setImp({ ...imp, titre: e.target.value })} placeholder="Titre affiché sur les cartes (ex : Knotless braids)"
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          <input value={imp.tags} onChange={(e) => setImp({ ...imp, tags: e.target.value })} placeholder="Mots-clés en français (ex : tresses nattes)"
            className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(IDEES[imp.categorie] || []).map((q) => (
            <button key={q} onClick={() => setImp({ ...imp, query: q })} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{q}</button>
          ))}
        </div>
        <button onClick={importer} disabled={importing || !imp.query.trim()}
          className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold disabled:opacity-50">
          {importing ? 'Import en cours…' : `Importer ${imp.nombre} photos`}
        </button>
        <p className="text-xs text-gray-500">Astuce : vérifiez ensuite les photos ci-dessous et masquez celles qui ne collent pas au style ivoirien.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect value={source} onChange={(v) => { setSource(v); setPage(1); }} options={[{ value: '', label: 'Toutes sources' }, { value: 'prestataire', label: 'Prestataires' }, { value: 'curation', label: 'Importées' }]} />
        <FilterSelect value={filtreCat} onChange={(v) => { setFiltreCat(v); setPage(1); }} options={[{ value: '', label: 'Toutes catégories' }, ...CATEGORIES]} />
      </div>

      {loading && !data ? <LoadingSpinner /> : !data?.modeles.length ? (
        <EmptyState icon={ImageIcon} message="Aucun modèle pour le moment — importez vos premières photos ci-dessus" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.modeles.map((m: any) => (
              <div key={m.id} className={`relative rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 ${m.is_active ? '' : 'opacity-40'}`}>
                <img src={m.photo_url} alt={m.titre} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-[11px] line-clamp-2">{m.titre}</p>
                  <p className="text-white/70 text-[10px]">{m.categorie} · {m.source === 'prestataire' ? 'prestataire' : 'importée'} · ♥ {m.nombre_likes}</p>
                </div>
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <button title={m.is_active ? 'Masquer' : 'Réafficher'} onClick={async () => { await api.modeles.admin.toggle(m.id); load(); }}
                    className="p-1.5 rounded-lg bg-white/90">
                    {m.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {m.source === 'curation' && (
                    <button title="Supprimer" onClick={async () => { if (confirm('Supprimer cette photo ?')) { await api.modeles.admin.remove(m.id); load(); } }}
                      className="p-1.5 rounded-lg bg-white/90">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} label="modèles"
            onPageChange={(d) => setPage((p) => (d === 'next' ? p + 1 : Math.max(1, p - 1)))} />
        </>
      )}
    </div>
  );
}

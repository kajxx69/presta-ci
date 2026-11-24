import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, Image as ImageIcon, FileText } from 'lucide-react';
import AdminFicheModele from './AdminFicheModele';
import { api } from '../../lib/api';
import AdminTableauxPinterest from './AdminTableauxPinterest';
import ModeleVisuel from '../client/ModeleVisuel';
import { SectionHeader, RefreshButton, FilterSelect, Pagination, LoadingSpinner, EmptyState } from './AdminShared';

// Contenu du fil « Découvrir » : épingles Pinterest (ajoutées par lien ou par
// tableau suivi) + modèles issus des vrais services des prestataires.

const CATEGORIES = [
  { value: 'coiffure', label: 'Coiffure' },
  { value: 'ongles', label: 'Ongles' },
  { value: 'maquillage', label: 'Maquillage' },
  { value: 'cils', label: 'Cils & sourcils' },
  { value: 'soins', label: 'Soins' },
];

export default function AdminModeles() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.modeles.admin.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [filtreCat, setFiltreCat] = useState('');
  const [page, setPage] = useState(1);
  const [fiche, setFiche] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.modeles.admin.list({ source, categorie: filtreCat, page })); } catch { setData(null); } finally { setLoading(false); }
  }, [source, filtreCat, page]);
  useEffect(() => { load(); }, [load]);

  const compte = (src: string) => (data?.stats || []).filter((s) => s._id.source === src).reduce((n, s) => n + s.n, 0);

  return (
    <div className="space-y-6">
      <SectionHeader title="Modèles (fil Découvrir)" subtitle="Photos à swiper : épingles Pinterest + vraies réalisations des prestataires">
        <RefreshButton onClick={load} loading={loading} />
      </SectionHeader>

      <AdminTableauxPinterest onSynchro={load} />

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <p className="text-xs uppercase text-gray-500">Issus des prestataires</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{compte('prestataire')}</p>
          <p className="text-xs text-gray-500">Réservables · prioritaires dans le fil · ajoutés automatiquement</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <p className="text-xs uppercase text-gray-500">Épingles Pinterest</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{compte('pinterest')}</p>
          <p className="text-xs text-gray-500">Affichées via le widget officiel Pinterest</p>
        </div>
      </div>


      <div className="flex flex-wrap gap-2">
        <FilterSelect value={source} onChange={(v) => { setSource(v); setPage(1); }} options={[{ value: '', label: 'Toutes sources' }, { value: 'prestataire', label: 'Prestataires' }, { value: 'pinterest', label: 'Pinterest' }]} />
        <FilterSelect value={filtreCat} onChange={(v) => { setFiltreCat(v); setPage(1); }} options={[{ value: '', label: 'Toutes catégories' }, ...CATEGORIES]} />
      </div>

      {loading && !data ? <LoadingSpinner /> : !data?.modeles.length ? (
        <EmptyState icon={ImageIcon} message="Aucun modèle pour le moment — importez vos premières photos ci-dessus" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.modeles.map((m: any) => (
              <div key={m.id} className={`relative rounded-xl overflow-hidden aspect-[3/4] bg-gray-100 ${m.is_active ? '' : 'opacity-40'}`}>
                <ModeleVisuel modele={m} compact className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-[11px] line-clamp-2">{m.titre}</p>
                  <p className="text-white/70 text-[10px]">{m.categorie} · {m.source === 'prestataire' ? 'prestataire' : 'Pinterest'} · ♥ {m.nombre_likes}</p>
                </div>
                {(m.prix_reference || m.couleurs?.length || m.conseils_entretien?.length) ? (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/90 text-gray-800">Fiche ✓</span>
                ) : null}
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <button title="Fiche : prix de référence, couleurs, conseils" onClick={() => setFiche(m)} className="p-1.5 rounded-lg bg-white/90">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button title={m.is_active ? 'Masquer' : 'Réafficher'} onClick={async () => { await api.modeles.admin.toggle(m.id); load(); }}
                    className="p-1.5 rounded-lg bg-white/90">
                    {m.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {m.source !== 'prestataire' && (
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
      <AdminFicheModele modele={fiche} onFermer={() => setFiche(null)} onEnregistre={load} />
    </div>
  );
}

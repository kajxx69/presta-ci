import { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton, FilterSelect, SearchInput, Pagination,
  formatDate
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Avis {
  id: number;
  client_nom: string;
  client_prenom: string;
  service_nom: string;
  note: number;
  commentaire: string;
  is_visible: boolean;
  created_at: string;
}

type AvisFilter = 'all' | 'approved' | 'rejected';

// ── Helpers ──────────────────────────────────────────────────────────────────

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-4 h-4 ${
          star <= rating
            ? 'text-yellow-400 fill-yellow-400'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))}
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminAvis() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [filter, setFilter] = useState<AvisFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ all: 0, approved: 0, rejected: 0 });
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  const PER_PAGE = 20;

  // ── Data loaders — pagination et recherche envoyées au serveur : au-delà de
  // la page par défaut, tout charger côté client faussait silencieusement les
  // compteurs "au total / visibles / masqués" affichés dans l'en-tête. ───────

  const loadAvis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.avis.getAll({ page, limit: PER_PAGE, status: filter, search: search || undefined });
      setAvis(data?.avis || []);
      setTotal(data?.pagination?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des avis', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filter, search, showToast]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.admin.avis.getStats();
      const o = data?.overview;
      if (o) setCounts({ all: o.total_avis || 0, approved: o.approuves || 0, rejected: o.rejetes || 0 });
    } catch { /* les compteurs restent à zéro, pas bloquant pour la liste */ }
  }, []);

  useEffect(() => {
    loadAvis();
  }, [loadAvis]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleModerate = useCallback(
    async (id: number, approved: boolean) => {
      setModeratingId(id);
      try {
        await api.admin.avis.moderate(id, approved);
        showToast(approved ? 'Avis approuve' : 'Avis rejete', 'success');
        await Promise.all([loadAvis(), loadStats()]);
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la moderation', 'error');
      } finally {
        setModeratingId(null);
      }
    },
    [showToast, loadAvis, loadStats]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des avis..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Moderation des Avis"
        subtitle={`${counts.all} avis au total — ${counts.approved} visibles, ${counts.rejected} masques`}
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un avis, client, service..." />
        <FilterSelect
          value={filter}
          onChange={(v) => setFilter(v as AvisFilter)}
          options={[
            { value: 'all', label: `Tous (${counts.all})` },
            { value: 'approved', label: `Visibles (${counts.approved})` },
            { value: 'rejected', label: `Masques (${counts.rejected})` },
          ]}
        />
        <RefreshButton onClick={loadAvis} loading={loading} />
      </SectionHeader>

      {/* Avis list */}
      {avis.length === 0 ? (
        <EmptyState icon={Star} message="Aucun avis trouve pour ce filtre" />
      ) : (
        <div className="space-y-4">
          {avis.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                {/* Left side: info */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {a.client_prenom} {a.client_nom}
                    </p>
                    <span className="text-sm text-gray-400">sur</span>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {a.service_nom}
                    </p>
                  </div>

                  <StarRating rating={a.note} />

                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {a.commentaire}
                  </p>

                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(a.created_at)}
                  </p>
                </div>

                {/* Right side: moderation */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={a.is_visible ? 'approved' : 'rejected'} />
                  {a.is_visible ? (
                    <button
                      onClick={() => handleModerate(a.id, false)}
                      disabled={moderatingId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Masquer
                    </button>
                  ) : (
                    <button
                      onClick={() => handleModerate(a.id, true)}
                      disabled={moderatingId === a.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Rendre visible
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            label="avis"
            onPageChange={(dir) => setPage((p) => (dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1)))}
          />
        </div>
      )}
    </div>
  );
}

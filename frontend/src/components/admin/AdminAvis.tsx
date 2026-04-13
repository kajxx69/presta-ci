import { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton, FilterSelect,
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
  is_approved: boolean | null;
  created_at: string;
}

type AvisFilter = 'all' | 'pending' | 'approved' | 'rejected';

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
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadAvis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.avis.getAll();
      setAvis(Array.isArray(data) ? data : data?.data || data?.avis || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des avis', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAvis();
  }, [loadAvis]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return avis.filter((a) => {
      if (filter === 'pending') return a.is_approved === null;
      if (filter === 'approved') return a.is_approved === true;
      if (filter === 'rejected') return a.is_approved === false;
      return true;
    });
  }, [avis, filter]);

  const counts = useMemo(() => {
    return {
      all: avis.length,
      pending: avis.filter((a) => a.is_approved === null).length,
      approved: avis.filter((a) => a.is_approved === true).length,
      rejected: avis.filter((a) => a.is_approved === false).length,
    };
  }, [avis]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleModerate = useCallback(
    async (id: number, approved: boolean) => {
      setModeratingId(id);
      try {
        await api.admin.avis.moderate(id, approved);
        showToast(approved ? 'Avis approuve' : 'Avis rejete', 'success');
        await loadAvis();
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la moderation', 'error');
      } finally {
        setModeratingId(null);
      }
    },
    [showToast, loadAvis]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des avis..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Moderation des Avis"
        subtitle={`${counts.all} avis au total — ${counts.pending} en attente de moderation`}
      >
        <FilterSelect
          value={filter}
          onChange={(v) => setFilter(v as AvisFilter)}
          options={[
            { value: 'all', label: `Tous (${counts.all})` },
            { value: 'pending', label: `En attente (${counts.pending})` },
            { value: 'approved', label: `Approuves (${counts.approved})` },
            { value: 'rejected', label: `Rejetes (${counts.rejected})` },
          ]}
        />
        <RefreshButton onClick={loadAvis} loading={loading} />
      </SectionHeader>

      {/* Avis list */}
      {filtered.length === 0 ? (
        <EmptyState icon={Star} message="Aucun avis trouve pour ce filtre" />
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
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
                  {a.is_approved === null ? (
                    <>
                      <button
                        onClick={() => handleModerate(a.id, true)}
                        disabled={moderatingId === a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => handleModerate(a.id, false)}
                        disabled={moderatingId === a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                    </>
                  ) : (
                    <StatusBadge status={a.is_approved ? 'approved' : 'rejected'} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

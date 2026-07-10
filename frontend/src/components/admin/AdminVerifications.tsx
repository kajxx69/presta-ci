import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton, FilterSelect,
  formatDate
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Verification {
  id: number;
  nom_commercial: string;
  ville: string | null;
  user_nom: string | null;
  user_email: string | null;
  user_telephone: string | null;
  verification_statut: 'en_attente' | 'verifie' | 'rejete';
  verification_document: string | null;
  verification_demandee_at: string | null;
  verification_traitee_at: string | null;
  verification_rejet_motif: string | null;
  is_verified: boolean;
}

type VerifFilter = 'en_attente' | 'verifie' | 'rejete' | 'all';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminVerifications() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Verification[]>([]);
  const [filter, setFilter] = useState<VerifFilter>('en_attente');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.verifications.getAll({ statut: filter, limit: 100 });
      setItems(data?.verifications || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des vérifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, filter]);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  const counts = useMemo(() => {
    return {
      en_attente: items.filter(v => v.verification_statut === 'en_attente').length,
      verifie: items.filter(v => v.verification_statut === 'verifie').length,
      rejete: items.filter(v => v.verification_statut === 'rejete').length,
    };
  }, [items]);

  const handleApprove = useCallback(async (id: number) => {
    setProcessingId(id);
    try {
      await api.admin.verifications.approve(id);
      showToast('Prestataire vérifié avec succès', 'success');
      await loadVerifications();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la validation', 'error');
    } finally {
      setProcessingId(null);
    }
  }, [showToast, loadVerifications]);

  const handleReject = useCallback(async (id: number) => {
    if (!rejectMotif.trim()) {
      showToast('Un motif de rejet est requis', 'error');
      return;
    }
    setProcessingId(id);
    try {
      await api.admin.verifications.reject(id, rejectMotif.trim());
      showToast('Demande rejetée', 'success');
      setRejectingId(null);
      setRejectMotif('');
      await loadVerifications();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du rejet', 'error');
    } finally {
      setProcessingId(null);
    }
  }, [showToast, loadVerifications, rejectMotif]);

  if (loading) return <LoadingSpinner message="Chargement des vérifications..." />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Vérifications d'identité"
        subtitle={`${counts.en_attente} en attente d'examen`}
      >
        <FilterSelect
          value={filter}
          onChange={(v) => setFilter(v as VerifFilter)}
          options={[
            { value: 'en_attente', label: `En attente (${counts.en_attente})` },
            { value: 'verifie', label: `Vérifiés (${counts.verifie})` },
            { value: 'rejete', label: `Rejetés (${counts.rejete})` },
            { value: 'all', label: 'Toutes' },
          ]}
        />
        <RefreshButton onClick={loadVerifications} loading={loading} />
      </SectionHeader>

      {items.length === 0 ? (
        <EmptyState icon={ShieldCheck} message="Aucune demande de vérification pour ce filtre" />
      ) : (
        <div className="space-y-4">
          {items.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.nom_commercial}</p>
                    <StatusBadge status={v.verification_statut === 'verifie' ? 'approved' : v.verification_statut === 'rejete' ? 'rejected' : 'pending'} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {v.user_nom} — {v.user_email} {v.user_telephone ? `— ${v.user_telephone}` : ''}
                  </p>
                  {v.ville && <p className="text-xs text-gray-400 dark:text-gray-500">{v.ville}</p>}
                  {v.verification_demandee_at && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Demandé le {formatDate(v.verification_demandee_at)}
                    </p>
                  )}
                  {v.verification_statut === 'rejete' && v.verification_rejet_motif && (
                    <p className="text-xs text-red-600 dark:text-red-400">Motif : {v.verification_rejet_motif}</p>
                  )}
                  {v.verification_document && (
                    <a
                      href={v.verification_document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Voir le document
                    </a>
                  )}
                </div>

                {v.verification_statut === 'en_attente' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleApprove(v.id)}
                      disabled={processingId === v.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Vérifier
                    </button>
                    <button
                      onClick={() => { setRejectingId(v.id); setRejectMotif(''); }}
                      disabled={processingId === v.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                )}
              </div>

              {rejectingId === v.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Motif du rejet (visible par le prestataire)
                  </label>
                  <textarea
                    value={rejectMotif}
                    onChange={(e) => setRejectMotif(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Ex: document illisible, informations non correspondantes..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setRejectingId(null); setRejectMotif(''); }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleReject(v.id)}
                      disabled={processingId === v.id || !rejectMotif.trim()}
                      className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirmer le rejet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard, DollarSign, Clock, CheckCircle, XCircle,
  Eye, AlertTriangle, Calendar, Hash, User
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, SearchInput, FilterSelect, LoadingSpinner, EmptyState,
  Pagination, Modal, SectionHeader, RefreshButton, ResetButton,
  TableContainer, TableHead,
  formatDate, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface WaveTransaction {
  id: number;
  user_id?: number;
  prestataire_id?: number;
  prestataire_nom?: string;
  prestataire_prenom?: string;
  prestataire_email?: string;
  prestataire_telephone?: string;
  plan_id?: number;
  plan_nom?: string;
  montant: number;
  devise?: string;
  transaction_id_wave?: string;
  statut: string;
  motif_rejet?: string;
  duree_abonnement_jours?: number;
  created_at: string;
  validated_at?: string;
  rejected_at?: string;
}

interface TransactionSummary {
  total: number;
  validated_amount: number;
  pending_amount: number;
  today_count: number;
}

type StatusFilterType = 'all' | 'en_attente' | 'valide' | 'rejete';
type DateFilterType = 'all' | 'today' | 'week' | 'month';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [transactions, setTransactions] = useState<WaveTransaction[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTx, setSelectedTx] = useState<WaveTransaction | null>(null);
  const [rejectTx, setRejectTx] = useState<WaveTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmValidate, setConfirmValidate] = useState<WaveTransaction | null>(null);
  const [summary, setSummary] = useState<TransactionSummary>({ total: 0, validated_amount: 0, pending_amount: 0, today_count: 0 });

  const LIMIT = 15;

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const s = await api.admin.getWaveTransactionsStats();
      setSummary({
        total: s.total_transactions,
        validated_amount: s.revenus_total,
        pending_amount: s.montant_en_attente,
        today_count: s.today_count,
      });
    } catch { /* les StatCards restent à zéro, pas bloquant pour la liste */ }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.statut = statusFilter;

      const data = await api.admin.getWaveTransactions(params);
      const txList = Array.isArray(data) ? data : data?.transactions || [];
      setTransactions(txList);
      if (!Array.isArray(data) && data?.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotal(data.pagination.total || txList.length);
      } else {
        setTotalPages(1);
        setTotal(txList.length);
      }
    } catch (err: any) {
      showToast('Erreur lors du chargement des transactions', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showToast]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFilter, search]);

  // ── Client-side filtering ────────────────────────────────────────────────

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(tx =>
        (tx.prestataire_nom || '').toLowerCase().includes(q) ||
        (tx.prestataire_prenom || '').toLowerCase().includes(q) ||
        (tx.transaction_id_wave || '').toLowerCase().includes(q) ||
        (tx.plan_nom || '').toLowerCase().includes(q) ||
        String(tx.montant).includes(q)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const start = new Date();
      if (dateFilter === 'today') {
        start.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        start.setDate(now.getDate() - 7);
      } else if (dateFilter === 'month') {
        start.setMonth(now.getMonth() - 1);
      }
      result = result.filter(tx => new Date(tx.created_at) >= start);
    }

    return result;
  }, [transactions, search, dateFilter]);


  // ── Actions ──────────────────────────────────────────────────────────────

  const handleValidate = useCallback(async (tx: WaveTransaction) => {
    setActionLoading(true);
    try {
      await api.admin.validateWaveTransaction(tx.id);
      showToast('Transaction validee avec succes', 'success');
      setConfirmValidate(null);
      setSelectedTx(null);
      await Promise.all([loadTransactions(), loadStats()]);
    } catch (err: any) {
      showToast('Erreur lors de la validation', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadTransactions, loadStats, showToast]);

  const handleReject = useCallback(async () => {
    if (!rejectTx) return;
    if (!rejectReason.trim()) {
      showToast('Veuillez saisir un motif de rejet', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.admin.rejectWaveTransaction(rejectTx.id, rejectReason.trim());
      showToast('Transaction rejetee', 'success');
      setRejectTx(null);
      setRejectReason('');
      setSelectedTx(null);
      await Promise.all([loadTransactions(), loadStats()]);
    } catch (err: any) {
      showToast('Erreur lors du rejet', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [rejectTx, rejectReason, loadTransactions, loadStats, showToast]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setPage(1);
  };

  // ── Options ──────────────────────────────────────────────────────────────

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'valide', label: 'Validees' },
    { value: 'rejete', label: 'Rejetees' },
  ];

  const dateChips: { value: DateFilterType; label: string }[] = [
    { value: 'all', label: 'Tout' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && transactions.length === 0) return <LoadingSpinner message="Chargement des transactions..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Transactions Wave" subtitle="Gestion des paiements Wave">
        <RefreshButton onClick={loadTransactions} loading={loading} />
      </SectionHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total transactions" value={total || summary.total} icon={CreditCard} color="blue" />
        <StatCard title="Montant valide" value={formatCurrency(summary.validated_amount)} icon={CheckCircle} color="green" />
        <StatCard title="Montant en attente" value={formatCurrency(summary.pending_amount)} icon={Clock} color="orange" />
        <StatCard title="Aujourd'hui" value={summary.today_count} icon={Calendar} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 flex-wrap items-start">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par prestataire, Wave ID..."
          className="flex-1 min-w-[200px]"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilterType)}
          options={statusOptions}
        />
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {dateChips.map(chip => (
            <button
              key={chip.value}
              onClick={() => setDateFilter(chip.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                dateFilter === chip.value
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <ResetButton onClick={resetFilters} />
      </div>

      {/* Table */}
      {filteredTransactions.length === 0 ? (
        <EmptyState icon={CreditCard} message="Aucune transaction trouvee" action={{ label: 'Reinitialiser les filtres', onClick: resetFilters }} />
      ) : (
        <TableContainer>
          <table className="w-full">
            <TableHead columns={['Prestataire', 'Plan', 'Montant', 'Date & Wave ID', 'Statut', 'Actions']} />
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* Prestataire */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {(tx.prestataire_prenom || tx.prestataire_nom || 'P')?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {tx.prestataire_prenom} {tx.prestataire_nom}
                        </p>
                        {tx.prestataire_email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tx.prestataire_email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Plan */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {tx.plan_nom || '-'}
                    </span>
                    {tx.duree_abonnement_jours && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{tx.duree_abonnement_jours} jours</p>
                    )}
                  </td>
                  {/* Montant */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(tx.montant, tx.devise || 'FCFA')}
                    </span>
                  </td>
                  {/* Date & Wave ID */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(tx.created_at)}</p>
                    {tx.transaction_id_wave && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate max-w-[180px]">
                        {tx.transaction_id_wave}
                      </p>
                    )}
                  </td>
                  {/* Statut */}
                  <td className="px-6 py-4">
                    <StatusBadge status={tx.statut} />
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {tx.statut === 'en_attente' && (
                        <>
                          <button
                            onClick={() => setConfirmValidate(tx)}
                            className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Valider"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setRejectTx(tx); setRejectReason(''); }}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Rejeter"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedTx(tx)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="transactions"
          onPageChange={(dir) => setPage(p => dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1))}
        />
      )}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Modal
          title={`Transaction #${selectedTx.id}`}
          subtitle="Detail de la transaction"
          onClose={() => setSelectedTx(null)}
        >
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Statut</span>
              <StatusBadge status={selectedTx.statut} />
            </div>

            {/* Prestataire info */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 space-y-2">
              <p className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold">Prestataire</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold text-sm">
                  {(selectedTx.prestataire_prenom || selectedTx.prestataire_nom || 'P')?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedTx.prestataire_prenom} {selectedTx.prestataire_nom}
                  </p>
                  {selectedTx.prestataire_email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTx.prestataire_email}</p>
                  )}
                  {selectedTx.prestataire_telephone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTx.prestataire_telephone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2.5">
              <DetailRow icon={DollarSign} label="Montant" value={formatCurrency(selectedTx.montant, selectedTx.devise || 'FCFA')} bold />
              <DetailRow icon={CreditCard} label="Plan" value={selectedTx.plan_nom || '-'} />
              {selectedTx.duree_abonnement_jours && (
                <DetailRow icon={Calendar} label="Duree" value={`${selectedTx.duree_abonnement_jours} jours`} />
              )}
              <DetailRow icon={Hash} label="Wave ID" value={selectedTx.transaction_id_wave || '-'} mono />
              <DetailRow icon={Calendar} label="Date" value={formatDate(selectedTx.created_at)} />
              {selectedTx.validated_at && (
                <DetailRow icon={CheckCircle} label="Validee le" value={formatDate(selectedTx.validated_at)} />
              )}
              {selectedTx.rejected_at && (
                <DetailRow icon={XCircle} label="Rejetee le" value={formatDate(selectedTx.rejected_at)} />
              )}
              {selectedTx.motif_rejet && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                  <span className="font-semibold">Motif de rejet : </span>{selectedTx.motif_rejet}
                </div>
              )}
            </div>

            {/* Actions for pending */}
            {selectedTx.statut === 'en_attente' && (
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setSelectedTx(null);
                    setConfirmValidate(selectedTx);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Valider
                </button>
                <button
                  onClick={() => {
                    const tx = selectedTx;
                    setSelectedTx(null);
                    setRejectTx(tx);
                    setRejectReason('');
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Rejeter
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Validate Confirmation Modal */}
      {confirmValidate && (
        <Modal
          title="Confirmer la validation"
          subtitle="Confirmation requise"
          onClose={() => setConfirmValidate(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Valider la transaction de <strong>{formatCurrency(confirmValidate.montant, confirmValidate.devise || 'FCFA')}</strong> pour{' '}
                <strong>{confirmValidate.prestataire_prenom} {confirmValidate.prestataire_nom}</strong> ?
                L'abonnement sera active.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium text-gray-900 dark:text-white">{confirmValidate.plan_nom || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Wave ID</span>
                <span className="font-mono text-gray-900 dark:text-white text-xs">{confirmValidate.transaction_id_wave || '-'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmValidate(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidate(confirmValidate)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'En cours...' : 'Valider'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {rejectTx && (
        <Modal
          title="Rejeter la transaction"
          subtitle="Motif de rejet"
          onClose={() => { setRejectTx(null); setRejectReason(''); }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Vous etes sur le point de rejeter la transaction de{' '}
                <strong>{formatCurrency(rejectTx.montant, rejectTx.devise || 'FCFA')}</strong> pour{' '}
                <strong>{rejectTx.prestataire_prenom} {rejectTx.prestataire_nom}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motif du rejet <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez la raison du rejet..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setRejectTx(null); setRejectReason(''); }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'En cours...' : 'Rejeter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Helper Component ─────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value, bold, mono }: {
  icon: any; label: string; value: string; bold?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 dark:text-gray-400 min-w-[80px]">{label}</span>
      <span className={`text-gray-900 dark:text-white ${bold ? 'font-bold' : 'font-medium'} ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

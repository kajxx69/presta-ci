import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle, XCircle, Eye, AlertTriangle,
  CalendarDays, CalendarCheck, CalendarX, User, Phone, Mail,
  TrendingUp, Timer
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, SearchInput, FilterSelect, LoadingSpinner, EmptyState,
  Pagination, Modal, SectionHeader, RefreshButton, ResetButton,
  formatDate, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Reservation {
  id: number;
  client_nom: string;
  client_prenom: string;
  client_email: string;
  client_telephone?: string;
  service_nom: string;
  prestataire_nom: string;
  date_reservation: string;
  heure_debut?: string;
  heure_fin?: string;
  statut: 'en_attente' | 'confirmee' | 'terminee' | 'annulee';
}

type StatusFilter = 'all' | 'en_attente' | 'confirmee' | 'terminee' | 'annulee';
type DateFilter = 'all' | 'today' | 'week' | 'month';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminReservations() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    reservation: Reservation;
    action: 'confirmee' | 'terminee' | 'annulee';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const perPage = 10;

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      // Le filtrage, tri et pagination se font côté client dans ce composant :
      // il faut donc charger toutes les réservations, pas la page de 20 par défaut du backend.
      const data = await api.admin.reservations.getAll({ limit: 500 });
      setReservations(Array.isArray(data) ? data : data?.data || data?.reservations || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des reservations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const monthFromNow = new Date(now);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);

    return reservations.filter((r) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const match =
          `${r.client_prenom} ${r.client_nom}`.toLowerCase().includes(q) ||
          r.client_email.toLowerCase().includes(q) ||
          r.service_nom.toLowerCase().includes(q) ||
          r.prestataire_nom.toLowerCase().includes(q);
        if (!match) return false;
      }
      // Status
      if (statusFilter !== 'all' && r.statut !== statusFilter) return false;
      // Date
      if (dateFilter !== 'all') {
        const rDate = r.date_reservation.split('T')[0];
        if (dateFilter === 'today' && rDate !== todayStr) return false;
        if (dateFilter === 'week') {
          const d = new Date(rDate);
          if (d < now || d > weekFromNow) return false;
        }
        if (dateFilter === 'month') {
          const d = new Date(rDate);
          if (d < now || d > monthFromNow) return false;
        }
      }
      return true;
    });
  }, [reservations, search, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page]
  );

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, dateFilter]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const total = reservations.length;
    const enAttente = reservations.filter((r) => r.statut === 'en_attente').length;
    const confirmees = reservations.filter((r) => r.statut === 'confirmee').length;
    const terminees = reservations.filter((r) => r.statut === 'terminee').length;
    const todayCount = reservations.filter((r) => r.date_reservation.split('T')[0] === todayStr).length;
    const next30 = reservations.filter((r) => {
      const d = new Date(r.date_reservation);
      return d >= now && d <= thirtyDays;
    }).length;
    const completionRate = total > 0 ? Math.round((terminees / total) * 100) : 0;

    return { total, enAttente, confirmees, terminees, todayCount, next30, completionRate };
  }, [reservations]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusUpdate = useCallback(
    async (reservation: Reservation, newStatus: 'confirmee' | 'terminee' | 'annulee') => {
      setActionLoading(true);
      try {
        await api.admin.reservations.updateStatus(reservation.id, newStatus);
        showToast('Statut mis a jour avec succes', 'success');
        setConfirmModal(null);
        setSelectedReservation(null);
        await loadReservations();
      } catch (err: any) {
        showToast(err.message || 'Erreur lors de la mise a jour', 'error');
      } finally {
        setActionLoading(false);
      }
    },
    [showToast, loadReservations]
  );

  const actionLabel = (action: string) => {
    switch (action) {
      case 'confirmee': return 'Valider';
      case 'terminee': return 'Terminer';
      case 'annulee': return 'Annuler';
      default: return action;
    }
  };

  const dateChips: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des reservations..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Gestion des Reservations" subtitle={`${reservations.length} reservations au total`}>
        <RefreshButton onClick={loadReservations} loading={loading} />
      </SectionHeader>

      {/* Summary gradient cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total" value={stats.total} icon={Calendar} color="blue" />
        <StatCard title="En attente" value={stats.enAttente} icon={Clock} color="orange" />
        <StatCard title="Confirmees" value={stats.confirmees} icon={CalendarCheck} color="green" />
        <StatCard title="Terminees" value={stats.terminees} icon={CalendarDays} color="purple" />
      </div>

      {/* Extra stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Aujourd&apos;hui</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.todayCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">30 prochains jours</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.next30}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Taux de completion</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher par client, service, prestataire..."
            className="flex-1"
          />
          <FilterSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'en_attente', label: 'En attente' },
              { value: 'confirmee', label: 'Confirmee' },
              { value: 'terminee', label: 'Terminee' },
              { value: 'annulee', label: 'Annulee' },
            ]}
          />
          <ResetButton
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setDateFilter('all');
            }}
          />
        </div>

        {/* Date filter chips */}
        <div className="flex flex-wrap gap-2">
          {dateChips.map((chip) => (
            <button
              key={chip.value}
              onClick={() => setDateFilter(chip.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                dateFilter === chip.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} message="Aucune reservation trouvee" />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {['Client', 'Service', 'Prestataire', 'Date & horaire', 'Statut', 'Actions'].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {r.client_prenom} {r.client_nom}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.client_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.service_nom}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{r.prestataire_nom}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(r.date_reservation).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      {r.heure_debut && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {r.heure_debut}{r.heure_fin ? ` - ${r.heure_fin}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.statut} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedReservation(r)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {r.statut === 'en_attente' && (
                          <button
                            onClick={() => setConfirmModal({ reservation: r, action: 'confirmee' })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Valider"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {r.statut === 'confirmee' && (
                          <button
                            onClick={() => setConfirmModal({ reservation: r, action: 'terminee' })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title="Terminer"
                          >
                            <CalendarCheck className="w-4 h-4" />
                          </button>
                        )}
                        {(r.statut === 'en_attente' || r.statut === 'confirmee') && (
                          <button
                            onClick={() => setConfirmModal({ reservation: r, action: 'annulee' })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Annuler"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              label="reservations"
              onPageChange={(dir) => setPage((p) => (dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1)))}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReservation && (
        <Modal
          title="Detail de la reservation"
          subtitle={`Reservation #${selectedReservation.id}`}
          onClose={() => setSelectedReservation(null)}
        >
          <div className="space-y-5">
            {/* Client info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</h4>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedReservation.client_prenom} {selectedReservation.client_nom}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedReservation.client_email}
                    </span>
                    {selectedReservation.client_telephone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedReservation.client_telephone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Service & Prestataire */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Service</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReservation.service_nom}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prestataire</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedReservation.prestataire_nom}</p>
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(selectedReservation.date_reservation).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Horaire</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedReservation.heure_debut
                    ? `${selectedReservation.heure_debut}${selectedReservation.heure_fin ? ` - ${selectedReservation.heure_fin}` : ''}`
                    : 'Non defini'}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statut</p>
              <StatusBadge status={selectedReservation.statut} />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {selectedReservation.statut === 'en_attente' && (
                <button
                  onClick={() =>
                    setConfirmModal({ reservation: selectedReservation, action: 'confirmee' })
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Valider
                </button>
              )}
              {selectedReservation.statut === 'confirmee' && (
                <button
                  onClick={() =>
                    setConfirmModal({ reservation: selectedReservation, action: 'terminee' })
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <CalendarCheck className="w-4 h-4" /> Terminer
                </button>
              )}
              {(selectedReservation.statut === 'en_attente' || selectedReservation.statut === 'confirmee') && (
                <button
                  onClick={() =>
                    setConfirmModal({ reservation: selectedReservation, action: 'annulee' })
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Annuler
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          title="Confirmation"
          subtitle="Action sur la reservation"
          onClose={() => setConfirmModal(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Etes-vous sur de vouloir{' '}
              <span className="font-semibold">{actionLabel(confirmModal.action).toLowerCase()}</span>{' '}
              la reservation de{' '}
              <span className="font-semibold">
                {confirmModal.reservation.client_prenom} {confirmModal.reservation.client_nom}
              </span>{' '}
              pour le service{' '}
              <span className="font-semibold">{confirmModal.reservation.service_nom}</span> ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleStatusUpdate(confirmModal.reservation, confirmModal.action)}
                disabled={actionLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  confirmModal.action === 'annulee'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.action === 'terminee'
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading ? 'Traitement...' : actionLabel(confirmModal.action)}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

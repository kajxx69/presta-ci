import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DragEvent } from 'react';
import {
  Calendar,
  Clock,
  Phone,
  Mail,
  Check,
  X,
  Loader2,
  RefreshCw,
  Search,
  MapPin,
  GripVertical,
  LayoutGrid,
  List,
  Filter,
  TrendingUp,
  Info,
  Flag
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import SignalementModal from '../common/SignalementModal';

interface Reservation {
  id: number;
  client_id?: number;
  client_nom: string;
  client_prenom: string;
  client_telephone?: string;
  client_email?: string;
  service_nom: string;
  date_reservation: string;
  heure_debut: string;
  heure_fin: string;
  statut: 'en_attente' | 'confirmee' | 'annulee' | 'terminee';
  prix?: number;
  prix_final?: number;
  montant_total?: number;
  devise?: string;
  adresse_rdv?: string;
  notes_client?: string;
}

type ReservationStatusFilter = 'all' | 'en_attente' | 'confirmee' | 'terminee' | 'annulee';
type ReservationDateFilter = 'all' | 'today' | 'week' | 'upcoming';
type ReservationViewMode = 'cards' | 'table';

export default function ReservationsTab() {
  const { showToast } = useAppStore();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReservationStatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<ReservationDateFilter>('all');
  const [viewMode, setViewMode] = useState<ReservationViewMode>('cards');
  const [actionState, setActionState] = useState<{ id: number | null; type: 'accept' | 'reject' | 'complete' | 'cancel' | null }>({
    id: null,
    type: null
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [signalementTarget, setSignalementTarget] = useState<{ id: number; nom: string } | null>(null);
  const [dragState, setDragState] = useState<{ draggedId: number | null; dragOverId: number | null }>({
    draggedId: null,
    dragOverId: null
  });

  const loadReservations = useCallback(async () => {
    try {
      setError(null);
      const reservationsData = await api.prestataireReservations.list(statusFilter);
      setReservations(reservationsData);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setActionState({ id: null, type: null });
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    setLoading(true);
    loadReservations();
  }, [loadReservations]);

  const handleAccept = async (id: number) => {
    if (!confirm('Confirmer cette réservation ?')) return;
    try {
      setActionState({ id, type: 'accept' });
      await api.prestataireReservations.accept(id);
      await loadReservations();
      showToast('Réservation confirmée', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  const handleReject = async (id: number) => {
    const motif = prompt('Motif du refus (facultatif) :') || undefined;
    try {
      setActionState({ id, type: 'reject' });
      await api.prestataireReservations.reject(id, motif);
      await loadReservations();
      showToast('Réservation refusée', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  const handleComplete = async (id: number) => {
    if (!confirm('Marquer ce service comme terminé ?')) return;
    try {
      setActionState({ id, type: 'complete' });
      await api.prestataireReservations.complete(id);
      await loadReservations();
      showToast('Réservation marquée comme terminée', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    const motif = prompt('Motif de l’annulation :') || undefined;
    if (motif === undefined && !confirm('Annuler sans motif ?')) return;
    try {
      setActionState({ id, type: 'cancel' });
      await api.prestataireReservations.reject(id, motif);
      await loadReservations();
      showToast('Réservation annulée', 'success');
    } catch (e: any) {
      showToast(e.message || 'Erreur', 'error');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReservations();
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return {
          bg: 'from-orange-100 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20',
          text: 'text-orange-800 dark:text-orange-200',
          border: 'border-orange-200 dark:border-orange-800'
        };
      case 'confirmee':
        return {
          bg: 'from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20',
          text: 'text-blue-800 dark:text-blue-200',
          border: 'border-blue-200 dark:border-blue-800'
        };
      case 'terminee':
        return {
          bg: 'from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20',
          text: 'text-green-800 dark:text-green-200',
          border: 'border-green-200 dark:border-green-800'
        };
      case 'annulee':
        return {
          bg: 'from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20',
          text: 'text-red-800 dark:text-red-200',
          border: 'border-red-200 dark:border-red-800'
        };
      default:
        return {
          bg: 'from-gray-100 to-gray-100 dark:from-gray-900/20 dark:to-gray-900/20',
          text: 'text-gray-800 dark:text-gray-200',
          border: 'border-gray-200 dark:border-gray-800'
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return '⏳ En attente';
      case 'confirmee': return '✓ Confirmée';
      case 'terminee': return '✓ Terminée';
      case 'annulee': return '✕ Annulée';
      default: return statut;
    }
  };

  const parseMontant = (value: number | string | undefined) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatMontant = (reservation: Reservation) => {
    const montant =
      parseMontant((reservation as any).montant_total) ??
      parseMontant(reservation.prix_final) ??
      parseMontant(reservation.prix);

    if (montant === null) {
      return 'Montant indisponible';
    }

    const devise = reservation.devise || 'XOF';
    return `${montant.toLocaleString('fr-FR')} ${devise}`;
  };

  const summaryStats = useMemo(() => {
    const now = new Date();
    const todaySignature = now.toDateString();
    const counts: Record<string, number> = {
      en_attente: 0,
      confirmee: 0,
      terminee: 0,
      annulee: 0
    };
    let today = 0;
    let upcoming = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let completedRevenue = 0;

    reservations.forEach((reservation) => {
      counts[reservation.statut] = (counts[reservation.statut] || 0) + 1;
      const date = new Date(reservation.date_reservation);
      if (date.toDateString() === todaySignature) {
        today += 1;
      }
      if (!isNaN(date.getTime()) && date >= now) {
        upcoming += 1;
      }
      const amount =
        parseMontant((reservation as any).montant_total) ??
        parseMontant(reservation.prix_final) ??
        parseMontant(reservation.prix) ??
        0;
      if (reservation.statut === 'terminee' && amount) {
        completedRevenue += amount;
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) {
          weekRevenue += amount;
        }
        if (diffDays <= 30) {
          monthRevenue += amount;
        }
      }
    });

    const total = reservations.length || 0;
    const completionRate = total ? Math.round(((counts.terminee || 0) / total) * 100) : 0;
    const confirmationRate = total ? Math.round((((counts.confirmee || 0) + (counts.terminee || 0)) / total) * 100) : 0;
    const averageTicket = (counts.terminee || 0) ? Math.round(completedRevenue / counts.terminee) : 0;

    return {
      total,
      counts,
      today,
      upcoming,
      weekRevenue,
      monthRevenue,
      completionRate,
      confirmationRate,
      averageTicket
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const now = new Date();

    const matchesDateFilter = (reservation: Reservation) => {
      if (dateFilter === 'all') return true;
      const date = new Date(reservation.date_reservation);
      if (isNaN(date.getTime())) return false;
      if (dateFilter === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (dateFilter === 'week') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() + 7);
        return date >= now && date <= limit;
      }
      if (dateFilter === 'upcoming') {
        return date >= now;
      }
      return true;
    };

    return reservations
      .filter(r => statusFilter === 'all' ? true : r.statut === statusFilter)
      .filter(matchesDateFilter)
      .filter(r =>
        !q ||
        (r.client_nom || '').toLowerCase().includes(q) ||
        (r.client_prenom || '').toLowerCase().includes(q) ||
        (r.service_nom || '').toLowerCase().includes(q) ||
        String(r.id).includes(q)
      );
  }, [reservations, statusFilter, dateFilter, searchTerm]);

  const reorderReservations = useCallback((list: Reservation[], fromId: number, toId: number) => {
    const fromIndex = list.findIndex((res) => res.id === fromId);
    const toIndex = list.findIndex((res) => res.id === toId);
    if (fromIndex === -1 || toIndex === -1) return list;
    const updated = [...list];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    return updated;
  }, []);

  const handleDragStart = (event: DragEvent<HTMLElement>, reservationId: number) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', reservationId.toString());
    setDragState({ draggedId: reservationId, dragOverId: null });
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>, reservationId: number) => {
    if (dragState.draggedId === null || dragState.draggedId === reservationId) return;
    event.preventDefault();
    if (dragState.dragOverId !== reservationId) {
      setDragState((prev) => ({ ...prev, dragOverId: reservationId }));
    }
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, reservationId: number) => {
    if (dragState.draggedId === null || dragState.draggedId === reservationId) return;
    event.preventDefault();
  };

  const handleDragEnd = () => {
    setDragState({ draggedId: null, dragOverId: null });
  };

  const handleDrop = (event: DragEvent<HTMLElement>, reservationId: number) => {
    event.preventDefault();
    if (dragState.draggedId === null || dragState.draggedId === reservationId) {
      handleDragEnd();
      return;
    }

    setReservations((prev) => reorderReservations(prev, dragState.draggedId!, reservationId));
    setDragState({ draggedId: null, dragOverId: null });
    showToast('Priorité des réservations mise à jour', 'success');
  };

  const handleCardClick = (reservation: Reservation) => {
    if (dragState.draggedId) return;
    setSelectedReservation(reservation);
  };

  const statusFilterOptions: { value: ReservationStatusFilter; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'confirmee', label: 'Confirmées' },
    { value: 'terminee', label: 'Terminées' },
    { value: 'annulee', label: 'Annulées' }
  ];

  const dateFilterOptions: { value: ReservationDateFilter; label: string }[] = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: '7 prochains jours' },
    { value: 'upcoming', label: 'À venir' }
  ];

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto pb-20">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Réservations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gardez le contrôle sur vos rendez-vous clients
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-green-500" />
              Taux de confirmation {summaryStats.confirmationRate}%
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition disabled:opacity-50"
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualiser
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Toutes', value: summaryStats.total, color: 'from-slate-600 to-gray-900' },
            { label: 'En attente', value: summaryStats.counts.en_attente || 0, color: 'from-orange-500 to-amber-600' },
            { label: 'Confirmées', value: summaryStats.counts.confirmee || 0, color: 'from-blue-500 to-cyan-500' },
            { label: 'Terminées', value: summaryStats.counts.terminee || 0, color: 'from-emerald-500 to-lime-500' }
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
              <p className={`text-3xl font-semibold mt-2 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs uppercase text-gray-500">Cette semaine</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {summaryStats.weekRevenue > 0 ? `${summaryStats.weekRevenue.toLocaleString('fr-FR')} XOF` : '—'}
            </p>
            <p className="text-sm text-gray-500">Revenus des 7 derniers jours</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs uppercase text-gray-500">30 derniers jours</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {summaryStats.monthRevenue > 0 ? `${summaryStats.monthRevenue.toLocaleString('fr-FR')} XOF` : '—'}
            </p>
            <p className="text-sm text-gray-500">Revenus des 30 derniers jours</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs uppercase text-gray-500">Panier moyen</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {summaryStats.counts.terminee > 0
                ? `${summaryStats.averageTicket.toLocaleString('fr-FR')} XOF`
                : '—'}
            </p>
            <p className="text-sm text-gray-500">
              {summaryStats.counts.terminee > 0
                ? `Basé sur ${summaryStats.counts.terminee} réservation${summaryStats.counts.terminee > 1 ? 's' : ''} terminée${summaryStats.counts.terminee > 1 ? 's' : ''}`
                : 'Aucune réservation terminée'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-4 space-y-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche client, service ou référence..."
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {statusFilterOptions.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    statusFilter === f.value
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              {dateFilterOptions.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setDateFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    dateFilter === f.value
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-gray-50 dark:bg-gray-800 p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  viewMode === 'cards' ? 'bg-white dark:bg-gray-900 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Cartes
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                  viewMode === 'table' ? 'bg-white dark:bg-gray-900 shadow text-blue-600' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                Tableau
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'cards' && (
          <div className="flex items-center space-x-2 text-xs text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2">
            <GripVertical className="w-4 h-4" />
            <span>Glissez l’icône pour réordonner vos priorités de rendez-vous, même après filtrage.</span>
          </div>
        )}
      </div>

      {/* Reservations List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Loader2 className="w-10 h-10 text-gray-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Chargement des réservations...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Aucune réservation
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? 'Aucune réservation ne correspond à votre recherche'
                : statusFilter === 'all' ? 'Aucune réservation pour le moment' : `Aucune réservation ${statusFilter}`}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Client</th>
                    <th className="px-6 py-3 text-left">Service</th>
                    <th className="px-6 py-3 text-left">Date & horaire</th>
                    <th className="px-6 py-3 text-left">Montant</th>
                    <th className="px-6 py-3 text-left">Statut</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {filteredReservations.map((reservation) => {
                    const statusColor = getStatusColor(reservation.statut);
                    return (
                      <tr
                        key={reservation.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer"
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {reservation.client_prenom} {reservation.client_nom}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {reservation.client_email || reservation.client_telephone || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{reservation.service_nom}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <p>{formatDate(reservation.date_reservation)}</p>
                          <p className="text-xs">{reservation.heure_debut} - {reservation.heure_fin}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{formatMontant(reservation)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                            {getStatusLabel(reservation.statut)}
                          </span>
                        </td>
                        <td className="px-6 py-4 space-x-2">
                          {reservation.statut === 'en_attente' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAccept(reservation.id);
                                }}
                                disabled={actionState.id === reservation.id && actionState.type === 'accept'}
                                className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs"
                              >
                                {actionState.id === reservation.id && actionState.type === 'accept' ? 'Validation...' : 'Valider'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(reservation.id);
                                }}
                                disabled={actionState.id === reservation.id && actionState.type === 'reject'}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          {reservation.statut === 'confirmee' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleComplete(reservation.id);
                                }}
                                disabled={actionState.id === reservation.id && actionState.type === 'complete'}
                                className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs"
                              >
                                Terminer
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancel(reservation.id);
                                }}
                                disabled={actionState.id === reservation.id && actionState.type === 'cancel'}
                                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs"
                              >
                                Annuler
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <Info className="w-4 h-4" />
              Cliquez sur une ligne pour ouvrir la fiche détaillée.
            </div>
          </div>
        ) : (
          filteredReservations.map((reservation) => {
            const statusColor = getStatusColor(reservation.statut);
            const isDragging = dragState.draggedId === reservation.id;
            const isDragTarget = dragState.dragOverId === reservation.id && dragState.draggedId !== reservation.id;
            return (
              <div
                key={reservation.id}
                onClick={() => handleCardClick(reservation)}
                onDragEnter={(e) => handleDragEnter(e, reservation.id)}
                onDragOver={(e) => handleDragOver(e, reservation.id)}
                onDrop={(e) => handleDrop(e, reservation.id)}
                className={`bg-white dark:bg-gray-800 rounded-2xl border p-6 transition-all duration-300 cursor-pointer ${
                  isDragTarget
                    ? 'border-blue-400 ring-2 ring-blue-300 dark:ring-blue-700 shadow-xl'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-xl'
                } ${isDragging ? 'opacity-80' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {reservation.client_prenom[0]}{reservation.client_nom[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          {reservation.client_prenom} {reservation.client_nom}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {reservation.service_nom}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                      {getStatusLabel(reservation.statut)}
                    </span>
                    <button
                      className={`p-2 rounded-full border text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ${
                        isDragging ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, reservation.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                      title="Maintenir pour réordonner"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDate(reservation.date_reservation)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-sm">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Horaire</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {reservation.heure_debut} - {reservation.heure_fin}
                      </p>
                    </div>
                  </div>

                  {reservation.client_telephone && (
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                        <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Téléphone</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {reservation.client_telephone}
                        </p>
                      </div>
                    </div>
                  )}

                  {reservation.client_email && (
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                        <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-medium text-gray-900 dark:text-white text-xs">
                          {reservation.client_email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatMontant(reservation)}
                  </div>

                  {reservation.statut === 'en_attente' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(reservation.id);
                        }}
                        disabled={actionState.id === reservation.id && actionState.type === 'reject'}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium transition-colors disabled:opacity-60"
                      >
                        {actionState.id === reservation.id && actionState.type === 'reject' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Refus...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Refuser</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(reservation.id);
                        }}
                        disabled={actionState.id === reservation.id && actionState.type === 'accept'}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60"
                      >
                        {actionState.id === reservation.id && actionState.type === 'accept' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Confirmation...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Accepter</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {reservation.statut === 'confirmee' && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancel(reservation.id);
                        }}
                        disabled={actionState.id === reservation.id && actionState.type === 'cancel'}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium transition-colors disabled:opacity-60"
                      >
                        {actionState.id === reservation.id && actionState.type === 'cancel' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Annulation...</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span>Annuler</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(reservation.id);
                        }}
                        disabled={actionState.id === reservation.id && actionState.type === 'complete'}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60"
                      >
                        {actionState.id === reservation.id && actionState.type === 'complete' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Finalisation...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Marquer terminé</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-gray-400">Réservation #{selectedReservation.id}</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {selectedReservation.client_prenom} {selectedReservation.client_nom}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedReservation.service_nom}</p>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-200">Date</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatDate(selectedReservation.date_reservation)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
                <p className="text-xs text-purple-600 dark:text-purple-300">Horaire</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedReservation.heure_debut} - {selectedReservation.heure_fin}
                </p>
              </div>
              {selectedReservation.adresse_rdv && (
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Adresse RDV</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>{selectedReservation.adresse_rdv}</span>
                  </p>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <p className="text-xs text-gray-500">Montant</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatMontant(selectedReservation)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedReservation.client_id && (
                <button
                  onClick={() => {
                    setSelectedReservation(null);
                    setSignalementTarget({
                      id: selectedReservation.client_id!,
                      nom: `${selectedReservation.client_prenom} ${selectedReservation.client_nom}`
                    });
                  }}
                  className="w-full px-4 py-2 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Signaler ce client
                </button>
              )}
              {selectedReservation.client_telephone && (
                <button
                  onClick={() => window.open(`tel:${selectedReservation.client_telephone}`, '_self')}
                  className="flex-1 min-w-[45%] px-4 py-2 rounded-2xl bg-blue-600 text-white font-semibold flex items-center justify-center space-x-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Appeler</span>
                </button>
              )}
              {selectedReservation.client_email && (
                <button
                  onClick={() => window.open(`mailto:${selectedReservation.client_email}`)}
                  className="flex-1 min-w-[45%] px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>E-mail</span>
                </button>
              )}
            </div>

            {selectedReservation.notes_client && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4">
                <p className="text-xs text-gray-500 mb-1">Note du client</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReservation.notes_client}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <SignalementModal
        open={!!signalementTarget}
        onClose={() => setSignalementTarget(null)}
        typeCible="utilisateur"
        cibleId={signalementTarget?.id ?? 0}
        cibleNom={signalementTarget?.nom}
      />
    </div>
  );
}

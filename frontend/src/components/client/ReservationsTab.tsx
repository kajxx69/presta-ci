import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Phone, Star, RefreshCw, Info, CheckCircle2, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import RatingModal from './RatingModal';
import SupportTicketModal from '../common/SupportTicketModal';
import { SearchInput } from '../ui/SearchInput';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { StaggerContainer, StaggerItem } from '../ui/PageTransition';

const filters = [
  { key: 'all', label: 'Toutes' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'completed', label: 'Terminées' },
  { key: 'cancelled', label: 'Annulées' },
] as const;

function ReservationsSkeleton() {
  return (
    <div className="p-4 space-y-4 max-w-lg lg:max-w-5xl mx-auto">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-12 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

export default function ReservationsTab() {
  const { showToast } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-lg lg:max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vos réservations</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs">
            Connectez-vous pour voir et gérer vos réservations de services.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg"
            >
              Se connecter
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold"
            >
              S'inscrire
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean; reservation: any }>({ isOpen: false, reservation: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null);
  const [ticketModal, setTicketModal] = useState<{ open: boolean; reservationId: number | null; reservationNom: string | null }>({ open: false, reservationId: null, reservationNom: null });

  const loadReservations = useCallback(async () => {
    try {
      setError(null);
      const rows = await api.reservations.list(selectedFilter === 'all' ? undefined : selectedFilter);
      setReservations(rows);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setActionLoading(null);
    }
  }, [selectedFilter]);

  useEffect(() => {
    setLoading(true);
    loadReservations();
  }, [loadReservations]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Confirmer l'annulation de cette réservation ?")) return;
    try {
      setActionLoading(id);
      await api.reservations.cancel(id);
      await loadReservations();
      showToast('Réservation annulée', 'success');
    } catch {
      showToast("Erreur lors de l'annulation", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleContact = (reservation: any) => {
    if (reservation.prestataire_telephone) {
      window.open(`tel:${reservation.prestataire_telephone}`, '_self');
    } else {
      showToast('Numéro de téléphone non disponible', 'error');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadReservations();
  };

  const handleConfirmCompletion = async (id: number) => {
    if (!confirm('Confirmez-vous que la prestation a bien été effectuée ?')) return;
    try {
      setActionLoading(id);
      await api.reservations.confirmCompletion(id);
      await loadReservations();
      showToast('Prestation confirmée ! Vous pouvez maintenant laisser un avis.', 'success');
    } catch {
      showToast('Erreur lors de la confirmation', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const statusMeta = useMemo(() => (reservation: any) => ({
    canCancel: reservation.can_cancel ?? ['en_attente', 'confirmee'].includes(reservation.statut_nom),
    canRate: reservation.statut_nom === 'terminee' && !reservation.a_laisse_avis,
    canConfirmEnd: reservation.peut_confirmer_fin === true,
  }), []);

  const summary = useMemo(() => ({
    total: reservations.length,
    upcoming: reservations.filter(r => ['en_attente', 'confirmee'].includes(r.statut_nom)).length,
    completed: reservations.filter(r => r.statut_nom === 'terminee').length,
    cancelled: reservations.filter(r => ['annulee', 'refusee'].includes(r.statut_nom)).length,
  }), [reservations]);

  const filteredReservations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reservations;
    return reservations.filter(r =>
      (r.service_nom || '').toLowerCase().includes(q) ||
      (r.prestataire_nom || '').toLowerCase().includes(q) ||
      String(r.reference || r.id).includes(q),
    );
  }, [reservations, searchTerm]);

  if (loading) return <ReservationsSkeleton />;

  return (
    <div className="p-4 space-y-5 max-w-lg lg:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes réservations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {summary.total} réservation{summary.total > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          loading={isRefreshing}
          icon={RefreshCw}
        >
          Actualiser
        </Button>
      </div>

      {/* Search */}
      <SearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Rechercher par service, prestataire..."
        debounceMs={300}
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'À venir', value: summary.upcoming, variant: 'info' as const },
          { label: 'Terminées', value: summary.completed, variant: 'success' as const },
          { label: 'Annulées', value: summary.cancelled, variant: 'error' as const },
          { label: 'Total', value: summary.total, variant: 'default' as const },
        ].map(stat => (
          <div
            key={stat.label}
            className={clsx(
              'rounded-xl px-3 py-2.5 text-center',
              stat.variant === 'info' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
              stat.variant === 'success' && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
              stat.variant === 'error' && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
              stat.variant === 'default' && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
            )}
          >
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filters.map(filter => (
          <motion.button
            key={filter.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedFilter(filter.key)}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
              selectedFilter === filter.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
            )}
          >
            {filter.label}
          </motion.button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <EmptyState
          icon={RefreshCw}
          title="Erreur de chargement"
          description={error}
          action={{ label: 'Réessayer', onClick: handleRefresh }}
        />
      )}

      {/* List */}
      {!error && filteredReservations.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={searchTerm ? 'Aucun résultat' : 'Aucune réservation'}
          description={
            searchTerm
              ? 'Aucune réservation ne correspond à votre recherche.'
              : "Vous n'avez pas encore de réservations."
          }
        />
      ) : (
        <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {filteredReservations.map((reservation: any) => {
            const meta = statusMeta(reservation);
            return (
              <StaggerItem key={reservation.id}>
                <Card
                  hoverable
                  onClick={() => setSelectedReservation(reservation)}
                  padding="md"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {reservation.service_nom}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {reservation.prestataire_nom}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
                        style={{ backgroundColor: reservation.statut_couleur || '#6B7280' }}
                      >
                        {reservation.statut_nom || 'inconnu'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        #{reservation.reference || reservation.id}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>{formatDate(reservation.date_reservation)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{reservation.heure_debut} - {reservation.heure_fin}</span>
                    </div>
                    {reservation.prestataire_adresse && !reservation.a_domicile && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{reservation.prestataire_adresse}</span>
                      </div>
                    )}
                    {reservation.a_domicile && reservation.adresse_rdv && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="truncate">À domicile - {reservation.adresse_rdv}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/60">
                    <span className="text-lg font-bold text-gradient">
                      {reservation.prix_final?.toLocaleString()} {reservation.devise}
                    </span>
                    <div className="flex gap-1.5">
                      {meta.canConfirmEnd && (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={actionLoading === reservation.id}
                          onClick={(e) => { e.stopPropagation(); handleConfirmCompletion(reservation.id); }}
                          icon={CheckCircle2}
                        >
                          Confirmer
                        </Button>
                      )}
                      {meta.canRate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setRatingModal({ isOpen: true, reservation }); }}
                          icon={Star}
                        >
                          Noter
                        </Button>
                      )}
                      {meta.canCancel && (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={actionLoading === reservation.id}
                          onClick={(e) => { e.stopPropagation(); handleCancel(reservation.id); }}
                        >
                          Annuler
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleContact(reservation); }}
                        icon={Phone}
                      />
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Detail modal */}
      <Modal
        open={!!selectedReservation}
        onClose={() => setSelectedReservation(null)}
        title="Détails de la réservation"
        size="md"
      >
        {selectedReservation && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedReservation.service_nom}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedReservation.prestataire_nom}
              </p>
            </div>

            <div className="space-y-2.5 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span>{formatDate(selectedReservation.date_reservation)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>{selectedReservation.heure_debut} - {selectedReservation.heure_fin}</span>
              </div>
              {(selectedReservation.prestataire_adresse || selectedReservation.adresse_rdv) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>{selectedReservation.adresse_rdv || selectedReservation.prestataire_adresse}</span>
                </div>
              )}
              {selectedReservation.notes_client && (
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  <span>{selectedReservation.notes_client}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-gray-500 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedReservation.prix_final?.toLocaleString()} {selectedReservation.devise}
                </p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: selectedReservation.statut_couleur || '#6B7280' }}
              >
                {selectedReservation.statut_nom}
              </span>
            </div>

            {/* Confirmation de fin */}
            {selectedReservation.peut_confirmer_fin && (
              <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4">
                <p className="text-sm text-purple-700 dark:text-purple-300 font-medium mb-2">
                  Le prestataire a marqué la prestation comme terminée.
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                  Confirmez si la prestation a bien été réalisée pour valider le service.
                </p>
                <Button
                  fullWidth
                  loading={actionLoading === selectedReservation.id}
                  onClick={() => {
                    setSelectedReservation(null);
                    handleConfirmCompletion(selectedReservation.id);
                  }}
                  icon={CheckCircle2}
                >
                  Confirmer la fin de prestation
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              {selectedReservation.prestataire_telephone && (
                <Button
                  fullWidth
                  onClick={() => handleContact(selectedReservation)}
                  icon={Phone}
                >
                  Appeler
                </Button>
              )}
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  if (selectedReservation.prestataire_adresse) {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReservation.prestataire_adresse)}`);
                  } else {
                    showToast('Adresse non disponible', 'error');
                  }
                }}
                icon={MapPin}
              >
                Itinéraire
              </Button>
            </div>

            {/* Ouvrir un ticket support */}
            <button
              onClick={() => {
                setSelectedReservation(null);
                setTicketModal({ open: true, reservationId: selectedReservation.id, reservationNom: selectedReservation.service_nom });
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Headphones className="w-4 h-4" />
              Signaler un problème avec cette réservation
            </button>
          </div>
        )}
      </Modal>

      {/* Support ticket modal */}
      {ticketModal.open && (
        <SupportTicketModal
          open={ticketModal.open}
          onClose={() => setTicketModal({ open: false, reservationId: null, reservationNom: null })}
          reservationId={ticketModal.reservationId}
          reservationNom={ticketModal.reservationNom}
          onSuccess={() => showToast('Votre ticket a été créé. Notre équipe vous répondra rapidement.', 'success')}
        />
      )}

      {/* Rating modal */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        reservation={ratingModal.reservation}
        onClose={() => setRatingModal({ isOpen: false, reservation: null })}
        onSuccess={loadReservations}
      />
    </div>
  );
}

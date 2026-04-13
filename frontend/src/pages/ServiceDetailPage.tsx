import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Layout from '../components/Layout';
import ReservationModal from '../components/client/ReservationModal';
import {
  Star,
  Clock,
  MapPin,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  Home,
  RefreshCw,
  Shield,
  Info
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => (
  <div className="flex items-center space-x-1 text-sm">
    {[...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < Math.round(rating) ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm' : 'text-gray-300 dark:text-gray-600'}`}
      />
    ))}
    {reviewCount > 0 && (
      <span className="text-xs text-gray-500 dark:text-gray-400">({reviewCount} avis)</span>
    )}
  </div>
);

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const redirectToLogin = () => {
    showToast('Connectez-vous pour réserver ce service', 'info');
    navigate('/login');
  };

  const [service, setService] = useState<any>(null);
  const [prestataire, setPrestataire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const serviceId = Number(id);

  const loadServiceDetails = async (withRefresh = false) => {
    if (!serviceId) return;
    try {
      if (withRefresh) setRefreshing(true);
      setLoading(true);
      const serviceData = await api.services.getById(serviceId);
      setService(serviceData);
      if (serviceData.prestataire_id) {
        const prestataireData = await api.prestataires.getById(serviceData.prestataire_id);
        setPrestataire(prestataireData);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReviews = async () => {
    if (!serviceId) return;
    try {
      setLoadingReviews(true);
      const list = await api.reviews.forService(serviceId);
      setReviews(list);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void loadServiceDetails();
    void loadReviews();
  }, [id]);

  const photos = useMemo(() => {
    if (!service?.photos) return [] as string[];
    if (Array.isArray(service.photos)) return service.photos;
    try {
      return JSON.parse(service.photos);
    } catch {
      return [] as string[];
    }
  }, [service?.photos]);

  if (loading && !service) {
    return (
      <Layout>
        <div className="max-w-lg lg:max-w-4xl mx-auto">
          <Skeleton className="h-64 w-full" />
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28 rounded-2xl" />
              <Skeleton className="h-10 w-28 rounded-2xl" />
            </div>
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-4 text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => loadServiceDetails()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      </Layout>
    );
  }

  if (!service) {
    return (
      <Layout>
        <div className="p-4 text-center">Service non trouvé.</div>
      </Layout>
    );
  }

  const openReservation = () => {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }
    setShowReservationModal(true);
  };
  const closeReservation = () => setShowReservationModal(false);

  return (
    <Layout showBottomNav={false}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        <div className="relative h-64">
          {photos.length > 0 ? (
            <>
              <img src={photos[0]} alt={service.nom} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <ImageIcon className="w-10 h-10 mb-2" />
              <span>Pas de photo</span>
            </div>
          )}

          <div className="absolute top-4 left-4 flex space-x-2">
            <button
              onClick={() => navigate(-1)}
              className="bg-white/90 dark:bg-gray-900/70 p-2 rounded-full text-gray-800 dark:text-white shadow"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => loadServiceDetails(true)}
              disabled={refreshing}
              className="bg-white/90 dark:bg-gray-900/70 p-2 rounded-full text-gray-800 dark:text-white shadow disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="px-4 -mt-10 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-gray-400">Service</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.nom}</h1>
              </div>
              {service.is_domicile ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <Home className="w-3 h-3 mr-1" /> À domicile
                </span>
              ) : null}
            </div>

            <StarRating rating={service.note_moyenne || 0} reviewCount={service.nombre_avis || 0} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col p-4 rounded-2xl bg-gray-100 dark:bg-gray-700">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-500 dark:text-gray-300 mt-1">Durée</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {service.duree_minutes} min
                </span>
              </div>
              <div className="flex flex-col p-4 rounded-2xl bg-gray-100 dark:bg-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-300">Prix</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                  {service.prix?.toLocaleString()} {service.devise || 'XOF'}
                </span>
              </div>
            </div>

            {service.description && (
              <div className="bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-700">
                {service.description}
              </div>
            )}

            {prestataire && (
              <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-gray-400">Prestataire</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {prestataire.nom_commercial}
                    </h3>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span>{prestataire.ville || 'Localisation non fournie'}</span>
                    </div>
                  </div>
                  {prestataire.is_verified && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      <Shield className="w-3 h-3 mr-1" /> Vérifié
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => navigate(`/prestataires/${prestataire.id}`)}
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Voir le profil
                  </button>
                  {prestataire.telephone_pro && (
                    <button
                      onClick={() => window.open(`tel:${prestataire.telephone_pro}`, '_self')}
                      className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                    >
                      Appeler
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={openReservation}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow hover:shadow-lg transition"
            >
              Réserver ce service
            </button>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="px-4 mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Galerie</h2>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {photos.slice(1).map((url, index) => (
                <img key={index} src={url} alt={`${service.nom} ${index + 2}`} className="w-36 h-24 rounded-2xl object-cover shadow-sm" />
              ))}
            </div>
          </div>
        )}

        <div className="px-4 mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avis</h2>
            <button
              onClick={loadReviews}
              disabled={loadingReviews}
              className="text-sm text-blue-600 dark:text-blue-400 flex items-center space-x-1 disabled:opacity-50"
            >
              {loadingReviews ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Actualiser</span>
                </>
              )}
            </button>
          </div>
          {reviews.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center border border-dashed rounded-2xl p-4">
              Aucun avis pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map(review => (
                <div key={review.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">
                        {review.prenom} {review.nom}
                      </p>
                      <p className="text-xs text-gray-500">{review.date_avis}</p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-semibold text-yellow-500">{review.note}/5</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{review.commentaire}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showReservationModal && (
        <ReservationModal
          service={service}
          prestataire={prestataire}
          onClose={closeReservation}
          onReservationSuccess={() => showToast('Réservation envoyée au prestataire', 'success')}
        />
      )}
    </Layout>
  );
}

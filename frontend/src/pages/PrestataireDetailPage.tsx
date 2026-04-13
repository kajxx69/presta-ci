import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ApiService } from '../lib/api';
import Layout from '../components/Layout';
import {
  Star,
  MapPin,
  ChevronLeft,
  Phone,
  Clock,
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RefreshCw,
  Shield,
  Compass
} from 'lucide-react';
import ReservationModal from '../components/client/ReservationModal';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => (
  <div className="flex items-center space-x-1">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.round(rating)
            ? 'text-yellow-400 fill-yellow-400 drop-shadow-sm'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))}
    {reviewCount > 0 && (
      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({reviewCount} avis)</span>
    )}
  </div>
);

const InfoBadge = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center space-x-2 px-3 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
    <Icon className="w-4 h-4 text-blue-500" />
    <div>
      <p className="text-[11px] uppercase text-gray-400">{label}</p>
      <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export default function PrestataireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  const [prestataire, setPrestataire] = useState<any>(null);
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ApiService | null>(null);
  const [favoriteProviders, setFavoriteProviders] = useState<number[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const prestataireId = Number(id);

  const loadDetails = async (withRefresh = false) => {
    if (!prestataireId) return;
    try {
      if (withRefresh) setRefreshing(true);
      setLoading(true);
      const favoritesPromise = isAuthenticated
        ? api.favorites.listProviders().catch(() => [])
        : Promise.resolve([]);

      const [prestataireData, servicesData, favProviders] = await Promise.all([
        api.prestataires.getById(prestataireId),
        api.getServices({ prestataire_id: prestataireId }),
        favoritesPromise
      ]);
      setPrestataire(prestataireData);
      setServices(servicesData);
      setFavoriteProviders(favProviders.map((fav: any) => fav.prestataire_id));
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadReviews = async () => {
    if (!prestataireId) return;
    try {
      setLoadingReviews(true);
      const items = await api.reviews.forPrestataire(prestataireId);
      setReviews(items);
    } catch {
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    void loadDetails();
    void loadReviews();
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!prestataire) return;
    try {
      const isFavorite = favoriteProviders.includes(prestataire.id);
      if (isFavorite) {
        await api.favorites.removeProvider(prestataire.id);
        setFavoriteProviders(prev => prev.filter(pid => pid !== prestataire.id));
        showToast('Prestataire retiré des favoris', 'info');
      } else {
        await api.favorites.addProvider(prestataire.id);
        setFavoriteProviders(prev => [...prev, prestataire.id]);
        showToast('Prestataire ajouté aux favoris', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Impossible de mettre à jour vos favoris', 'error');
    }
  };

  const redirectToLogin = () => {
    showToast('Connectez-vous pour réserver ce service', 'info');
    navigate('/login');
  };

  const openReservation = (service: ApiService) => {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }
    setSelectedService(service);
    setShowReservationModal(true);
  };

  const closeReservation = () => {
    setSelectedService(null);
    setShowReservationModal(false);
  };

  const gallery = useMemo(() => {
    if (!prestataire?.photos_etablissement) return [] as string[];
    return Array.isArray(prestataire.photos_etablissement)
      ? prestataire.photos_etablissement
      : [];
  }, [prestataire?.photos_etablissement]);

  if (loading && !prestataire) {
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
              <Skeleton className="h-10 w-28 rounded-2xl" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
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
            onClick={() => loadDetails()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            Réessayer
          </button>
        </div>
      </Layout>
    );
  }

  if (!prestataire) {
    return (
      <Layout>
        <div className="p-4 text-center">Prestataire non trouvé.</div>
      </Layout>
    );
  }

  const isFavorite = favoriteProviders.includes(prestataire.id);
  const topServices = services.slice(0, 4);

  return (
    <Layout showBottomNav={false}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-16">
        <div className="relative h-56">
          {gallery.length > 0 ? (
            <div className="h-full">
              <img
                src={gallery[0]}
                alt={prestataire.nom_commercial}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <ImageIcon className="w-8 h-8 mb-2" />
              <span>Pas d'image disponible</span>
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
              onClick={() => loadDetails(true)}
              disabled={refreshing}
              className="bg-white/90 dark:bg-gray-900/70 p-2 rounded-full text-gray-800 dark:text-white shadow disabled:opacity-50"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>

          {isAuthenticated && (
            <button
              onClick={toggleFavorite}
              className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/70 p-2 rounded-full text-gray-800 dark:text-white shadow"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} />
            </button>
          )}
        </div>

        <div className="-mt-16 px-4 relative z-10">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase text-gray-400">Prestataire</p>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {prestataire.nom_commercial}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{prestataire.ville || 'Ville non spécifiée'}</span>
                </div>
              </div>
              {prestataire.is_verified && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <Shield className="w-3 h-3 mr-1" /> Vérifié
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 inline-flex items-center space-x-2">
                <StarRating rating={prestataire.note_moyenne || 0} reviewCount={prestataire.nombre_avis || 0} />
              </div>
              {prestataire.telephone_pro && (
                <div className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 inline-flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{prestataire.telephone_pro}</span>
                </div>
              )}
            </div>

            {prestataire.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {prestataire.bio}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <InfoBadge icon={Compass} label="Adresse" value={prestataire.adresse || 'Non renseignée'} />
              <InfoBadge icon={MapPin} label="Localisation" value={prestataire.ville || 'Côte d\'Ivoire'} />
            </div>
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="px-4 mt-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Galerie photos</h2>
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {gallery.slice(1).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${prestataire.nom_commercial} photo ${index + 2}`}
                  className="w-36 h-24 rounded-2xl object-cover shadow-sm"
                />
              ))}
            </div>
          </div>
        )}

        <div className="px-4 mt-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Services proposés</h2>
              {services.length > 4 && (
                <button
                  onClick={() => navigate(`/prestataires/${prestataire.id}?view=services`)}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  Voir tout
                </button>
              )}
            </div>
            <div className="space-y-4">
              {services.length > 0 ? (
                topServices.map(service => (
                  <div
                    key={service.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {service.nom}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                          {service.description || 'Description non fournie'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">
                          {service.prix.toLocaleString()} {service.devise || 'XOF'}
                        </span>
                        <button
                          onClick={() => openReservation(service)}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Réserver
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-3">
                      <Clock className="w-4 h-4" />
                      <span>{service.duree_minutes} min</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 border border-dashed rounded-2xl p-4 text-center">
                  Aucun service disponible pour le moment.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avis récents</h2>
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
                Aucun avis pour l'instant.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 3).map(review => (
                  <div
                    key={review.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {review.prenom} {review.nom}
                        </p>
                        <p className="text-xs text-gray-500">{review.date_avis}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-semibold text-yellow-500">
                          {review.note}/5
                        </span>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{review.commentaire}</p>
                    {review.service_nom && (
                      <div className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 inline-flex items-center px-3 py-1 rounded-full">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {review.service_nom}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReservationModal && selectedService && (
        <ReservationModal
          service={selectedService}
          prestataire={prestataire}
          onClose={closeReservation}
          onReservationSuccess={() => showToast('Réservation envoyée au prestataire', 'success')}
        />
      )}
    </Layout>
  );
}

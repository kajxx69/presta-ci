import { useEffect, useMemo, useState } from 'react';
import {
  Heart,
  Star,
  MapPin,
  Clock,
  Trash2,
  ChevronLeft,
  Image as ImageIcon,
  Play,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ReservationModal from './ReservationModal';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import AuthPromptModal from '../common/AuthPromptModal';
import { SearchInput } from '../ui/SearchInput';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { StaggerContainer, StaggerItem } from '../ui/PageTransition';

type TabKey = 'providers' | 'services' | 'publications';

const tabs = [
  { key: 'providers' as const, label: 'Prestataires', icon: Heart },
  { key: 'services' as const, label: 'Services', icon: Star },
  { key: 'publications' as const, label: 'Publications', icon: ImageIcon },
];

function FavoritesSkeleton() {
  return (
    <div className="p-4 space-y-4 max-w-lg lg:max-w-5xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-10 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-2xl" />
      ))}
    </div>
  );
}

export default function FavoritesTab() {
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('providers');
  const [favoriteProvidersData, setFavoriteProvidersData] = useState<any[]>([]);
  const [favoriteServicesData, setFavoriteServicesData] = useState<any[]>([]);
  const [favoritePublicationsData, setFavoritePublicationsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedServiceForReservation, setSelectedServiceForReservation] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadFavorites = async () => {
    try {
      setError(null);
      setLoading(true);
      const [providers, services, publications] = await Promise.all([
        api.favorites.listProviders(),
        api.favorites.listServices(),
        api.favorites.listPublications(),
      ]);
      setFavoriteProvidersData(providers);
      setFavoriteServicesData(services);
      setFavoritePublicationsData(publications);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void loadFavorites();
  }, [isAuthenticated]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadFavorites();
  };

  const removeWithConfirm = async (action: () => Promise<void>, message: string) => {
    if (!confirm('Retirer cet élément de vos favoris ?')) return;
    await action();
    showToast(message, 'success');
  };

  const removeFavoriteProvider = (providerId: number) => removeWithConfirm(
    async () => {
      await api.favorites.removeProvider(providerId);
      setFavoriteProvidersData(prev => prev.filter(p => p.id !== providerId));
    },
    'Prestataire retiré des favoris',
  );

  const removeFavoriteService = (serviceId: number) => removeWithConfirm(
    async () => {
      await api.favorites.removeService(serviceId);
      setFavoriteServicesData(prev => prev.filter(s => s.id !== serviceId));
    },
    'Service retiré des favoris',
  );

  const removeFavoritePublication = (publicationId: number) => removeWithConfirm(
    async () => {
      await Promise.all([
        api.favorites.removePublication(publicationId),
        api.publications.unlike(publicationId).catch(() => {}),
      ]);
      setFavoritePublicationsData(prev => prev.filter(p => p.id !== publicationId));
    },
    'Publication retirée des favoris',
  );

  const loadProviderServices = async (providerId: number) => {
    try {
      setLoadingServices(true);
      const services = await api.getServices({ prestataire_id: providerId });
      setProviderServices(services);
    } catch {
      setError('Erreur de chargement des services');
    } finally {
      setLoadingServices(false);
    }
  };

  const handleProviderClick = (provider: any) => {
    setSelectedProvider(provider);
    void loadProviderServices(provider.id);
  };

  const counts = useMemo(() => ({
    providers: favoriteProvidersData.length,
    services: favoriteServicesData.length,
    publications: favoritePublicationsData.length,
    total: favoriteProvidersData.length + favoriteServicesData.length + favoritePublicationsData.length,
  }), [favoriteProvidersData, favoriteServicesData, favoritePublicationsData]);

  const filteredProviders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (activeTab !== 'providers' || !q) return favoriteProvidersData;
    return favoriteProvidersData.filter(p =>
      (p.nom_commercial || '').toLowerCase().includes(q) || (p.ville || '').toLowerCase().includes(q),
    );
  }, [favoriteProvidersData, searchTerm, activeTab]);

  const filteredServices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (activeTab !== 'services' || !q) return favoriteServicesData;
    return favoriteServicesData.filter(s =>
      (s.nom || '').toLowerCase().includes(q) || (s.prestataire_nom || '').toLowerCase().includes(q),
    );
  }, [favoriteServicesData, searchTerm, activeTab]);

  const filteredPublications = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (activeTab !== 'publications' || !q) return favoritePublicationsData;
    return favoritePublicationsData.filter(p =>
      (p.description || '').toLowerCase().includes(q) || (p.client_nom || '').toLowerCase().includes(q),
    );
  }, [favoritePublicationsData, searchTerm, activeTab]);

  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-lg lg:max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Heart className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vos favoris</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs">
            Connectez-vous pour sauvegarder vos prestataires et services préférés.
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

  // Provider detail view
  if (selectedProvider) {
    return (
      <>
        {isReservationModalOpen && selectedServiceForReservation && (
          <ReservationModal
            service={selectedServiceForReservation}
            onClose={() => setIsReservationModalOpen(false)}
            onReservationSuccess={() => showToast('Réservation en attente de confirmation', 'success')}
          />
        )}
        <div className="p-4 space-y-5 max-w-lg lg:max-w-5xl mx-auto">
          <button
            onClick={() => { setSelectedProvider(null); setProviderServices([]); }}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour aux favoris
          </button>

          <Card padding="none" className="overflow-hidden">
            {Array.isArray(selectedProvider.photos_etablissement) && selectedProvider.photos_etablissement[0] && (
              <img
                src={selectedProvider.photos_etablissement[0]}
                alt={selectedProvider.nom_commercial}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedProvider.nom_commercial}
                  </h2>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedProvider.ville}</span>
                  </div>
                </div>
                {selectedProvider.is_verified && <Badge variant="info">Vérifié</Badge>}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedProvider.bio || 'Aucune description disponible.'}
              </p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">
                  {parseFloat(selectedProvider.note_moyenne ?? 0).toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">({selectedProvider.nombre_avis ?? 0} avis)</span>
              </div>
            </div>
          </Card>

          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Services proposés</h3>

          {loadingServices ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : providerServices.length === 0 ? (
            <EmptyState icon={Star} title="Aucun service" description="Aucun service disponible pour l'instant." />
          ) : (
            <div className="space-y-3">
              {providerServices.map(service => (
                <Card key={service.id} padding="md">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{service.nom}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {service.description || 'Description indisponible.'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-lg font-bold text-gradient">
                        {(service.prix ?? 0).toLocaleString()} {service.devise || 'FCFA'}
                      </span>
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{service.duree_minutes}min</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedServiceForReservation(service);
                        setIsReservationModalOpen(true);
                      }}
                    >
                      Réserver
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  if (loading) return <FavoritesSkeleton />;

  const currentData = activeTab === 'providers' ? filteredProviders : activeTab === 'services' ? filteredServices : filteredPublications;

  return (
    <>
      {isReservationModalOpen && selectedServiceForReservation && (
        <ReservationModal
          service={selectedServiceForReservation}
          onClose={() => setIsReservationModalOpen(false)}
          onReservationSuccess={() => showToast('Réservation en attente de confirmation', 'success')}
        />
      )}
      <div className="p-4 pb-24 space-y-5 max-w-lg lg:max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes favoris</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {counts.total} élément{counts.total > 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
            icon={RefreshCw}
          >
            Actualiser
          </Button>
        </div>

        {/* Search */}
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Rechercher dans vos favoris..."
          debounceMs={300}
        />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {tabs.map(tab => {
            const count = tab.key === 'providers' ? counts.providers : tab.key === 'services' ? counts.services : counts.publications;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex-1 min-w-0 py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center gap-0.5',
                  activeTab === tab.key
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400',
                )}
              >
                <div className="flex items-center gap-1">
                  <tab.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </div>
                <span className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <EmptyState
            icon={RefreshCw}
            title="Erreur"
            description={error}
            action={{ label: 'Réessayer', onClick: handleRefresh }}
          />
        )}

        {/* Content */}
        {!error && currentData.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aucun favori"
            description={searchTerm ? 'Aucun résultat pour votre recherche.' : 'Ajoutez des éléments à vos favoris pour les retrouver ici.'}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                {/* Providers */}
                {activeTab === 'providers' && filteredProviders.map(p => (
                  <StaggerItem key={p.id}>
                    <Card padding="none" hoverable className="overflow-hidden" onClick={() => handleProviderClick(p)}>
                      {Array.isArray(p.photos_etablissement) && p.photos_etablissement[0] && (
                        <div className="relative">
                          <img src={p.photos_etablissement[0]} alt={p.nom_commercial} className="w-full h-36 object-cover" />
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={(e) => { e.stopPropagation(); removeFavoriteProvider(p.id); }}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </motion.button>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{p.nom_commercial}</h3>
                          {p.is_verified && <Badge variant="info" size="sm">Vérifié</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{p.ville}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{parseFloat(p.note_moyenne ?? 0).toFixed(1)}</span>
                            <span className="text-xs text-gray-400">({p.nombre_avis ?? 0})</span>
                          </div>
                          <Button variant="secondary" size="sm">Voir services</Button>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}

                {/* Services */}
                {activeTab === 'services' && filteredServices.map(s => (
                  <StaggerItem key={s.id}>
                    <Card padding="none" className="overflow-hidden">
                      {Array.isArray(s.photos) && s.photos[0] && (
                        <div className="relative">
                          <img src={s.photos[0]} alt={s.nom} className="w-full h-36 object-cover" />
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => removeFavoriteService(s.id)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </motion.button>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{s.nom}</h3>
                        {s.prestataire_nom && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">chez {s.prestataire_nom}</p>
                        )}
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 mb-3">
                          {s.description || 'Description indisponible.'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gradient">
                              {(s.prix ?? 0).toLocaleString()} {s.devise || 'FCFA'}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-400">
                              <Clock className="w-3.5 h-3.5" />
                              {s.duree_minutes}min
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => { setSelectedServiceForReservation(s); setIsReservationModalOpen(true); }}
                          >
                            Réserver
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                ))}

                {/* Publications */}
                {activeTab === 'publications' && filteredPublications.map(pub => (
                  <StaggerItem key={pub.id}>
                    <Card padding="md">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {pub.photo_profil ? (
                            <img src={pub.photo_profil} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                              {pub.client_prenom?.[0]}{pub.client_nom?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {pub.client_prenom} {pub.client_nom}
                          </h3>
                          <p className="text-xs text-gray-400">Ajoutée à vos favoris</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => removeFavoritePublication(pub.id)}
                          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mb-3 leading-relaxed">
                        {pub.description}
                      </p>
                      <MediaGrid publication={pub} />
                    </Card>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
}

function MediaGrid({ publication }: { publication: any }) {
  const photos = publication.photos || [];
  const videos = publication.videos || [];
  const media = [
    ...videos.map((v: string) => ({ type: 'video', src: v })),
    ...photos.map((p: string) => ({ type: 'photo', src: p })),
  ];

  if (media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {item.type === 'photo' ? (
          <img src={item.src} alt="" className="w-full object-cover max-h-72" />
        ) : (
          <video src={item.src} controls className="w-full" />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
      {media.slice(0, 4).map((item: any, index: number) => (
        <div key={index} className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {item.type === 'photo' ? (
            <img src={item.src} alt="" className="w-full h-full object-cover" />
          ) : (
            <video src={item.src} className="w-full h-full object-cover" />
          )}
          {item.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-8 h-8 text-white" />
            </div>
          )}
          {index === 3 && media.length > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-bold">
              +{media.length - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

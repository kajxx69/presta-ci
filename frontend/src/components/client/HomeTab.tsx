import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Heart, Clock, Loader2, ChevronLeft, BadgeCheck, RefreshCw, ChevronDown, ChevronUp, Map as MapIcon, Navigation, Sparkles, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ReservationModal from './ReservationModal';
import MapView from '../map/MapView';
import AuthPromptModal from '../common/AuthPromptModal';
import { api, ApiCategory, ApiSubCategory, ApiPrestataire, ApiService } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { SearchInput } from '../ui/SearchInput';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { StaggerContainer, StaggerItem } from '../ui/PageTransition';

const CATEGORY_ICON_MAP: Record<string, string> = {
  'beauty.svg': '💄',
  'wellness.svg': '🌿',
  'hair.svg': '✂️',
  'nails.svg': '💅',
  'massage.svg': '💆',
  'fitness.svg': '💪',
  'cleaning.svg': '🧹',
  'cooking.svg': '🍽️',
  'plumbing.svg': '🔧',
  'electricity.svg': '⚡',
  'security.svg': '🔒',
  'transport.svg': '🚗',
  'education.svg': '📚',
  'health.svg': '🏥',
  'photography.svg': '🖨️',
  'music.svg': '🎵',
};

function getCategoryEmoji(icone?: string): string {
  if (!icone) return '✨';
  if (CATEGORY_ICON_MAP[icone]) return CATEGORY_ICON_MAP[icone];
  // If it doesn't look like a filename, use as-is (already an emoji or text)
  if (!icone.includes('.')) return icone;
  return '✨';
}

interface HomeTabProps {
  onSelectService: (serviceId: number) => void;
  onSelectProvider: (providerId: number) => void;
}

function HomeSkeleton() {
  return (
    <div className="p-4 space-y-6 max-w-lg lg:max-w-5xl mx-auto">
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <div>
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-48 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl mb-3" />
        ))}
      </div>
    </div>
  );
}

export default function HomeTab({ onSelectService, onSelectProvider }: HomeTabProps) {
  const { showToast } = useAppStore();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const requireAuth = (message: string, callback: () => void) => {
    if (!isAuthenticated) {
      setAuthPromptMessage(message);
      setAuthPromptOpen(true);
      return;
    }
    callback();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ApiCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<ApiSubCategory | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ApiSubCategory[]>([]);
  const [prestataires, setPrestataires] = useState<ApiPrestataire[]>([]);
  const [services, setServices] = useState<ApiService[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [routeMsg, setRouteMsg] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [favoriteProviders, setFavoriteProviders] = useState<number[]>([]);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [selectedServiceForReservation, setSelectedServiceForReservation] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const favoritesPromise = isAuthenticated
        ? api.favorites.listProviders().catch(() => [])
        : Promise.resolve([]);

      const [cats, subs, provs, servs, favProvs] = await Promise.all([
        api.getCategories(),
        api.getSubCategories(),
        api.getPrestataires({ limit: 100 }),
        api.getServices({ limit: 100 }),
        favoritesPromise,
      ]);
      setCategories(cats);
      setSubCategories(subs);
      setPrestataires(provs);
      setServices(servs);
      setFavoriteProviders(favProvs.map((fav: any) => fav.id));
    } catch {
      setDataError("Impossible de charger les données.");
      showToast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [showToast, isAuthenticated]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  // Auto-scroll to results when search query changes
  useEffect(() => {
    if (searchQuery.trim() && resultsRef.current) {
      const timeout = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery]);

  // Recherche serveur (débouncée) : moteur intelligent (fautes de frappe, accents,
  // synonymes, pertinence) — ses résultats priment sur le filtre local
  const [serverResults, setServerResults] = useState<{ services: ApiService[]; prestataires: ApiPrestataire[] } | null>(null);
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setServerResults(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const geo = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : undefined;
        const res = await api.search(q, geo);
        setServerResults(res);
      } catch { /* réseau indisponible : le filtre local prend le relais */ }
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchQuery, userLocation]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }, []);

  // Quartier réel de l'utilisateur (reverse geocoding via le proxy backend)
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!userLocation) return;
    api.geo.reverse(userLocation[0], userLocation[1])
      .then(res => setLocationLabel(res.label_court))
      .catch(() => {});
  }, [userLocation]);

  // Carte repliée par défaut : évite qu'un nouvel utilisateur tombe direct sur une map
  const [showMap, setShowMap] = useState(false);

  // Filtre "Près de moi" : requête $geoNear côté serveur (distances exactes, triées)
  const [nearMe, setNearMe] = useState(false);
  const [nearRadius, setNearRadius] = useState(10);
  const [nearbyPrestataires, setNearbyPrestataires] = useState<ApiPrestataire[] | null>(null);
  useEffect(() => {
    if (!nearMe || !userLocation) {
      setNearbyPrestataires(null);
      return;
    }
    let cancelled = false;
    api.getPrestataires({ lat: userLocation[0], lng: userLocation[1], radius_km: nearRadius, limit: 100 })
      .then(rows => { if (!cancelled) setNearbyPrestataires(rows); })
      .catch(() => { if (!cancelled) setNearbyPrestataires(null); });
    return () => { cancelled = true; };
  }, [nearMe, nearRadius, userLocation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const subs = await api.getSubCategories(selectedCategory?.id);
        if (mounted) setSubCategories(subs);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [selectedCategory?.id]);

  const distanceKm = useCallback((a: [number, number], b: [number, number]) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }, []);

  const formatDistance = useCallback((d: number) => d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`, []);

  const filteredServices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // Résultats du moteur serveur (classés par pertinence) prioritaires
    if (q.length >= 2 && serverResults) {
      return serverResults.services.filter(
        s => !selectedSubCategory || s.sous_categorie_id === selectedSubCategory.id
      );
    }

    return services.filter(s => {
      const prestataire = prestataires.find(p => p.id === s.prestataire_id);
      const subCat = subCategories.find(sc => sc.id === s.sous_categorie_id);
      const matchesQuery = !q ||
        (s.nom || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (prestataire?.nom_commercial || '').toLowerCase().includes(q) ||
        (subCat?.nom || '').toLowerCase().includes(q);
      const matchesSub = !selectedSubCategory || s.sous_categorie_id === selectedSubCategory.id;
      return matchesQuery && matchesSub;
    });
  }, [services, prestataires, subCategories, searchQuery, selectedSubCategory, serverResults]);

  const filteredPrestataires = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return prestataires;

    // Résultats du moteur serveur, complétés par les propriétaires des services trouvés
    if (q.length >= 2 && serverResults) {
      const direct = serverResults.prestataires;
      const directIds = new Set(direct.map(p => p.id));
      const fromServices = new Set(filteredServices.map(s => s.prestataire_id));
      const owners = prestataires.filter(p => fromServices.has(p.id) && !directIds.has(p.id));
      return [...direct, ...owners];
    }

    // Match by name OR by having at least one matching service
    const serviceMatchIds = new Set(filteredServices.map(s => s.prestataire_id));
    return prestataires.filter(p =>
      (p.nom_commercial || '').toLowerCase().includes(q) ||
      serviceMatchIds.has(p.id)
    );
  }, [prestataires, filteredServices, searchQuery, serverResults]);

  const getSubCategoriesByCategory = (categoryId: number) =>
    subCategories.filter(sc => Number(sc.categorie_id) === Number(categoryId));

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
  };

  const defaultCenter: [number, number] = [5.3599517, -3.9810768];

  const markers = useMemo(() => {
    return filteredPrestataires
      .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number')
      .map(p => {
        const pos = [p.latitude as number, p.longitude as number] as [number, number];
        const dist = userLocation ? distanceKm(userLocation, pos) : null;
        const distLabel = dist != null ? ` · ${formatDistance(dist)}` : '';
        return {
          id: p.id,
          position: pos,
          title: p.nom_commercial,
          subtitle: (p.ville || '') + distLabel,
          rating: typeof p.note_moyenne === 'number' ? p.note_moyenne : parseFloat(String(p.note_moyenne || 0)),
          type: 'prestataire' as const,
        };
      });
  }, [filteredPrestataires, userLocation, distanceKm, formatDistance]);

  const handleMarkerClick = async (marker: { id: number; position: [number, number] }) => {
    try {
      setRouteError(null);
      if (!userLocation) {
        setRouteError("Position utilisateur indisponible");
        return;
      }
      setLoadingRoute(true);
      const from = { lat: userLocation[0], lng: userLocation[1] };
      const to = { lat: marker.position[0], lng: marker.position[1] };
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const data = await res.json();
      const coords: [number, number][] = (data?.routes?.[0]?.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]]);
      if (!coords.length) throw new Error('Aucun itinéraire');
      setRoute(coords);
      setRouteMsg('Itinéraire affiché');
      setTimeout(() => setRouteMsg(null), 3000);
    } catch (e: any) {
      setRouteError(e.message || "Erreur de calcul d'itinéraire");
    } finally {
      setLoadingRoute(false);
    }
  };

  const clearRoute = () => {
    setRoute([]);
    setRouteMsg(null);
    setRouteError(null);
  };

  const handleToggleFavorite = async (prestataire_id: number) => {
    if (!isAuthenticated) {
      setAuthPromptMessage('Connectez-vous pour ajouter ce prestataire à vos favoris.');
      setAuthPromptOpen(true);
      return;
    }
    try {
      const isFavorite = favoriteProviders.includes(prestataire_id);
      if (isFavorite) {
        await api.favorites.removeProvider(prestataire_id);
        setFavoriteProviders(prev => prev.filter(id => id !== prestataire_id));
        showToast('Retiré des favoris', 'success');
      } else {
        await api.favorites.addProvider(prestataire_id);
        setFavoriteProviders(prev => [...prev, prestataire_id]);
        showToast('Ajouté aux favoris', 'success');
      }
    } catch {
      showToast('Erreur lors de la mise à jour des favoris', 'error');
    }
  };

  const sortedPrestataires = useMemo(() => {
    // "Près de moi" actif : résultats $geoNear du serveur (déjà triés par distance exacte)
    if (nearMe && nearbyPrestataires) return nearbyPrestataires;
    if (!userLocation) return filteredPrestataires;
    const getDist = (p: ApiPrestataire) =>
      typeof p.latitude === 'number' && typeof p.longitude === 'number'
        ? distanceKm(userLocation, [p.latitude as number, p.longitude as number])
        : Number.POSITIVE_INFINITY;
    return [...filteredPrestataires].sort((a, b) => getDist(a) - getDist(b));
  }, [filteredPrestataires, userLocation, distanceKm, nearMe, nearbyPrestataires]);

  if (loadingData) return <HomeSkeleton />;

  return (
    <>
      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} message={authPromptMessage} />

      {isReservationModalOpen && selectedServiceForReservation && (
        <ReservationModal
          service={selectedServiceForReservation}
          onClose={() => setIsReservationModalOpen(false)}
          onReservationSuccess={() => showToast('Réservation confirmée', 'success')}
        />
      )}

      <div className="p-4 lg:p-6 space-y-5 max-w-lg lg:max-w-5xl mx-auto">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-purple-600 px-5 py-6 lg:px-8 lg:py-8 shadow-brand-lg">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {user?.prenom ? `Bonjour ${user.prenom} 👋` : 'Bienvenue sur PrestaCI 👋'}
            </p>
            <h1 className="mt-2 text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Trouvez le bon prestataire,<br className="lg:hidden" /> près de chez vous.
            </h1>
            <p className="mt-1.5 text-sm text-white/80 max-w-md">
              Coiffure, ménage, beauté, imprimerie… réservez en toute confiance, où que vous soyez en Côte d'Ivoire.
            </p>
            {(categories.length > 0 || prestataires.length > 0) && (
              <div className="mt-4 flex items-center gap-4 text-white/90">
                {prestataires.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1.5 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    {prestataires.length}+ prestataires
                  </div>
                )}
                {categories.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" />
                    {categories.length} catégories
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Coiffure, plomberie, traiteur…"
          debounceMs={300}
          voice
          onFetchSuggestions={async (q) => {
            const geo = userLocation ? { lat: userLocation[0], lng: userLocation[1] } : undefined;
            const res = await api.search(q, geo);
            const dist = (d?: number) => (typeof d === 'number' ? ` · à ${d < 1 ? `${Math.round(d * 1000)} m` : `${d} km`}` : '');
            return [
              ...res.services.slice(0, 4).map(s => ({
                id: `s-${s.id}`,
                label: s.nom,
                sublabel: `${(s.prix || 0).toLocaleString()} ${s.devise || 'FCFA'}${dist((s as any).distance_km)}`,
                emoji: '🛠️',
                onSelect: () => onSelectService(s.id),
              })),
              ...res.prestataires.slice(0, 3).map(p => ({
                id: `p-${p.id}`,
                label: p.nom_commercial,
                sublabel: `${p.ville || ''}${dist((p as any).distance_km)}`.replace(/^ · /, '') || undefined,
                emoji: '🏪',
                onSelect: () => onSelectProvider(p.id),
              })),
            ];
          }}
        />

        {/* Location indicator + filtre Près de moi */}
        <div className="flex items-center gap-2 flex-wrap text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-800/70 backdrop-blur px-3.5 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-soft">
          <span className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-blue-500" />
          </span>
          <span className="text-sm font-medium truncate">
            {locationLabel || "Abidjan, Côte d'Ivoire"}
          </span>
          {userLocation && (
            <Badge variant="success" size="sm">GPS actif</Badge>
          )}

          {userLocation && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setNearMe(v => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  nearMe
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-brand'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                📍 Près de moi
              </button>
              {nearMe && (
                <select
                  value={nearRadius}
                  onChange={e => setNearRadius(Number(e.target.value))}
                  className="px-2 py-1.5 text-xs font-semibold rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-0 focus:outline-none cursor-pointer"
                >
                  {[2, 5, 10, 25, 50].map(km => <option key={km} value={km}>{km} km</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Résumé Près de moi */}
        {nearMe && nearbyPrestataires && (
          <p className="text-xs text-gray-500 dark:text-gray-400 px-1 -mt-2">
            {nearbyPrestataires.length > 0
              ? `${nearbyPrestataires.length} prestataire${nearbyPrestataires.length > 1 ? 's' : ''} dans un rayon de ${nearRadius} km, du plus proche au plus lointain.`
              : `Aucun prestataire dans un rayon de ${nearRadius} km — élargissez le rayon.`}
          </p>
        )}

        {/* Categories — premier contenu de découverte, avant tout le reste */}
        {!searchQuery.trim() && !selectedCategory && !dataError && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Catégories
            </h2>
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
              {categories.map(category => (
                <StaggerItem key={category.id}>
                  <Card
                    hoverable
                    onClick={() => setSelectedCategory(category)}
                    padding="sm"
                    className="text-center"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                      style={{ backgroundColor: (category.couleur || '#3B82F6') + '15' }}
                    >
                      <span className="text-2xl">
                        {getCategoryEmoji(category.icone)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {category.nom}
                    </h3>
                    {category.description && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        )}

        {/* Error state */}
        {dataError && (
          <EmptyState
            icon={RefreshCw}
            title="Erreur de chargement"
            description={dataError}
            action={{ label: 'Réessayer', onClick: loadInitialData }}
          />
        )}

        {/* Search results */}
        {searchQuery.trim() && !dataError && (
          <section ref={resultsRef} className="space-y-4">
            {/* Services results */}
            {filteredServices.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  Services <span className="text-sm font-normal text-gray-400">({filteredServices.length})</span>
                </h2>
                <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                  {filteredServices.map(service => {
                    const prestataire = prestataires.find(p => p.id === service.prestataire_id);
                    return (
                      <StaggerItem key={service.id}>
                        <ServiceCard
                          service={service}
                          prestataire={prestataire}
                          onSelect={() => onSelectService(service.id)}
                          onReserve={() => {
                            requireAuth('Connectez-vous pour réserver ce service.', () => {
                              setSelectedServiceForReservation(service);
                              setIsReservationModalOpen(true);
                            });
                          }}
                        />
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </div>
            )}

            {/* Prestataires results */}
            {filteredPrestataires.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                  Prestataires <span className="text-sm font-normal text-gray-400">({filteredPrestataires.length})</span>
                </h2>
                <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                  {filteredPrestataires.map(prestataire => (
                    <StaggerItem key={prestataire.id}>
                      <ProviderCard
                        prestataire={prestataire}
                        isFavorite={favoriteProviders.includes(prestataire.id)}
                        distance={
                          userLocation && typeof prestataire.latitude === 'number' && typeof prestataire.longitude === 'number'
                            ? formatDistance(distanceKm(userLocation, [prestataire.latitude as number, prestataire.longitude as number]))
                            : null
                        }
                        onSelect={() => onSelectProvider(prestataire.id)}
                        onToggleFavorite={() => handleToggleFavorite(prestataire.id)}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            )}

            {filteredServices.length === 0 && filteredPrestataires.length === 0 && (
              <EmptyState
                icon={RefreshCw}
                title="Aucun résultat"
                description={`Aucun service ou prestataire ne correspond à "${searchQuery}".`}
              />
            )}
          </section>
        )}

        {/* Sub-categories */}
        <AnimatePresence mode="wait">
          {!searchQuery.trim() && selectedCategory && !selectedSubCategory && (
            <motion.section
              key="subcategories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={resetFilters}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedCategory.nom}
                </h2>
              </div>
              <div className="space-y-2">
                {getSubCategoriesByCategory(selectedCategory.id).map(subCategory => (
                  <Card
                    key={subCategory.id}
                    hoverable
                    onClick={() => setSelectedSubCategory(subCategory)}
                    padding="md"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {subCategory.nom}
                    </h3>
                    {subCategory.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {subCategory.description}
                      </p>
                    )}
                  </Card>
                ))}
                {getSubCategoriesByCategory(selectedCategory.id).length === 0 && (
                  <EmptyState
                    icon={MapPin}
                    title="Aucune sous-catégorie"
                    description="Revenez plus tard pour de nouvelles offres."
                  />
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Services list */}
        <AnimatePresence mode="wait">
          {!searchQuery.trim() && selectedSubCategory && (
            <motion.section
              key="services"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setSelectedSubCategory(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSubCategory.nom}
                </h2>
                <Badge variant="info" size="sm">{filteredServices.length}</Badge>
              </div>

              {filteredServices.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="Aucun service trouvé"
                  description="Essayez de modifier votre recherche."
                />
              ) : (
                <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                  {filteredServices.map(service => {
                    const prestataire = prestataires.find(p => p.id === service.prestataire_id);
                    return (
                      <StaggerItem key={service.id}>
                        <ServiceCard
                          service={service}
                          prestataire={prestataire}
                          onSelect={() => onSelectService(service.id)}
                          onReserve={() => {
                            requireAuth('Connectez-vous pour réserver ce service.', () => {
                              setSelectedServiceForReservation(service);
                              setIsReservationModalOpen(true);
                            });
                          }}
                        />
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Popular providers */}
        {!searchQuery.trim() && !selectedCategory && !dataError && (
          <section ref={resultsRef}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
              Prestataires populaires
            </h2>
            {sortedPrestataires.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="Aucun prestataire trouvé"
                description={searchQuery ? 'Essayez une autre recherche.' : 'Revenez bientôt !'}
              />
            ) : (
              <StaggerContainer className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
                {sortedPrestataires.map(prestataire => (
                  <StaggerItem key={prestataire.id}>
                    <ProviderCard
                      prestataire={prestataire}
                      isFavorite={favoriteProviders.includes(prestataire.id)}
                      distance={
                        userLocation && typeof prestataire.latitude === 'number' && typeof prestataire.longitude === 'number'
                          ? formatDistance(distanceKm(userLocation, [prestataire.latitude as number, prestataire.longitude as number]))
                          : null
                      }
                      onSelect={() => onSelectProvider(prestataire.id)}
                      onToggleFavorite={() => handleToggleFavorite(prestataire.id)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </section>
        )}

        {/* Carte — reléguée en fin de page et repliée par défaut : un nouvel
            utilisateur découvre d'abord les catégories/prestataires, la carte
            reste disponible pour qui la cherche plutôt que de s'imposer d'entrée. */}
        {!searchQuery.trim() && !selectedCategory && !dataError && (
          <section className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/60 shadow-soft bg-white dark:bg-gray-800">
            <button
              onClick={() => setShowMap(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/20">
                  <MapIcon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">Voir sur la carte</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-white/90 bg-white/15 px-2 py-0.5 rounded-full">
                  <Navigation className="w-3 h-3" />
                  {markers.length}
                </span>
              </div>
              {showMap ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            <AnimatePresence initial={false}>
              {showMap && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <AnimatePresence>
                    {(routeMsg || loadingRoute) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="m-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2"
                      >
                        {loadingRoute && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{loadingRoute ? "Calcul de l'itinéraire..." : routeMsg}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {routeError && (
                    <div className="m-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm font-medium">
                      {routeError}
                    </div>
                  )}

                  <MapView
                    center={userLocation || defaultCenter}
                    markers={markers}
                    userLocation={userLocation || undefined}
                    onMarkerClick={handleMarkerClick}
                    route={route}
                    className="[&_.leaflet-container]:rounded-none"
                  />

                  {route.length > 0 && (
                    <div className="flex justify-end p-2">
                      <Button variant="ghost" size="sm" onClick={clearRoute}>
                        Effacer l'itinéraire
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>
    </>
  );
}

/* ---------- Service Card ---------- */
function ServiceCard({
  service,
  prestataire,
  onSelect,
  onReserve,
}: {
  service: ApiService;
  prestataire?: ApiPrestataire;
  onSelect: () => void;
  onReserve: () => void;
}) {
  return (
    <Card padding="none" hoverable onClick={onSelect} className="overflow-hidden">
      {Array.isArray(service.photos) && service.photos[0] && (
        <div className="relative overflow-hidden">
          <img
            src={service.photos[0]}
            alt={service.nom}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 right-2">
            <Badge variant="default" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              {service.duree_minutes}min
            </Badge>
          </div>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {service.nom}
        </h3>
        {service.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {service.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gradient">
              {service.prix?.toLocaleString()} {service.devise || 'XOF'}
            </span>
            {(service as any).unite && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                par {(service as any).unite}
              </p>
            )}
          </div>
          {service.note_moyenne != null && (
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{Number(service.note_moyenne).toFixed(1)}</span>
            </div>
          )}
        </div>

        {prestataire && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {prestataire.nom_commercial}
            </p>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onReserve(); }}>
              Réserver
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ---------- Provider Card ---------- */
function ProviderCard({
  prestataire,
  isFavorite,
  distance,
  onSelect,
  onToggleFavorite,
}: {
  prestataire: ApiPrestataire;
  isFavorite: boolean;
  distance: string | null;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <Card padding="none" hoverable onClick={onSelect} className="overflow-hidden">
      {Array.isArray(prestataire.photos_etablissement) && prestataire.photos_etablissement[0] && (
        <div className="relative overflow-hidden">
          <img
            src={prestataire.photos_etablissement[0]}
            alt={prestataire.nom_commercial}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Favorite button */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-md"
          >
            <Heart
              className={clsx(
                'w-4 h-4 transition-colors',
                isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-600 dark:text-gray-300',
              )}
            />
          </motion.button>

          {/* Verified badge */}
          {prestataire.is_verified && (
            <div className="absolute top-3 left-3">
              <Badge variant="info" size="sm">
                <BadgeCheck className="w-3 h-3 mr-1" />
                Vérifié
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {prestataire.nom_commercial}
          </h3>
          {typeof prestataire.note_moyenne === 'number' && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {prestataire.note_moyenne.toFixed(1)}
              </span>
              <span className="text-gray-400 text-xs">
                ({prestataire.nombre_avis || 0})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5" />
          <span>{prestataire.ville}</span>
          {distance && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">{distance}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

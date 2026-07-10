import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Share2,
  Camera,
  Plus,
  MapPin,
  Tag,
  Copy,
  Check,
  Play,
  Loader2,
  Filter,
  Image as ImageIcon,
  Video,
  RefreshCw,
  CalendarPlus
} from 'lucide-react';
import CommentsModal from './CommentsModal';
import AuthPromptModal from '../common/AuthPromptModal';
import ReservationModal from './ReservationModal';
import { LikeButton } from '../ui/LikeButton';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';

interface PublicationInput {
  description: string;
  photos: string[];
  videos: string[];
  prestataire_id: number;
  service_id: number;
}

export default function PublicationsTab() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { addNotification } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPublication, setNewPublication] = useState<PublicationInput>({
    description: '',
    photos: [],
    videos: [],
    prestataire_id: 0,
    service_id: 0
  });

  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prestataires, setPrestataires] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [prestataireInput, setPrestataireInput] = useState('');
  const [showPrestataireDropdown, setShowPrestataireDropdown] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [shareMenuOpen, setShareMenuOpen] = useState<number | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [commentingPublicationId, setCommentingPublicationId] = useState<number | null>(null);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterMedia, setFilterMedia] = useState<'all' | 'photos' | 'videos'>('all');
  const [visibleCount, setVisibleCount] = useState(5);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingPublication, setBookingPublication] = useState<any | null>(null);
  const [bookingService, setBookingService] = useState<any | null>(null);
  const [bookingServiceLoading, setBookingServiceLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [pubs, prestas] = await Promise.all([
          api.publications.list(),
          api.getPrestataires(),
        ]);
        if (!mounted) return;
        setFeed(pubs);
        setPrestataires(prestas);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadServicesForPrestataire = async (prestataireId: number) => {
    try {
      const list = await api.getServices({ prestataire_id: prestataireId });
      setServices(list);
    } catch {
      setServices([]);
    }
  };

  const handleToggleLike = async (publicationId: number, liked: boolean) => {
    if (!isAuthenticated) {
      setAuthPromptMessage('Connectez-vous pour aimer cette publication.');
      setAuthPromptOpen(true);
      return;
    }
    setFeed(currentFeed =>
      currentFeed.map(p =>
        p.id === publicationId
          ? { ...p, liked: !p.liked, nombre_likes: p.liked ? p.nombre_likes - 1 : p.nombre_likes + 1 }
          : p
      )
    );

    try {
      if (liked) {
        await api.publications.unlike(publicationId);
      } else {
        await api.publications.like(publicationId);
      }
    } catch (e: any) {
      setFeed(currentFeed =>
        currentFeed.map(p =>
          p.id === publicationId
            ? { ...p, liked: liked, nombre_likes: liked ? p.nombre_likes + 1 : p.nombre_likes - 1 }
            : p
        )
      );
      addNotification({
        id: Date.now(),
        user_id: user?.id,
        titre: 'Erreur',
        message: 'Impossible de mettre à jour le like.',
        type: 'error',
        is_read: false,
        created_at: new Date().toISOString()
      });
    }
  };

  const handleShare = (publicationId: number, platform: string) => {
    const url = `${window.location.origin}/publication/${publicationId}`;
    const text = 'Découvrez cette publication sur PrestaCI';

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
        break;
    }
    setShareMenuOpen(null);
  };

  const handleBookFromPublication = async (publication: any) => {
    if (!isAuthenticated) {
      setAuthPromptMessage('Connectez-vous pour réserver ce service.');
      setAuthPromptOpen(true);
      return;
    }
    if (!publication.service_id) return;
    setBookingServiceLoading(true);
    setBookingPublication(publication);
    try {
      const service = await api.getServiceById(publication.service_id);
      setBookingService(service);
    } catch {
      addNotification({
        id: Date.now(), user_id: user?.id,
        titre: 'Erreur', message: 'Impossible de charger le service.',
        type: 'error', is_read: false, created_at: new Date().toISOString()
      });
      setBookingPublication(null);
    } finally {
      setBookingServiceLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      const pubs = await api.publications.list();
      setFeed(pubs);
      setVisibleCount(5);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l’actualisation');
    } finally {
      setRefreshing(false);
    }
  };

  const createPublication = async () => {
    if (!newPublication.description || !newPublication.prestataire_id) return;
    try {
      await api.publications.create({
        prestataire_id: newPublication.prestataire_id,
        service_id: newPublication.service_id || undefined,
        description: newPublication.description,
        photos: newPublication.photos,
        videos: newPublication.videos,
      });
      setShowCreateModal(false);
      setNewPublication({ description: '', photos: [], videos: [], prestataire_id: 0, service_id: 0 });
      setPrestataireInput('');
      setSelectedFiles([]);
      const pubs = await api.publications.list();
      setFeed(pubs);
      addNotification({
        id: Date.now(),
        user_id: user?.id,
        titre: 'Publication créée',
        message: 'Votre publication a été partagée avec succès !',
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      });
    } catch (e: any) {
      setError(e.message || 'Erreur de création');
    }
  };

  const handlePrestataireInputChange = (value: string) => {
    setPrestataireInput(value);
    setShowPrestataireDropdown(value.trim().length > 0);
    // Reset selection if user edits after selecting
    if (newPublication.prestataire_id && value !== prestataires.find(p => p.id === newPublication.prestataire_id)?.nom_commercial) {
      setNewPublication(prev => ({ ...prev, prestataire_id: 0, service_id: 0 }));
      setServices([]);
    }
  };

  const selectPrestataire = (prestataire: any) => {
    setPrestataireInput(prestataire.nom_commercial);
    setNewPublication(prev => ({ ...prev, prestataire_id: prestataire.id, service_id: 0 }));
    setShowPrestataireDropdown(false);
    loadServicesForPrestataire(prestataire.id);
  };

  const filteredPrestataires = prestataires.filter(p => {
    if (!prestataireInput.trim()) return false;
    const searchTerm = prestataireInput.trim().toLowerCase();
    return p.nom_commercial.toLowerCase().includes(searchTerm);
  });

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const maxSize = 1200;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressed);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);

      try {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        const videoFiles = files.filter(f => f.type.startsWith('video/'));

        const compressedImages = await Promise.all(imageFiles.map(compressImage));
        const videoBase64s = await Promise.all(videoFiles.map(fileToBase64));

        setNewPublication(prev => ({ ...prev, photos: compressedImages, videos: videoBase64s }));

      } catch (error) {
        console.error('Erreur lors du traitement des fichiers:', error);
        addNotification({
          id: Date.now(),
          user_id: user?.id,
          titre: 'Erreur de fichier',
          message: 'Un problème est survenu lors du traitement de vos fichiers.',
          type: 'error',
          is_read: false,
          created_at: new Date().toISOString()
        });
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  };

  const filteredFeed = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feed.filter(p => {
      const matchSearch = !q || (p.description || '').toLowerCase().includes(q) || (p.prestataire_nom || '').toLowerCase().includes(q);
      const hasPhoto = Array.isArray(p.photos) && p.photos.length > 0;
      const hasVideo = Array.isArray(p.videos) && p.videos.length > 0;
      const matchMedia = filterMedia === 'all' || (filterMedia === 'photos' && hasPhoto) || (filterMedia === 'videos' && hasVideo);
      return matchSearch && matchMedia;
    });
  }, [feed, search, filterMedia]);

  const visibleFeed = filteredFeed.slice(0, visibleCount);

  const renderMediaGrid = (publication: any) => {
    const photos = publication.photos || [];
    const videos = publication.videos || [];
    const media = [...videos.map((v: string) => ({ type: 'video', src: v })), ...photos.map((p: string) => ({ type: 'photo', src: p }))];

    if (media.length === 0) return null;
    if (media.length === 1) {
      const item = media[0];
      return (
        <div className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3">
          {item.type === 'photo' ? (
            <img src={item.src} alt="Publication" className="w-full object-cover max-h-96" />
          ) : (
            <video src={item.src} controls className="w-full" />
          )}
        </div>
      );
    }

    const visibleMedia = media.slice(0, 4);
    return (
      <div className="grid grid-cols-2 gap-1 mb-3 rounded-2xl overflow-hidden">
        {visibleMedia.map((item: any, index: number) => (
          <div key={index} className="relative aspect-square bg-gray-100 dark:bg-gray-800">
            {item.type === 'photo' ? (
              <img src={item.src} alt={`media-${index}`} className="w-full h-full object-cover" />
            ) : (
              <video src={item.src} className="w-full h-full object-cover" />
            )}
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-8 h-8 text-white" />
              </div>
            )}
            {index === 3 && media.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-lg font-semibold">
                +{media.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {showCopiedToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <Check className="w-4 h-4" />
          <span>Lien copié !</span>
        </div>
      )}
      
      <div className="max-w-md lg:max-w-3xl mx-auto" onClick={() => setShareMenuOpen(null)}>
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-400">Inspiration</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Publications</h1>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthPromptMessage('Connectez-vous pour créer une publication.');
                  setAuthPromptOpen(true);
                  return;
                }
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publier</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une publication..."
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-500"
                  onClick={() => setSearch('')}
                >
                  Effacer
                </button>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium flex items-center space-x-1 text-blue-600 dark:text-blue-400 disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Actualiser</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'Toutes', icon: Filter },
              { key: 'photos', label: 'Photos', icon: ImageIcon },
              { key: 'videos', label: 'Vidéos', icon: Video }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setFilterMedia(filter.key as 'all' | 'photos' | 'videos')}
                className={`px-3 py-1.5 rounded-2xl text-xs font-semibold inline-flex items-center space-x-1 transition ${
                  filterMedia === filter.key
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                <filter.icon className="w-4 h-4" />
                <span>{filter.label}</span>
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredFeed.length} publication{filteredFeed.length > 1 ? 's' : ''} affichée{filteredFeed.length > 1 ? 's' : ''}
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 p-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 animate-pulse space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                  <div className="h-36 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-red-500 text-center">{error}</div>
          ) : visibleFeed.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Aucune publication ne correspond à vos filtres.
            </div>
          ) : (
            visibleFeed.map((publication) => (
              <div key={publication.id} className="p-4">
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {publication.photo_profil ? (
                      <img 
                        src={publication.photo_profil} 
                        alt={`${publication.client_prenom} ${publication.client_nom}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {publication.client_prenom?.[0]}{publication.client_nom?.[0]}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
                          {publication.client_prenom} {publication.client_nom}
                        </h3>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">•</span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {formatTimeAgo(publication.created_at)}
                        </span>
                      </div>
                      {publication.prestataire_nom && (
                        <button 
                          onClick={() => navigate(`/prestataires/${publication.prestataire_id}`)}
                          className="flex items-center space-x-1 text-xs text-gray-400 hover:text-blue-500"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>@{publication.prestataire_nom}</span>
                        </button>
                      )}
                    </div>
                    
                    {publication.service_nom && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/services/${publication.service_id}`)}
                          className="flex items-center space-x-1.5 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <Tag className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate max-w-[140px]">
                            {publication.service_nom}
                          </span>
                        </button>
                        <button
                          onClick={() => handleBookFromPublication(publication)}
                          disabled={bookingServiceLoading && bookingPublication?.id === publication.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {bookingServiceLoading && bookingPublication?.id === publication.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CalendarPlus className="w-3 h-3" />
                          )}
                          Réserver ce service
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-900 dark:text-white mb-3 text-sm leading-relaxed">
                  {publication.description}
                </p>

                {renderMediaGrid(publication)}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <LikeButton
                      liked={publication.liked}
                      count={publication.nombre_likes}
                      onToggle={() => handleToggleLike(publication.id, publication.liked)}
                    />
                    
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setAuthPromptMessage('Connectez-vous pour commenter.');
                          setAuthPromptOpen(true);
                          return;
                        }
                        setCommentingPublicationId(publication.id);
                      }}
                      className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm">{publication.nombre_commentaires || 0}</span>
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareMenuOpen(shareMenuOpen === publication.id ? null : publication.id);
                        }}
                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      {shareMenuOpen === publication.id && (
                        <div className="fixed inset-x-4 bottom-20 sm:absolute sm:bottom-full sm:right-0 sm:left-auto sm:inset-x-auto sm:mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 sm:min-w-[200px] z-50">
                          <button
                            onClick={() => handleShare(publication.id, 'whatsapp')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-green-500 font-bold">WA</span>
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => handleShare(publication.id, 'facebook')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-blue-600 font-bold">f</span>
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShare(publication.id, 'twitter')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-sky-500 font-semibold">X</span>
                            <span>Twitter</span>
                          </button>
                          <button
                            onClick={() => handleShare(publication.id, 'copy')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 text-gray-700 dark:text-gray-300"
                          >
                            <Copy className="w-5 h-5" />
                            <span>Copier le lien</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!loading && visibleFeed.length < filteredFeed.length && (
          <div className="text-center py-4">
            <button
              onClick={() => setVisibleCount(count => count + 5)}
              className="px-4 py-2 rounded-2xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              Voir plus de publications
            </button>
          </div>
        )}
      </div>

      {commentingPublicationId && (
        <CommentsModal 
          publicationId={commentingPublicationId} 
          onClose={() => setCommentingPublicationId(null)} 
          onCommentAdded={() => {
            setFeed(currentFeed =>
              currentFeed.map(p =>
                p.id === commentingPublicationId
                  ? { ...p, nombre_commentaires: (p.nombre_commentaires || 0) + 1 }
                  : p
              )
            );
          }}
        />
      )}

      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} message={authPromptMessage} />

      {bookingService && bookingPublication && (
        <div className="fixed inset-0 z-50">
          <div className="absolute top-0 left-0 right-0 z-10 flex justify-center pt-3 px-4 pointer-events-none">
            <div className="bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-none">
              <Tag className="w-3 h-3" />
              Inspiré de la publication de {bookingPublication.client_prenom} {bookingPublication.client_nom}
            </div>
          </div>
          <ReservationModal
            service={bookingService}
            publicationId={bookingPublication.id}
            onClose={() => { setBookingService(null); setBookingPublication(null); }}
            onReservationSuccess={() => {
              addNotification({
                id: Date.now(), user_id: user?.id,
                titre: 'Réservation créée',
                message: `Réservation pour "${bookingService.nom}" en attente de confirmation.`,
                type: 'success', is_read: false, created_at: new Date().toISOString()
              });
              setBookingService(null);
              setBookingPublication(null);
            }}
          />
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nouvelle publication
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newPublication.description}
                  onChange={(e) => setNewPublication(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez votre réalisation..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prestataire
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Rechercher un prestataire..."
                    value={prestataireInput}
                    onChange={(e) => handlePrestataireInputChange(e.target.value)}
                    onFocus={() => { if (prestataireInput.trim()) setShowPrestataireDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowPrestataireDropdown(false), 200)}
                    className={`w-full px-4 py-2.5 rounded-lg border bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      newPublication.prestataire_id
                        ? 'border-green-400 dark:border-green-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  />
                  {newPublication.prestataire_id > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
                {showPrestataireDropdown && filteredPrestataires.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {filteredPrestataires.slice(0, 10).map(prestataire => (
                      <button
                        key={prestataire.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPrestataire(prestataire)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                          {prestataire.photo_profil ? (
                            <img src={prestataire.photo_profil} alt="" className="w-full h-full object-cover" />
                          ) : (
                            prestataire.nom_commercial?.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {prestataire.nom_commercial}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {prestataire.ville || 'Côte d\'Ivoire'}
                            {typeof prestataire.note_moyenne === 'number' && prestataire.note_moyenne > 0 && (
                              <span> · ★ {prestataire.note_moyenne.toFixed(1)}</span>
                            )}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showPrestataireDropdown && prestataireInput.trim().length > 0 && filteredPrestataires.length === 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Aucun prestataire trouvé
                  </div>
                )}
              </div>

              {services.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Service
                  </label>
                  <select
                    value={newPublication.service_id}
                    onChange={(e) => setNewPublication(prev => ({ ...prev, service_id: Number(e.target.value) }))}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value={0}>Sélectionnez un service (facultatif)</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Médias
                </label>
                <label className="flex items-center justify-center px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <Camera className="w-6 h-6 text-gray-500 dark:text-gray-400 mr-2" />
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    <span className="font-semibold text-blue-500">Cliquez pour télécharger</span> ou glissez-déposez
                  </div>
                  <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
                </label>
                {selectedFiles.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {selectedFiles.length} fichier(s) sélectionné(s)
                  </p>
                )}
              </div>

              <button
                onClick={createPublication}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Partager</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

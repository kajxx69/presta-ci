import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Mail,
  Phone,
  Camera,
  Pencil,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  MapPin,
  Calendar,
  Heart,
  Loader2,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Trash2,
  X,
  Check,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import PrivacyTab from './PrivacyTab';
import ParrainageCard from '../common/ParrainageCard';
import NotificationsSettingsTab from './NotificationsSettingsTab';
import HelpSupportTab from './HelpSupportTab';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

interface ProfileFormData {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  photo_profil: string;
}

interface ProfileInsights {
  totalReservations: number;
  upcomingReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  favoritesTotal: number;
  unreadNotifications: number;
}

export default function ProfileTab() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isDarkMode, toggleDarkMode, showToast } = useAppStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="p-4 max-w-lg lg:max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-3xl font-bold">?</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mon profil</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs">
            Connectez-vous pour accéder à votre profil et vos paramètres.
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
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editData, setEditData] = useState<ProfileFormData>({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    telephone: user?.telephone || '',
    ville: user?.ville || '',
    photo_profil: user?.photo_profil || '',
  });
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [insights, setInsights] = useState<ProfileInsights>({
    totalReservations: 0, upcomingReservations: 0, completedReservations: 0,
    cancelledReservations: 0, favoritesTotal: 0, unreadNotifications: 0,
  });
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [favoriteHighlights, setFavoriteHighlights] = useState<{ providers: any[]; services: any[] }>({ providers: [], services: [] });
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const { user } = await api.users.getMe();
        if (user) {
          useAuthStore.setState({ user });
          setEditData({
            nom: user.nom || '', prenom: user.prenom || '',
            telephone: user.telephone || '', ville: user.ville || '',
            photo_profil: user.photo_profil || '',
          });
        }
      } catch (e: any) {
        setError(e?.message || 'Impossible de charger votre profil');
      } finally {
        setProfileLoading(false);
      }
    };
    void loadProfile();
  }, []);

  useEffect(() => {
    if (!user) return;
    setEditData({
      nom: user.nom || '', prenom: user.prenom || '',
      telephone: user.telephone || '', ville: user.ville || '',
      photo_profil: user.photo_profil || '',
    });
  }, [user?.nom, user?.prenom, user?.telephone, user?.ville, user?.photo_profil]);

  useEffect(() => { void refreshInsights(); }, []);

  const refreshInsights = async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    let encounteredError = false;

    async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
      try { return await fn(); } catch { encounteredError = true; return fallback; }
    }

    const reservations = await safeFetch(() => api.reservations.list('all'), [] as any[]);
    const favoriteProviders = await safeFetch(() => api.favorites.listProviders(), [] as any[]);
    const favoriteServices = await safeFetch(() => api.favorites.listServices(), [] as any[]);
    const favoritePublications = await safeFetch(() => api.favorites.listPublications(), [] as any[]);
    const unreadCount = await safeFetch(() => api.notifications.getUnreadCount(), { count: 0 });

    setInsights({
      totalReservations: reservations.length,
      upcomingReservations: reservations.filter((r: any) => ['en_attente', 'confirmee', 'acceptee'].includes(r.statut_nom)).length,
      completedReservations: reservations.filter((r: any) => r.statut_nom === 'terminee').length,
      cancelledReservations: reservations.filter((r: any) => ['annulee', 'refusee'].includes(r.statut_nom)).length,
      favoritesTotal: favoriteProviders.length + favoriteServices.length + favoritePublications.length,
      unreadNotifications: unreadCount.count || 0,
    });
    setRecentReservations(reservations.slice(0, 3));
    setFavoriteHighlights({ providers: favoriteProviders.slice(0, 2), services: favoriteServices.slice(0, 2) });
    if (encounteredError) setInsightsError("Certaines données n'ont pas pu être chargées.");
    setInsightsLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!editData.prenom.trim() || !editData.nom.trim()) {
      showToast('Merci de renseigner votre prénom et votre nom.', 'error');
      return;
    }
    try {
      setSaving(true);
      setError(null);

      const { user: saved } = await api.users.updateMe({
        nom: editData.nom.trim(),
        prenom: editData.prenom.trim(),
        telephone: editData.telephone.trim() || undefined,
        ville: editData.ville.trim() || undefined,
        photo_profil: editData.photo_profil || undefined,
      });

      // Fusionner avec le user existant (préserver role_nom, token, etc.)
      const storeState = useAuthStore.getState();
      const mergedUser = { ...storeState.user, ...saved };
      useAuthStore.setState({ user: mergedUser });

      // Persister dans localStorage pour que les changements survivent au rechargement
      const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
      localStorage.setItem('prestaci-auth', JSON.stringify({ ...auth, user: mergedUser }));

      setEditData({
        nom: mergedUser.nom || '',
        prenom: mergedUser.prenom || '',
        telephone: mergedUser.telephone || '',
        ville: mergedUser.ville || '',
        photo_profil: mergedUser.photo_profil || '',
      });
      setIsEditing(false);
      showToast('Profil mis à jour !', 'success');
    } catch (e: any) {
      const msg = e?.message || 'Impossible de sauvegarder';
      setError(msg.replace('HTTP 4', 'Erreur de serveur (4').replace('HTTP 5', 'Erreur serveur (5'));
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (file: File, maxWidth = 800, quality = 0.8): Promise<string> =>
    new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
        } else {
          if (height > maxWidth) { width = (width * maxWidth) / height; height = maxWidth; }
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    event.target.value = '';
    if (!file.type.startsWith('image/')) { showToast('Veuillez sélectionner une image', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast("L'image ne doit pas dépasser 10MB", 'error'); return; }
    try {
      const compressedBase64 = await compressImage(file, 800, 0.8);
      setPhotoPreview(compressedBase64);
      setShowPhotoMenu(false);
    } catch {
      showToast('Erreur lors de la lecture de l\'image', 'error');
    }
  };

  const persistUser = (updated: any) => {
    const storeState = useAuthStore.getState();
    const mergedUser = { ...storeState.user, ...updated };
    useAuthStore.setState({ user: mergedUser });
    const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
    localStorage.setItem('prestaci-auth', JSON.stringify({ ...auth, user: mergedUser }));
    return mergedUser;
  };

  const handlePhotoConfirm = async () => {
    if (!photoPreview) return;
    try {
      setUploadingPhoto(true);
      const { user: updated } = await api.users.updateMe({ photo_profil: photoPreview });
      const merged = persistUser(updated);
      setEditData(prev => ({ ...prev, photo_profil: merged.photo_profil || '' }));
      setPhotoPreview(null);
      showToast('Photo mise à jour !', 'success');
    } catch {
      showToast('Erreur lors de la mise à jour de la photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    try {
      setUploadingPhoto(true);
      setShowPhotoMenu(false);
      const { user: updated } = await api.users.updateMe({ photo_profil: '' });
      persistUser(updated);
      setEditData(prev => ({ ...prev, photo_profil: '' }));
      showToast('Photo supprimée', 'success');
    } catch {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) logout();
  };

  const statusChips = useMemo(() => [
    { label: 'Réservations', value: insights.totalReservations, icon: Calendar, gradient: 'from-blue-500 to-indigo-500' },
    { label: 'À venir', value: insights.upcomingReservations, icon: CheckCircle2, gradient: 'from-purple-500 to-pink-500' },
    { label: 'Favoris', value: insights.favoritesTotal, icon: Heart, gradient: 'from-rose-500 to-orange-500' },
    { label: 'Alertes', value: insights.unreadNotifications, icon: Bell, gradient: 'from-emerald-500 to-teal-500' },
  ], [insights]);

  const formatReservationDate = (r: any) => {
    const date = r?.date_reservation ? new Date(`${r.date_reservation}T${r.heure_debut || '00:00'}`) : null;
    if (!date || isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => setShowNotifications(true) },
    { icon: Shield, label: 'Confidentialité', action: () => setShowPrivacy(true) },
    { icon: HelpCircle, label: 'Aide & Support', action: () => setShowHelp(true) },
    { icon: Settings, label: 'Paramètres', action: () => showToast('Paramètres avancés — Prochainement', 'info') },
  ];

  if (showPrivacy) return <PrivacyTab onBack={() => setShowPrivacy(false)} />;
  if (showNotifications) return <NotificationsSettingsTab onBack={() => setShowNotifications(false)} />;
  if (showHelp) return <HelpSupportTab onBack={() => setShowHelp(false)} />;

  return (
    <div className="max-w-lg lg:max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 px-4 py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center relative z-10"
        >
          <div className="relative inline-block">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              disabled={uploadingPhoto}
              className="hidden"
            />

            {/* Avatar — clickable */}
            <button
              onClick={() => setShowPhotoMenu(true)}
              disabled={uploadingPhoto}
              className="relative w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-white/30 shadow-xl group focus:outline-none"
            >
              {user?.photo_profil ? (
                <img src={user.photo_profil} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                {uploadingPhoto
                  ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                  : <Camera className="w-6 h-6 text-white" />
                }
              </div>
            </button>

            {/* Camera badge */}
            <div className="absolute bottom-4 right-0 p-1.5 bg-white rounded-full shadow-lg pointer-events-none">
              {uploadingPhoto
                ? <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-blue-600" />
              }
            </div>
          </div>

          {/* Backdrop to close menu */}
          {showPhotoMenu && (
            <div className="fixed inset-0 z-10" onClick={() => setShowPhotoMenu(false)} />
          )}

          {/* Photo action menu */}
          <AnimatePresence>
            {showPhotoMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-500" />
                  Choisir une photo
                </button>
                {user?.photo_profil && (
                  <button
                    onClick={handlePhotoRemove}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer la photo
                  </button>
                )}
                <button
                  onClick={() => setShowPhotoMenu(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <h1 className={clsx('text-2xl font-bold text-white mb-1 drop-shadow-lg', profileLoading && 'opacity-70 animate-pulse')}>
            {user?.prenom} {user?.nom}
          </h1>
          <p className="text-white/80 text-sm font-medium">Membre PrestaCI</p>
          <div className="flex items-center justify-center mt-1.5 gap-1.5 text-white/70 text-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span>{user?.ville || 'Ville non renseignée'}</span>
          </div>
        </motion.div>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview stats */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">Vue d'ensemble</h2>
            <Button variant="ghost" size="sm" onClick={refreshInsights} loading={insightsLoading} icon={ArrowUpRight}>
              Actualiser
            </Button>
          </div>

          {insightsError && (
            <div className="mb-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {insightsError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {statusChips.map(chip => (
              <div key={chip.label} className={`rounded-xl p-3 text-white bg-gradient-to-br ${chip.gradient}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="bg-white/20 rounded-lg p-1.5">
                    <chip.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-bold">{insightsLoading ? '—' : chip.value}</span>
                </div>
                <p className="text-xs font-semibold">{chip.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Personal info */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white">Informations personnelles</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                disabled={profileLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-40"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {profileLoading ? (
              <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </motion.div>
            ) : isEditing ? (
              /* ── EDIT MODE ── */
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Prénom *</label>
                    <input
                      type="text"
                      value={editData.prenom}
                      onChange={e => setEditData(d => ({ ...d, prenom: e.target.value }))}
                      placeholder="Votre prénom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nom *</label>
                    <input
                      type="text"
                      value={editData.nom}
                      onChange={e => setEditData(d => ({ ...d, nom: e.target.value }))}
                      placeholder="Votre nom"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                {/* Email — non modifiable */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-1 truncate">{user?.email}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-md font-medium">Non modifiable</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={editData.telephone}
                      onChange={e => setEditData(d => ({ ...d, telephone: e.target.value }))}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Ville</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editData.ville}
                      onChange={e => setEditData(d => ({ ...d, ville: e.target.value }))}
                      placeholder="Abidjan, Bouaké, San-Pédro..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError(null);
                      setEditData({
                        nom: user?.nom || '', prenom: user?.prenom || '',
                        telephone: user?.telephone || '', ville: user?.ville || '',
                        photo_profil: user?.photo_profil || '',
                      });
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── VIEW MODE ── */
              <motion.div
                key="view"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-1"
              >
                {[
                  { icon: <span className="text-base">👤</span>, label: 'Nom complet', value: `${user?.prenom || ''} ${user?.nom || ''}`.trim() || undefined },
                  { icon: <Mail className="w-4 h-4 text-gray-400" />, label: 'Email', value: user?.email },
                  { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'Téléphone', value: user?.telephone },
                  { icon: <MapPin className="w-4 h-4 text-gray-400" />, label: 'Ville', value: user?.ville },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{label}</p>
                      <p className={clsx('text-sm font-medium truncate', value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic')}>
                        {value || 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Recent activity */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 dark:text-white">Activité récente</h2>
            <Badge variant="default" size="sm">{insights.totalReservations}</Badge>
          </div>
          {insightsLoading ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : recentReservations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Pas encore de réservation.</p>
          ) : (
            <div className="space-y-2">
              {recentReservations.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
                    {formatReservationDate(r)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{r.service_nom}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.prestataire_nom}</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${r.statut_couleur || '#E5E7EB'}20`, color: r.statut_couleur || '#1F2937' }}
                  >
                    {r.statut_nom}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Favorite highlights */}
        <Card padding="md">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Favoris</h2>
          {favoriteHighlights.providers.length === 0 && favoriteHighlights.services.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ajoutez des favoris pour les retrouver ici.</p>
          ) : (
            <div className="space-y-2">
              {favoriteHighlights.providers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <div>
                    <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">{p.nom_commercial}</p>
                    <p className="text-xs text-blue-700/70 dark:text-blue-300/70 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{p.ville || 'Ville non précisée'}
                    </p>
                  </div>
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
              ))}
              {favoriteHighlights.services.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                  <div>
                    <p className="font-semibold text-sm text-purple-900 dark:text-purple-100">{s.nom}</p>
                    <p className="text-xs text-purple-700/70 dark:text-purple-300/70">{s.prestataire_nom}</p>
                  </div>
                  <Heart className="w-4 h-4 text-purple-500" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card padding="md">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">Paramètres</h2>
          <div className="space-y-1">
            {/* Dark mode toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                  {isDarkMode ? '🌙' : '☀️'}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Mode sombre</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={clsx(
                  'w-11 h-6 rounded-full transition-all duration-300 relative',
                  isDarkMode ? 'bg-blue-600' : 'bg-gray-300',
                )}
              >
                <div className={clsx(
                  'w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-300 shadow-sm',
                  isDarkMode ? 'translate-x-5' : 'translate-x-0.5',
                )} />
              </button>
            </div>

            {menuItems.map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <item.icon className="w-4.5 h-4.5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </Card>

        {/* Parrainage */}
        <ParrainageCard />

        {/* Logout */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </motion.button>
      </div>

      {/* Photo preview modal */}
      <AnimatePresence>
        {photoPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setPhotoPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xs p-6 space-y-5"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-center font-bold text-gray-900 dark:text-white text-lg">
                Aperçu de la photo
              </h3>

              <div className="flex justify-center">
                <div className="w-36 h-36 rounded-full overflow-hidden ring-4 ring-blue-500/30 shadow-xl">
                  <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Cette photo sera visible sur votre profil public.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPhotoPreview(null)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handlePhotoConfirm}
                  disabled={uploadingPhoto}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {uploadingPhoto
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />
                  }
                  {uploadingPhoto ? 'Envoi...' : 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  LogOut,
  Users,
  Package,
  Calendar,
  Bell,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  new_reservation: boolean;
  reservation_confirmed: boolean;
  reservation_cancelled: boolean;
  new_publication: boolean;
  new_like: boolean;
  new_comment: boolean;
  new_follower: boolean;
  promotions: boolean;
  tips: boolean;
}

interface EditableProfile {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  ville?: string;
  photo_profil?: string;
}

interface SystemStatus {
  maintenanceMode?: boolean;
  lastBackupAt?: string | null;
  lastCacheClearAt?: string | null;
}

export default function AdminProfile() {
  const { user, logout } = useAuthStore();
  const { showToast, isDarkMode, toggleDarkMode } = useAppStore();

  const [profileData, setProfileData] = useState<EditableProfile>({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    ville: user?.ville || '',
    photo_profil: user?.photo_profil || ''
  });
  const [stats, setStats] = useState<any | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfileData({
      prenom: user?.prenom || '',
      nom: user?.nom || '',
      email: user?.email || '',
      telephone: user?.telephone || '',
      ville: user?.ville || '',
      photo_profil: user?.photo_profil || ''
    });
  }, [user?.prenom, user?.nom, user?.email, user?.telephone, user?.ville, user?.photo_profil]);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileResponse, statsResponse, systemResponse, notificationPrefs, unreadCount] = await Promise.all([
        api.users.getMe().catch(() => null),
        api.admin.getStats().catch(() => null),
        api.admin.maintenance.getStatus().catch(() => null),
        api.notificationPreferences.get().catch(() => null),
        api.notifications.getUnreadCount().catch(() => ({ count: 0 }))
      ]);

      if (profileResponse?.user) {
        const refreshed = profileResponse.user;
        useAuthStore.setState({ user: refreshed });
        setProfileData({
          prenom: refreshed.prenom || '',
          nom: refreshed.nom || '',
          email: refreshed.email || '',
          telephone: refreshed.telephone || '',
          ville: refreshed.ville || '',
          photo_profil: refreshed.photo_profil || ''
        });
      }

      if (statsResponse) {
        setStats(statsResponse);
      }

      if (systemResponse) {
        setSystemStatus(systemResponse);
      }

      if (notificationPrefs) {
        setNotificationSettings({
          push_enabled: Boolean(notificationPrefs.push_enabled),
          email_enabled: Boolean(notificationPrefs.email_enabled),
          sms_enabled: Boolean(notificationPrefs.sms_enabled),
          new_reservation: Boolean(notificationPrefs.new_reservation),
          reservation_confirmed: Boolean(notificationPrefs.reservation_confirmed),
          reservation_cancelled: Boolean(notificationPrefs.reservation_cancelled),
          new_publication: Boolean(notificationPrefs.new_publication),
          new_like: Boolean(notificationPrefs.new_like),
          new_comment: Boolean(notificationPrefs.new_comment),
          new_follower: Boolean(notificationPrefs.new_follower),
          promotions: Boolean(notificationPrefs.promotions),
          tips: Boolean(notificationPrefs.tips)
        });
      }

      setUnreadNotifications(unreadCount?.count || 0);
    } catch (error) {
      console.error('Erreur chargement profil admin:', error);
      showToast('Impossible de charger les données du profil admin', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'Jamais';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statsCards = useMemo(() => ([
    {
      label: 'Utilisateurs',
      value: stats?.users?.total_users ?? 0,
      subtitle: `${stats?.users?.admins || 0} admins`,
      icon: Users,
      accent: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'
    },
    {
      label: 'Services',
      value: stats?.services?.total_services ?? 0,
      subtitle: `${stats?.services?.services_actifs || 0} actifs`,
      icon: Package,
      accent: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200'
    },
    {
      label: 'Réservations',
      value: stats?.reservations?.total_reservations ?? 0,
      subtitle: `${stats?.reservations?.en_attente || 0} en attente`,
      icon: Calendar,
      accent: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-200'
    },
    {
      label: 'Notifications',
      value: unreadNotifications,
      subtitle: 'Non lues',
      icon: Bell,
      accent: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-200'
    }
  ]), [stats, unreadNotifications]);

  const handleSaveProfile = async () => {
    if (!profileData.prenom.trim() || !profileData.nom.trim()) {
      showToast('Merci de renseigner votre prénom et votre nom', 'error');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        prenom: profileData.prenom,
        nom: profileData.nom,
        telephone: profileData.telephone,
        ville: profileData.ville,
        photo_profil: profileData.photo_profil
      };
      const { user: saved } = await api.users.updateMe(payload);
      useAuthStore.setState({ user: saved });
      setProfileData({
        prenom: saved.prenom || '',
        nom: saved.nom || '',
        email: saved.email || profileData.email,
        telephone: saved.telephone || '',
        ville: saved.ville || '',
        photo_profil: saved.photo_profil || ''
      });
      setIsEditing(false);
      showToast('Profil administrateur mis à jour', 'success');
    } catch (error) {
      console.error('Erreur sauvegarde profil admin:', error);
      showToast('Impossible de sauvegarder vos informations', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, photo_profil: reader.result as string }));
      setIsEditing(true);
    };
    reader.readAsDataURL(file);
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings) => {
    if (!notificationSettings) return;
    const previous = notificationSettings;
    const updated = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(updated);
    try {
      await api.notificationPreferences.update(updated);
      showToast('Préférences mises à jour', 'success');
    } catch (error) {
      console.error('Erreur mise à jour préférences admin:', error);
      showToast('Impossible de mettre à jour les notifications', 'error');
      setNotificationSettings(previous);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du profil administrateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/30 shadow-lg">
                {profileData.photo_profil ? (
                  <img src={profileData.photo_profil} alt="Avatar admin" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl font-semibold">
                    {profileData.prenom?.[0]}{profileData.nom?.[0]}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 bg-white text-gray-800 rounded-full p-2 shadow-md hover:scale-105 transition-transform"
                title="Changer la photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <p className="text-sm uppercase text-white/70 tracking-wide">Profil administrateur</p>
              <h1 className="text-3xl font-bold">{profileData.prenom} {profileData.nom}</h1>
              <p className="flex items-center gap-2 text-white/90 mt-1">
                <Mail className="w-4 h-4" /> {profileData.email}
              </p>
              {profileData.telephone && (
                <p className="flex items-center gap-2 text-white/90 mt-1">
                  <Phone className="w-4 h-4" /> {profileData.telephone}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[220px]">
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white/70">Statut</span>
                <Shield className="w-5 h-5 text-white/80" />
              </div>
              <p className="text-lg font-semibold">Superviseur</p>
              <p className="text-xs text-white/70">Accès complet au panneau d'administration</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 bg-white text-gray-900 rounded-2xl py-3 font-semibold shadow-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Informations personnelles</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mettez à jour vos informations de contact</p>
            </div>
            <button
              onClick={() => setIsEditing((prev) => !prev)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {isEditing ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Prénom', key: 'prenom', type: 'text' },
              { label: 'Nom', key: 'nom', type: 'text' },
              { label: 'Email professionnel', key: 'email', type: 'email', disabled: true },
              { label: 'Téléphone', key: 'telephone', type: 'tel' },
              { label: 'Ville', key: 'ville', type: 'text' }
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  disabled={field.disabled || !isEditing}
                  value={(profileData as any)[field.key] || ''}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:text-gray-500 disabled:dark:text-gray-500 ${
                    field.disabled || !isEditing
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
            ))}
          </div>

          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setProfileData({
                    prenom: user?.prenom || '',
                    nom: user?.nom || '',
                    email: user?.email || '',
                    telephone: user?.telephone || '',
                    ville: user?.ville || '',
                    photo_profil: user?.photo_profil || ''
                  });
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Préférences</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Personnalisez votre expérience</p>
              </div>
              <button
                type="button"
                onClick={loadAdminData}
                className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                title="Actualiser les données"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Mode sombre</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Repos visuel pour les sessions longues</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`w-14 h-7 rounded-full flex items-center ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform flex items-center justify-center ${
                      isDarkMode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  >
                    {isDarkMode ? <Moon className="w-3 h-3 text-blue-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
                  </div>
                </button>
              </div>

              {notificationSettings && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Alertes critiques</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Incidents, maintenance et sécurité</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle('push_enabled')}
                      className={`w-12 h-6 rounded-full ${notificationSettings.push_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}
                    >
                      <span
                        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                          notificationSettings.push_enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Rapports par email</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Résumé quotidien des indicateurs clés</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle('email_enabled')}
                      className={`w-12 h-6 rounded-full ${notificationSettings.email_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}
                    >
                      <span
                        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                          notificationSettings.email_enabled ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Santé du système</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Mode maintenance</span>
                <span className={`font-semibold ${systemStatus?.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                  {systemStatus?.maintenanceMode ? 'Activé' : 'Désactivé'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Dernière sauvegarde</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(systemStatus?.lastBackupAt || null)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Cache nettoyé</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(systemStatus?.lastCacheClearAt || null)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coordonnées</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Visibles par l'équipe de support uniquement</p>
            </div>
          </div>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              {profileData.email || 'Non renseigné'}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              {profileData.telephone || 'Non renseigné'}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              {profileData.ville || 'Ville non renseignée'}
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sécurité</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paramètres essentiels de votre compte</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between">
              <span>Protection du compte</span>
              <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Dernière connexion</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(user?.last_login || user?.updated_at || '')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Accès critiques</span>
              <span className="font-medium text-gray-900 dark:text-white">
                2 niveaux validés
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

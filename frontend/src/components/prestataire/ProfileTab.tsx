import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import {
  User,
  Phone,
  Building,
  Edit2,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  Clock,
  MapPin,
  Globe,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Loader2
} from 'lucide-react';
import PrivacyTab from '../client/PrivacyTab';
import NotificationsSettingsTab from '../client/NotificationsSettingsTab';
import HelpSupportTab from '../client/HelpSupportTab';
import HorairesOuvertureEditor from './HorairesOuvertureEditor';
import PhotosEtablissementEditor from './PhotosEtablissementEditor';

interface PrestataireProfile {
  id: number;
  user_id: number;
  nom_commercial: string;
  bio: string | null;
  adresse: string | null;
  ville: string | null;
  pays: string | null;
  latitude: number | null;
  longitude: number | null;
  telephone_pro: string | null;
  horaires_ouverture: Record<string, { debut: string; fin: string } | null> | null;
  photos_etablissement: string[] | null;
  is_verified?: number;
  plan_actuel_id?: number | null;
  abonnement_expires_at?: string | null;
  updated_at?: string;
}

const REQUIRED_FIELDS: Array<{ key: keyof PrestataireProfile; label: string; isArray?: boolean }> = [
  { key: 'nom_commercial', label: 'Nom commercial' },
  { key: 'bio', label: 'Description' },
  { key: 'telephone_pro', label: 'Téléphone professionnel' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'ville', label: 'Ville' },
  { key: 'horaires_ouverture', label: 'Horaires' },
  { key: 'photos_etablissement', label: 'Photos', isArray: true }
];

const DAYS_ORDER = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

const parseJsonField = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeProfile = (profile: any): PrestataireProfile => {
  const parseNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  return {
    ...profile,
    latitude: parseNumber(profile?.latitude),
    longitude: parseNumber(profile?.longitude),
    horaires_ouverture: parseJsonField(profile?.horaires_ouverture, null),
    photos_etablissement: parseJsonField(profile?.photos_etablissement, null)
  };
};

export default function ProfileTab() {
  const { user, logout } = useAuthStore();
  const { showToast, isDarkMode, toggleDarkMode } = useAppStore();
  const [profile, setProfile] = useState<PrestataireProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PrestataireProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const fetchedProfile = await api.prestataires.getProfile();
        const normalized = normalizeProfile(fetchedProfile);
        setProfile(normalized);
        setEditData(normalized);
        setPreviewPhoto(normalized.photos_etablissement?.[0] || user?.photo_profil || null);
      } catch (e: any) {
        setError('Impossible de charger le profil. Il est peut-être incomplet.');
        showToast(e.message || 'Erreur de chargement du profil', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [showToast]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      const { prestataire: savedProfile } = await api.prestataires.updateProfile(editData);
      const normalized = normalizeProfile(savedProfile);
      setProfile(normalized);
      setEditData(normalized);
      setPreviewPhoto(normalized.photos_etablissement?.[0] || user?.photo_profil || null);
      setIsEditing(false);
      showToast('Profil mis à jour avec succès', 'success');
    } catch (e: any) {
      setError(e?.message || 'Impossible de sauvegarder le profil');
      showToast(e?.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const profileCompletion = useMemo(() => {
    if (!profile) return { percent: 0, missing: REQUIRED_FIELDS.map((f) => f.label) };
    const missing = REQUIRED_FIELDS.filter((field) => {
      const value = (profile as any)[field.key];
      if (field.isArray) {
        return !Array.isArray(value) || value.length === 0;
      }
      if (field.key === 'horaires_ouverture') {
        return !value || Object.values(value).every((slot) => !slot);
      }
      return !value || String(value).trim() === '';
    }).map((field) => field.label);
    const percent = Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100);
    return { percent, missing };
  }, [profile]);

  const photos = Array.isArray(profile?.photos_etablissement) ? profile.photos_etablissement : [];
  const hasSchedule = !!profile?.horaires_ouverture && Object.values(profile.horaires_ouverture).some(Boolean);
  const addressText = [profile?.adresse, profile?.ville, profile?.pays].filter(Boolean).join(', ') || 'Non renseignée';
  const isVerified = Boolean(profile?.is_verified);
  const schedulePreview = useMemo(() => {
    if (!profile?.horaires_ouverture) return [];
    return DAYS_ORDER.map((day) => ({
      day,
      slot: profile.horaires_ouverture?.[day] || null
    }));
  }, [profile?.horaires_ouverture]);

  const menuItems = [
    { icon: Bell, label: 'Notifications', action: () => setShowNotifications(true) },
    { icon: Shield, label: 'Confidentialité', action: () => setShowPrivacy(true) },
    { icon: HelpCircle, label: 'Aide & Support', action: () => setShowHelp(true) },
    { icon: Settings, label: 'Paramètres', action: () => showToast('Paramètres avancés - Prochainement disponible', 'info') }
  ];

  if (showPrivacy) return <PrivacyTab onBack={() => setShowPrivacy(false)} />;
  if (showNotifications) return <NotificationsSettingsTab onBack={() => setShowNotifications(false)} />;
  if (showHelp) return <HelpSupportTab onBack={() => setShowHelp(false)} />;

  if (loading) {
    return <div className="p-4 text-center">Chargement du profil...</div>;
  }

  if (error && !profile) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  const handleCancelEdit = () => {
    setEditData(profile ? { ...profile } : {});
    setIsEditing(false);
  };

  const renderValue = (value?: string | null) => (value && value.trim() !== '' ? value : 'Non renseigné');

  const profileTips = profileCompletion.missing.length
    ? profileCompletion.missing
    : ['Votre profil est complet. Pensez à le mettre à jour régulièrement pour rester attractif.'];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6 pb-20">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-semibold uppercase">
              {previewPhoto || user?.photo_profil ? (
                <img
                  src={previewPhoto || user?.photo_profil}
                  alt="Profil"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                `${user?.prenom?.[0] || '?'}${user?.nom?.[0] || ''}`
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile?.nom_commercial || 'Profil prestataire'}</h1>
                {isVerified && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Vérifié
                  </span>
                )}
              </div>
              <p className="text-white/80 text-sm mt-1">
                {user?.prenom} {user?.nom} • {user?.email}
              </p>
              {profile?.updated_at && (
                <p className="text-xs text-white/70 mt-1">
                  Dernière mise à jour le {new Date(profile.updated_at).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
              disabled={isEditing && saving}
              className="inline-flex items-center px-4 py-2 rounded-2xl bg-white text-blue-600 font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-70"
            >
              {isEditing ? (
                <>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Sauvegarder
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Modifier
                </>
              )}
            </button>
            {isEditing && (
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center px-4 py-2 rounded-2xl border border-white/40 text-white font-semibold hover:bg-white/10 transition"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between mb-1 text-sm text-white/80">
            <span>Complétion du profil</span>
            <span>{profileCompletion.percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/30">
            <div className="h-2 rounded-full bg-white transition-all" style={{ width: `${profileCompletion.percent}%` }} />
          </div>
          {profileCompletion.percent < 80 && (
            <p className="text-xs text-white/80 mt-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Complétez les sections manquantes pour inspirer confiance aux clients.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Statut du profil</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
            {profileCompletion.percent >= 80 ? 'Professionnel' : 'À compléter'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {profileCompletion.percent >= 80
              ? 'Votre profil inspire confiance.'
              : 'Ajoutez les informations manquantes pour débloquer tout le potentiel.'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Horaires</p>
          <p className={`text-xl font-semibold mt-1 ${hasSchedule ? 'text-emerald-600' : 'text-orange-500'}`}>
            {hasSchedule ? 'Définis' : 'À configurer'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {hasSchedule ? 'Vos disponibilités sont visibles par les clients.' : 'Indiquez vos jours d’ouverture pour recevoir plus de demandes.'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Photos</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mt-1">{photos.length} photo(s)</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {photos.length > 0 ? 'Vos visuels rassurent les clients' : 'Ajoutez des photos de votre établissement.'}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informations principales</h2>
                <p className="text-sm text-gray-500">Présentez clairement votre activité.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Nom commercial</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.nom_commercial || ''}
                    onChange={(e) => setEditData({ ...editData, nom_commercial: e.target.value })}
                    className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                  />
                ) : (
                  <p className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                    <Building className="w-4 h-4 text-gray-400" />
                    {renderValue(profile?.nom_commercial)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Téléphone professionnel</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editData.telephone_pro || ''}
                    onChange={(e) => setEditData({ ...editData, telephone_pro: e.target.value })}
                    className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                  />
                ) : (
                  <p className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {renderValue(profile?.telephone_pro)}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">Bio</label>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                  />
                ) : (
                  <p className="mt-1 text-gray-700 dark:text-gray-300">{renderValue(profile?.bio)}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Email de contact</label>
                <p className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {user?.email}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Fonction</label>
                <p className="flex items-center gap-2 mt-1 text-gray-900 dark:text-white">
                  <User className="w-4 h-4 text-gray-400" />
                  Prestataire
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Localisation
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase">Adresse</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.adresse || ''}
                      onChange={(e) => setEditData({ ...editData, adresse: e.target.value })}
                      className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 dark:text-gray-200">{addressText}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Ville</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.ville || ''}
                        onChange={(e) => setEditData({ ...editData, ville: e.target.value })}
                        className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                      />
                    ) : (
                      <p className="mt-1 text-gray-800 dark:text-gray-200">{renderValue(profile?.ville)}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Pays</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.pays || ''}
                        onChange={(e) => setEditData({ ...editData, pays: e.target.value })}
                        className="w-full mt-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5"
                      />
                    ) : (
                      <p className="mt-1 text-gray-800 dark:text-gray-200">{renderValue(profile?.pays)}</p>
                    )}
                  </div>
                </div>
                {(profile?.latitude || profile?.longitude) && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Globe className="w-4 h-4 text-blue-500" />
                    {profile?.latitude?.toFixed(4)}, {profile?.longitude?.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Horaires d’ouverture
              </h3>
              {isEditing ? (
                <HorairesOuvertureEditor
                  value={editData.horaires_ouverture || null}
                  onChange={(newHoraires) => setEditData({ ...editData, horaires_ouverture: newHoraires })}
                />
              ) : hasSchedule ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {schedulePreview.map(({ day, slot }) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{day}</span>
                      {slot ? (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {slot.debut} - {slot.fin}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Fermé</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun horaire défini pour le moment.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-pink-500" />
              Photos de l’établissement
            </h3>
            {isEditing ? (
              <PhotosEtablissementEditor
                value={Array.isArray(editData.photos_etablissement) ? editData.photos_etablissement : []}
                onChange={(newPhotos) => setEditData({ ...editData, photos_etablissement: newPhotos })}
                onPreviewChange={setPreviewPhoto}
              />
            ) : photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative rounded-2xl overflow-hidden">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-28 object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-gray-300 rounded-2xl text-center text-gray-500 dark:text-gray-400">
                Ajoutez des images pour mettre votre établissement en valeur.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Checklist qualité</h3>
            <div className="space-y-3">
              {profileTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    {profileCompletion.percent === 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Paramètres</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                    {isDarkMode ? '🌙' : '☀️'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Mode sombre</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reposez vos yeux en basse lumière.</p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`w-12 h-6 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'} relative`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-300 ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Configurer</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

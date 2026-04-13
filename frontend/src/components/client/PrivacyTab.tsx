import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, MapPin, Phone, Mail, Users, Bell, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showPhone: boolean;
  showEmail: boolean;
  showLocation: boolean;
  allowMessages: boolean;
  allowNotifications: boolean;
  showActivity: boolean;
  dataSharing: boolean;
}

export default function PrivacyTab({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { addNotification } = useAppStore();
  
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showPhone: false,
    showEmail: false,
    showLocation: true,
    allowMessages: true,
    allowNotifications: true,
    showActivity: true,
    dataSharing: false
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    // Simuler une sauvegarde
    setTimeout(() => {
      setLoading(false);
      addNotification({
        id: Date.now(),
        user_id: user?.id,
        titre: 'Paramètres sauvegardés',
        message: 'Vos préférences de confidentialité ont été mises à jour',
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      });
      onBack();
    }, 500);
  };

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      } relative`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-0.5'
      }`} />
    </button>
  );

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Confidentialité
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez vos paramètres de confidentialité
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Visibilité du profil */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Visibilité du profil</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Qui peut voir votre profil</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {[
              { value: 'public', label: 'Public', desc: 'Tout le monde peut voir votre profil' },
              { value: 'contacts', label: 'Contacts uniquement', desc: 'Seuls vos contacts peuvent voir votre profil' },
              { value: 'private', label: 'Privé', desc: 'Personne ne peut voir votre profil' }
            ].map(option => (
              <label
                key={option.value}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{option.desc}</div>
                </div>
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={settings.profileVisibility === option.value}
                  onChange={(e) => setSettings({ ...settings, profileVisibility: e.target.value as any })}
                  className="w-4 h-4 text-blue-600"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contrôlez vos données visibles</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Afficher mon téléphone</span>
              </div>
              <ToggleSwitch
                enabled={settings.showPhone}
                onChange={() => setSettings({ ...settings, showPhone: !settings.showPhone })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Afficher mon email</span>
              </div>
              <ToggleSwitch
                enabled={settings.showEmail}
                onChange={() => setSettings({ ...settings, showEmail: !settings.showEmail })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Afficher ma localisation</span>
              </div>
              <ToggleSwitch
                enabled={settings.showLocation}
                onChange={() => setSettings({ ...settings, showLocation: !settings.showLocation })}
              />
            </div>
          </div>
        </div>

        {/* Communications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Communications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gérez vos interactions</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Autoriser les messages</span>
              </div>
              <ToggleSwitch
                enabled={settings.allowMessages}
                onChange={() => setSettings({ ...settings, allowMessages: !settings.allowMessages })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Recevoir les notifications</span>
              </div>
              <ToggleSwitch
                enabled={settings.allowNotifications}
                onChange={() => setSettings({ ...settings, allowNotifications: !settings.allowNotifications })}
              />
            </div>
          </div>
        </div>

        {/* Activité et données */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activité et données</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contrôlez vos données</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <EyeOff className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-gray-900 dark:text-white">Afficher mon activité</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Publications, likes, commentaires</div>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.showActivity}
                onChange={() => setSettings({ ...settings, showActivity: !settings.showActivity })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-gray-900 dark:text-white">Partage de données</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Améliorer les recommandations</div>
                </div>
              </div>
              <ToggleSwitch
                enabled={settings.dataSharing}
                onChange={() => setSettings({ ...settings, dataSharing: !settings.dataSharing })}
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg transition-colors text-white ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Enregistrement...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

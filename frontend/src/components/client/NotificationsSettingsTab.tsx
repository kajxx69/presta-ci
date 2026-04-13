import { useState, useEffect } from 'react';
import { Bell, ChevronLeft, Smartphone, Mail, MessageSquare, Heart, Calendar, Star, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';

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

export default function NotificationsSettingsTab({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    new_reservation: true,
    reservation_confirmed: true,
    reservation_cancelled: true,
    new_publication: false,
    new_like: false,
    new_comment: false,
    new_follower: false,
    promotions: true,
    tips: true
  });

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Charger les préférences au montage du composant
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setInitialLoading(true);
        const preferences = await api.notificationPreferences.get();
        
        // Mapper les données backend vers le state frontend
        setSettings({
          push_enabled: Boolean(preferences.push_enabled),
          email_enabled: Boolean(preferences.email_enabled),
          sms_enabled: Boolean(preferences.sms_enabled),
          new_reservation: Boolean(preferences.new_reservation),
          reservation_confirmed: Boolean(preferences.reservation_confirmed),
          reservation_cancelled: Boolean(preferences.reservation_cancelled),
          new_publication: Boolean(preferences.new_publication),
          new_like: Boolean(preferences.new_like),
          new_comment: Boolean(preferences.new_comment),
          new_follower: Boolean(preferences.new_follower),
          promotions: Boolean(preferences.promotions),
          tips: Boolean(preferences.tips)
        });
      } catch (error: any) {
        showToast('Erreur de chargement des préférences', 'error');
        console.error('Erreur chargement préférences:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await api.notificationPreferences.update(settings);
      
      if (response.ok) {
        showToast('Préférences sauvegardées avec succès', 'success');
        onBack();
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } catch (error: any) {
      showToast('Erreur lors de la sauvegarde', 'error');
      console.error('Erreur sauvegarde préférences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser toutes les préférences aux valeurs par défaut ?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await api.notificationPreferences.reset();
      
      if (response.ok && response.preferences) {
        // Mettre à jour le state avec les nouvelles préférences
        setSettings({
          push_enabled: Boolean(response.preferences.push_enabled),
          email_enabled: Boolean(response.preferences.email_enabled),
          sms_enabled: Boolean(response.preferences.sms_enabled),
          new_reservation: Boolean(response.preferences.new_reservation),
          reservation_confirmed: Boolean(response.preferences.reservation_confirmed),
          reservation_cancelled: Boolean(response.preferences.reservation_cancelled),
          new_publication: Boolean(response.preferences.new_publication),
          new_like: Boolean(response.preferences.new_like),
          new_comment: Boolean(response.preferences.new_comment),
          new_follower: Boolean(response.preferences.new_follower),
          promotions: Boolean(response.preferences.promotions),
          tips: Boolean(response.preferences.tips)
        });
        
        showToast('Préférences réinitialisées', 'success');
      } else {
        showToast('Erreur lors de la réinitialisation', 'error');
      }
    } catch (error: any) {
      showToast('Erreur lors de la réinitialisation', 'error');
      console.error('Erreur réinitialisation préférences:', error);
    } finally {
      setLoading(false);
    }
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

  if (initialLoading) {
    return (
      <div className="max-w-md mx-auto pb-20">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement des préférences...</p>
          </div>
        </div>
      </div>
    );
  }

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
              Notifications
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez vos préférences de notifications
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Canaux de notification */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Canaux de notification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comment recevoir les notifications</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Notifications push</span>
              </div>
              <ToggleSwitch
                enabled={settings.push_enabled}
                onChange={() => setSettings({ ...settings, push_enabled: !settings.push_enabled })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">Email</span>
              </div>
              <ToggleSwitch
                enabled={settings.email_enabled}
                onChange={() => setSettings({ ...settings, email_enabled: !settings.email_enabled })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white">SMS</span>
              </div>
              <ToggleSwitch
                enabled={settings.sms_enabled}
                onChange={() => setSettings({ ...settings, sms_enabled: !settings.sms_enabled })}
              />
            </div>
          </div>
        </div>

        {/* Réservations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Réservations</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Notifications liées aux réservations</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Nouvelle réservation</span>
              <ToggleSwitch
                enabled={settings.new_reservation}
                onChange={() => setSettings({ ...settings, new_reservation: !settings.new_reservation })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Réservation confirmée</span>
              <ToggleSwitch
                enabled={settings.reservation_confirmed}
                onChange={() => setSettings({ ...settings, reservation_confirmed: !settings.reservation_confirmed })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Réservation annulée</span>
              <ToggleSwitch
                enabled={settings.reservation_cancelled}
                onChange={() => setSettings({ ...settings, reservation_cancelled: !settings.reservation_cancelled })}
              />
            </div>
          </div>
        </div>

        {/* Activité sociale */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activité sociale</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Publications et interactions</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Nouvelles publications</span>
              <ToggleSwitch
                enabled={settings.new_publication}
                onChange={() => setSettings({ ...settings, new_publication: !settings.new_publication })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Nouveaux likes</span>
              <ToggleSwitch
                enabled={settings.new_like}
                onChange={() => setSettings({ ...settings, new_like: !settings.new_like })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Nouveaux commentaires</span>
              <ToggleSwitch
                enabled={settings.new_comment}
                onChange={() => setSettings({ ...settings, new_comment: !settings.new_comment })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <span className="text-gray-900 dark:text-white">Nouveaux abonnés</span>
              <ToggleSwitch
                enabled={settings.new_follower}
                onChange={() => setSettings({ ...settings, new_follower: !settings.new_follower })}
              />
            </div>
          </div>
        </div>

        {/* Autres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Autres</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Promotions et conseils</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div>
                <div className="text-gray-900 dark:text-white">Promotions</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Offres spéciales et réductions</div>
              </div>
              <ToggleSwitch
                enabled={settings.promotions}
                onChange={() => setSettings({ ...settings, promotions: !settings.promotions })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <div>
                <div className="text-gray-900 dark:text-white">Conseils et astuces</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Optimisez votre expérience</div>
              </div>
              <ToggleSwitch
                enabled={settings.tips}
                onChange={() => setSettings({ ...settings, tips: !settings.tips })}
              />
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-3 pt-4">
          {/* Bouton de réinitialisation */}
          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser aux valeurs par défaut</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onBack}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
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
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, Trash2, X, RefreshCw, TestTube } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../store/appStore';

interface Notification {
  id: number;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  data?: any;
  sent_at: string;
  read_at?: string;
  template_nom?: string;
}

interface NotificationCenterProps {
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationCenter({ onClose, onUnreadCountChange }: NotificationCenterProps) {
  const { showToast } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.notifications.list({
        limit: 50,
        unread: filter === 'unread'
      });
      setNotifications(data);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { count } = await api.notifications.getUnreadCount();
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (error) {
      console.error('Erreur comptage notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await api.notifications.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
      showToast('Notification marquée comme lue', 'success');
    } catch (error) {
      showToast('Erreur', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await api.notifications.markAllAsRead();
      await loadNotifications();
      await loadUnreadCount();
      showToast(`${result.count} notification(s) marquée(s) comme lue(s)`, 'success');
    } catch (error) {
      showToast('Erreur', 'error');
    }
  };

  const handleDelete = async (notificationId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) return;
    
    try {
      await api.notifications.delete(notificationId);
      await loadNotifications();
      await loadUnreadCount();
      showToast('Notification supprimée', 'success');
    } catch (error) {
      showToast('Erreur de suppression', 'error');
    }
  };

  const handleCreateTest = async () => {
    try {
      await api.notifications.createTest();
      await loadNotifications();
      await loadUnreadCount();
      showToast('Notification de test créée', 'success');
    } catch (error) {
      showToast('Erreur création test', 'error');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'border-orange-200 bg-orange-50 dark:bg-orange-900/20';
      case 'error': return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      default: return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-blue-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {unreadCount} non lue(s)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadNotifications}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Filtres et Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Tout marquer lu</span>
            </button>
          )}
          
          <button
            onClick={handleCreateTest}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <TestTube className="w-4 h-4" />
            <span>Test</span>
          </button>
        </div>
      </div>

      {/* Liste des notifications */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BellOff className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  notification.is_read 
                    ? 'border-gray-200 bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600' 
                    : getTypeColor(notification.type)
                } ${!notification.is_read ? 'shadow-sm' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-lg">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className={`font-medium text-sm ${
                        notification.is_read 
                          ? 'text-gray-700 dark:text-gray-300' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {notification.titre}
                      </h4>
                      
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 hover:bg-white/50 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Marquer comme lu"
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-1 hover:bg-white/50 dark:hover:bg-gray-600 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    <p className={`text-xs mt-1 ${
                      notification.is_read 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {formatDate(notification.sent_at)}
                      </span>
                      
                      {notification.template_nom && (
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded">
                          {notification.template_nom}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

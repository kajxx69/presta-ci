import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, Send, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  LoadingSpinner, EmptyState, SectionHeader, RefreshButton, formatDate
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  titre: string;
  message: string;
  type: string;
  is_read: boolean;
  user_nom?: string;
  user_prenom?: string;
  created_at: string;
}

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type TargetRole = 'all' | 'client' | 'prestataire' | 'admin';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const { showToast } = useAppStore();

  // Notifications list
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Broadcast form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [targetRoles, setTargetRoles] = useState<Set<TargetRole>>(new Set(['all']));
  const [sending, setSending] = useState(false);

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.notifications.getAll();
      setNotifications(Array.isArray(data) ? data : data?.data || data?.notifications || []);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du chargement des notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ── Target role toggle ───────────────────────────────────────────────────

  const toggleRole = useCallback((role: TargetRole) => {
    setTargetRoles((prev) => {
      const next = new Set(prev);
      if (role === 'all') {
        // If selecting "all", clear others
        return new Set(['all']);
      }
      // Remove "all" when selecting a specific role
      next.delete('all');
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      // If nothing selected, default to "all"
      if (next.size === 0) return new Set<TargetRole>(['all']);
      return next;
    });
  }, []);

  // ── Broadcast ────────────────────────────────────────────────────────────

  const handleBroadcast = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Veuillez remplir le titre et le message', 'error');
      return;
    }
    setSending(true);
    try {
      await api.admin.notifications.broadcast({
        title: title.trim(),
        message: message.trim(),
        type,
        target_roles: Array.from(targetRoles),
      });
      showToast('Notification envoyee avec succes', 'success');
      setTitle('');
      setMessage('');
      setType('info');
      setTargetRoles(new Set(['all']));
      await loadNotifications();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'envoi", 'error');
    } finally {
      setSending(false);
    }
  }, [title, message, type, targetRoles, showToast, loadNotifications]);

  // ── Type icon mapping ────────────────────────────────────────────────────

  const typeIcon = (t: string) => {
    switch (t) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const roleOptions: { value: TargetRole; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'client', label: 'Clients' },
    { value: 'prestataire', label: 'Prestataires' },
    { value: 'admin', label: 'Admins' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Notifications" subtitle="Gestion et envoi de notifications">
        <RefreshButton onClick={loadNotifications} loading={loading} />
      </SectionHeader>

      {/* Broadcast card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Envoyer une notification globale
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Envoyez une notification a un groupe d&apos;utilisateurs
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la notification"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contenu de la notification..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Type & Roles row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="info">Information</option>
                <option value="success">Succes</option>
                <option value="warning">Avertissement</option>
                <option value="error">Erreur</option>
              </select>
            </div>

            {/* Target roles checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Destinataires
              </label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleRole(opt.value)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      targetRoles.has(opt.value)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Send button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleBroadcast}
              disabled={sending || !title.trim() || !message.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent notifications list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications recentes
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {notifications.length} notifications
          </p>
        </div>

        {loading ? (
          <LoadingSpinner message="Chargement des notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState icon={Bell} message="Aucune notification" />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                  !n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-semibold ${
                          !n.is_read
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {n.titre}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          n.is_read
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                      >
                        {n.is_read ? 'Lu' : 'Non lu'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {formatDate(n.created_at)}
                    </p>
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

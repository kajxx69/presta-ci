import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings, Shield, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Hash, Tag, AlertTriangle
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, SearchInput, LoadingSpinner, Modal,
  SectionHeader, RefreshButton
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Setting {
  key: string;
  value: any;
  description: string;
  category?: string;
}

interface NewSetting {
  key: string;
  value: string;
  description: string;
  category: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'security', label: 'Securite' },
  { value: 'payment', label: 'Paiement' },
  { value: 'notification', label: 'Notification' },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  payment: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  notification: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [newSetting, setNewSetting] = useState<NewSetting>({ key: '', value: '', description: '', category: 'general' });
  const [showResetModal, setShowResetModal] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getSettings();
      const list: Setting[] = Object.entries(data).map(([key, val]) => {
        // Detect category from key prefix
        let category = 'general';
        if (key.startsWith('security_') || key.includes('password') || key.includes('auth')) category = 'security';
        else if (key.startsWith('payment_') || key.includes('wave') || key.includes('prix')) category = 'payment';
        else if (key.startsWith('notification_') || key.includes('email') || key.includes('sms')) category = 'notification';

        return {
          key,
          value: typeof val === 'object' && val !== null && 'value' in val ? (val as any).value : val,
          description: typeof val === 'object' && val !== null && 'description' in val ? (val as any).description : '',
          category,
        };
      });
      setSettings(list);
    } catch (err: any) {
      showToast('Erreur chargement des parametres: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const filteredSettings = useMemo(() => {
    if (!search.trim()) return settings;
    const q = search.toLowerCase();
    return settings.filter(
      s => s.key.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || String(s.value).toLowerCase().includes(q)
    );
  }, [settings, search]);

  const groupedSettings = useMemo(() => {
    const groups: Record<string, Setting[]> = {};
    filteredSettings.forEach(s => {
      const cat = s.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [filteredSettings]);

  const categoriesCount = useMemo(() => new Set(settings.map(s => s.category || 'general')).size, [settings]);
  const securityCount = useMemo(() => settings.filter(s => s.category === 'security').length, [settings]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAddSetting = async () => {
    if (!newSetting.key.trim() || !newSetting.value.trim()) {
      showToast('Cle et valeur requises', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.admin.updateSetting(newSetting.key, newSetting.value, newSetting.description);
      showToast('Parametre ajoute avec succes', 'success');
      setNewSetting({ key: '', value: '', description: '', category: 'general' });
      await loadSettings();
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (key: string) => {
    setActionLoading(true);
    try {
      await api.admin.updateSetting(key, editValue);
      showToast('Parametre mis a jour', 'success');
      setEditingKey(null);
      await loadSettings();
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteKey) return;
    setActionLoading(true);
    try {
      await api.admin.deleteSetting(deleteKey);
      showToast('Parametre supprime', 'success');
      setDeleteKey(null);
      await loadSettings();
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    try {
      const result = await api.admin.resetSettings();
      showToast(`Parametres reinitialises (${result.count || 0} parametres)`, 'success');
      setShowResetModal(false);
      await loadSettings();
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const startEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    setEditValue(typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value));
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des parametres..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Parametres de l'application" subtitle="Configuration globale du systeme">
        <RefreshButton onClick={loadSettings} loading={loading} />
        <button
          onClick={() => setShowResetModal(true)}
          className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Reinitialiser
        </button>
      </SectionHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total parametres" value={settings.length} icon={Settings} color="blue" />
        <StatCard title="Categories" value={categoriesCount} icon={Tag} color="green" />
        <StatCard title="Parametres securite" value={securityCount} icon={Shield} color="red" />
      </div>

      {/* Add new setting form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ajouter un parametre</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Cle"
            value={newSetting.key}
            onChange={e => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <input
            type="text"
            placeholder="Valeur"
            value={newSetting.value}
            onChange={e => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <input
            type="text"
            placeholder="Description"
            value={newSetting.description}
            onChange={e => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <select
            value={newSetting.category}
            onChange={e => setNewSetting(prev => ({ ...prev, category: e.target.value }))}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={handleAddSetting}
            disabled={actionLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un parametre..." />

      {/* Grouped settings */}
      {Object.keys(groupedSettings).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
          Aucun parametre trouve
        </div>
      ) : (
        Object.entries(groupedSettings).map(([category, items]) => {
          const isCollapsed = collapsedCategories.has(category);
          const catLabel = CATEGORIES.find(c => c.value === category)?.label || category;
          return (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">{catLabel}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({items.length})</span>
                </div>
              </button>

              {/* Settings list */}
              {!isCollapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map(setting => (
                    <div key={setting.key} className="px-6 py-4">
                      {editingKey === setting.key ? (
                        /* Edit mode */
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{setting.key}</p>
                            <input
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(setting.key); }}
                              autoFocus
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(setting.key)}
                              disabled={actionLoading}
                              className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Sauvegarder
                            </button>
                            <button
                              onClick={() => setEditingKey(null)}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{setting.key}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLORS[setting.category || 'general'] || CATEGORY_COLORS.general}`}>
                                {catLabel}
                              </span>
                            </div>
                            {setting.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{setting.description}</p>
                            )}
                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded inline-block max-w-full truncate">
                              {typeof setting.value === 'object' ? JSON.stringify(setting.value) : String(setting.value)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => startEdit(setting)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteKey(setting.key)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Reset confirmation modal */}
      {showResetModal && (
        <Modal onClose={() => setShowResetModal(false)} title="Reinitialiser les parametres" subtitle="Confirmation">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">
                Cette action va reinitialiser tous les parametres a leurs valeurs par defaut. Cette operation est irreversible.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReset}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Confirmer la reinitialisation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteKey && (
        <Modal onClose={() => setDeleteKey(null)} title="Supprimer le parametre" subtitle="Confirmation">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Voulez-vous vraiment supprimer le parametre <span className="font-mono font-bold text-gray-900 dark:text-white">{deleteKey}</span> ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteKey(null)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

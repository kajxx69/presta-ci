import { useState, useEffect, useCallback } from 'react';
import {
  Server, Database, Trash2, Power, Activity,
  RefreshCw, FileText, AlertTriangle, CheckCircle, Info,
  HardDrive, Cpu, Search, ChevronDown, ChevronUp,
  XCircle, Shield, Zap, Archive, X
} from 'lucide-react';
import { api, API_BASE } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  LoadingSpinner, SectionHeader, RefreshButton, formatDateTime
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface SystemStatus {
  system_status: string;
  timestamp: string;
  database: {
    connected: boolean;
    collections: Array<{ name: string; count: number }>;
  };
  notifications: {
    total_notifications: number;
    notifications_non_lues: number;
    notifications_derniere_heure: number;
  };
  uptime: number;
  memory_usage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  node_version: string;
}

interface HealthCheck {
  status: string;
  timestamp: string;
  response_time_ms: number;
  checks: {
    database: boolean;
    memory: boolean;
    response_time: boolean;
    disk_space: boolean;
  };
  system_info: {
    uptime_seconds: number;
    memory_usage_percent: string;
    node_version: string;
    platform: string;
  };
}

interface BackupInfo {
  file_name: string;
  file_size_mb: string;
  created_at: string;
  modified_at?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminMaintenance() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [cacheType, setCacheType] = useState<'all' | 'sessions' | 'notifications'>('all');
  const [maintenanceMessage, setMaintenanceMessage] = useState('Maintenance en cours');
  const [maintenanceDuration, setMaintenanceDuration] = useState('');

  const LOG_LIMIT = 50;

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadSystemStatus = useCallback(async () => {
    try {
      const data = await api.admin.maintenance.getStatus();
      setSystemStatus(data as any);
    } catch { /* silent */ }
  }, []);

  const authHeaders = (): Record<string, string> => {
    const token = JSON.parse(localStorage.getItem('prestaci-auth') || '{}').token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadHealthCheck = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/health`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (res.ok) setHealthCheck(await res.json());
    } catch { /* silent */ }
  }, []);

  const loadMaintenanceMode = useCallback(async () => {
    try {
      const settings = await api.admin.getSettings();
      const modeVal = (settings as any)?.maintenance_mode?.value;
      setMaintenanceMode(modeVal === true || modeVal === 'true' || modeVal === '1' || modeVal === 1);
    } catch { /* silent */ }
  }, []);

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/maintenance/backups`, {
        headers: authHeaders(),
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data.backups) ? data.backups : []);
      }
    } catch { /* silent */ }
  }, []);

  const loadLogs = useCallback(async (page = 1, search = '') => {
    setLogsLoading(true);
    try {
      const data = await api.admin.maintenance.getLogs({
        limit: LOG_LIMIT,
        page,
        search: search || undefined,
      });
      // Backend returns { logs: string[] | string, total, page, limit, totalPages }
      const rawLogs = (data as any)?.logs;
      if (Array.isArray(rawLogs)) {
        setLogLines(rawLogs);
      } else if (typeof rawLogs === 'string' && rawLogs !== 'Aucun journal disponible') {
        setLogLines(rawLogs.split('\n').filter(Boolean));
      } else {
        setLogLines([]);
      }
      setLogTotal((data as any)?.total || 0);
      setLogPage(page);
    } catch {
      setLogLines([]);
      setLogTotal(0);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadSystemStatus(),
      loadHealthCheck(),
      loadMaintenanceMode(),
      loadBackups(),
      loadLogs(1, ''),
    ]);
    setLoading(false);
  }, [loadSystemStatus, loadHealthCheck, loadMaintenanceMode, loadBackups, loadLogs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleToggleMaintenance = async () => {
    setToggleLoading(true);
    try {
      const newMode = !maintenanceMode;
      await api.admin.maintenance.toggleMode(newMode, {
        message: maintenanceMessage,
        estimated_duration: maintenanceDuration || undefined,
      });
      setMaintenanceMode(newMode);
      showToast(
        newMode ? 'Mode maintenance active' : 'Mode maintenance desactive',
        'success'
      );
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await api.admin.maintenance.createBackup();
      showToast(
        `Sauvegarde creee: ${(result as any)?.backup_info?.file_name || 'OK'}`,
        'success'
      );
      await loadBackups();
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleClearCache = async () => {
    setCacheLoading(true);
    try {
      const result = await api.admin.maintenance.clearCache(cacheType);
      const cleared = (result as any)?.cleared_caches?.join(', ') || cacheType;
      showToast(`Cache vide: ${cleared}`, 'success');
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    } finally {
      setCacheLoading(false);
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    if (!confirm(`Supprimer la sauvegarde ${fileName} ?`)) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/maintenance/backups/${encodeURIComponent(fileName)}`,
        { method: 'DELETE', headers: authHeaders(), credentials: 'include' }
      );
      if (res.ok) {
        showToast('Sauvegarde supprimee', 'success');
        await loadBackups();
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (err: any) {
      showToast('Erreur: ' + (err.message || ''), 'error');
    }
  };

  const handleSearchLogs = () => {
    loadLogs(1, logSearch);
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  const memoryPercent = systemStatus?.memory_usage
    ? ((systemStatus.memory_usage.heapUsed / systemStatus.memory_usage.heapTotal) * 100)
    : 0;

  const totalDocs = systemStatus?.database?.collections?.reduce((s, c) => s + c.count, 0) || 0;
  const logTotalPages = Math.ceil(logTotal / LOG_LIMIT);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement de la maintenance..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Maintenance systeme" subtitle="Surveillance, sauvegardes et outils d'administration">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className={`w-2.5 h-2.5 rounded-full ${
              healthCheck?.status === 'healthy' || systemStatus?.system_status === 'operational'
                ? 'bg-green-500 animate-pulse'
                : 'bg-red-500 animate-pulse'
            }`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {healthCheck?.status === 'healthy' ? 'Sain' : systemStatus?.system_status === 'operational' ? 'Operationnel' : 'Erreur'}
            </span>
            {healthCheck?.response_time_ms !== undefined && (
              <span className="text-xs text-gray-400 ml-1">({healthCheck.response_time_ms}ms)</span>
            )}
          </div>
          <RefreshButton onClick={loadAll} loading={loading} />
        </div>
      </SectionHeader>

      {/* ── System metrics row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Uptime */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Uptime</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {systemStatus ? formatUptime(systemStatus.uptime) : '—'}
          </p>
        </div>

        {/* Memory */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Memoire</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {memoryPercent.toFixed(1)}%
          </p>
          <div className="mt-1 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                memoryPercent > 80 ? 'bg-red-500' : memoryPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(memoryPercent, 100)}%` }}
            />
          </div>
          {systemStatus?.memory_usage && (
            <p className="text-xs text-gray-400 mt-1">
              {formatBytes(systemStatus.memory_usage.heapUsed)} / {formatBytes(systemStatus.memory_usage.heapTotal)}
            </p>
          )}
        </div>

        {/* Database */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Base de donnees</span>
          </div>
          <div className="flex items-center gap-2">
            {systemStatus?.database?.connected ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {systemStatus?.database?.connected ? 'Connectee' : 'Deconnectee'}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {systemStatus?.database?.collections?.length || 0} collections — {totalDocs.toLocaleString()} docs
          </p>
        </div>

        {/* Node version */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Serveur</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {systemStatus?.node_version || '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {healthCheck?.system_info?.platform || 'N/A'}
          </p>
        </div>
      </div>

      {/* ── Collections detail (collapsible) ──────────────────────────────── */}
      {systemStatus?.database?.collections && systemStatus.database.collections.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowCollections(!showCollections)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Collections MongoDB ({systemStatus.database.collections.length})
              </span>
              <span className="text-sm text-gray-500">— {totalDocs.toLocaleString()} documents</span>
            </div>
            {showCollections ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {showCollections && (
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {systemStatus.database.collections
                  .sort((a, b) => b.count - a.count)
                  .map((col) => (
                    <div key={col.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{col.name}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">{col.count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Health checks ─────────────────────────────────────────────────── */}
      {healthCheck && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Verification de sante
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(healthCheck.checks).map(([key, ok]) => (
              <div key={key} className={`flex items-center gap-3 p-3 rounded-xl ${
                ok ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                {ok ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                <div>
                  <p className={`text-sm font-medium ${ok ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                    {key === 'database' ? 'Base de donnees' : key === 'memory' ? 'Memoire' : key === 'response_time' ? 'Temps de reponse' : key === 'disk_space' ? 'Espace disque' : key}
                  </p>
                  <p className="text-xs text-gray-500">{ok ? 'OK' : 'Probleme'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Action cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Maintenance mode */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${maintenanceMode ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <Power className={`w-6 h-6 ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Mode maintenance</h3>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className={`text-sm ${maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                  {maintenanceMode ? 'Active' : 'Desactive'}
                </span>
              </div>
            </div>
          </div>
          {/* Options when activating */}
          {!maintenanceMode && (
            <div className="space-y-2 mb-3">
              <input
                type="text"
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Message de maintenance"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                value={maintenanceDuration}
                onChange={(e) => setMaintenanceDuration(e.target.value)}
                placeholder="Duree estimee (ex: 30min, 2h)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          )}
          <button
            onClick={handleToggleMaintenance}
            disabled={toggleLoading}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              maintenanceMode
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white'
                : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white'
            }`}
          >
            {toggleLoading ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> En cours...
              </span>
            ) : maintenanceMode ? 'Desactiver la maintenance' : 'Activer la maintenance'}
          </button>
        </div>

        {/* Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <Archive className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Sauvegarde</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {backups.length > 0
                  ? `${backups.length} sauvegarde(s) existante(s)`
                  : 'Aucune sauvegarde'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={backupLoading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {backupLoading ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Creation en cours...
              </span>
            ) : 'Creer une sauvegarde complete'}
          </button>
        </div>

        {/* Cache */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <Trash2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Vider le cache</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Sessions expirees et anciennes notifications
              </p>
            </div>
          </div>
          {/* Cache type selector */}
          <div className="flex gap-1 mb-3">
            {(['all', 'sessions', 'notifications'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCacheType(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  cacheType === t
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t === 'all' ? 'Tout' : t === 'sessions' ? 'Sessions' : 'Notifs'}
              </button>
            ))}
          </div>
          <button
            onClick={handleClearCache}
            disabled={cacheLoading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {cacheLoading ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> En cours...
              </span>
            ) : 'Vider le cache'}
          </button>
        </div>
      </div>

      {/* ── Notifications stats ───────────────────────────────────────────── */}
      {systemStatus?.notifications && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Notifications systeme
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemStatus.notifications.total_notifications.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Total</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <p className="text-2xl font-bold text-orange-600">
                {systemStatus.notifications.notifications_non_lues.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">Non lues</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-2xl font-bold text-blue-600">
                {systemStatus.notifications.notifications_derniere_heure}
              </p>
              <p className="text-sm text-gray-500 mt-1">Derniere heure</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Backups list ──────────────────────────────────────────────────── */}
      {backups.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-500" />
              Sauvegardes ({backups.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {backups.map((backup) => (
              <div key={backup.file_name} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{backup.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(backup.created_at)} — {backup.file_size_mb} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBackup(backup.file_name)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Logs ──────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Logs d'application
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {logTotal} ligne(s) — page {logPage}/{Math.max(logTotalPages, 1)}
            </p>
          </div>
          <button
            onClick={() => loadLogs(logPage, logSearch)}
            disabled={logsLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLogs()}
                placeholder="Rechercher dans les logs..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleSearchLogs}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
            >
              Rechercher
            </button>
          </div>
        </div>

        {/* Log lines */}
        <div className="px-6 py-4">
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : logLines.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                Aucun log disponible
              </div>
            ) : (
              <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {logLines.map((line, i) => (
                  <div
                    key={i}
                    className={`py-1 px-2 rounded ${
                      line.toLowerCase().includes('error') ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                      line.toLowerCase().includes('warn') ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                      i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/30' : ''
                    }`}
                  >
                    <span className="text-gray-400 select-none mr-3">{((logPage - 1) * LOG_LIMIT) + i + 1}</span>
                    {line}
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>

        {/* Pagination */}
        {logTotalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => loadLogs(logPage - 1, logSearch)}
              disabled={logPage <= 1 || logsLoading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Precedent
            </button>
            <span className="text-sm text-gray-500">Page {logPage} / {logTotalPages}</span>
            <button
              onClick={() => loadLogs(logPage + 1, logSearch)}
              disabled={logPage >= logTotalPages || logsLoading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* ── Info notes ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          Notes d'administration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Power className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Mode maintenance</p>
              <p className="text-xs text-blue-700/70 dark:text-blue-400/70">Bloque l'acces utilisateur pendant les mises a jour. Un message personnalise sera affiche.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Archive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Sauvegardes</p>
              <p className="text-xs text-blue-700/70 dark:text-blue-400/70">Export complet de toutes les collections MongoDB. Recommande avant chaque mise a jour.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Trash2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-1">Cache</p>
              <p className="text-xs text-blue-700/70 dark:text-blue-400/70">Supprime les sessions expirees et les anciennes notifications lues (+90 jours).</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300 text-sm mb-1">Attention</p>
              <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70">Les actions de maintenance sont irreversibles. Creez une sauvegarde avant toute operation critique.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Briefcase, DollarSign, TrendingUp, Calendar,
  AlertTriangle, CheckCircle, Star, Clock, CreditCard,
  BarChart3, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, LoadingSpinner, SectionHeader, RefreshButton,
  formatDateTime, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '1y';

interface OverviewData {
  revenue_trend?: { period: string; amount: number }[];
  growth?: {
    new_users?: number;
    new_services?: number;
    new_reservations?: number;
    revenue?: number;
    snapshot?: { today?: number; week?: number; month?: number };
  };
  performance?: {
    completion_rate?: number;
    conversion_prestataires?: number;
    avis_rate?: number;
    note_moyenne?: number;
  };
  alerts?: { type: string; message: string; severity: 'info' | 'warning' | 'error' }[];
}

interface Reservation {
  id: number;
  client_nom?: string;
  client_prenom?: string;
  service_nom?: string;
  statut: string;
  date_reservation?: string;
  prix?: number;
  devise?: string;
  created_at: string;
}

interface WaveTransaction {
  id: number;
  prestataire_nom?: string;
  prestataire_prenom?: string;
  montant: number;
  devise?: string;
  statut: string;
  created_at: string;
  plan_nom?: string;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '1y', label: '1 an' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminStatistics() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<any>(null);
  const [overview, setOverview] = useState<OverviewData>({});
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<WaveTransaction[]>([]);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, overviewData, reservationsData, transactionsData] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.statistics.getOverview(period).catch(() => ({})),
        api.admin.reservations.getAll({ limit: 5 }).catch(() => ({ reservations: [] })),
        api.admin.getWaveTransactions({ statut: 'en_attente', limit: 5 }).catch(() => ({ transactions: [] })),
      ]);

      setStats(statsData);
      setOverview(overviewData || {});

      const resList = Array.isArray(reservationsData)
        ? reservationsData
        : reservationsData?.reservations || [];
      setRecentReservations(resList.slice(0, 5));

      const txList = Array.isArray(transactionsData)
        ? transactionsData
        : transactionsData?.transactions || [];
      setPendingTransactions(txList.slice(0, 5));
    } catch (err: any) {
      showToast('Erreur chargement statistiques: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const totalUsers = stats?.users?.total_users || 0;
  const totalPrestataires = stats?.users?.prestataires || 0;
  const revenuePeriode = overview?.growth?.revenue || 0;
  const completionRate = overview?.performance?.completion_rate || 0;

  const revenueTrend = useMemo(() => {
    const data = overview?.revenue_trend || [];
    if (data.length === 0) return [];
    const maxAmount = Math.max(...data.map(d => d.amount), 1);
    return data.map(d => ({ ...d, height: Math.max((d.amount / maxAmount) * 100, 4) }));
  }, [overview]);

  const alerts = overview?.alerts || [];

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des statistiques..." />;

  return (
    <div className="space-y-6">
      {/* Header + period selector */}
      <SectionHeader title="Statistiques avancees" subtitle="Vue d'ensemble et analyses">
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <RefreshButton onClick={loadData} loading={loading} />
        </div>
      </SectionHeader>

      {/* Main stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total utilisateurs" value={totalUsers} icon={Users} color="blue" />
        <StatCard title="Prestataires" value={totalPrestataires} icon={Briefcase} color="green" />
        <StatCard
          title="Revenu periode"
          value={formatCurrency(revenuePeriode)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Taux completion"
          value={`${completionRate}%`}
          icon={CheckCircle}
          color="orange"
        />
      </div>

      {/* Revenue trend + Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tendance des revenus</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Evolution sur la periode</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {revenueTrend.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-500 dark:text-gray-400">
              Aucune donnee de revenu disponible
            </div>
          ) : (
            <div className="flex items-end gap-1 h-48">
              {revenueTrend.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-full">
                    {formatCurrency(item.amount)}
                  </span>
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-lg transition-all duration-300 min-h-[4px]"
                    style={{ height: `${item.height}%` }}
                  />
                  <span className="text-[9px] text-gray-400 truncate max-w-full">{item.period}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Growth panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Croissance</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'Nouveaux utilisateurs', value: overview?.growth?.new_users || 0, icon: Users, color: 'text-blue-600' },
              { label: 'Nouveaux services', value: overview?.growth?.new_services || 0, icon: Briefcase, color: 'text-green-600' },
              { label: 'Nouvelles reservations', value: overview?.growth?.new_reservations || 0, icon: Calendar, color: 'text-purple-600' },
              { label: 'Revenus', value: formatCurrency(overview?.growth?.revenue || 0), icon: DollarSign, color: 'text-orange-600' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>

          {overview?.growth?.snapshot && (
            <>
              <hr className="my-4 border-gray-100 dark:border-gray-700" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase">Snapshot</p>
              <div className="space-y-2">
                {[
                  { label: "Aujourd'hui", value: overview.growth.snapshot.today || 0 },
                  { label: 'Cette semaine', value: overview.growth.snapshot.week || 0 },
                  { label: 'Ce mois', value: overview.growth.snapshot.month || 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Performance + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance & conversions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance & Conversions</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[
              {
                label: 'Taux de completion',
                value: `${overview?.performance?.completion_rate || 0}%`,
                color: 'bg-green-500',
                percent: overview?.performance?.completion_rate || 0,
              },
              {
                label: 'Conversion prestataires',
                value: `${overview?.performance?.conversion_prestataires || 0}%`,
                color: 'bg-blue-500',
                percent: overview?.performance?.conversion_prestataires || 0,
              },
              {
                label: 'Taux d\'avis',
                value: `${overview?.performance?.avis_rate || 0}%`,
                color: 'bg-purple-500',
                percent: overview?.performance?.avis_rate || 0,
              },
              {
                label: 'Note moyenne',
                value: `${overview?.performance?.note_moyenne || 0}/5`,
                color: 'bg-orange-500',
                percent: ((overview?.performance?.note_moyenne || 0) / 5) * 100,
              },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.value}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(item.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alertes</h3>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune alerte active</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const severityStyles = {
                  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
                  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                };
                const iconColor = {
                  info: 'text-blue-600',
                  warning: 'text-yellow-600',
                  error: 'text-red-600',
                };
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${severityStyles[alert.severity] || severityStyles.info}`}>
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor[alert.severity] || iconColor.info}`} />
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{alert.type}</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent reservations + Wave transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent reservations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reservations recentes</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="px-6 pb-6">
            {recentReservations.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Aucune reservation recente</p>
            ) : (
              <div className="space-y-3">
                {recentReservations.map(res => (
                  <div key={res.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {res.client_prenom} {res.client_nom}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{res.service_nom || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(res.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {res.prix != null && (
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(res.prix, res.devise)}
                        </span>
                      )}
                      <StatusBadge status={res.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wave transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transactions Wave en attente</h3>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <div className="px-6 pb-6">
            {pendingTransactions.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">Aucune transaction en attente</p>
            ) : (
              <div className="space-y-3">
                {pendingTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {tx.prestataire_prenom} {tx.prestataire_nom}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{tx.plan_nom || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(tx.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(tx.montant, tx.devise)}
                      </span>
                      <StatusBadge status={tx.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

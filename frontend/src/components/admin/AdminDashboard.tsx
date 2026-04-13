import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Package, Calendar, DollarSign, TrendingUp, BarChart3,
  AlertTriangle, Clock, Bell, Eye, CreditCard, Activity,
  CheckCircle, ArrowUpRight, Zap
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton, Card, CardHeader,
  formatDate, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  users: { total_users: number; clients: number; prestataires: number; admins: number; active_users?: number };
  services: { total_services: number; services_actifs: number; pending_approval?: number };
  reservations: { total_reservations: number; confirmees: number; en_attente: number; today?: number };
  financial?: { revenue_today: number; revenue_month: number; pending_payments: number };
  notifications: { total_notifications: number; non_lues: number };
}

interface OverviewStats {
  users?: { total: number; new_period: number; growth_percent: number };
  services?: { total: number; active: number; growth_percent: number };
  reservations?: { total: number; confirmed: number; pending: number; growth_percent: number };
  revenue?: { total: number; period_total: number; growth_percent: number; data?: { label: string; value: number }[] };
  performance?: { conversion_rate: number; avg_rating: number; avg_response_time: number };
}

interface Reservation {
  id: number;
  client_nom?: string;
  client_prenom?: string;
  service_nom?: string;
  prestataire_nom?: string;
  statut: string;
  date_reservation: string;
  prix?: number;
}

interface WaveTransaction {
  id: number;
  prestataire_nom?: string;
  plan_nom?: string;
  montant: number;
  devise?: string;
  transaction_id_wave?: string;
  statut: string;
  created_at: string;
}

type Period = '7d' | '30d' | '90d' | '1y';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [pendingWave, setPendingWave] = useState<WaveTransaction[]>([]);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, overviewData, reservationsData, waveData] = await Promise.all([
        api.admin.getStats(),
        api.admin.statistics.getOverview(period),
        api.admin.reservations.getAll({ limit: 5 }),
        api.admin.getWaveTransactions({ statut: 'en_attente', limit: 5 }),
      ]);
      setStats(statsData);
      setOverview(overviewData);
      setRecentReservations(
        Array.isArray(reservationsData) ? reservationsData : reservationsData?.reservations || []
      );
      setPendingWave(
        Array.isArray(waveData) ? waveData : waveData?.transactions || []
      );
    } catch (err: any) {
      showToast('Erreur lors du chargement du tableau de bord', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ── Computed values ──────────────────────────────────────────────────────

  const revenueData = useMemo(() => {
    return overview?.revenue?.data || [];
  }, [overview]);

  const maxRevenue = useMemo(() => {
    if (revenueData.length === 0) return 1;
    return Math.max(...revenueData.map(d => d.value), 1);
  }, [revenueData]);

  const alerts = useMemo(() => {
    const items: { icon: any; label: string; count: number; color: string }[] = [];
    if (stats?.reservations?.en_attente) {
      items.push({ icon: Clock, label: 'Reservations en attente', count: stats.reservations.en_attente, color: 'text-yellow-600' });
    }
    if (pendingWave.length > 0) {
      items.push({ icon: CreditCard, label: 'Transactions Wave en attente', count: pendingWave.length, color: 'text-orange-600' });
    }
    if (stats?.notifications?.non_lues) {
      items.push({ icon: Bell, label: 'Notifications non lues', count: stats.notifications.non_lues, color: 'text-blue-600' });
    }
    return items;
  }, [stats, pendingWave]);

  // ── Period selector ──────────────────────────────────────────────────────

  const periods: { value: Period; label: string }[] = [
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: '1y', label: '1 an' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement du tableau de bord..." />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <SectionHeader title="Tableau de bord" subtitle="Vue d'ensemble de la plateforme">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <RefreshButton onClick={loadDashboard} loading={loading} />
      </SectionHeader>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs"
          value={stats?.users?.total_users ?? 0}
          icon={Users}
          trend={overview?.users?.growth_percent}
          subtitle={`${stats?.users?.clients ?? 0} clients, ${stats?.users?.prestataires ?? 0} prestataires`}
          color="blue"
        />
        <StatCard
          title="Services actifs"
          value={stats?.services?.services_actifs ?? 0}
          icon={Package}
          trend={overview?.services?.growth_percent}
          subtitle={`${stats?.services?.total_services ?? 0} au total`}
          color="green"
        />
        <StatCard
          title="Reservations aujourd'hui"
          value={stats?.reservations?.today ?? stats?.reservations?.en_attente ?? 0}
          icon={Calendar}
          trend={overview?.reservations?.growth_percent}
          subtitle={`${stats?.reservations?.confirmees ?? 0} confirmees`}
          color="purple"
        />
        <StatCard
          title="Revenu du mois"
          value={formatCurrency(stats?.financial?.revenue_month ?? overview?.revenue?.period_total ?? 0)}
          icon={DollarSign}
          trend={overview?.revenue?.growth_percent}
          subtitle={`${formatCurrency(stats?.financial?.revenue_today ?? 0)} aujourd'hui`}
          color="orange"
        />
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vue generale */}
        <Card>
          <CardHeader title="Vue generale" icon={BarChart3} />
          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Total utilisateurs</span>
              <span className="font-semibold text-gray-900 dark:text-white">{overview?.users?.total ?? stats?.users?.total_users ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Nouveaux ({period})</span>
              <span className="font-semibold text-green-600">{overview?.users?.new_period ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Services actifs</span>
              <span className="font-semibold text-gray-900 dark:text-white">{overview?.services?.active ?? stats?.services?.services_actifs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Reservations totales</span>
              <span className="font-semibold text-gray-900 dark:text-white">{overview?.reservations?.total ?? stats?.reservations?.total_reservations ?? 0}</span>
            </div>
          </div>
        </Card>

        {/* Croissance */}
        <Card>
          <CardHeader title="Croissance" icon={TrendingUp} />
          <div className="px-6 pb-6 space-y-3">
            {[
              { label: 'Utilisateurs', value: overview?.users?.growth_percent },
              { label: 'Services', value: overview?.services?.growth_percent },
              { label: 'Reservations', value: overview?.reservations?.growth_percent },
              { label: 'Revenu', value: overview?.revenue?.growth_percent },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                <span className={`font-semibold flex items-center gap-1 ${
                  (item.value ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <ArrowUpRight className={`w-3 h-3 ${(item.value ?? 0) < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(item.value ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Performance / Conversions */}
        <Card>
          <CardHeader title="Performance" icon={Zap} />
          <div className="px-6 pb-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Taux de conversion</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(overview?.performance?.conversion_rate ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Note moyenne</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {(overview?.performance?.avg_rating ?? 0).toFixed(1)} / 5
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Temps de reponse moy.</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {overview?.performance?.avg_response_time ?? 0}h
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Reservations en attente</span>
              <span className="font-semibold text-yellow-600">
                {overview?.reservations?.pending ?? stats?.reservations?.en_attente ?? 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <Card>
          <CardHeader title="Tendance des revenus" subtitle={`Periode : ${periods.find(p => p.value === period)?.label}`} icon={BarChart3} />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-1.5 h-48">
              {revenueData.map((d, i) => {
                const heightPercent = (d.value / maxRevenue) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatCurrency(d.value)}
                    </div>
                    <div
                      className="w-full bg-blue-500 dark:bg-blue-600 rounded-t-md hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors cursor-pointer min-h-[4px]"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-center">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader title="Alertes" icon={AlertTriangle} />
          <div className="px-6 pb-6 space-y-3">
            {alerts.map((alert, i) => {
              const AlertIcon = alert.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <AlertIcon className={`w-5 h-5 ${alert.color}`} />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{alert.label}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                    {alert.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Bottom grid: Recent Reservations + Pending Wave */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reservations */}
        <Card>
          <CardHeader title="Reservations recentes" icon={Calendar} />
          <div className="px-6 pb-6">
            {recentReservations.length === 0 ? (
              <EmptyState icon={Calendar} message="Aucune reservation recente" />
            ) : (
              <div className="space-y-3">
                {recentReservations.map(res => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {res.client_prenom} {res.client_nom}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {res.service_nom} — {res.prestataire_nom}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(res.date_reservation)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {res.prix != null && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {formatCurrency(res.prix)}
                        </span>
                      )}
                      <StatusBadge status={res.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Pending Wave Transactions */}
        <Card>
          <CardHeader title="Transactions Wave en attente" icon={CreditCard} />
          <div className="px-6 pb-6">
            {pendingWave.length === 0 ? (
              <EmptyState icon={CheckCircle} message="Aucune transaction en attente" />
            ) : (
              <div className="space-y-3">
                {pendingWave.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {tx.prestataire_nom || `Transaction #${tx.id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.plan_nom} — {tx.transaction_id_wave}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(tx.montant, tx.devise || 'FCFA')}
                      </span>
                      <StatusBadge status={tx.statut} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Package,
  Star,
  Clock,
  ChevronRight,
  Sparkles,
  BellRing,
  AlertTriangle,
  Wallet,
  MessageCircle
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { api } from '../../lib/api';

interface DashboardTabProps {
  onNavigateToTab: (tab: string) => void;
}

interface DashboardStats {
  reservations_total: number;
  reservations_en_attente: number;
  reservations_confirmees: number;
  reservations_terminees: number;
  services_total: number;
  services_actifs: number;
  note_moyenne: number;
  nombre_avis: number;
  revenus_mois: number;
}

export default function DashboardTab({ onNavigateToTab }: DashboardTabProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    reservations_total: 0,
    reservations_en_attente: 0,
    reservations_confirmees: 0,
    reservations_terminees: 0,
    services_total: 0,
    services_actifs: 0,
    note_moyenne: 0,
    nombre_avis: 0,
    revenus_mois: 0,
  });
  const [recentReservations, setRecentReservations] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        // Récupérer les vraies statistiques depuis l'API
        const [statsData, recentData, analyticsData] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getRecentReservations(3),
          api.dashboard.getAnalytics().catch(() => null),
        ]);

        if (mounted) {
          setStats(statsData);
          setRecentReservations(recentData);
          setAnalytics(analyticsData);
          setLoading(false);
        }
      } catch (e: any) {
        console.error('Erreur chargement dashboard:', e);
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const conversionRate = useMemo(() => {
    if (!stats.reservations_total) return 0;
    return Math.round((stats.reservations_terminees / stats.reservations_total) * 100);
  }, [stats.reservations_total, stats.reservations_terminees]);
  const activeServicesRate = useMemo(() => {
    if (!stats.services_total) return 0;
    return Math.round((stats.services_actifs / stats.services_total) * 100);
  }, [stats.services_total, stats.services_actifs]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const formatTime = (time: string) => time?.slice(0, 5) || '--:--';

  const statCards = [
    {
      title: 'Réservations',
      value: stats.reservations_total,
      subtitle: `${stats.reservations_en_attente} en attente`,
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Services actifs',
      value: stats.services_actifs,
      subtitle: `${stats.services_total} au total`,
      icon: Package,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Note moyenne',
      value: stats.note_moyenne.toFixed(1),
      subtitle: `${stats.nombre_avis} avis`,
      icon: Star,
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'Revenus du mois',
      value: `${Math.round(stats.revenus_mois).toLocaleString()} XOF`,
      subtitle: 'Réservations terminées',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const quickActions = [
    { label: 'Ajouter service', icon: Package, tab: 'services' },
    { label: 'Calendrier', icon: Calendar, tab: 'reservations' },
    { label: 'Gérer réservations', icon: BellRing, tab: 'reservations' },
    { label: 'Voir avis', icon: MessageCircle, tab: 'reservations' }
  ];

  const alerts = useMemo(() => {
    const list: { icon: any; title: string; description: string; action?: () => void }[] = [];
    if (stats.reservations_en_attente > 0) {
      list.push({
        icon: BellRing,
        title: `${stats.reservations_en_attente} réservation(s) à confirmer`,
        description: 'Répondez rapidement pour rassurer vos clients',
        action: () => onNavigateToTab('reservations')
      });
    }
    if (!stats.services_actifs) {
      list.push({
        icon: AlertTriangle,
        title: 'Aucun service actif',
        description: 'Créez ou réactivez vos services pour être visible',
        action: () => onNavigateToTab('services')
      });
    }
    return list;
  }, [stats.reservations_en_attente, stats.services_actifs, onNavigateToTab]);

  const insightCards = [
    {
      title: 'Taux de confirmation',
      value: `${conversionRate}%`,
      description: 'Réservations terminées',
      accent: 'text-emerald-500'
    },
    {
      title: 'Services visibles',
      value: `${activeServicesRate}%`,
      description: `${stats.services_actifs}/${stats.services_total} services actifs`,
      accent: 'text-blue-500'
    },
    {
      title: 'Avis clients',
      value: stats.nombre_avis,
      description: 'Retours reçus',
      accent: 'text-amber-500'
    }
  ];

  // Les réservations récentes sont maintenant chargées dynamiquement via l'API

  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <Skeleton className="h-64 rounded-b-[3rem]" />
        <div className="px-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="px-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 px-6 py-12 rounded-b-[3rem]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                Tableau de bord
              </h1>
              <p className="text-white/90 text-sm font-medium">Vue d'ensemble de votre activité</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 mt-6 text-white/90 text-sm">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Calendar className="w-4 h-4" />
              <span>{stats.reservations_total} réservations</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Package className="w-4 h-4" />
              <span>{stats.services_actifs} services</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Star className="w-4 h-4 fill-current" />
              <span>{stats.note_moyenne.toFixed(1)}/5</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase text-white/70">Revenus du mois</p>
              <p className="text-2xl font-bold text-white flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>{Math.round(stats.revenus_mois).toLocaleString()} XOF</span>
              </p>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase text-white/70">Taux de confirmation</p>
              <div className="text-2xl font-bold text-white">{conversionRate}%</div>
              <div className="w-full bg-white/20 rounded-full h-1.5 mt-2">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur">
              <p className="text-xs uppercase text-white/70">Avis reçus</p>
              <div className="text-2xl font-bold text-white">{stats.nombre_avis}</div>
              <p className="text-xs text-white/70">N'oubliez pas de répondre</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6 max-w-6xl mx-auto">

      {/* Analyse d'activité */}
      {analytics && (
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-soft p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Analyse d'activité
            </h2>
            {analytics.comparaison?.evolution_revenus_pct !== null && analytics.comparaison?.evolution_revenus_pct !== undefined && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                analytics.comparaison.evolution_revenus_pct >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {analytics.comparaison.evolution_revenus_pct >= 0 ? '▲' : '▼'} {Math.abs(analytics.comparaison.evolution_revenus_pct)}% vs mois dernier
              </span>
            )}
          </div>

          {/* Indicateurs clés */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">{analytics.vues_profil}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Vues du profil</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">
                {analytics.taux_acceptation !== null ? `${analytics.taux_acceptation}%` : '—'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Taux d'acceptation</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40">
              <p className="text-xl font-extrabold text-gray-900 dark:text-white">{analytics.comparaison?.reservations_mois_courant ?? 0}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Résa ce mois</p>
            </div>
          </div>

          {/* Revenus 6 derniers mois (mini bar chart) */}
          {Array.isArray(analytics.revenus_par_mois) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Revenus — 6 derniers mois</p>
              <div className="flex items-end gap-2 h-24">
                {(() => {
                  const max = Math.max(1, ...analytics.revenus_par_mois.map((m: any) => m.revenus));
                  return analytics.revenus_par_mois.map((m: any, i: number) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-gray-400 font-medium">
                        {m.revenus > 0 ? `${Math.round(m.revenus / 1000)}k` : ''}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-purple-500 min-h-[3px] transition-all"
                        style={{ height: `${Math.max(4, (m.revenus / max) * 100)}%` }}
                        title={`${m.revenus.toLocaleString()} XOF`}
                      />
                      <span className="text-[10px] text-gray-400">{m.mois}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Créneaux les plus demandés */}
          {analytics.creneaux_populaires?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Créneaux les plus demandés</p>
              <div className="flex flex-wrap gap-2">
                {analytics.creneaux_populaires.map((c: any) => (
                  <span key={c.heure} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    {c.heure} · {c.count} demande{c.count > 1 ? 's' : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
                  <p className="text-xs text-gray-400">{card.subtitle}</p>
                </div>
                <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Actions rapides</h2>
          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigateToTab(action.tab)}
                className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <Icon className="w-5 h-5 mb-2 text-blue-600 dark:text-blue-300" />
                <span className="text-xs font-semibold text-center text-gray-700 dark:text-gray-200">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {insightCards.map(card => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <p className="text-xs text-gray-500">{card.title}</p>
            <p className={`text-2xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      {!!alerts.length && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Priorités du jour</h2>
            <span className="text-xs text-gray-500">{alerts.length} action{alerts.length > 1 ? 's' : ''}</span>
          </div>
          {alerts.map((alert, idx) => {
            const Icon = alert.icon;
            return (
              <button
                key={idx}
                className="w-full flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                onClick={alert.action}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            );
          })}
        </div>
      )}

      {/* Réservations récentes */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Réservations récentes</h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 text-blue-800 dark:text-blue-200">
              {recentReservations.length}
            </span>
          </div>
          <button 
            onClick={() => onNavigateToTab('reservations')}
            className="group text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold flex items-center space-x-1 transition-all"
          >
            <span>Tout voir</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="space-y-3">
          {recentReservations.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8 border border-dashed rounded-2xl">
              Aucune activité récente. Encouragez vos clients à réserver !
            </div>
          ) : recentReservations.map((reservation, index) => (
            <div
              key={reservation.id}
              className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-100 dark:border-gray-600"
            >
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                <div className="relative">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                    {reservation.client_prenom?.[0] || reservation.client_nom?.[0] || 'C'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {reservation.client_prenom} {reservation.client_nom}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{reservation.service_nom}</p>
                </div>
              </div>
              
                <div className="hidden sm:flex items-center space-x-4 text-sm">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">{formatDate(reservation.date_reservation)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-500 mt-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-xs">{formatTime(reservation.heure_debut)}</span>
                    </div>
                  </div>
                
                {reservation.statut_nom === 'confirmee' ? (
                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md">
                    ✓ Confirmé
                  </span>
                ) : reservation.statut_nom === 'en_attente' ? (
                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-md animate-pulse">
                    ⏱ En attente
                  </span>
                ) : reservation.statut_nom === 'terminee' ? (
                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md">
                    ✅ Terminé
                  </span>
                ) : (
                  <span className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-md">
                    {reservation.statut_nom}
                  </span>
                )}
              </div>
              
              {/* Mobile status */}
              <div className="sm:hidden">
                {reservation.statut_nom === 'confirmee' ? (
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
                ) : reservation.statut_nom === 'en_attente' ? (
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 animate-pulse"></div>
                ) : reservation.statut_nom === 'terminee' ? (
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 rounded-3xl p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        <div className="relative z-10 flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
              <span>Boostez votre visibilité</span>
              <span className="text-2xl">🚀</span>
            </h3>
            <p className="text-white/90 mb-4">
              Passez à Premium pour publier plus de services et apparaître en priorité.
            </p>
            <button 
              onClick={() => onNavigateToTab('plans')}
              className="px-6 py-3 rounded-xl bg-white text-purple-600 font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Voir les plans Premium
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

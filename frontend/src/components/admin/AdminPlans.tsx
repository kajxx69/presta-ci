import { useState, useEffect, useCallback } from 'react';
import { Package, Check, Crown } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton,
  formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  nom: string;
  description: string;
  prix: number;
  devise: string;
  duree_jours: number;
  max_services?: number;
  max_photos_per_service?: number;
  is_active: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPlans() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.plans.getAll(true);
      const list = Array.isArray(data) ? data : data?.plans || [];
      setPlans(list);
    } catch (err: any) {
      showToast('Erreur chargement des plans: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des plans..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Plans d'abonnement" subtitle={`${plans.length} plan(s) configures`}>
        <RefreshButton onClick={loadPlans} loading={loading} />
      </SectionHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total plans"
          value={plans.length}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Plans actifs"
          value={plans.filter(p => p.is_active).length}
          icon={Check}
          color="green"
        />
        <StatCard
          title="Plan le plus cher"
          value={plans.length > 0 ? formatCurrency(Math.max(...plans.map(p => p.prix)), plans[0]?.devise || 'FCFA') : '—'}
          icon={Crown}
          color="purple"
        />
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <EmptyState icon={Package} message="Aucun plan d'abonnement configure" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Plan header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.nom}</h3>
                  <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="px-6 py-4 border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(plan.prix, plan.devise || 'FCFA')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  pour {plan.duree_jours} jour{plan.duree_jours > 1 ? 's' : ''}
                </p>
              </div>

              {/* Features */}
              <div className="p-6 pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    Max services :{' '}
                    <span className="font-medium">
                      {plan.max_services != null ? plan.max_services : 'Illimite'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    Max photos/service :{' '}
                    <span className="font-medium">
                      {plan.max_photos_per_service != null ? plan.max_photos_per_service : 'Illimite'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    Duree : <span className="font-medium">{plan.duree_jours} jours</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

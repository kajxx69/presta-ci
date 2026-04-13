import { useEffect, useState } from 'react';
import { Check, Crown, Zap, Star, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import WavePaymentModal from './WavePaymentModal';

interface PlanInfo {
  id: number;
  nom: string;
  prix: number;
  prix_promo?: number | null;
  devise: string;
  max_services: number;
  max_reservations_mois?: number | null;
  mise_en_avant?: boolean | number | null;
  description?: string | null;
  avantages: string[];
  is_popular?: boolean;
  max_photos_par_service?: number;
  features?: string[];
}

const parseList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      // fallback split by newline or comma
      return trimmed
        .replace(/[\[\]]/g, '')
        .split(/[\n,;]/)
        .map((v) => v.replace(/['"]/g, '').trim())
        .filter(Boolean);
    }
  }
  return [];
};

const normalizePlan = (plan: any): PlanInfo => ({
  ...plan,
  prix_promo: plan.prix_promo ?? null,
  max_reservations_mois: plan.max_reservations_mois ?? null,
  mise_en_avant: plan.mise_en_avant ?? null,
  description: plan.description ?? null,
  avantages: parseList(plan.avantages)
});

export default function PlansTab() {
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [plansData, subData, transactionData] = await Promise.all([
          api.subscription.getPlans(),
          api.subscription.getCurrent(),
          api.waveTransactions.getStatus()
        ]);
        if (!mounted) return;
        setPlans(plansData.map(normalizePlan));
        setCurrentPlan(subData.subscription);
        setTransactionStatus(transactionData);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const daysLeft = currentPlan?.abonnement_expires_at
    ? Math.ceil(
        (new Date(currentPlan.abonnement_expires_at).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const isExpired = typeof daysLeft === 'number' && daysLeft < 0;
  const isEndingSoon = typeof daysLeft === 'number' && daysLeft >= 0 && daysLeft <= 7;

  const planStats = currentPlan
    ? [
        {
          label: 'Plan actif',
          value: currentPlan.plan_nom || 'Non défini',
          detail: daysLeft !== null
            ? daysLeft >= 0
              ? `Expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
              : 'Expiré - renouvelez vite'
            : 'Sans date de fin'
        },
        {
          label: 'Services autorisés',
          value: currentPlan.max_services < 0 ? 'Illimité' : currentPlan.max_services,
          detail: currentPlan.max_services < 0 ? 'Publiez sans limite' : 'Services actifs au même moment'
        },
        {
          label: 'Réservations mensuelles',
          value: currentPlan.max_reservations_mois ?? 'Standard',
          detail: currentPlan.max_reservations_mois
            ? `${currentPlan.max_reservations_mois} réservations incluses`
            : 'Limite par défaut'
        }
      ]
    : [];

  const comparisonFeatures: {
    label: string;
    getValue: (plan: PlanInfo, index: number) => string;
  }[] = [
    {
      label: 'Services actifs',
      getValue: (plan) => (plan.max_services < 0 ? 'Illimité' : `${plan.max_services}`)
    },
    {
      label: 'Réservations / mois',
      getValue: (plan) => (plan.max_reservations_mois && plan.max_reservations_mois > 0 ? `${plan.max_reservations_mois}` : plan.max_reservations_mois === -1 ? 'Illimité' : 'Standard')
    },
    {
      label: 'Photos / service',
      getValue: (plan) => `${plan.max_photos_par_service || 3}`
    },
    {
      label: 'Badge vérifié',
      getValue: (plan) => (plan.features?.includes('verified_badge') ? '✓' : '—')
    },
    {
      label: 'Mise en avant',
      getValue: (plan) => (plan.mise_en_avant ? '✓' : '—')
    },
    {
      label: 'Support',
      getValue: (_plan, index) => index === 0 ? 'Communauté' : index === 1 ? 'WhatsApp' : index === 2 ? 'Prioritaire' : 'VIP dédié'
    }
  ];

  const handleSelectPlan = (plan: PlanInfo) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async () => {
    // Recharger le statut des transactions
    try {
      const transactionData = await api.waveTransactions.getStatus();
      setTransactionStatus(transactionData);
    } catch (e: any) {
      console.error('Erreur rechargement statut:', e);
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('elite')) return Crown;
    if (name.includes('business')) return TrendingUp;
    if (name.includes('pro')) return Zap;
    return Star;
  };

  const getPlanColor = (index: number) => {
    const colors = [
      {
        gradient: 'from-gray-400 to-gray-500',
        bg: 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        button: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
      },
      {
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        button: 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
      },
      {
        gradient: 'from-purple-500 to-pink-500',
        bg: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        button: 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
      },
      {
        gradient: 'from-amber-500 to-orange-500',
        bg: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        button: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700'
      }
    ];
    return colors[index % colors.length];
  };

  if (loading && !plans.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choisissez votre plan
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Développez votre activité avec nos plans adaptés à vos besoins. Plus de services, plus de visibilité !
        </p>
      </div>

      {currentPlan && (
        <div className="grid gap-4 md:grid-cols-3">
          {planStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.detail}</p>
            </div>
          ))}
        </div>
      )}

      {isEndingSoon && !isExpired && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 flex items-start space-x-3">
          <Clock className="w-5 h-5 text-orange-500 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-700 dark:text-orange-300">Votre abonnement arrive à expiration</p>
            <p className="text-sm text-orange-600 dark:text-orange-200">
              Il reste {daysLeft} jour{Number(daysLeft) > 1 ? 's' : ''}. Renouvelez dès maintenant pour éviter de perdre vos avantages premium.
            </p>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">Abonnement expiré</p>
            <p className="text-sm text-red-600 dark:text-red-200">
              Certaines fonctionnalités sont limitées. Choisissez à nouveau un plan pour réactiver vos services.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      {currentPlan && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                Abonnement actuel : {currentPlan.plan_nom}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Services max: {currentPlan.max_services < 0 ? 'Illimité' : currentPlan.max_services}
                </span>
                {currentPlan.abonnement_expires_at && (
                  <span>
                    Expire le {new Date(currentPlan.abonnement_expires_at).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(plan.nom);
          const colors = getPlanColor(index);
          const isCurrentPlan = currentPlan?.plan_nom === plan.nom;
          const isPopular = !!plan.is_popular;
          const hasPromo = !!(plan.prix_promo && plan.prix_promo < plan.prix);
          const displayPrice = hasPromo ? plan.prix_promo! : plan.prix;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border-2 ${colors.border} bg-gradient-to-br ${colors.bg} p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
                isPopular ? 'lg:-mt-4 lg:scale-105' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${colors.button} text-white shadow-lg`}>
                    ⭐ POPULAIRE
                  </span>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                    ✓ Actif
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg mb-4`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.nom}</h3>
                <div className="flex items-center justify-center space-x-2">
                  {hasPromo && (
                    <span className="text-sm text-gray-400 line-through">
                      {plan.prix.toLocaleString()} {plan.devise}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {displayPrice.toLocaleString()}
                  </span>
                  <span className="text-lg text-gray-600 dark:text-gray-400">{plan.devise}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">par mois</p>
                {plan.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{plan.description}</p>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                  {plan.max_reservations_mois && (
                    <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                      Jusqu'à {plan.max_reservations_mois} réservations/mois
                    </span>
                  )}
                  {plan.mise_en_avant ? (
                    <span className="px-3 py-1 rounded-full bg-white/70 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                      Mise en avant incluse
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700">
                      Mise en avant optionnelle
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>{plan.max_services < 0 ? 'Illimité' : plan.max_services}</strong> {plan.max_services === 1 ? 'service' : 'services'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Gestion des réservations</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Statistiques détaillées</span>
                </div>

                {index > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">Badges de mise en avant</span>
                  </div>
                )}

                {index > 1 && (
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">Support prioritaire</span>
                  </div>
                )}

                {plan.avantages.length > 0 && (
                  <div className="pt-4 border-t border-white/60 dark:border-gray-700">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Avantages clés</p>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {plan.avantages.map((item, idx) => (
                        <li key={`${plan.id}-adv-${idx}`} className="flex items-start space-x-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || loading || (transactionStatus?.hasTransaction && transactionStatus.transaction.statut === 'en_attente')}
                className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isCurrentPlan
                    ? 'bg-gray-400 cursor-not-allowed'
                    : transactionStatus?.hasTransaction && transactionStatus.transaction.statut === 'en_attente'
                    ? 'bg-orange-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${colors.button} hover:scale-[1.02]`
                }`}
              >
                {isCurrentPlan 
                  ? 'Plan actuel' 
                  : transactionStatus?.hasTransaction && transactionStatus.transaction.statut === 'en_attente'
                  ? 'En attente de validation'
                  : loading 
                  ? 'Chargement...' 
                  : 'Choisir ce plan'
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* Features comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Pourquoi passer à un plan premium ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
            <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Plus de visibilité</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Apparaissez en tête des résultats et attirez plus de clients
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
            <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Augmentez vos revenus</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Plus de services = plus de réservations = plus de revenus
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
            <div className="inline-flex p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 mb-4">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Badges exclusifs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Affichez votre statut premium et gagnez en crédibilité
            </p>
          </div>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Comparatif express</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Visualisez en un coup d'œil les limites et avantages clés de chaque plan.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3">
                    Caractéristiques
                  </th>
                  {plans.map((plan) => (
                    <th key={`feature-${plan.id}`} className="text-left text-sm font-semibold text-gray-900 dark:text-white py-3 px-3">
                      {plan.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.label}>
                    <td className="py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{feature.label}</td>
                    {plans.map((plan, idx) => (
                      <td key={`${plan.id}-${feature.label}`} className="py-3 px-3 text-sm text-gray-800 dark:text-gray-200">
                        {feature.getValue(plan, idx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction Status */}
      {transactionStatus?.hasTransaction && (
        <div className="mt-8">
          <div className={`rounded-2xl border p-6 ${
            transactionStatus.transaction.statut === 'en_attente' 
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : transactionStatus.transaction.statut === 'valide'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-xl ${
                transactionStatus.transaction.statut === 'en_attente' 
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                  : transactionStatus.transaction.statut === 'valide'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {transactionStatus.transaction.statut === 'en_attente' ? (
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                ) : transactionStatus.transaction.statut === 'valide' ? (
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-lg mb-2 ${
                  transactionStatus.transaction.statut === 'en_attente' 
                    ? 'text-orange-800 dark:text-orange-200'
                    : transactionStatus.transaction.statut === 'valide'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {transactionStatus.transaction.statut === 'en_attente' && 'Demande en attente de validation'}
                  {transactionStatus.transaction.statut === 'valide' && 'Abonnement activé'}
                  {transactionStatus.transaction.statut === 'rejete' && 'Demande rejetée'}
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Plan :</strong> {transactionStatus.transaction.plan_nom}</p>
                  <p><strong>Montant :</strong> {transactionStatus.transaction.montant} {transactionStatus.transaction.devise}</p>
                  <p><strong>ID Transaction Wave :</strong> {transactionStatus.transaction.transaction_id_wave}</p>
                  <p><strong>Date de demande :</strong> {new Date(transactionStatus.transaction.created_at).toLocaleDateString('fr-FR')}</p>
                  {transactionStatus.transaction.statut === 'en_attente' && (
                    <p className="text-orange-700 dark:text-orange-300 font-medium">
                      Votre demande sera validée par un administrateur sous 24h.
                    </p>
                  )}
                  {transactionStatus.transaction.statut === 'rejete' && transactionStatus.transaction.motif_rejet && (
                    <p className="text-red-700 dark:text-red-300">
                      <strong>Motif du rejet :</strong> {transactionStatus.transaction.motif_rejet}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wave Payment Modal */}
      <WavePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plan={selectedPlan}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

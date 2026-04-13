import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  DollarSign,
  Image as ImageIcon,
  RefreshCw,
  AlertTriangle,
  Crown,
  Check,
  Info,
  ChevronRight
} from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { useAppStore } from '../../store/appStore';
import { api, API_BASE } from '../../lib/api';
import ServiceForm from './ServiceForm';

interface ServicesTabProps {
  onNavigateToTab?: (tab: string) => void;
}

export default function ServicesTab({ onNavigateToTab }: ServicesTabProps) {
  const { showToast } = useAppStore();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      setLoading(true);
      setPlanError(null);
      const [servicesData, subscriptionData] = await Promise.all([
        api.services.list(),
        api.subscription.getCurrent().catch((err: any) => {
          console.warn('Subscription fetch failed', err);
          return { subscription: null };
        })
      ]);
      setServices(servicesData);
      setSubscription(subscriptionData?.subscription || null);
    } catch (e: any) {
      console.error('Erreur chargement services:', e);
      showToast('Erreur de chargement', 'error');
      setPlanError(e?.message || null);
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceStatus = async (serviceId: number) => {
    try {
      // Trouver le service actuel pour obtenir son statut
      const currentService = services.find(s => s.id === serviceId);
      if (!currentService) {
        showToast('Service introuvable dans la liste', 'error');
        return;
      }
      
      console.log('Toggling service:', serviceId, 'Current status:', currentService.is_active);
      
      // Mettre à jour le service avec le statut inversé
      await api.services.update(serviceId, { is_active: !currentService.is_active });
      
      setServices(services.map(s => 
        s.id === serviceId ? { ...s, is_active: !s.is_active } : s
      ));
      showToast(`Service ${!currentService.is_active ? 'activé' : 'masqué'} avec succès`, 'success');
    } catch (e: any) {
      console.error('Erreur toggle service:', e);
      
      // Gestion des erreurs spécifiques
      const errorMessage = e.message || 'Erreur';
      
      if (errorMessage.includes('403') || errorMessage.includes('droits')) {
        showToast('Vous ne pouvez modifier que vos propres services', 'error');
        // Recharger la liste pour s'assurer qu'on a les bons services
        loadContext();
      } else if (errorMessage.includes('404')) {
        showToast('Ce service n\'existe pas ou ne vous appartient pas', 'error');
        loadContext();
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const deleteService = async (serviceId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;
    
    try {
      const response = await api.services.delete(serviceId);
      console.log('Delete response:', response);
      
      if (response.deactivated) {
        // Le service a été désactivé au lieu d'être supprimé
        setServices(services.map(s => 
          s.id === serviceId ? { ...s, is_active: false } : s
        ));
        showToast('Service désactivé (des réservations existent)', 'info');
      } else if (response.deleted) {
        // Le service a été complètement supprimé
        setServices(services.filter(s => s.id !== serviceId));
        showToast('Service supprimé avec succès', 'success');
      } else {
        showToast(response.message || 'Action effectuée', 'info');
      }
    } catch (e: any) {
      console.error('Erreur suppression service:', e);
      const errorMessage = e.message || 'Erreur lors de la suppression';
      
      // Extraire le message d'erreur du backend si disponible
      if (errorMessage.includes('lié à d\'autres données')) {
        showToast('Ce service ne peut pas être supprimé car il a des réservations. Utilisez le bouton Masquer pour le désactiver.', 'error');
      } else {
        showToast(errorMessage, 'error');
      }
    }
  };

  const planName = subscription?.plan_nom || 'Standard';
  const maxServices = subscription?.max_services ?? 0;
  const isUnlimitedPlan = typeof maxServices !== 'number' || maxServices < 0;
  const planExpired = subscription?.abonnement_expires_at
    ? new Date(subscription.abonnement_expires_at).getTime() < Date.now()
    : false;
  const limitReached = !isUnlimitedPlan && services.length >= maxServices;
  const remainingSlots = isUnlimitedPlan ? Infinity : Math.max(maxServices - services.length, 0);

  const planBenefitsMap: Record<string, string[]> = {
    starter: [
      '2 services mis en avant',
      'Paiement Wave inclus',
      'Support standard'
    ],
    pro: [
      '10 services visibles simultanément',
      'Réservations illimitées',
      'Mise en avant hebdomadaire'
    ],
    premium: [
      'Services illimités',
      'Badge vérifié & boost recherche',
      'Support prioritaire + stats détaillées'
    ],
    business: [
      'Equipe multi-comptes',
      'Campagnes de promotion personnalisées',
      'Gestionnaire dédié'
    ]
  };
  const perks = useMemo(() => {
    const key = planName.toLowerCase();
    return planBenefitsMap[key] || [
      'Visibilité sur PrestaCI',
      'Réservations en ligne',
      'Accès à Wave pour les paiements'
    ];
  }, [planName]);

  const goToPlans = () => {
    if (onNavigateToTab) {
      onNavigateToTab('plans');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenAddModal = () => {
    if (planExpired) {
      showToast('Votre abonnement est expiré. Renouvelez-le pour ajouter des services.', 'error');
      goToPlans();
      return;
    }
    if (limitReached) {
      showToast('Limite de services atteinte. Passez à un plan supérieur pour en ajouter.', 'error');
      goToPlans();
      return;
    }
    setEditingService(null);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (service: any) => {
    setEditingService(service);
    setShowFormModal(true);
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingService(null);
  };

  const handleSubmitService = async (data: any) => {
    try {
      if (editingService) {
        await api.services.update(editingService.id, data);
        setServices(services.map(s => 
          s.id === editingService.id ? { ...s, ...data } : s
        ));
        showToast('Service modifié avec succès', 'success');
      } else {
        const result = await api.services.create(data);
        const newService = { id: result.id, ...data, photos: [] };
        setServices([...services, newService]);
        showToast('Service créé avec succès', 'success');
      }
      void loadContext();
      handleCloseModal();
    } catch (e: any) {
      const msg = e?.message || 'Erreur lors de l\'enregistrement';
      if (msg.toLowerCase().includes('limite de services')) {
        showToast('Vous avez atteint la limite de services de votre plan.', 'error');
        goToPlans();
      } else {
        showToast(msg, 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 max-w-6xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mes Services
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            {services.length} service{services.length > 1 ? 's' : ''} •{' '}
            {services.filter(s => s.is_active).length} actif{services.filter(s => s.is_active).length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadContext}
            disabled={loading}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            disabled={limitReached || planExpired}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 ${
              limitReached || planExpired
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105'
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>{limitReached ? 'Limite atteinte' : 'Ajouter un service'}</span>
          </button>
        </div>
      </div>

      {/* Subscription info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400">Plan actuel</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{planName}</p>
            </div>
          </div>
          {planExpired ? (
            <div className="flex items-start space-x-2 text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <p>Votre abonnement est expiré. Renouvelez-le pour réactiver vos services.</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{services.length} / {isUnlimitedPlan ? '∞' : maxServices} services</span>
                {!isUnlimitedPlan && <span>{remainingSlots} restant(s)</span>}
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div
                  className={`h-full rounded-full ${limitReached ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{
                    width: `${Math.min(100, isUnlimitedPlan ? 100 : (services.length / maxServices) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
          <button
            onClick={goToPlans}
            className="inline-flex items-center space-x-2 text-sm font-semibold text-blue-600 dark:text-blue-400"
          >
            <span>Voir les abonnements</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-2 mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Info className="w-4 h-4" />
            <span>Avantages de votre plan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {perks.map((perk, idx) => (
              <span
                key={idx}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <Check className="w-3 h-3 text-emerald-500" />
                <span>{perk}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {planError && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-sm text-red-600 dark:text-red-400">
          {planError}
        </div>
      )}
      {limitReached && !planExpired && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-sm text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Limite atteinte</p>
              <p>Vous avez atteint le nombre maximum de services inclus dans votre abonnement.</p>
            </div>
          </div>
          <button
            onClick={goToPlans}
            className="px-4 py-2 rounded-xl bg-white text-yellow-700 font-semibold shadow"
          >
            Améliorer mon plan
          </button>
        </div>
      )}

      {/* Services Grid */}
      {services.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 mb-4">
            <Plus className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucun service pour le moment
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Commencez par ajouter votre premier service
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Ajouter un service
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 overflow-hidden">
                {service.photos && service.photos[0] ? (
                  <img
                    src={service.photos[0]}
                    alt={service.nom}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                {/* Status badge */}
                <div className="absolute top-3 left-3">
                  {service.is_active ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
                      ✓ Actif
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-lg">
                      Inactif
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">
                  {service.nom}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {service.description}
                </p>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span>Prix</span>
                    </div>
                    <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {service.prix.toLocaleString()} {service.devise}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>Durée</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {service.duree_minutes} min
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleServiceStatus(service.id)}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    {service.is_active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {service.is_active ? 'Masquer' : 'Activer'}
                    </span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(service)}
                    className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteService(service.id)}
                    className="p-2 rounded-xl bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Service Form Modal */}
      {showFormModal && (
        <ServiceForm
          service={editingService}
          onClose={handleCloseModal}
          onSubmit={handleSubmitService}
        />
      )}
    </div>
  );
}

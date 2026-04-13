import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

interface WavePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSuccess: () => void;
}

export default function WavePaymentModal({ isOpen, onClose, plan, onSuccess }: WavePaymentModalProps) {
  const { showToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transaction_id_wave: '',
    duree_abonnement_jours: 30
  });

  // Calculer le prix en fonction de la durée (prix de base = 1 mois)
  const calculatePrice = (durationDays: number) => {
    if (!plan) return 0;
    const basePrice = plan.prix; // Prix pour 1 mois (30 jours)
    const months = durationDays / 30;
    return Math.round(basePrice * months);
  };

  // Calculer la date d'expiration
  const calculateExpirationDate = (durationDays: number) => {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);
    return expirationDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const currentPrice = calculatePrice(formData.duree_abonnement_jours);
  const expirationDate = calculateExpirationDate(formData.duree_abonnement_jours);

  if (!isOpen || !plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.transaction_id_wave.trim()) {
      showToast('Veuillez saisir l\'ID de transaction Wave', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const response = await api.waveTransactions.create({
        plan_id: plan.id,
        transaction_id_wave: formData.transaction_id_wave.trim(),
        montant: currentPrice, // Utiliser le prix calculé dynamiquement
        devise: plan.devise || 'FCFA',
        duree_abonnement_jours: formData.duree_abonnement_jours
      });

      if (response.ok) {
        showToast('Demande d\'abonnement soumise avec succès !', 'success');
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          transaction_id_wave: '',
          duree_abonnement_jours: 30
        });
      }
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de la soumission', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Paiement Wave
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Plan Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{plan.nom}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.max_services} services maximum
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Montant à payer :</span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {currentPrice.toLocaleString()} {plan.devise || 'FCFA'}
              </span>
            </div>
            {formData.duree_abonnement_jours > 30 && plan && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                Prix de base: {plan.prix.toLocaleString()} FCFA/mois
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  Instructions de paiement
                </h4>
                <ol className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-decimal list-inside">
                  <li>Effectuez le paiement via Wave Money</li>
                  <li>Montant : <strong>{currentPrice.toLocaleString()} FCFA</strong></li>
                  <li>Copiez l'ID de transaction Wave ci-dessous</li>
                  <li>Votre abonnement sera activé après validation par l'admin</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ID de transaction Wave *
              </label>
              <input
                type="text"
                value={formData.transaction_id_wave}
                onChange={(e) => setFormData({ ...formData, transaction_id_wave: e.target.value })}
                placeholder="Ex: TXN123456789"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Saisissez l'ID de transaction fourni par Wave après le paiement
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Durée d'abonnement
              </label>
              <select
                value={formData.duree_abonnement_jours}
                onChange={(e) => setFormData({ ...formData, duree_abonnement_jours: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={30}>1 mois (30 jours) - {plan?.prix?.toLocaleString() || 0} FCFA</option>
                <option value={90}>3 mois (90 jours) - {calculatePrice(90).toLocaleString()} FCFA</option>
                <option value={180}>6 mois (180 jours) - {calculatePrice(180).toLocaleString()} FCFA</option>
                <option value={365}>1 an (365 jours) - {calculatePrice(365).toLocaleString()} FCFA</option>
              </select>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300">
                    <strong>Expiration :</strong> {expirationDate}
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 font-semibold">
                    {currentPrice.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Success Info */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">
                    Après soumission
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Votre demande sera en attente de validation. Un administrateur vérifiera votre paiement et activera votre abonnement sous 24h.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-4 py-3 rounded-xl transition-colors text-white ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? 'Soumission...' : 'Soumettre la demande'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: { id: number; nom: string; prix: number; prix_promo?: number | null; max_services: number } | null;
  durees: number[];
  /** Ouvre le flux Wave manuel (saisie d'ID + validation admin) */
  onChooseWaveManuel: () => void;
}

const LIBELLES: Record<number, string> = { 30: '1 mois', 90: '3 mois', 180: '6 mois', 365: '1 an' };
const MOYENS = ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Carte bancaire'];

// Même règle que le serveur (utils/geniuspay.ts → montantPour)
const prixMensuel = (p: { prix: number; prix_promo?: number | null }) =>
  typeof p.prix_promo === 'number' && p.prix_promo > 0 && p.prix_promo < p.prix ? p.prix_promo : p.prix;

export default function PaiementEnLigneModal({ isOpen, onClose, plan, durees, onChooseWaveManuel }: Props) {
  const { showToast } = useAppStore();
  const [duree, setDuree] = useState(30);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !plan) return null;

  const mensuel = prixMensuel(plan);
  const montant = Math.round(mensuel * (duree / 30));

  const payer = async () => {
    try {
      setLoading(true);
      const { checkout_url } = await api.paiements.checkout({ plan_id: plan.id, duree_abonnement_jours: duree });
      window.location.href = checkout_url; // page de paiement sécurisée GeniusPay
    } catch (e: any) {
      let msg = 'Impossible de démarrer le paiement. Réessayez.';
      try { msg = JSON.parse(String(e.message).replace(/^HTTP \d+: /, '')).error || msg; } catch { /* message brut */ }
      showToast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Activer le plan {plan.nom}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" aria-label="Fermer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Durée</p>
            <div className="grid grid-cols-2 gap-2">
              {durees.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuree(d)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    duree === d
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{LIBELLES[d] || `${d} jours`}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{Math.round(mensuel * (d / 30)).toLocaleString('fr-FR')} FCFA</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total à payer</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{montant.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <button
            type="button"
            onClick={payer}
            disabled={loading}
            className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? 'Redirection vers le paiement…' : `Payer ${montant.toLocaleString('fr-FR')} FCFA`}
          </button>

          <div className="space-y-2">
            <div className="flex flex-wrap justify-center gap-1.5">
              {MOYENS.map((m) => (
                <span key={m} className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{m}</span>
              ))}
            </div>
            <p className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Paiement sécurisé par GeniusPay — activation immédiate
            </p>
          </div>

          <button
            type="button"
            onClick={onChooseWaveManuel}
            className="w-full text-center text-sm text-gray-500 dark:text-gray-400 underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Vous avez déjà envoyé l'argent par Wave ? Saisir l'ID de transaction
          </button>
        </div>
      </div>
    </div>
  );
}

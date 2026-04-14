import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Send, Loader2, CheckCircle, Camera, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

interface SignalementModalProps {
  open: boolean;
  onClose: () => void;
  typeCible: 'prestataire' | 'service' | 'publication' | 'utilisateur';
  cibleId: number;
  cibleNom?: string;
}

const motifs = [
  { value: 'arnaque', label: 'Arnaque / Escroquerie', icon: '💰' },
  { value: 'comportement_inapproprie', label: 'Comportement inapproprié', icon: '😤' },
  { value: 'contenu_offensant', label: 'Contenu offensant', icon: '🚫' },
  { value: 'service_non_conforme', label: 'Service non conforme', icon: '📋' },
  { value: 'harcèlement', label: 'Harcèlement', icon: '⚠️' },
  { value: 'faux_profil', label: 'Faux profil', icon: '🎭' },
  { value: 'spam', label: 'Spam', icon: '📧' },
  { value: 'autre', label: 'Autre', icon: '📌' },
];

export default function SignalementModal({ open, onClose, typeCible, cibleId, cibleNom }: SignalementModalProps) {
  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useAppStore();

  const handleSubmit = async () => {
    if (!motif || !description.trim()) {
      setError('Veuillez sélectionner un motif et décrire le problème');
      return;
    }
    if (description.trim().length < 10) {
      setError('La description doit contenir au moins 10 caractères');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.signalements.create({
        type_cible: typeCible,
        cible_id: cibleId,
        motif,
        description: description.trim()
      });
      setSuccess(true);
      showToast('Signalement envoyé avec succès', 'success');
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setMotif('');
        setDescription('');
      }, 2000);
    } catch (e: any) {
      const msg = e.message?.includes('409') || e.message?.includes('déjà signalé')
        ? 'Vous avez déjà signalé cet élément'
        : 'Erreur lors de l\'envoi du signalement';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setTimeout(() => {
        setMotif('');
        setDescription('');
        setError('');
        setSuccess(false);
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Signalement envoyé</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                  Notre équipe va examiner votre signalement dans les plus brefs délais. Vous recevrez une notification de suivi.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Signaler un problème</h3>
                      {cibleNom && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                          {typeCible === 'prestataire' ? 'Prestataire' : typeCible === 'service' ? 'Service' : typeCible === 'publication' ? 'Publication' : 'Utilisateur'}: {cibleNom}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Motif */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quel est le problème ?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {motifs.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => { setMotif(m.value); setError(''); }}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left text-sm transition-all ${
                            motif === m.value
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span className="font-medium text-xs leading-tight">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Décrivez le problème en détail
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => { setDescription(e.target.value); setError(''); }}
                      placeholder="Expliquez ce qui s'est passé, quand, et tout détail utile pour notre enquête..."
                      className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-red-500 transition-colors resize-none placeholder:text-gray-400"
                      rows={4}
                    />
                    <p className="text-xs text-gray-400 mt-1">{description.length}/500 caractères</p>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -8, height: 0 }}
                        className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Info */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      <strong>Important :</strong> Les faux signalements sont pris très au sérieux et peuvent entraîner la suspension de votre compte. Ne signalez que les vrais problèmes.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !motif || !description.trim()}
                      className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Envoyer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

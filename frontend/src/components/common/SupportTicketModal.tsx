import { useState } from 'react';
import { X, Headphones, CheckCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  reservationId?: number | null;
  reservationNom?: string | null;
  onSuccess?: () => void;
}

const categories = [
  { value: 'probleme_reservation', label: 'Problème de réservation' },
  { value: 'probleme_paiement', label: 'Problème de paiement' },
  { value: 'probleme_prestataire', label: 'Problème avec le prestataire' },
  { value: 'probleme_client', label: 'Problème avec un client' },
  { value: 'probleme_compte', label: 'Problème de compte' },
  { value: 'autre', label: 'Autre' },
];

export default function SupportTicketModal({ open, onClose, reservationId, reservationNom, onSuccess }: Props) {
  const [sujet, setSujet] = useState('');
  const [categorie, setCategorie] = useState('probleme_reservation');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!sujet.trim() || !message.trim()) {
      setError('Veuillez remplir le sujet et le message.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.tickets.create({ sujet, categorie, message, reservation_id: reservationId ?? undefined });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        setSuccess(false);
        setSujet('');
        setMessage('');
        onClose();
      }, 2000);
    } catch (e: any) {
      setError(e.message?.includes('HTTP') ? 'Erreur lors de la création du ticket.' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Contacter le support</h2>
                  {reservationNom && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {reservationNom}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {success ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ticket créé !</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Notre équipe vous répondra dans les 24h. Suivez vos tickets dans la section Aide.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Catégorie
                    </label>
                    <select
                      value={categorie}
                      onChange={e => setCategorie(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Sujet <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sujet}
                      onChange={e => setSujet(e.target.value)}
                      placeholder="Résumez votre problème en quelques mots"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Décrivez votre problème en détail. Plus vous êtes précis, plus nous pourrons vous aider rapidement."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/1000</p>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!success && (
              <div className="px-6 pb-6 pt-2 flex-shrink-0">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !sujet.trim() || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Envoyer le ticket
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

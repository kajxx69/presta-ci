import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, X } from 'lucide-react';

interface AuthPromptModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export default function AuthPromptModal({ open, onClose, message }: AuthPromptModalProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="p-6 pt-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">P</span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Rejoignez PrestaCI
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {message || 'Connectez-vous pour profiter de toutes les fonctionnalités.'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  <LogIn className="w-5 h-5" />
                  Se connecter
                </button>
                <button
                  onClick={() => { onClose(); navigate('/register'); }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserPlus className="w-5 h-5" />
                  Créer un compte
                </button>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                C'est gratuit et ça prend 30 secondes
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

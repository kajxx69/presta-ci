import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Briefcase, ArrowRight } from 'lucide-react';
import Logo from '../Logo';

interface WelcomeGateProps {
  open: boolean;
  onClose: () => void;
  onSelect: (intent: 'search' | 'discover' | 'pro') => void;
}

const choices = [
  {
    id: 'search' as const,
    icon: Search,
    title: 'Je cherche un service précis',
    desc: 'Coiffure, ménage, imprimerie, traiteur…',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'discover' as const,
    icon: Compass,
    title: 'Je veux découvrir autour de moi',
    desc: 'Parcourez les réalisations des prestataires',
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'pro' as const,
    icon: Briefcase,
    title: 'Je suis un professionnel',
    desc: 'Proposez vos services sur PrestaCI',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

export default function WelcomeGate({ open, onClose, onSelect }: WelcomeGateProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-800"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative w-full max-w-lg"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg mb-4">
                <Logo className="h-10 w-auto" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Bienvenue sur PrestaCI</h1>
              <p className="text-white/80 text-sm mt-1.5">
                La marketplace de services près de chez vous, en Côte d'Ivoire.
              </p>
              <p className="text-white/70 text-sm mt-3 font-medium">Qu'est-ce qui vous amène ?</p>
            </div>

            <div className="space-y-3">
              {choices.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(c.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow text-left group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center flex-shrink-0`}>
                    <c.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{c.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </motion.button>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              onClick={onClose}
              className="w-full text-center text-white/70 hover:text-white text-xs font-medium mt-6 py-2 transition-colors"
            >
              Passer et explorer librement →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

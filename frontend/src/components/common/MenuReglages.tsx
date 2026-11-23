import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Pencil, X, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

/** Menu ⚙ de la barre du haut : modifier le profil, mode sombre, se déconnecter (avec confirmation). */
export default function MenuReglages({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useAppStore();
  const [confirmer, setConfirmer] = useState(false);
  const fermer = () => { setConfirmer(false); onFermer(); };
  const seDeconnecter = () => { fermer(); logout(); navigate('/app/home'); };

  // Rendu au niveau du <body> : la barre du haut (flou + sticky) piégerait un élément « fixed »
  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={fermer}>
          <motion.div className="w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-bold text-gray-900 dark:text-white">Réglages</p>
              <button onClick={fermer} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            {!confirmer ? (
              <div className="space-y-1">
                <button onClick={() => { fermer(); navigate('/app/compte'); }}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-gray-800 dark:text-gray-100 font-medium">
                  <Pencil className="w-5 h-5 text-gray-500" /> Modifier le profil
                </button>
                <button onClick={toggleDarkMode}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-gray-800 dark:text-gray-100 font-medium">
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-500" />}
                  <span className="flex-1">Mode sombre</span>
                  <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${isDarkMode ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
                <button onClick={() => setConfirmer(true)}
                  className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400 font-semibold">
                  <LogOut className="w-5 h-5" /> Se déconnecter
                </button>
              </div>
            ) : (
              <div className="px-2 space-y-3">
                <p className="text-gray-700 dark:text-gray-200">Tu veux vraiment te déconnecter ? Tes modèles enregistrés restent sur ton compte.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmer(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">Annuler</button>
                  <button onClick={seDeconnecter} className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-semibold">Me déconnecter</button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

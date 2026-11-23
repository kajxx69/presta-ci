import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LocateFixed, Globe2, Loader2, Check } from 'lucide-react';
import ChoixCommune from './ChoixCommune';
import { usePosition, communeParDefaut } from '../../lib/position';
import { useAppStore } from '../../store/appStore';

/** Feuille « Près de moi » : ma position GPS, une commune, ou partout. */
export default function ChoixPosition({ ouvert, onFermer }: { ouvert: boolean; onFermer: () => void }) {
  const { commune, gps, choisi, enCours, choisirCommune, utiliserGPS } = usePosition();
  const { showToast } = useAppStore();
  const communeActuelle = gps ? null : commune || (choisi ? null : communeParDefaut());
  const partout = !gps && !communeActuelle;

  const gpsDemande = async () => {
    if (await utiliserGPS()) onFermer();
    else showToast('Position indisponible. Choisis plutôt ta commune 📍', 'info');
  };

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div className="w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] space-y-3"
            initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">📍 Près de moi</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Les modèles réservables près de toi passent en premier.</p>
              </div>
              <button onClick={onFermer} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <button onClick={gpsDemande} disabled={enCours}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left font-medium border ${gps ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300' : 'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'} disabled:opacity-60`}>
              {enCours ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5 text-pink-600" />}
              <span className="flex-1">Utiliser ma position<span className="block text-xs font-normal text-gray-500 dark:text-gray-400">Le plus précis, demandé une seule fois</span></span>
              {gps && <Check className="w-5 h-5" />}
            </button>

            <div className="px-1">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Ou choisis ta commune</p>
              <ChoixCommune valeur={communeActuelle} onChange={(c) => { if (c) { choisirCommune(c); onFermer(); } }} />
            </div>

            <button onClick={() => { choisirCommune(null); onFermer(); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left font-medium ${partout ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              <Globe2 className="w-5 h-5 text-gray-500" />
              <span className="flex-1">Partout, sans localisation</span>
              {partout && <Check className="w-5 h-5" />}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

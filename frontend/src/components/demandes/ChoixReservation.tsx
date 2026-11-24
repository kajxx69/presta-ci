import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, HandCoins, MapPin, Star, BadgeCheck, ChevronRight } from 'lucide-react';
import type { OuLeFaire } from '../../lib/api';
import { libelleLieu } from '../../lib/communes';
import { fcfa } from './commun';

/**
 * « Comment veux-tu réserver ? » — les deux façons de réserver un modèle :
 *  1. Choisir sa prestataire : son prix, son agenda (réservation classique)
 *     … ou lui proposer son prix à elle seule
 *  2. Proposer son prix à toutes les prestataires proches (demande ouverte)
 */
export default function ChoixReservation({ ouvert, onFermer, pros, prosSimilaires, maCommune, maDemandeId, onReserver, onProposerA, onProposerATous, onVoirMaDemande }: {
  ouvert: boolean;
  onFermer: () => void;
  pros: OuLeFaire[];
  /** Pros d'un style proche, montrées quand personne ne fait exactement ce modèle */
  prosSimilaires: OuLeFaire[];
  maCommune?: string | null;
  maDemandeId?: number | null;
  onReserver: (serviceId: number) => void;
  onProposerA: (o: OuLeFaire) => void;
  onProposerATous: () => void;
  onVoirMaDemande: () => void;
}) {
  const liste = (pros.length ? pros : prosSimilaires).slice(0, 5);
  const similaires = !pros.length && liste.length > 0;

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[75] bg-black/40 flex items-end sm:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div className="w-full sm:max-w-md max-h-[88dvh] overflow-y-auto bg-creme dark:bg-gray-950 rounded-t-[32px] sm:rounded-[32px] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-ligne mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-encre dark:text-white">Comment veux-tu réserver ?</h2>

            {/* 1. Choisir sa prestataire (réservation classique) */}
            <section className="mt-5 rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 p-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-vin-50 dark:bg-vin-900/30 flex items-center justify-center flex-shrink-0"><CalendarCheck className="w-5 h-5 text-vin-600" /></span>
                <div>
                  <p className="text-lg font-semibold text-encre dark:text-white">Choisir ma prestataire</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{similaires ? 'Personne ne propose encore exactement ce modèle. Ces pros font un style proche.' : 'Son prix, son agenda : tu choisis ton créneau.'}</p>
                </div>
              </div>
              {liste.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Aucune prestataire ne propose encore ce modèle. Propose ton prix : les pros proches seront prévenues.</p>
              ) : (
                <ul className="mt-3 divide-y divide-ligne dark:divide-gray-800">
                  {liste.map((o) => {
                    const p = o.prestataire;
                    const lieu = libelleLieu(p, maCommune);
                    return (
                      <li key={p.id} className="py-3">
                        <button onClick={() => onReserver(o.service.id)} className="w-full flex items-center gap-3 text-left">
                          <div className="w-11 h-11 rounded-2xl bg-vin-100 dark:bg-vin-900/40 overflow-hidden flex items-center justify-center text-vin-700 dark:text-vin-200 font-semibold flex-shrink-0">
                            {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : (p.nom_commercial || '?')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-encre dark:text-white flex items-center gap-1 truncate">{p.nom_commercial}{p.is_verified && <BadgeCheck className="w-4 h-4 text-vin-600 flex-shrink-0" />}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 truncate">
                              {!!p.nombre_avis && <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 fill-encre text-encre dark:fill-white dark:text-white" />{(p.note_moyenne || 0).toFixed(1)}</span>}
                              {lieu && <span className="inline-flex items-center gap-0.5 truncate"><MapPin className="w-3.5 h-3.5 text-vin-600 flex-shrink-0" />{lieu}</span>}
                            </p>
                          </div>
                          <span className="text-right flex-shrink-0">
                            <span className="block font-bold text-encre dark:text-white">{fcfa(o.service.prix)}</span>
                            <span className="text-xs font-semibold text-vin-600 dark:text-vin-300 inline-flex items-center">Réserver<ChevronRight className="w-3.5 h-3.5" /></span>
                          </span>
                        </button>
                        {!similaires && (
                          <button onClick={() => onProposerA(o)} className="mt-2 ml-14 text-sm font-medium text-gray-600 dark:text-gray-300 underline underline-offset-2">
                            Lui proposer mon prix
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 2. Proposer son prix à toutes les pros proches (demande ouverte) */}
            <button onClick={maDemandeId ? onVoirMaDemande : onProposerATous}
              className="mt-3 w-full text-left rounded-[24px] bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800 p-4 flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-vin-50 dark:bg-vin-900/30 flex items-center justify-center flex-shrink-0"><HandCoins className="w-5 h-5 text-vin-600" /></span>
              <span className="flex-1">
                <span className="block text-lg font-semibold text-encre dark:text-white">{maDemandeId ? 'Voir ma demande en cours' : 'Proposer mon prix'}</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  {maDemandeId ? 'Tu as déjà envoyé une demande pour ce modèle : suis les réponses.' : 'Toutes les prestataires proches voient ta demande et peuvent accepter ou négocier.'}
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-gray-400 self-center" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

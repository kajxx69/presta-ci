import { motion } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import Logo from '../Logo';

// Décor commun connexion / inscription : l'univers de l'app (cartes à swiper,
// coiffures, ongles, maquillage) plutôt qu'un formulaire austère.

const CARTES = [
  { emoji: '💇🏾‍♀️', titre: 'Knotless braids', prix: 'dès 15 000 F', fond: 'from-pink-400 to-rose-500' },
  { emoji: '💅🏾', titre: 'Nail art doré', prix: 'dès 8 000 F', fond: 'from-amber-400 to-orange-500' },
  { emoji: '💄', titre: 'Make-up glam', prix: 'dès 12 000 F', fond: 'from-fuchsia-500 to-purple-600' },
];

// Positions sur les bords, loin du texte
const FLOTTANTS = [
  { e: '✨', left: '84%', top: '6%' }, { e: '💖', left: '88%', top: '46%' }, { e: '👑', left: '4%', top: '44%' },
  { e: '🌸', left: '90%', top: '88%' }, { e: '✂️', left: '62%', top: '10%' },
];

/** Pile de cartes en éventail, la première « swipe » doucement en boucle. */
export function PileDeCartes({ petite = false }: { petite?: boolean }) {
  const w = petite ? 'w-24 h-32' : 'w-44 h-60';
  return (
    <div className={`relative mx-auto ${petite ? 'w-56 h-36' : 'w-72 h-72'}`}>
      {CARTES.map((c, i) => {
        const angle = (i - 1) * (petite ? 12 : 10);
        const dx = (i - 1) * (petite ? 64 : 70);
        return (
          <motion.div
            key={c.titre}
            className={`absolute left-1/2 top-1/2 ${w} rounded-3xl bg-gradient-to-br ${c.fond} shadow-2xl ring-4 ring-white/70 dark:ring-white/10 flex flex-col items-center justify-center text-white overflow-hidden`}
            style={{ zIndex: i === 1 ? 3 : 1, marginLeft: petite ? '-3rem' : '-5.5rem', marginTop: petite ? '-4rem' : '-7.5rem' }}
            initial={{ opacity: 0, y: 40, rotate: 0, x: 0 }}
            animate={i === 1
              ? { opacity: 1, y: [0, -8, 0], rotate: [0, 3, 0], x: 0 }
              : { opacity: 1, y: 0, rotate: angle, x: dx }}
            transition={i === 1
              ? { opacity: { duration: 0.4 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
              : { type: 'spring', stiffness: 120, damping: 14, delay: 0.15 * i }}
          >
            <span className={petite ? 'text-4xl' : 'text-7xl'}>{c.emoji}</span>
            {!petite && (
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/40 to-transparent">
                <p className="font-bold text-sm leading-tight">{c.titre}</p>
                <p className="text-xs text-white/85">{c.prix}</p>
              </div>
            )}
          </motion.div>
        );
      })}
      {!petite && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-5 z-10">
          <motion.span whileHover={{ scale: 1.1 }} className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center">
            <X className="w-6 h-6 text-gray-400" />
          </motion.span>
          <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center">
            <Heart className="w-6 h-6 fill-pink-500 text-pink-500" />
          </motion.span>
        </div>
      )}
    </div>
  );
}

/** Émojis qui flottent en fond. */
export function Flottants() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLOTTANTS.map(({ e, left, top }, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl opacity-60 select-none"
          style={{ left, top }}
          animate={{ y: [0, -14, 0], rotate: [0, i % 2 ? 12 : -12, 0] }}
          transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
        >
          {e}
        </motion.span>
      ))}
    </div>
  );
}

/** Panneau gauche (ordinateur) : marque + cartes + accroche. */
export function PanneauMarque({ accroche, sousTitre }: { accroche: string; sousTitre: string }) {
  return (
    <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-10 flex-col justify-between overflow-hidden">
      <Flottants />
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-lg"><Logo className="h-12 w-12" /></div>
        <span className="text-2xl font-extrabold text-white tracking-tight">Chicly</span>
      </div>
      <div className="relative z-10 pt-4 pb-12"><PileDeCartes /></div>
      <div className="relative z-10">
        <p className="text-3xl font-extrabold text-white leading-tight">{accroche}</p>
        <p className="text-white/85 text-sm mt-2">{sousTitre}</p>
      </div>
    </div>
  );
}

/** En-tête mobile : mini pile de cartes + titre. */
export function EnTeteMobile({ titre, sousTitre }: { titre: string; sousTitre: string }) {
  return (
    <div className="lg:hidden text-center mb-6">
      <PileDeCartes petite />
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2">{titre}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sousTitre}</p>
    </div>
  );
}

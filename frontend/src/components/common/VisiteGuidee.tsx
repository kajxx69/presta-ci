import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, Search, User } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Logo from '../Logo';

// Visite guidée (maquette 2) : montrée une seule fois, au premier passage sur Découvrir.
// Vue = enregistré sur le compte (tous ses appareils) et dans le navigateur (visiteuses).
const CLE = 'chicly-visite-vue';
const dejaVue = () => { try { return localStorage.getItem(CLE) === '1'; } catch { return true; } };
const marquerVue = () => { try { localStorage.setItem(CLE, '1'); } catch { /* navigation privée */ } };

const TUILES = ['#D9C2B5,#B58F7C', '#E8D5D0,#C9A3A0', '#CFC4BA,#8F7F73', '#E3D9CF,#BFA58F', '#D8B7A8,#A6786A', '#CBB8C0,#8E6F7D'];
const tuile = (i: number) => ({ background: `linear-gradient(160deg, ${TUILES[i % TUILES.length]})` });

function Bienvenue() {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div className="w-40 h-40 rounded-full bg-vin-600/10 flex items-center justify-center"
        animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        <Logo className="w-28 h-28 rounded-full" />
      </motion.div>
      <p className="text-sm font-medium text-white/80">Découvrez · Réservez · Brillez</p>
    </div>
  );
}

function Swipe() {
  return (
    <div className="relative w-40 h-52">
      <div className="absolute inset-0 rounded-2xl opacity-60" style={{ ...tuile(1), transform: 'scale(0.93) translateY(10px)' }} />
      <motion.div className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg" style={tuile(4)}
        animate={{ x: [0, 56, 0, -56, 0], rotate: [0, 9, 0, -9, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm font-semibold">Box braids</p>
          <p className="text-white/80 text-[11px]">Coiffure</p>
        </div>
      </motion.div>
    </div>
  );
}

function Demander() {
  return (
    <div className="w-56 rounded-2xl bg-white/95 p-4 shadow-lg space-y-3">
      <div className="flex gap-3 items-center">
        <div className="w-11 h-14 rounded-xl" style={tuile(0)} />
        <div>
          <p className="text-sm font-semibold text-encre">Box braids</p>
          <p className="text-[11px] text-gray-500">Réf. 25 000 F CFA</p>
        </div>
      </div>
      <div className="rounded-xl border border-ligne px-3 py-2 text-lg font-bold text-encre">
        <motion.span animate={{ opacity: [0.4, 1, 1] }} transition={{ duration: 2.4, repeat: Infinity }}>20 000</motion.span> F CFA
      </div>
      <motion.div className="rounded-full bg-vin-600 py-2 text-center text-xs font-semibold text-white"
        animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>Envoyer ma demande</motion.div>
    </div>
  );
}

function Profil() {
  return (
    <div className="w-56 rounded-2xl bg-white/95 p-3 shadow-lg">
      <div className="flex justify-around text-xs font-semibold text-encre border-b border-ligne pb-2 mb-2">
        <span className="border-b-2 border-encre pb-1">Enregistrés</span><span className="text-gray-400">Demandes</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="relative aspect-[3/4] rounded-md" style={tuile(i)}>
            {i < 3 && <Heart className="absolute top-1 right-1 w-3 h-3 fill-white text-white" />}
          </div>
        ))}
      </div>
    </div>
  );
}

const ETAPES = [
  { titre: 'Bienvenue sur Chicly', texte: 'Découvre des coiffures et des ongles qui te ressemblent, garde tes coups de cœur et réserve près de chez toi.', image: <Bienvenue /> },
  { titre: 'Swipe pour choisir', texte: 'À gauche, tu passes. À droite, tu gardes le modèle dans tes coups de cœur. Tu peux aussi utiliser les deux boutons.', image: <Swipe /> },
  { titre: 'Demande à ton prix', texte: 'Ouvre une fiche, touche « Demander cette prestation » et propose ton prix. Les prestataires proches acceptent ou discutent.', image: <Demander /> },
  { titre: 'Retrouve tout dans ton profil', texte: 'Tes coups de cœur, tes demandes et tes réservations t’attendent dans ton profil.', image: <Profil /> },
];

export default function VisiteGuidee() {
  const { isAuthenticated, role } = useAuthStore();
  const [ouverte, setOuverte] = useState(false);
  const [etape, setEtape] = useState(0);

  useEffect(() => {
    if (role?.nom === 'admin' || dejaVue()) return;
    let actif = true;
    if (isAuthenticated) {
      // Déjà vue sur un autre appareil : on ne la remontre pas
      api.users.getMe().then(({ user }) => {
        if (!actif) return;
        if (user?.visite_guidee_vue) marquerVue(); else setOuverte(true);
      }).catch(() => actif && setOuverte(true));
    } else {
      setOuverte(true);
    }
    return () => { actif = false; };
  }, [isAuthenticated, role?.nom]);

  const fermer = () => {
    marquerVue();
    setOuverte(false);
    if (isAuthenticated) api.users.visiteGuideeVue().catch(() => {});
  };
  const derniere = etape === ETAPES.length - 1;
  const e = ETAPES[etape];

  return createPortal(
    <AnimatePresence>
      {ouverte && (
        <motion.div role="dialog" aria-modal="true" aria-labelledby="visite-titre"
          className="fixed inset-0 z-[95] bg-[#4A403B]/95 flex flex-col items-center justify-end sm:justify-center px-5 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button onClick={fermer} aria-label="Fermer la visite" className="absolute top-[calc(1rem+env(safe-area-inset-top,0px))] right-4 p-2 rounded-full text-white/80 hover:bg-white/10"><X className="w-6 h-6" /></button>
          <div className="flex-1 w-full max-w-md flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={etape} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                {e.image}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="w-full max-w-md rounded-[32px] bg-creme dark:bg-gray-900 p-6">
            <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Visite guidée</span><span>{etape + 1} / {ETAPES.length}</span></div>
            {etape === 1 && (
              <div className="flex justify-center gap-8 mt-4">
                <div className="flex flex-col items-center gap-1.5"><span className="w-14 h-14 rounded-full bg-white border border-ligne flex items-center justify-center"><X className="w-6 h-6 text-encre" /></span><span className="text-sm text-gray-500">Passer</span></div>
                <div className="flex flex-col items-center gap-1.5"><span className="w-14 h-14 rounded-full bg-vin-600 flex items-center justify-center"><Heart className="w-6 h-6 text-white" /></span><span className="text-sm text-gray-500">J’aime</span></div>
              </div>
            )}
            {etape === 2 && <div className="flex justify-center mt-4"><Search className="w-6 h-6 text-vin-600" /></div>}
            {etape === 3 && <div className="flex justify-center mt-4"><User className="w-6 h-6 text-vin-600" /></div>}
            <h2 id="visite-titre" className="mt-4 text-[26px] font-bold text-encre dark:text-white">{e.titre}</h2>
            <p className="mt-1.5 text-gray-600 dark:text-gray-300 text-[17px] leading-snug">{e.texte}</p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex gap-1.5 flex-1">
                {ETAPES.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === etape ? 'w-6 bg-vin-600' : 'w-2 bg-ligne'}`} />)}
              </div>
              {!derniere && <button onClick={fermer} className="px-2 text-gray-500 dark:text-gray-400">Passer la visite</button>}
              <button onClick={() => (derniere ? fermer() : setEtape(etape + 1))} className="px-7 py-3.5 rounded-full bg-vin-600 text-white text-lg font-semibold">
                {derniere ? 'C’est parti' : 'Suivant'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Heart, Info, Sparkles, MapPin, RotateCcw } from 'lucide-react';
import { api, Modele, CategorieModele } from '../../lib/api';
import { swipesLocaux } from '../../lib/swipesLocaux';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import ModeleDetailSheet from './ModeleDetailSheet';
import ModeleVisuel from './ModeleVisuel';

export const CATEGORIES: { id: CategorieModele | ''; label: string; emoji: string }[] = [
  { id: '', label: 'Tout', emoji: '✨' },
  { id: 'coiffure', label: 'Coiffure', emoji: '💇🏾‍♀️' },
  { id: 'ongles', label: 'Ongles', emoji: '💅🏾' },
  { id: 'maquillage', label: 'Maquillage', emoji: '💄' },
  { id: 'cils', label: 'Cils & sourcils', emoji: '👁️' },
  { id: 'soins', label: 'Soins', emoji: '🧖🏾‍♀️' },
];

type Direction = 1 | -1;
const SEUIL_PX = 110;

function Carte({ modele, dessus, onSwipe, onOuvrir }: {
  modele: Modele; dessus: boolean; onSwipe: (d: Direction) => void; onOuvrir: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);
  const opaciteJaime = useTransform(x, [30, 120], [0, 1]);
  const opacitePasse = useTransform(x, [-120, -30], [1, 0]);

  const finDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SEUIL_PX || info.velocity.x > 600) onSwipe(1);
    else if (info.offset.x < -SEUIL_PX || info.velocity.x < -600) onSwipe(-1);
  };

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-gray-200 dark:bg-gray-800 select-none touch-pan-y"
      style={{ x, rotate, zIndex: dessus ? 2 : 1 }}
      drag={dessus ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={finDrag}
      initial={{ scale: 0.95, y: 10, opacity: 0.9 }}
      animate={{ scale: dessus ? 1 : 0.95, y: dessus ? 0 : 10, opacity: 1 }}
      variants={{ sortie: (d: Direction) => ({ x: d * 650, rotate: d * 25, opacity: 0, transition: { duration: 0.3 } }) }}
      exit="sortie"
      onTap={() => dessus && onOuvrir()}
    >
      <ModeleVisuel modele={modele} className="w-full h-full" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      <motion.div style={{ opacity: opaciteJaime }} className="absolute top-8 left-6 -rotate-12 border-4 border-green-400 text-green-400 font-extrabold text-3xl px-3 py-1 rounded-xl pointer-events-none">
        J'AIME
      </motion.div>
      <motion.div style={{ opacity: opacitePasse }} className="absolute top-8 right-6 rotate-12 border-4 border-rose-500 text-rose-500 font-extrabold text-3xl px-3 py-1 rounded-xl pointer-events-none">
        SUIVANT
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 p-5 text-white pointer-events-none">
        <h2 className="text-2xl font-bold leading-tight line-clamp-2 first-letter:uppercase">{modele.titre}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
          {modele.nb_offres ? (
            <span className="px-2 py-0.5 rounded-full bg-pink-500/90 text-xs font-semibold">
              {modele.nb_offres} prestataire{modele.nb_offres > 1 ? 's' : ''} · dès {(modele.prix_min || 0).toLocaleString('fr-FR')} F
            </span>
          ) : modele.source === 'prestataire' ? (
            <>
              {modele.prix ? <span className="font-semibold">{modele.prix.toLocaleString('fr-FR')} FCFA</span> : null}
              <span className="px-2 py-0.5 rounded-full bg-pink-500/90 text-xs font-semibold">Réservable</span>
            </>
          ) : null}
          {modele.ville && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{modele.ville}</span>}
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverTab() {
  const { isAuthenticated, role } = useAuthStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();
  const [categorie, setCategorie] = useState<CategorieModele | ''>('');
  const [pile, setPile] = useState<Modele[]>([]);
  const [chargement, setChargement] = useState(true);
  // Serveur en veille (hébergement gratuit) : on réessaie tout seul avant d'afficher une erreur
  const [reveil, setReveil] = useState(false);
  const [erreur, setErreur] = useState(false);
  const [epuise, setEpuise] = useState(false);
  const [direction, setDirection] = useState<Direction>(1);
  const [ouvert, setOuvert] = useState<Modele | null>(null);
  const [ouvrirProposition, setOuvrirProposition] = useState(false);
  // Barre d'actions après un like : Réserver / Je sais le faire (disparaît seule)
  const [apresLike, setApresLike] = useState<Modele | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  const ouvrir = (m: Modele, proposer = false) => { setApresLike(null); setOuvrirProposition(proposer); setOuvert(m); };
  const [dernier, setDernier] = useState<{ modele: Modele; action: 'like' | 'pass' } | null>(null);
  const vusSession = useRef<Set<number>>(new Set());
  const enCours = useRef(false);
  // Génération de requête : un changement de catégorie invalide la requête en cours
  const generation = useRef(0);
  const nbLikes = useRef(0);

  const charger = useCallback(async (cat: CategorieModele | '', reset = false) => {
    if (enCours.current && !reset) return; // complément de pile déjà en cours
    const gen = reset ? ++generation.current : generation.current;
    enCours.current = true;
    setChargement(true);
    try {
      const exclude = [...vusSession.current, ...(isAuthenticated ? [] : swipesLocaux.tousLesVus())];
      const requete = () => api.modeles.feed({ categorie: cat || undefined, exclude: exclude.slice(-1000) });
      let modeles: Modele[] = [];
      for (let essai = 0; ; essai++) {
        try { ({ modeles } = await requete()); break; } catch (e) {
          // ~45 s au total : le temps qu'un serveur endormi redémarre
          const attente = [2000, 4000, 8000, 12000, 18000][essai];
          if (attente === undefined || gen !== generation.current) throw e;
          setReveil(true);
          await new Promise((ok) => setTimeout(ok, attente));
        }
      }
      setReveil(false);
      setErreur(false);
      if (gen !== generation.current) return; // réponse d'une ancienne catégorie : ignorée
      // Précharger les images pour un swipe fluide
      modeles.forEach((m) => { if (m.photo_url) { const img = new Image(); img.src = m.photo_url; } });
      setPile((p) => {
        const base = reset ? [] : p;
        const deja = new Set(base.map((m) => m.id));
        return [...base, ...modeles.filter((m) => !deja.has(m.id))];
      });
      setEpuise(modeles.length === 0);
    } catch {
      setReveil(false);
      if (gen === generation.current) setErreur(true);
    } finally {
      if (gen === generation.current) {
        enCours.current = false;
        setChargement(false);
      }
    }
  }, [isAuthenticated, showToast]);

  useEffect(() => { setPile([]); setEpuise(false); charger(categorie, true); }, [categorie]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recharger avant d'arriver au bout de la pile
  useEffect(() => {
    if (!chargement && !epuise && !erreur && pile.length < 5) charger(categorie);
  }, [pile.length, chargement, epuise, erreur, categorie, charger]);

  const enregistrer = (m: Modele, action: 'like' | 'pass') => {
    vusSession.current.add(m.id);
    if (isAuthenticated) api.modeles.swipe(m.id, action).catch(() => {});
    else swipesLocaux.ajouter(m.id, action);
    if (action === 'like') {
      nbLikes.current += 1;
      if (nbLikes.current === 1) showToast('Ajouté à tes favoris ❤️', 'success');
      if (!isAuthenticated && nbLikes.current === 5) showToast('Crée ton compte pour retrouver tes favoris sur tous tes appareils', 'info');
    }
  };

  const swiper = (d: Direction) => {
    const m = pile[0];
    if (!m) return;
    setDirection(d);
    enregistrer(m, d === 1 ? 'like' : 'pass');
    setDernier({ modele: m, action: d === 1 ? 'like' : 'pass' });
    clearTimeout(minuteur.current);
    if (d === 1) {
      setApresLike(m);
      minuteur.current = setTimeout(() => setApresLike(null), 6000);
    } else setApresLike(null);
    setPile((p) => p.slice(1));
  };

  const annuler = () => {
    if (!dernier) return;
    const { modele } = dernier;
    vusSession.current.delete(modele.id);
    if (isAuthenticated) api.modeles.unlike(modele.id).catch(() => {});
    else swipesLocaux.retirerLike(modele.id);
    setPile((p) => [modele, ...p]);
    setDernier(null);
  };

  const visibles = pile.slice(0, 3);

  return (
    /* Plein écran : moins la barre du haut (affichée seulement une fois connectée) et la navigation du bas */
    <div className={`max-w-md mx-auto px-4 pt-3 flex flex-col ${isAuthenticated
      ? 'h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-5rem)]'
      : 'h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-1.5rem)]'}`}>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c.id || 'tout'}
            onClick={() => setCategorie(c.id)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              categorie === c.id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0">
        <AnimatePresence custom={direction}>
          {visibles.slice().reverse().map((m) => (
            <Carte
              key={m.id}
              modele={m}
              dessus={m.id === visibles[0].id}
              onSwipe={swiper}
              onOuvrir={() => ouvrir(m)}
            />
          ))}
        </AnimatePresence>

        {pile.length === 0 && (
          <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-center p-6">
            {chargement ? (
              <div className="w-full h-full rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
                {reveil && <p className="text-sm text-gray-500 dark:text-gray-400 px-6">Chargement des modèles… encore quelques secondes ✨</p>}
              </div>
            ) : erreur ? (
              <>
                <p className="text-4xl mb-2">📶</p>
                <p className="font-semibold text-gray-900 dark:text-white">Impossible de charger les modèles</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vérifie ta connexion internet puis réessaie.</p>
                <button onClick={() => { setErreur(false); charger(categorie, true); }} className="mt-4 px-5 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold">
                  Réessayer
                </button>
              </>
            ) : (
              <>
                <Sparkles className="w-10 h-10 text-pink-500 mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">Tu as tout vu ici 🎉</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">De nouveaux modèles arrivent chaque jour.</p>
                <div className="flex gap-2 mt-4">
                  {categorie && (
                    <button onClick={() => setCategorie('')} className="px-4 py-2 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-sm font-semibold">
                      Voir tout
                    </button>
                  )}
                  <button onClick={() => navigate('/app/favorites')} className="px-4 py-2 rounded-full bg-pink-500 text-white text-sm font-semibold">
                    Mes favoris
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {apresLike && (
          <motion.div key={apresLike.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="mt-3 flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700">
            <span className="pl-1 text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">❤️ <strong>Aimé !</strong> Et maintenant ?</span>
            <button onClick={() => ouvrir(apresLike)} className="px-3 py-2 rounded-xl bg-pink-500 text-white text-sm font-semibold whitespace-nowrap">
              Réserver{apresLike.nb_offres ? ` (${apresLike.nb_offres})` : ''}
            </button>
            <button onClick={() => ouvrir(apresLike, true)} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold whitespace-nowrap">
              ✋ Je sais le faire
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-5 py-4">
        <button onClick={annuler} disabled={!dernier} aria-label="Revenir en arrière"
          className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center disabled:opacity-30">
          <RotateCcw className="w-5 h-5 text-amber-500" />
        </button>
        <button onClick={() => swiper(-1)} disabled={!pile.length} aria-label="Suivant"
          className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
          <X className="w-8 h-8 text-rose-500" strokeWidth={3} />
        </button>
        <button onClick={() => swiper(1)} disabled={!pile.length} aria-label="J'aime"
          className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
          <Heart className="w-8 h-8 text-white fill-white" />
        </button>
        <button onClick={() => pile[0] && ouvrir(pile[0])} disabled={!pile.length} aria-label="Où le faire ?"
          className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center disabled:opacity-30">
          <Info className="w-5 h-5 text-blue-500" />
        </button>
      </div>

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} ouvrirProposition={ouvrirProposition} />
    </div>
  );
}

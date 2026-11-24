import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Heart, MapPin, RotateCcw, ChevronDown } from 'lucide-react';
import { api, Modele, CategorieModele } from '../../lib/api';
import { swipesLocaux } from '../../lib/swipesLocaux';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import ModeleDetailSheet from './ModeleDetailSheet';
import ModeleVisuel from './ModeleVisuel';
import ChoixPosition from '../common/ChoixPosition';
import { usePosition, paramsPosition, libellePosition } from '../../lib/position';
import { libelleLieu } from '../../lib/communes';
import VisiteGuidee from '../common/VisiteGuidee';

export const CATEGORIES: { id: CategorieModele | ''; label: string; emoji: string }[] = [
  { id: '', label: 'Tout', emoji: '' },
  { id: 'coiffure', label: 'Coiffures', emoji: '' },
  { id: 'ongles', label: 'Ongles', emoji: '' },
  { id: 'maquillage', label: 'Maquillage', emoji: '' },
  { id: 'cils', label: 'Cils & sourcils', emoji: '' },
  { id: 'soins', label: 'Soins', emoji: '' },
];

type Direction = 1 | -1;
const SEUIL_PX = 110;

function Carte({ modele, dessus, onSwipe, onOuvrir, maCommune }: {
  modele: Modele; dessus: boolean; onSwipe: (d: Direction) => void; onOuvrir: () => void; maCommune?: string | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-14, 14]);

  const finDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SEUIL_PX || info.velocity.x > 600) onSwipe(1);
    else if (info.offset.x < -SEUIL_PX || info.velocity.x < -600) onSwipe(-1);
  };

  return (
    <motion.div
      className="absolute inset-0 rounded-[28px] overflow-hidden bg-sable dark:bg-gray-800 select-none touch-pan-y shadow-[0_10px_30px_-12px_rgba(31,26,23,0.35)]"
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
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-[#2a1f1b]/90 via-[#2a1f1b]/40 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-0 p-6 text-white pointer-events-none">
        <h2 className="text-[28px] font-bold leading-tight line-clamp-2 first-letter:uppercase">{modele.titre}</h2>
        <p className="mt-1 text-[15px] text-white/90 line-clamp-1">
          {[
            CATEGORIES.find((c) => c.id === modele.categorie)?.label.replace(/s$/, ''),
            modele.nb_offres ? `${modele.nb_offres} pro${modele.nb_offres > 1 ? 's' : ''} · dès ${(modele.prix_min || 0).toLocaleString('fr-FR')} F`
              : modele.source === 'prestataire' && modele.prix ? `${modele.prix.toLocaleString('fr-FR')} F` : null,
          ].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur text-sm font-medium">Voir la fiche ↑</span>
          {modele.proche ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-encre text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 text-vin-600" />{libelleLieu(modele.proche, maCommune)}
            </span>
          ) : modele.ville ? <span className="inline-flex items-center gap-1 text-sm text-white/85"><MapPin className="w-3.5 h-3.5" />{modele.ville}</span> : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoverTab() {
  const { isAuthenticated } = useAuthStore();
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
  // Près de moi : la position fait remonter les modèles réservables chez une pro proche
  const { commune, gps, choisi } = usePosition();
  const [choixPosition, setChoixPosition] = useState(false);
  const position = paramsPosition({ commune, gps, choisi });
  const clePosition = JSON.stringify(position);
  const positionRef = useRef(position);
  positionRef.current = position;
  const lieuActuel = libellePosition({ commune, gps, choisi });

  const charger = useCallback(async (cat: CategorieModele | '', reset = false) => {
    if (enCours.current && !reset) return; // complément de pile déjà en cours
    const gen = reset ? ++generation.current : generation.current;
    enCours.current = true;
    setChargement(true);
    try {
      const exclude = [...vusSession.current, ...(isAuthenticated ? [] : swipesLocaux.tousLesVus())];
      const requete = () => api.modeles.feed({ categorie: cat || undefined, exclude: exclude.slice(-1000), ...positionRef.current });
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

  // Nouvelle pile (catégorie ou position changée) : on remonte la pile sans animer la sortie
  // des anciennes cartes — sinon une carte présente dans les deux piles reste bloquée en plein vol
  const [lot, setLot] = useState(0);
  useEffect(() => { setLot((l) => l + 1); setPile([]); setEpuise(false); charger(categorie, true); }, [categorie, clePosition]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <>
    <VisiteGuidee />
    {/* Plein écran : moins la barre du haut (affichée seulement une fois connectée) et la navigation du bas */}
    <div className={`max-w-md mx-auto px-4 pt-3 flex flex-col ${isAuthenticated
      ? 'h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-5rem)]'
      : 'h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-1.5rem)]'}`}>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setChoixPosition(true)}
          aria-label="Choisir où je suis"
          className={`flex-shrink-0 inline-flex items-center gap-1 pl-3 pr-2.5 py-2 rounded-full text-[15px] font-medium border transition-colors ${
            lieuActuel
              ? 'border-vin-300 bg-vin-50 text-vin-700 dark:border-vin-700 dark:bg-vin-900/30 dark:text-vin-200'
              : 'border-ligne bg-white text-encre dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
          }`}
        >
          <MapPin className="w-4 h-4" />{lieuActuel || 'Près de moi'}<ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id || 'tout'}
            onClick={() => setCategorie(c.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-[15px] font-medium border transition-colors ${
              categorie === c.id
                ? 'bg-vin-600 border-vin-600 text-white'
                : 'bg-white border-ligne text-encre dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="relative flex-1 min-h-0">
        <AnimatePresence key={lot} custom={direction}>
          {visibles.slice().reverse().map((m) => (
            <Carte
              key={m.id}
              modele={m}
              dessus={m.id === visibles[0].id}
              onSwipe={swiper}
              onOuvrir={() => ouvrir(m)}
              maCommune={position.commune}
            />
          ))}
        </AnimatePresence>

        {pile.length === 0 && (
          <div className="absolute inset-0 rounded-[28px] border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center p-6">
            {chargement ? (
              <div className="w-full h-full rounded-[28px] bg-sable dark:bg-gray-800 animate-pulse flex items-center justify-center">
                {reveil && <p className="text-sm text-gray-500 dark:text-gray-400 px-6">Chargement des modèles… encore quelques secondes</p>}
              </div>
            ) : erreur ? (
              <>
                <p className="font-semibold text-gray-900 dark:text-white">Impossible de charger les modèles</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vérifie ta connexion internet puis réessaie.</p>
                <button onClick={() => { setErreur(false); charger(categorie, true); }} className="mt-4 px-6 py-2.5 rounded-full bg-vin-600 text-white font-semibold">
                  Réessayer
                </button>
              </>
            ) : (
              <>
                <Heart className="w-9 h-9 text-vin-400 mb-3" strokeWidth={1.6} />
                <p className="font-semibold text-gray-900 dark:text-white">Tu as tout vu ici</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">De nouveaux modèles arrivent chaque jour.</p>
                <div className="flex gap-2 mt-4">
                  {categorie && (
                    <button onClick={() => setCategorie('')} className="px-5 py-2.5 rounded-full bg-white border border-ligne text-encre dark:bg-gray-900 dark:border-gray-700 dark:text-white font-semibold">
                      Voir tout
                    </button>
                  )}
                  <button onClick={() => navigate('/app/profile')} className="px-5 py-2.5 rounded-full bg-vin-600 text-white font-semibold">
                    Mes enregistrés
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
            className="mt-3 flex items-center gap-2 p-2 pl-4 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">Enregistré dans ton profil</span>
            <button onClick={() => ouvrir(apresLike)} className="px-4 py-2 rounded-full bg-vin-600 text-white text-sm font-semibold whitespace-nowrap">
              Réserver{apresLike.nb_offres ? ` (${apresLike.nb_offres})` : ''}
            </button>
            <button onClick={() => ouvrir(apresLike, true)} className="px-4 py-2 rounded-full border border-ligne dark:border-gray-700 text-encre dark:text-white text-sm font-semibold whitespace-nowrap">
              Je sais le faire
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center gap-8 py-4">
        <button onClick={annuler} disabled={!dernier} aria-label="Revenir au modèle précédent"
          className="absolute left-2 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 disabled:opacity-0 transition-opacity">
          <RotateCcw className="w-5 h-5" />
        </button>
        <button onClick={() => swiper(-1)} disabled={!pile.length} aria-label="Passer"
          className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40">
          <X className="w-7 h-7 text-encre dark:text-white" strokeWidth={2} />
        </button>
        <button onClick={() => swiper(1)} disabled={!pile.length} aria-label="J'aime"
          className="w-16 h-16 rounded-full bg-vin-600 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40">
          <Heart className="w-7 h-7 text-white" strokeWidth={2} />
        </button>
      </div>

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} ouvrirProposition={ouvrirProposition} />
      <ChoixPosition ouvert={choixPosition} onFermer={() => setChoixPosition(false)} />
    </div>
    </>
  );
}

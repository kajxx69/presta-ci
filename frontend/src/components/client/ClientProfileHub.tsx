import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Heart, LayoutDashboard, Scissors, Crown, Settings, LogOut, Pencil, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, Modele } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useFavoris } from '../../lib/useFavoris';
import { useOffreLancement } from '../../lib/offreLancement';
import ModeleVisuel from './ModeleVisuel';
import ModeleDetailSheet from './ModeleDetailSheet';

const ReservationsTab = lazy(() => import('./ReservationsTab'));
const MessagesTab = lazy(() => import('../common/MessagesTab'));
const ProfileTab = lazy(() => import('./ProfileTab'));
// Espace pro (visible dès qu'on a proposé un modèle)
const DemandesRecues = lazy(() => import('../prestataire/ReservationsTab'));
const ProfilPro = lazy(() => import('../prestataire/ProfileTab'));
const DashboardTab = lazy(() => import('../prestataire/DashboardTab'));
const ServicesTab = lazy(() => import('../prestataire/ServicesTab'));
const PlansTab = lazy(() => import('../prestataire/PlansTab'));

// Un seul compte pour tout le monde :
//  - cliente : Enregistrés (modèles aimés) · Réservations (ce qu'elle a réservé)
//  - pro (a proposé un modèle) : + Demandes (réservations reçues) et l'espace pro
//    (Tableau de bord, Mes prestations, Abonnement)
export type SousOngletProfil =
  | 'enregistres' | 'reservations' | 'demandes'
  | 'messages' | 'compte' | 'dashboard' | 'services' | 'plans';

const Chargement = () => <div className="p-8 text-center text-gray-400">Chargement…</div>;

function SousPage({ titre, children }: { titre: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div>
      <div className="sticky top-14 z-30 bg-app/95 backdrop-blur px-2 py-2 flex items-center gap-1 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate('/app/profile')} aria-label="Retour au profil" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white">{titre}</h1>
      </div>
      <Suspense fallback={<Chargement />}>{children}</Suspense>
    </div>
  );
}

function Grille({ modeles, onOuvrir }: { modeles: Modele[]; onOuvrir: (m: Modele) => void }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {modeles.map((m) => (
        <button key={m.id} onClick={() => onOuvrir(m)} aria-label={m.titre}
          className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <ModeleVisuel modele={m} compact className="w-full h-full" />
          {!!m.nb_offres && (
            <span className="absolute bottom-1 left-1 text-[10px] font-semibold text-white bg-black/50 rounded-full px-1.5 py-0.5">✂️ {m.nb_offres}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ClientProfileHub({ onglet, onNavigateToTab }: { onglet: SousOngletProfil; onNavigateToTab?: (tab: string) => void }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, role, logout } = useAuthStore();
  const [menu, setMenu] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const fermerMenu = () => { setMenu(false); setConfirmer(false); };
  const seDeconnecter = () => { fermerMenu(); logout(); navigate('/app/home'); };
  const estPro = isAuthenticated && role?.nom === 'prestataire';
  const { favoris, aimes, chargement, basculer } = useFavoris();
  const placesOffre = useOffreLancement();
  const [ouvert, setOuvert] = useState<Modele | null>(null);
  const [nbReservations, setNbReservations] = useState<number | null>(null);
  const [nbDemandes, setNbDemandes] = useState<number | null>(null);
  const [nonLus, setNonLus] = useState(0);
  const [abo, setAbo] = useState<{ plan_nom?: string; plan_actuel_id?: number } | null>(null);
  const aller = (tab: string) => (onNavigateToTab ? onNavigateToTab(tab) : navigate(`/app/${tab}`));

  useEffect(() => {
    if (!isAuthenticated) return;
    api.reservations.list('all').then((r) => setNbReservations(r.length)).catch(() => {});
    api.conversations.getUnreadCount().then((r) => setNonLus(r.count)).catch(() => {});
    if (estPro) {
      api.prestataireReservations.list('en_attente').then((r) => setNbDemandes(r.length)).catch(() => {});
      api.subscription.getCurrent().then((r) => setAbo(r.subscription)).catch(() => {});
    }
  }, [isAuthenticated, estPro]);

  // Sous-pages (flèche ← vers le profil)
  if (onglet === 'messages') return <SousPage titre="Messages"><MessagesTab /></SousPage>;
  if (onglet === 'compte') return <SousPage titre={estPro ? 'Mon profil & mon salon' : 'Mon compte'}>{estPro ? <ProfilPro /> : <ProfileTab />}</SousPage>;
  if (estPro && onglet === 'dashboard') return <SousPage titre="Tableau de bord"><DashboardTab onNavigateToTab={aller} /></SousPage>;
  if (estPro && onglet === 'services') return <SousPage titre="Mes prestations"><ServicesTab onNavigateToTab={aller} /></SousPage>;
  if (estPro && onglet === 'plans') return <SousPage titre="Abonnement"><PlansTab /></SousPage>;

  const u: any = user;
  const nom = u ? `${u.prenom || ''} ${u.nom ? `${u.nom[0]}.` : ''}`.trim() : '';
  const pseudo = u?.email ? `@${String(u.email).split('@')[0]}` : '';
  const initiales = `${u?.prenom?.[0] || ''}${u?.nom?.[0] || ''}`.toUpperCase();
  const actif: 'enregistres' | 'reservations' | 'demandes' =
    onglet === 'demandes' && estPro ? 'demandes' : onglet === 'reservations' ? 'reservations' : 'enregistres';
  const estAbonnePro = !!abo?.plan_actuel_id && abo.plan_actuel_id !== 1;

  const stats = [
    { n: favoris.length, label: 'aimés', tab: 'profile' },
    { n: nbReservations ?? '–', label: 'réservations', tab: 'mes-reservations' },
    estPro ? { n: nbDemandes ?? '–', label: 'demandes', tab: 'demandes' } : { n: nonLus, label: 'non lus', tab: 'messages' },
  ];
  const sousOnglets: [typeof actif, string, string][] = [
    ['enregistres', 'Enregistrés', 'profile'],
    ['reservations', 'Réservations', 'mes-reservations'],
    ...(estPro ? [['demandes', 'Demandes', 'demandes'] as [typeof actif, string, string]] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto pb-6">
      {/* En-tête */}
      {isAuthenticated ? (
        <div className="px-4 pt-5">
          <div className="flex items-start justify-between">
            <div className="w-20" />
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                {u?.photo_profil ? <img src={u.photo_profil} alt="" className="w-full h-full object-cover" /> : initiales || '💖'}
              </div>
              {estAbonnePro && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 text-white shadow">PRO ✨</span>
              )}
            </div>
            <div className="w-20 flex justify-end gap-0.5">
              <button onClick={() => setMenu(true)} aria-label="Réglages et déconnexion" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </button>
              <button onClick={() => aller('messages')} aria-label="Messages" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <MessageCircle className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                {nonLus > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{nonLus > 9 ? '9+' : nonLus}</span>
                )}
              </button>
            </div>
          </div>
          <h1 className="mt-3 text-center text-xl font-bold text-gray-900 dark:text-white">{nom || 'Mon profil'}</h1>
          {pseudo && <p className="text-center text-sm text-gray-500 dark:text-gray-400">{pseudo}</p>}
          <div className="flex justify-center mt-3">
            <button onClick={() => aller('compte')}
              className="px-5 py-1.5 rounded-full border border-pink-300 dark:border-pink-700 text-sm font-semibold text-pink-600 dark:text-pink-400">
              Modifier le profil
            </button>
          </div>
          <div className="grid grid-cols-3 mt-5">
            {stats.map((s) => (
              <button key={s.label} onClick={() => aller(s.tab)} className="text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.n}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Espace pro : apparaît dès qu'on a proposé un modèle */}
          {estPro ? (
            <div className="grid grid-cols-3 gap-2 mt-5">
              {([
                ['dashboard', 'Tableau de bord', LayoutDashboard],
                ['services', 'Mes prestations', Scissors],
                ['plans', estAbonnePro ? 'Pro ✨' : 'Passer Pro', Crown],
              ] as const).map(([tab, label, Icone]) => (
                <button key={tab} onClick={() => aller(tab)}
                  className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <Icone className="w-5 h-5 text-pink-500" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <button onClick={() => aller('home')}
              className="mt-5 w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 text-left">
              <span className="text-2xl">✋</span>
              <span className="flex-1 text-sm text-amber-900 dark:text-amber-100">
                <strong>Tu sais coiffer, faire les ongles ou le make-up ?</strong> Touche « Je sais le faire » sur un modèle pour recevoir des clientes.
                {placesOffre > 0 && <span className="block text-pink-600 dark:text-pink-400 font-semibold mt-0.5">🎁 1 mois Pro offert · plus que {placesOffre} places</span>}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="px-6 pt-8 text-center space-y-3">
          <p className="text-5xl">💇🏾‍♀️</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ton espace beauté</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Crée ton compte pour réserver, discuter avec les salons, garder tes modèles partout… ou proposer tes propres modèles.</p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/register')} className="flex-1 py-3 rounded-2xl bg-pink-500 text-white font-semibold">Créer mon compte</button>
            <button onClick={() => navigate('/login')} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">Me connecter</button>
          </div>
        </div>
      )}

      {/* Sous-onglets */}
      <div className={`grid ${sousOnglets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} mt-5 border-b border-gray-200 dark:border-gray-800`}>
        {sousOnglets.map(([id, label, tab]) => (
          <button key={id} onClick={() => aller(tab)}
            className={`relative py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${actif === id ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
            {label}
            {id === 'demandes' && !!nbDemandes && (
              <span className="ml-1 inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold items-center justify-center">{nbDemandes}</span>
            )}
          </button>
        ))}
      </div>

      {actif === 'enregistres' ? (
        chargement && favoris.length === 0 ? (
          <div className="grid grid-cols-3 gap-0.5">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : favoris.length === 0 ? (
          <div className="text-center py-14 px-6">
            <Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white">Aucun modèle enregistré</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Swipe à droite les modèles qui te plaisent : ils s'affichent ici.</p>
            <button onClick={() => aller('home')} className="mt-4 px-5 py-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm">Découvrir des modèles</button>
          </div>
        ) : (
          <Grille modeles={favoris} onOuvrir={setOuvert} />
        )
      ) : !isAuthenticated ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-14 px-6">Connecte-toi pour voir et suivre tes réservations.</p>
      ) : actif === 'demandes' ? (
        <Suspense fallback={<Chargement />}><DemandesRecues /></Suspense>
      ) : (
        <Suspense fallback={<Chargement />}><ReservationsTab /></Suspense>
      )}

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} aime={ouvert ? aimes.has(ouvert.id) : false} onToggleLike={basculer} />

      {/* Menu réglages : modifier le profil, se déconnecter (avec confirmation) */}
      <AnimatePresence>
        {menu && (
          <motion.div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={fermerMenu}>
            <motion.div className="w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="font-bold text-gray-900 dark:text-white">Réglages</p>
                <button onClick={fermerMenu} aria-label="Fermer" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              {!confirmer ? (
                <div className="space-y-1">
                  <button onClick={() => { fermerMenu(); aller('compte'); }}
                    className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left text-gray-800 dark:text-gray-100 font-medium">
                    <Pencil className="w-5 h-5 text-gray-500" /> Modifier le profil
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
      </AnimatePresence>
    </div>
  );
}

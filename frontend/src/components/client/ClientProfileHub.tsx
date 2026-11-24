import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, LayoutDashboard, Scissors, Crown } from 'lucide-react';
import { api, Modele } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useFavoris } from '../../lib/useFavoris';
import ModeleVisuel from './ModeleVisuel';
import ModeleDetailSheet from './ModeleDetailSheet';

const ReservationsTab = lazy(() => import('./ReservationsTab'));
const MessagesTab = lazy(() => import('../common/MessagesTab'));
const ProfileTab = lazy(() => import('./ProfileTab'));
// Espace pro (visible dès qu'on a proposé un modèle)
const DemandesPro = lazy(() => import('../demandes/DemandesPro'));
const MesDemandes = lazy(() => import('../demandes/MesDemandes'));
const ProfilPro = lazy(() => import('../prestataire/ProfileTab'));
const DashboardTab = lazy(() => import('../prestataire/DashboardTab'));
const ServicesTab = lazy(() => import('../prestataire/ServicesTab'));
const PlansTab = lazy(() => import('../prestataire/PlansTab'));
const DevenirPro = lazy(() => import('./DevenirPro'));

// Un seul compte pour tout le monde :
//  - cliente : Enregistrés (modèles aimés) · Réservations (ce qu'elle a réservé)
//  - pro (a proposé un modèle) : + Demandes (réservations reçues) et l'espace pro
//    (Tableau de bord, Mes prestations, Abonnement)
export type SousOngletProfil =
  | 'enregistres' | 'reservations' | 'demandes' | 'mes-demandes'
  | 'messages' | 'compte' | 'dashboard' | 'services' | 'plans' | 'devenir-pro';

/** ?demande=12 dans l'adresse (lien d'une notification) */
const idDansUrl = () => Number(new URLSearchParams(window.location.search).get('demande')) || null;

const Chargement = () => <div className="p-8 text-center text-gray-400">Chargement…</div>;

function SousPage({ titre, children }: { titre: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div>
      <div className="sticky top-14 z-30 bg-creme dark:bg-gray-950 px-3 pt-3 pb-2 flex items-center gap-3">
        <button onClick={() => navigate('/app/profile')} aria-label="Retour au profil"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700">
          <ArrowLeft className="w-5 h-5 text-encre dark:text-gray-200" />
        </button>
        <h1 className="text-xl font-bold text-encre dark:text-white">{titre}</h1>
      </div>
      <Suspense fallback={<Chargement />}>{children}</Suspense>
    </div>
  );
}

function Grille({ modeles, onOuvrir }: { modeles: Modele[]; onOuvrir: (m: Modele) => void }) {
  return (
    <div className="grid grid-cols-3 gap-[3px]">
      {modeles.map((m) => (
        <button key={m.id} onClick={() => onOuvrir(m)} aria-label={m.titre}
          className="relative aspect-[3/4] overflow-hidden bg-sable dark:bg-gray-800">
          <ModeleVisuel modele={m} compact className="w-full h-full" />
          {!!m.nb_offres && (
            <span className="absolute bottom-1.5 left-1.5 text-[10px] font-semibold text-encre bg-white/90 rounded-full px-2 py-0.5">{m.nb_offres} pro{m.nb_offres > 1 ? 's' : ''}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function ClientProfileHub({ onglet, onNavigateToTab }: { onglet: SousOngletProfil; onNavigateToTab?: (tab: string) => void }) {
  const navigate = useNavigate();
  const { isAuthenticated, user, role } = useAuthStore();
  const estPro = isAuthenticated && role?.nom === 'prestataire';
  const { favoris, aimes, chargement, basculer } = useFavoris();
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
  if (!estPro && isAuthenticated && onglet === 'devenir-pro') return <SousPage titre="Devenir prestataire"><DevenirPro onFait={() => aller('services')} /></SousPage>;
  // Pro : « Demandes » est un onglet de la barre du bas (page à part entière)
  if (estPro && onglet === 'demandes') return (
    <div className="max-w-3xl mx-auto pb-6">
      <h1 className="px-5 pt-5 pb-1 text-3xl font-bold text-encre dark:text-white">Demandes</h1>
      <Suspense fallback={<Chargement />}><DemandesPro ouvrirId={idDansUrl()} /></Suspense>
    </div>
  );

  const u: any = user;
  const nom = u ? `${u.prenom || ''} ${u.nom ? `${u.nom[0]}.` : ''}`.trim() : '';
  const pseudo = u?.email ? `@${String(u.email).split('@')[0]}` : '';
  const initiales = `${u?.prenom?.[0] || ''}${u?.nom?.[0] || ''}`.toUpperCase();
  const actif: 'enregistres' | 'mes-demandes' | 'reservations' = onglet === 'reservations' ? 'reservations' : onglet === 'mes-demandes' ? 'mes-demandes' : 'enregistres';
  const estAbonnePro = !!abo?.plan_actuel_id && abo.plan_actuel_id !== 1;

  const stats = [
    { n: favoris.length, label: 'aimés', tab: 'profile' },
    { n: nbReservations ?? '–', label: 'réservations', tab: 'mes-reservations' },
    estPro ? { n: nbDemandes ?? '–', label: 'demandes', tab: 'demandes' } : { n: nonLus, label: 'non lus', tab: 'messages' },
  ];
  const sousOnglets: [typeof actif, string, string][] = [
    ['enregistres', 'Enregistrés', 'profile'],
    ['mes-demandes', 'Demandes', 'mes-demandes'],
    ['reservations', 'Réservations', 'mes-reservations'],
  ];

  return (
    <div className="max-w-3xl mx-auto pb-6">
      {/* En-tête (maquette) : avatar, nom, @pseudo, chiffres */}
      {isAuthenticated ? (
        <div className="px-5 pt-5">
          <div className="relative flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-vin-100 dark:bg-vin-900/40 flex items-center justify-center text-vin-700 dark:text-vin-200 text-3xl font-semibold">
                {u?.photo_profil ? <img src={u.photo_profil} alt="" className="w-full h-full object-cover" /> : initiales || '·'}
              </div>
              {estAbonnePro && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-encre text-white">PRO</span>
              )}
            </div>
            {!estPro && (
              <button onClick={() => aller('devenir-pro')}
                className="absolute right-0 top-0 px-4 py-2 rounded-full border border-vin-500 text-sm font-semibold text-vin-600 dark:text-vin-300 bg-transparent">
                Devenir prestataire
              </button>
            )}
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold text-encre dark:text-white">{nom || 'Mon profil'}</h1>
          {pseudo && <p className="text-center text-gray-500 dark:text-gray-400 mt-0.5">{pseudo}</p>}
          <div className="grid grid-cols-3 mt-6">
            {stats.map((s) => (
              <button key={s.label} onClick={() => aller(s.tab)} className="text-center">
                <p className="text-2xl font-bold text-encre dark:text-white">{s.n}</p>
                <p className="text-gray-500 dark:text-gray-400">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Espace pro : trois accès sobres */}
          {estPro && (
            <div className="grid grid-cols-3 gap-2 mt-6">
              {([
                ['dashboard', 'Tableau de bord', LayoutDashboard],
                ['services', 'Mes prestations', Scissors],
                ['plans', estAbonnePro ? 'Abonnement' : 'Passer Pro', Crown],
              ] as const).map(([tab, label, Icone]) => (
                <button key={tab} onClick={() => aller(tab)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-ligne dark:border-gray-800">
                  <Icone className="w-5 h-5 text-vin-600 dark:text-vin-300" strokeWidth={1.8} />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 pt-10 text-center space-y-3">
          <h1 className="text-3xl font-bold text-encre dark:text-white">Ton espace beauté</h1>
          <p className="text-gray-500 dark:text-gray-400">Crée ton compte pour garder tes modèles, réserver et discuter avec les pros.</p>
          <div className="flex gap-2 pt-2">
            <button onClick={() => navigate('/register')} className="flex-1 py-3.5 rounded-full bg-vin-600 text-white font-semibold">Créer mon compte</button>
            <button onClick={() => navigate('/login')} className="flex-1 py-3.5 rounded-full bg-white dark:bg-gray-900 border border-ligne dark:border-gray-700 text-encre dark:text-gray-100 font-semibold">Me connecter</button>
          </div>
        </div>
      )}

      {/* Sous-onglets : soulignement noir (maquette) */}
      <div className="grid grid-cols-3 mt-6 border-b border-ligne dark:border-gray-800">
        {sousOnglets.map(([id, label, tab]) => (
          <button key={id} onClick={() => aller(tab)}
            className={`py-3.5 text-[17px] font-semibold border-b-2 -mb-px transition-colors ${actif === id ? 'border-encre dark:border-white text-encre dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
            {label}
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
            <Heart className="w-9 h-9 text-vin-300 mx-auto mb-3" strokeWidth={1.6} />
            <p className="font-semibold text-encre dark:text-white">Aucun modèle enregistré</p>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Les modèles que tu aimes dans Découvrir s'affichent ici.</p>
            <button onClick={() => aller('home')} className="mt-5 px-6 py-3 rounded-full bg-vin-600 text-white font-semibold">Découvrir des modèles</button>
          </div>
        ) : (
          <Grille modeles={favoris} onOuvrir={setOuvert} />
        )
      ) : !isAuthenticated ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-14 px-6">Connecte-toi pour voir et suivre tes demandes et tes réservations.</p>
      ) : actif === 'mes-demandes' ? (
        <Suspense fallback={<Chargement />}><MesDemandes ouvrirId={idDansUrl()} onChoisirModele={favoris.length ? () => aller('profile') : undefined} /></Suspense>
      ) : (
        <Suspense fallback={<Chargement />}><ReservationsTab /></Suspense>
      )}

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} aime={ouvert ? aimes.has(ouvert.id) : false} onToggleLike={basculer} />

    </div>
  );
}

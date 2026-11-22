import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Heart } from 'lucide-react';
import { api, Modele } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useFavoris } from '../../lib/useFavoris';
import ModeleVisuel from './ModeleVisuel';
import ModeleDetailSheet from './ModeleDetailSheet';

const ReservationsTab = lazy(() => import('./ReservationsTab'));
const MessagesTab = lazy(() => import('../common/MessagesTab'));
const ProfileTab = lazy(() => import('./ProfileTab'));

// Profil cliente (3e onglet) : avatar, compteurs, puis « Enregistrés » (modèles aimés)
// et « Demandes » (réservations). Messages et Mon compte s'ouvrent depuis l'en-tête.
export type SousOngletProfil = 'enregistres' | 'demandes' | 'messages' | 'compte';

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

export default function ClientProfileHub({ onglet }: { onglet: SousOngletProfil }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { favoris, aimes, chargement, basculer } = useFavoris();
  const [ouvert, setOuvert] = useState<Modele | null>(null);
  const [nbDemandes, setNbDemandes] = useState<number | null>(null);
  const [nonLus, setNonLus] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.reservations.list('all').then((r) => setNbDemandes(r.length)).catch(() => {});
    api.conversations.getUnreadCount().then((r) => setNonLus(r.count)).catch(() => {});
  }, [isAuthenticated]);

  if (onglet === 'messages') return <SousPage titre="Messages"><MessagesTab /></SousPage>;
  if (onglet === 'compte') return <SousPage titre="Mon compte"><ProfileTab /></SousPage>;

  const u: any = user;
  const nom = u ? `${u.prenom || ''} ${u.nom ? `${u.nom[0]}.` : ''}`.trim() : '';
  const pseudo = u?.email ? `@${String(u.email).split('@')[0]}` : '';
  const initiales = `${u?.prenom?.[0] || ''}${u?.nom?.[0] || ''}`.toUpperCase();
  const actif = onglet === 'demandes' ? 'demandes' : 'enregistres';

  const stats = [
    { n: favoris.length, label: 'aimés', aller: '/app/profile' },
    { n: nbDemandes ?? '–', label: 'demandes', aller: '/app/reservations' },
    { n: nonLus, label: 'non lus', aller: '/app/messages' },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-6">
      {/* En-tête */}
      {isAuthenticated ? (
        <div className="px-4 pt-5">
          <div className="flex items-start justify-between">
            <div className="w-20" />
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {u?.photo_profil ? <img src={u.photo_profil} alt="" className="w-full h-full object-cover" /> : initiales || '💖'}
            </div>
            <div className="w-20 flex justify-end gap-1">
              <button onClick={() => navigate('/app/messages')} aria-label="Messages" className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
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
            <button onClick={() => navigate('/app/compte')}
              className="px-5 py-1.5 rounded-full border border-pink-300 dark:border-pink-700 text-sm font-semibold text-pink-600 dark:text-pink-400">
              Modifier le profil
            </button>
          </div>
          <div className="grid grid-cols-3 mt-5">
            {stats.map((s) => (
              <button key={s.label} onClick={() => navigate(s.aller)} className="text-center">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{s.n}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 pt-8 text-center space-y-3">
          <p className="text-5xl">💇🏾‍♀️</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ton espace beauté</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Crée ton compte pour réserver, discuter avec les salons et garder tes modèles partout.</p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/register')} className="flex-1 py-3 rounded-2xl bg-pink-500 text-white font-semibold">Créer mon compte</button>
            <button onClick={() => navigate('/login')} className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">Me connecter</button>
          </div>
          <button onClick={() => navigate('/register?role=prestataire')} className="text-sm text-gray-500 underline underline-offset-2">Tu es coiffeuse ou esthéticienne ? Inscris ton salon</button>
        </div>
      )}

      {/* Sous-onglets */}
      <div className="grid grid-cols-2 mt-5 border-b border-gray-200 dark:border-gray-800">
        {([['enregistres', 'Enregistrés', '/app/profile'], ['demandes', 'Demandes', '/app/reservations']] as const).map(([id, label, aller]) => (
          <button key={id} onClick={() => navigate(aller)}
            className={`py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${actif === id ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400'}`}>
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
            <Heart className="w-10 h-10 text-pink-300 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white">Aucun modèle enregistré</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Swipe à droite les modèles qui te plaisent : ils s'affichent ici.</p>
            <button onClick={() => navigate('/app/home')} className="mt-4 px-5 py-2.5 rounded-full bg-pink-500 text-white font-semibold text-sm">Découvrir des modèles</button>
          </div>
        ) : (
          <Grille modeles={favoris} onOuvrir={setOuvert} />
        )
      ) : isAuthenticated ? (
        <Suspense fallback={<Chargement />}><ReservationsTab /></Suspense>
      ) : (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-14 px-6">Connecte-toi pour voir et suivre tes demandes de réservation.</p>
      )}

      <ModeleDetailSheet modele={ouvert} onClose={() => setOuvert(null)} aime={ouvert ? aimes.has(ouvert.id) : false} onToggleLike={basculer} />
    </div>
  );
}

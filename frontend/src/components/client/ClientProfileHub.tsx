import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ReservationsTab = lazy(() => import('./ReservationsTab'));
const MessagesTab = lazy(() => import('../common/MessagesTab'));
const ProfileTab = lazy(() => import('./ProfileTab'));

export type SousOngletProfil = 'reservations' | 'messages' | 'compte';
const ONGLETS: { id: SousOngletProfil; label: string }[] = [
  { id: 'reservations', label: 'Réservations' },
  { id: 'messages', label: 'Messages' },
  { id: 'compte', label: 'Mon compte' },
];
const ROUTE: Record<SousOngletProfil, string> = { reservations: 'reservations', messages: 'messages', compte: 'compte' };

/** Profil cliente : Réservations · Messages · Mon compte. */
export default function ClientProfileHub({ onglet }: { onglet: SousOngletProfil }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center space-y-4">
        <p className="text-5xl">💇🏾‍♀️</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ton espace beauté</h1>
        <p className="text-gray-500 dark:text-gray-400">Connecte-toi pour réserver, discuter avec les salons et retrouver tes favoris partout.</p>
        <button onClick={() => navigate('/register')} className="w-full py-3 rounded-2xl bg-pink-500 text-white font-semibold">Créer mon compte</button>
        <button onClick={() => navigate('/login')} className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-semibold">J'ai déjà un compte</button>
        <button onClick={() => navigate('/register?role=prestataire')} className="text-sm text-gray-500 underline underline-offset-2">Tu es coiffeuse ou esthéticienne ? Inscris ton salon</button>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-14 z-30 bg-app/95 backdrop-blur px-4 pt-3 pb-2">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/app/${ROUTE[o.id]}`)}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors ${
                onglet === o.id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Chargement…</div>}>
        {onglet === 'reservations' && <ReservationsTab />}
        {onglet === 'messages' && <MessagesTab />}
        {onglet === 'compte' && <ProfileTab />}
      </Suspense>
    </div>
  );
}

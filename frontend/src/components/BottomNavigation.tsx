import { useEffect, useState } from 'react';
import { Search, User, Package, CreditCard, LayoutDashboard, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';

interface BottomNavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

/** Icône « Découvrir » : une carte avec un cœur (maquette). */
function IconeDecouvrir({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="3.5" />
      <path d="M12 15.2s-3.2-1.9-3.2-4a1.8 1.8 0 0 1 3.2-1.1 1.8 1.8 0 0 1 3.2 1.1c0 2.1-3.2 4-3.2 4z" />
    </svg>
  );
}

type Onglet = { id: string; label: string; icon: React.ComponentType<any> };

const ONGLETS: Onglet[] = [
  { id: 'home', label: 'Découvrir', icon: IconeDecouvrir },
  { id: 'search', label: 'Recherche', icon: Search },
  { id: 'profile', label: 'Profil', icon: User },
];
// Pro : un onglet « Demandes » en plus (réservations reçues), comme dans la maquette
const ONGLETS_PRO: Onglet[] = [ONGLETS[0], ONGLETS[1], { id: 'demandes', label: 'Demandes', icon: Inbox }, ONGLETS[2]];

const DEMANDES_TABS = new Set(['demandes', 'reservations']);
// Le Profil regroupe Enregistrés, Réservations, Messages, Mon compte et l'espace pro
const PROFIL_TABS = new Set(['profile', 'favorites', 'reservations', 'mes-reservations', 'demandes', 'mes-demandes', 'messages', 'compte', 'dashboard', 'services', 'plans']);

const adminTabs: Onglet[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: User },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function BottomNavigation({ currentTab, setCurrentTab }: BottomNavigationProps) {
  const { role, isAuthenticated } = useAuthStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [demandesEnAttente, setDemandesEnAttente] = useState(0);
  const estPro = isAuthenticated && role?.nom === 'prestataire';

  // Badges : messages non lus (tous) et demandes en attente (pros) — toutes les 30 s
  useEffect(() => {
    if (!isAuthenticated) return;
    const load = () => {
      api.conversations.getUnreadCount().then((res) => setUnreadMessages(res.count)).catch(() => {});
      if (estPro) Promise.all([
        api.prestataireReservations.list('en_attente').then((r) => r.length).catch(() => 0),
        api.demandes.pourPro().then((r) => r.nouvelles.length).catch(() => 0),
      ]).then(([a, b]) => setDemandesEnAttente(a + b));
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, estPro]);

  const handleTabSelect = (tabId: string) => {
    if (tabId === 'messages' && !isAuthenticated) {
      showToast('Connecte-toi pour accéder à tes messages', 'info');
      navigate('/login');
      return;
    }
    setCurrentTab(tabId);
  };

  const enApp = !(role?.nom === 'admin' && !useAppStore.getState().adminDansApp);
  const tabs = !enApp ? adminTabs : estPro ? ONGLETS_PRO : ONGLETS;

  const estActif = (id: string) => {
    if (!enApp) return currentTab === id;
    if (estPro && id === 'demandes') return DEMANDES_TABS.has(currentTab);
    if (id === 'profile') return PROFIL_TABS.has(currentTab) && !(estPro && DEMANDES_TABS.has(currentTab));
    return currentTab === id;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-creme dark:bg-gray-950 border-t border-ligne dark:border-gray-800 safe-bottom lg:hidden">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-around items-stretch h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const actif = estActif(tab.id);
            const badge = tab.id === 'demandes' ? demandesEnAttente : tab.id === 'profile' && enApp ? unreadMessages : 0;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSelect(tab.id)}
                aria-current={actif ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                  actif ? 'text-vin-600 dark:text-vin-300' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <span className="relative">
                  <Icon className="w-6 h-6" strokeWidth={actif ? 2 : 1.7} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-vin-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] ${actif ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

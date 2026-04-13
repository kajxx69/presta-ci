import { Home, Calendar, Camera, Heart, User, Package, CreditCard, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import Logo from './Logo';

interface SidebarNavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

const clientTabs = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'reservations', label: 'Réservations', icon: Calendar },
  { id: 'publications', label: 'Publications', icon: Camera },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'profile', label: 'Profil', icon: User },
];

const prestataireTabs = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'reservations', label: 'Réservations', icon: Calendar },
  { id: 'plans', label: 'Abonnement', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: User },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function SidebarNavigation({ currentTab, setCurrentTab }: SidebarNavigationProps) {
  const { role, isAuthenticated } = useAuthStore();
  const { showToast } = useAppStore();
  const navigate = useNavigate();

  const handleTabSelect = (tabId: string) => {
    if (!isAuthenticated && tabId !== 'home') {
      showToast('Connectez-vous pour accéder à cette section', 'info');
      navigate('/login');
      return;
    }
    setCurrentTab(tabId);
  };

  let tabs = clientTabs;
  if (role?.nom === 'prestataire') tabs = prestataireTabs;
  if (role?.nom === 'admin') tabs = adminTabs;

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-0 h-screen border-r border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-200/50 dark:border-gray-700/50">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Logo className="h-9 w-auto" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTabSelect(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}

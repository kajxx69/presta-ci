import { Home, Calendar, Camera, Heart, User, Package, CreditCard, LayoutDashboard, MessageCircle } from 'lucide-react';
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
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'profile', label: 'Profil', icon: User },
];

const prestataireTabs = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'services', label: 'Services', icon: Package },
  { id: 'reservations', label: 'Réservations', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
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
    if (tabId === 'messages' && !isAuthenticated) {
      showToast('Connectez-vous pour accéder à vos messages', 'info');
      navigate('/login');
      return;
    }
    setCurrentTab(tabId);
  };

  let tabs = clientTabs;
  if (role?.nom === 'prestataire') tabs = prestataireTabs;
  if (role?.nom === 'admin') tabs = adminTabs;

  return (
    <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 sticky top-0 h-screen border-r border-gray-200/60 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur-2xl">
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-brand'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white/90"
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </aside>
  );
}

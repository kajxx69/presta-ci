import { useState, useEffect } from 'react';
import {
  BarChart3, Users, Package, Grid3X3, Calendar, Star,
  CreditCard, Bell, TrendingUp, Crown, Settings, Wrench,
  Menu, X, ChevronLeft, LogOut, Moon, Sun, ShieldAlert, MessageCircle, ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import Logo from '../Logo';
import NotificationCenter from '../NotificationCenter';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminServices from './AdminServices';
import AdminCategories from './AdminCategories';
import AdminReservations from './AdminReservations';
import AdminAvis from './AdminAvis';
import AdminPayments from './AdminPayments';
import AdminNotifications from './AdminNotifications';
import AdminStatistics from './AdminStatistics';
import AdminPlans from './AdminPlans';
import AdminSettings from './AdminSettings';
import AdminMaintenance from './AdminMaintenance';
import AdminProfile from './AdminProfile';
import AdminSignalements from './AdminSignalements';
import AdminTickets from './AdminTickets';
import AdminVerifications from './AdminVerifications';

type AdminTab =
  | 'dashboard' | 'users' | 'services' | 'categories'
  | 'reservations' | 'avis' | 'signalements' | 'tickets' | 'verifications' | 'payments' | 'notifications'
  | 'statistics' | 'plans' | 'settings' | 'maintenance' | 'profile';

interface NavItem {
  id: AdminTab;
  label: string;
  icon: any;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'statistics', label: 'Statistiques', icon: TrendingUp },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'services', label: 'Services', icon: Package },
      { id: 'categories', label: 'Catégories', icon: Grid3X3 },
      { id: 'reservations', label: 'Réservations', icon: Calendar },
    ],
  },
  {
    title: 'Modération',
    items: [
      { id: 'avis', label: 'Avis', icon: Star },
      { id: 'signalements', label: 'Signalements', icon: ShieldAlert },
      { id: 'verifications', label: 'Vérifications', icon: ShieldCheck },
      { id: 'tickets', label: 'Support', icon: MessageCircle },
      { id: 'payments', label: 'Paiements', icon: CreditCard },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { id: 'plans', label: 'Abonnements', icon: Crown },
      { id: 'settings', label: 'Paramètres', icon: Settings },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    ],
  },
];

const tabComponents: Record<AdminTab, React.ComponentType> = {
  dashboard: AdminDashboard,
  users: AdminUsers,
  services: AdminServices,
  categories: AdminCategories,
  reservations: AdminReservations,
  avis: AdminAvis,
  signalements: AdminSignalements,
  verifications: AdminVerifications,
  tickets: AdminTickets,
  payments: AdminPayments,
  notifications: AdminNotifications,
  statistics: AdminStatistics,
  plans: AdminPlans,
  settings: AdminSettings,
  maintenance: AdminMaintenance,
  profile: AdminProfile,
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useAppStore();
  const navigate = useNavigate();

  const ActiveComponent = tabComponents[activeTab];

  const activeLabel = activeTab === 'profile'
    ? 'Profil'
    : navGroups.flatMap((g) => g.items).find((item) => item.id === activeTab)?.label ?? 'Admin';

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { count } = await api.notifications.getUnreadCount();
        setUnreadCount(count);
      } catch {
        // silently ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (id: AdminTab) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          flex flex-col transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
          w-72
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <Logo className="h-8 w-auto flex-shrink-0" />
              <span className="font-bold text-gray-900 dark:text-white text-sm truncate">
                PrestaCI Admin
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <Logo className="h-8 w-auto mx-auto" />
          )}
          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={sidebarCollapsed ? 'Étendre' : 'Réduire'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          {/* Close button (mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {group.title}
                </p>
              )}
              {sidebarCollapsed && (
                <div className="mx-auto mb-2 w-6 border-t border-gray-200 dark:border-gray-700" />
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }
                      `}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
          {/* System status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-xs border border-green-200 dark:border-green-800 ${sidebarCollapsed ? 'justify-center px-2' : ''}`}>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            {!sidebarCollapsed && <span>Système opérationnel</span>}
          </div>

          {/* User section */}
          <button
            onClick={() => handleNavClick('profile')}
            title={sidebarCollapsed ? 'Profil' : undefined}
            className={`
              w-full flex items-center gap-3 rounded-xl transition-all duration-200
              ${sidebarCollapsed ? 'justify-center p-2' : 'px-3 py-2'}
              ${activeTab === 'profile'
                ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }
            `}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-600">
              {user?.photo_profil ? (
                <img src={user.photo_profil} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.prenom} {user?.nom}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Administrateur</p>
              </div>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Déconnexion' : undefined}
            className={`
              w-full flex items-center gap-3 rounded-xl text-sm font-medium
              text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
              transition-all duration-200
              ${sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
            `}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 sm:px-6 gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {activeLabel}
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[22rem] z-50">
                  <NotificationCenter
                    onClose={() => setShowNotifications(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                </div>
              )}
            </div>

            {/* Mobile avatar */}
            <button
              onClick={() => { handleNavClick('profile'); }}
              className="lg:hidden w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600 flex-shrink-0"
            >
              {user?.photo_profil ? (
                <img src={user.photo_profil} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>
  );
}

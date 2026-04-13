import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import { api } from './lib/api';
import { notificationService } from './services/notifications';
import ToastContainer from './components/ToastContainer';

// ─── Lazy: Auth (léger, chargé uniquement si non connecté) ───
const LoginForm = lazy(() => import('./components/auth/LoginForm'));
const RegisterForm = lazy(() => import('./components/auth/RegisterForm'));

// ─── Lazy: Layout shell (chargé dès qu'on est client/prestataire) ───
const Layout = lazy(() => import('./components/Layout'));
const BottomNavigation = lazy(() => import('./components/BottomNavigation'));

// ─── Lazy: Client ───
const HomeTab = lazy(() => import('./components/client/HomeTab'));
const ReservationsTab = lazy(() => import('./components/client/ReservationsTab'));
const PublicationsTab = lazy(() => import('./components/client/PublicationsTab'));
const FavoritesTab = lazy(() => import('./components/client/FavoritesTab'));
const ProfileTab = lazy(() => import('./components/client/ProfileTab'));

// ─── Lazy: Pages détail (accessibles par tous) ───
const PrestataireDetailPage = lazy(() => import('./pages/PrestataireDetailPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));

// ─── Lazy: Prestataire ───
const DashboardTab = lazy(() => import('./components/prestataire/DashboardTab'));
const ServicesTab = lazy(() => import('./components/prestataire/ServicesTab'));
const ReservationsTabP = lazy(() => import('./components/prestataire/ReservationsTab'));
const PlansTab = lazy(() => import('./components/prestataire/PlansTab'));
const ProfileTabP = lazy(() => import('./components/prestataire/ProfileTab'));
const ProviderDashboard = lazy(() => import('./components/provider/ProviderDashboard'));

// ─── Lazy: Admin (chargé UNIQUEMENT si admin) ───
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

// ─── Loading fallback ───
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <span className="text-white text-lg font-bold">P</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow">
          <span className="text-white text-2xl font-bold">P</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Role-based tab renderers ───

function ClientTabRenderer({ currentTab, homeTabProps }: {
  currentTab: string;
  homeTabProps: { onSelectService: (id: number) => void; onSelectProvider: (id: number) => void };
}) {
  switch (currentTab) {
    case 'home': return <HomeTab {...homeTabProps} />;
    case 'reservations': return <ReservationsTab />;
    case 'publications': return <PublicationsTab />;
    case 'favorites': return <FavoritesTab />;
    case 'profile': return <ProfileTab />;
    default: return <HomeTab {...homeTabProps} />;
  }
}

function PrestataireTabRenderer({ currentTab, setCurrentTab }: {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}) {
  switch (currentTab) {
    case 'home': return <DashboardTab onNavigateToTab={setCurrentTab} />;
    case 'reservations': return <ReservationsTabP />;
    case 'services': return <ServicesTab onNavigateToTab={setCurrentTab} />;
    case 'plans': return <PlansTab />;
    case 'profile': return <ProfileTabP />;
    default: return <DashboardTab onNavigateToTab={setCurrentTab} />;
  }
}

function App() {
  const { isAuthenticated, role } = useAuthStore();
  const { currentTab, setCurrentTab } = useAppStore();
  const navigate = useNavigate();

  const handleSelectService = useCallback((serviceId: number) => {
    navigate(`/services/${serviceId}`);
  }, [navigate]);

  const handleSelectProvider = useCallback((providerId: number) => {
    navigate(`/prestataires/${providerId}`);
  }, [navigate]);

  const homeTabProps = {
    onSelectService: handleSelectService,
    onSelectProvider: handleSelectProvider,
  };

  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
        if (!auth.token) {
          useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
          setAuthReady(true);
          return;
        }

        const { user } = await api.auth.me();
        let role = null as null | { id: number; nom: string; description: string; created_at: string };
        if (user?.role_id) {
          const roleName = user.role_nom || (user.role_id === 1 ? 'client' : user.role_id === 2 ? 'prestataire' : user.role_id === 3 ? 'admin' : '');
          role = { id: user.role_id, nom: roleName, description: '', created_at: '' };
        }
        useAuthStore.setState({ user, role, isAuthenticated: true });

        if (user) {
          await notificationService.initialize();
        }
      } catch {
        localStorage.removeItem('prestaci-auth');
        useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
      } finally {
        setAuthReady(true);
      }
    })();

    const savedDarkMode = localStorage.getItem('prestaci-dark-mode');
    if (savedDarkMode) {
      const darkMode = JSON.parse(savedDarkMode);
      useAppStore.setState({ isDarkMode: darkMode });
      document.documentElement.classList.toggle('dark', darkMode);
    }

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .catch(error => console.log('Service Worker registration failed:', error));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated && currentTab !== 'home') {
      setCurrentTab('home');
    }
  }, [isAuthenticated, currentTab, setCurrentTab]);

  const renderCurrentTab = () => {
    if (!isAuthenticated || !role) {
      return <HomeTab {...homeTabProps} />;
    }

    if (role.nom === 'client') {
      return <ClientTabRenderer currentTab={currentTab} homeTabProps={homeTabProps} />;
    }

    if (role.nom === 'prestataire') {
      return <PrestataireTabRenderer currentTab={currentTab} setCurrentTab={setCurrentTab} />;
    }

    if (role.nom === 'admin') {
      return <AdminPanel />;
    }

    return null;
  };

  if (!authReady) {
    return <SplashScreen />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/app" replace />
            ) : (
              <Layout showBottomNav={false}>
                <div className="min-h-screen flex items-center justify-center px-4 py-8">
                  <LoginForm />
                </div>
              </Layout>
            )
          }
        />

        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/app" replace />
            ) : (
              <Layout showBottomNav={false}>
                <div className="min-h-screen flex items-center justify-center px-4 py-8">
                  <RegisterForm />
                </div>
              </Layout>
            )
          }
        />

        <Route
          path="/app"
          element={
            isAuthenticated && role?.nom === 'admin' ? (
              <div className={useAppStore.getState().isDarkMode ? 'dark' : ''}>
                <AdminPanel />
                <ToastContainer />
              </div>
            ) : (
              <Layout>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {renderCurrentTab()}
                  </motion.div>
                </AnimatePresence>
                <BottomNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
              </Layout>
            )
          }
        />

        <Route
          path="/pro"
          element={
            !isAuthenticated ? (
              <Navigate to="/login" replace />
            ) : role?.id !== 2 ? (
              <Navigate to="/app" replace />
            ) : (
              <Layout>
                <ProviderDashboard />
              </Layout>
            )
          }
        />

        <Route path="/prestataires/:id" element={<PrestataireDetailPage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
      <ToastContainer />
    </Suspense>
  );
}

export default App;

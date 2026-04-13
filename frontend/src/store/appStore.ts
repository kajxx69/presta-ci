import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  isDarkMode: boolean;
  currentTab: string;
  currentLocation: { lat: number; lng: number } | null;
  notifications: any[];
  toasts: Toast[];
  toggleDarkMode: () => void;
  setCurrentTab: (tab: string) => void;
  setLocation: (location: { lat: number; lng: number }) => void;
  addNotification: (notification: any) => void;
  markNotificationAsRead: (id: number) => void;
  markAllNotificationsAsRead: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDarkMode: false,
  currentTab: (() => { try { return localStorage.getItem('prestaci-current-tab') || 'home'; } catch { return 'home'; } })(),
  currentLocation: null,
  notifications: [],
  toasts: [],

  setCurrentTab: (tab: string) => {
    set({ currentTab: tab });
    try { localStorage.setItem('prestaci-current-tab', tab); } catch {}
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode;
    set({ isDarkMode: newMode });
    localStorage.setItem('prestaci-dark-mode', JSON.stringify(newMode));
    document.documentElement.classList.toggle('dark', newMode);
  },

  setLocation: (location: { lat: number; lng: number }) => {
    set({ currentLocation: location });
  },

  addNotification: (notification: any) => {
    set(state => ({
      notifications: [notification, ...state.notifications]
    }));
  },

  markNotificationAsRead: (id: number) => {
    set(state => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      )
    }));
  },

  markAllNotificationsAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true }))
    }));
  },

  showToast: (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id: number) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  }
}));
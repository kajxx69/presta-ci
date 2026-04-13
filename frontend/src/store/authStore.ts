import { create } from 'zustand';
import { User, Role } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  role: Role | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: Partial<User>) => Promise<boolean>;
  updateProfile: (userData: Partial<User>) => void;
  setToken: (token: string) => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  token: null,
  isAuthenticated: false,

  login: async (email: string, _password: string) => {
    const response = await api.auth.login({ email, password: _password }) as any;
    const { user, token } = response;
    const nomRole = user?.role_nom || (user?.role_id === 1 ? 'client' : user?.role_id === 2 ? 'prestataire' : user?.role_id === 3 ? 'admin' : '');
    const role: Role | null = user?.role_id ? { id: user.role_id, nom: nomRole, description: '', created_at: '' } : null;
    
    set({ user, role, token, isAuthenticated: true });
    localStorage.setItem('prestaci-auth', JSON.stringify({ user, role, token }));
    return true;
  },

  logout: () => {
    try { 
      // Appeler l'API de déconnexion pour invalider les cookies côté serveur
      void api.auth.logout(); 
    } catch {}
    
    // Nettoyer l'état local
    set({ user: null, role: null, token: null, isAuthenticated: false });
    localStorage.removeItem('prestaci-auth');
    
    // Forcer la suppression des cookies côté client
    document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Redirection vers la page de connexion pour s'assurer de la déconnexion
    window.location.href = '/login';
  },

  register: async (userData: Partial<User>) => {
    const payload = {
      email: userData.email!,
      password: (userData as any).password as string,
      nom: userData.nom!,
      prenom: userData.prenom!,
      telephone: userData.telephone,
      role_id: userData.role_id || 1,
      // Champs prestataire si role_id === 2
      ...(userData.role_id === 2 && {
        nom_commercial: (userData as any).nom_commercial,
        ville: (userData as any).ville,
        adresse: (userData as any).adresse,
        latitude: (userData as any).latitude,
        longitude: (userData as any).longitude,
      }),
    };
    const response = await api.auth.register(payload) as any;
    const { user, token } = response;
    const nomRole = user?.role_nom || (user?.role_id === 1 ? 'client' : user?.role_id === 2 ? 'prestataire' : user?.role_id === 3 ? 'admin' : '');
    const role: Role | null = user?.role_id ? { id: user.role_id, nom: nomRole, description: '', created_at: '' } : null;
    set({ user, role, token, isAuthenticated: true });
    localStorage.setItem('prestaci-auth', JSON.stringify({ user, role, token }));
    return true;
  },

  updateProfile: (userData: Partial<User>) => {
    const currentUser = get().user;
    (async () => {
      try {
        if (!currentUser) return;
        const { user } = await api.users.updateMe({
          nom: userData.nom,
          prenom: userData.prenom,
          telephone: userData.telephone,
          ville: userData.ville,
          photo_profil: userData.photo_profil,
        });
        set({ user });
        localStorage.setItem('prestaci-auth', JSON.stringify({ user, role: get().role }));
      } catch (e) {
        // Fallback: still update locally to avoid UX dead-end
        const updatedUser = { ...currentUser, ...userData, updated_at: new Date().toISOString() } as User;
        set({ user: updatedUser });
        localStorage.setItem('prestaci-auth', JSON.stringify({ user: updatedUser, role: get().role, token: get().token }));
      }
    })();
  },

  setToken: (token: string) => {
    set({ token });
    const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
    localStorage.setItem('prestaci-auth', JSON.stringify({ ...auth, token }));
  },

  getToken: () => {
    const state = get();
    if (state.token) return state.token;
    
    const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
    return auth.token || null;
  }
}));
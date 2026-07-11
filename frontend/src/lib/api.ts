export interface ApiCategory { id: number; nom: string; description: string; icone?: string; couleur?: string; ordre_affichage?: number; is_active?: number; }
export interface ApiSubCategory { id: number; categorie_id: number; nom: string; description?: string; icone?: string; ordre_affichage?: number; is_active?: number; booking_type?: 'appointment' | 'order'; }
export interface ApiPrestataire { id: number; nom_commercial: string; ville?: string; adresse?: string; latitude?: number; longitude?: number; note_moyenne?: number; nombre_avis?: number; is_verified?: number; photos_etablissement?: any; }
export interface ApiService { id: number; prestataire_id: number; sous_categorie_id: number; nom: string; description?: string; prix: number; devise?: string; type_service?: 'prestation' | 'produit'; stock?: number | null; duree_minutes?: number | null; unite?: string | null; quantite_min?: number; quantite_max?: number | null; photos?: any; is_domicile?: number; is_active?: number; note_moyenne?: number; nombre_avis?: number; }

const envApiBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) as string | undefined;
const isLocalHost =
  typeof window !== 'undefined' &&
  (/^localhost$/i.test(window.location.hostname) || window.location.hostname.startsWith('127.'));

// En production, définir VITE_API_BASE ; sinon on suppose que l'API est servie sur la même origine (reverse proxy)
export const API_BASE = envApiBase || (isLocalHost ? 'http://localhost:4000' : '');

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  // Récupérer le token JWT depuis localStorage
  const auth = JSON.parse(localStorage.getItem('prestaci-auth') || '{}');
  const token = auth.token;
  
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json'
  };
  
  // Ajouter le token JWT si disponible
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${url}`, {
    headers,
    credentials: 'include', // Garder les cookies pour la compatibilité
    ...init,
  });
  
  if (!res.ok) {
    // Gérer les erreurs 401 (non autorisé) de manière silencieuse pour certaines routes
    if (res.status === 401) {
      // Nettoyer l'authentification locale si le token est invalide
      if (url.includes('/auth/me') || url.includes('/dashboard')) {
        localStorage.removeItem('prestaci-auth');
      }
      // Ne pas afficher l'erreur dans la console pour les vérifications d'auth
      throw new Error('UNAUTHORIZED');
    }
    
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  getCategories: (): Promise<ApiCategory[]> => http('/api/categories'),
  getSubCategories: (categorieId?: number): Promise<ApiSubCategory[]> => {
    const q = categorieId ? `?categorie_id=${categorieId}` : '';
    return http(`/api/sous_categories${q}`);
  },
  getPrestataires: (params?: { ville?: string; q?: string; lat?: number; lng?: number; radius_km?: number; page?: number; limit?: number }): Promise<ApiPrestataire[]> => {
    const query = new URLSearchParams();
    if (params?.ville) query.set('ville', params.ville);
    if (params?.q) query.set('q', params.q);
    if (params?.lat !== undefined) query.set('lat', String(params.lat));
    if (params?.lng !== undefined) query.set('lng', String(params.lng));
    if (params?.radius_km) query.set('radius_km', String(params.radius_km));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return http(`/api/prestataires${qs ? `?${qs}` : ''}`);
  },
  getServices: (params?: { sous_categorie_id?: number; prestataire_id?: number; q?: string; prix_max?: number; page?: number; limit?: number }): Promise<ApiService[]> => {
    const q = new URLSearchParams();
    if (params?.sous_categorie_id) q.set('sous_categorie_id', String(params.sous_categorie_id));
    if (params?.prestataire_id) q.set('prestataire_id', String(params.prestataire_id));
    if (params?.q) q.set('q', params.q);
    if (params?.prix_max) q.set('prix_max', String(params.prix_max));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return http(`/api/services${qs ? `?${qs}` : ''}`);
  },
  search: (q: string, geo?: { lat: number; lng: number }): Promise<{ services: ApiService[]; prestataires: ApiPrestataire[] }> => {
    const params = new URLSearchParams({ q });
    if (geo) {
      params.set('lat', String(geo.lat));
      params.set('lng', String(geo.lng));
    }
    return http(`/api/search?${params.toString()}`);
  },
  geo: {
    search: (q: string): Promise<Array<{ label: string; label_court: string; lat: number; lng: number; type?: string }>> =>
      http(`/api/geo/search?q=${encodeURIComponent(q)}`),
    reverse: (lat: number, lng: number): Promise<{ label: string; label_court: string; quartier: string | null; ville: string | null; lat: number; lng: number }> =>
      http(`/api/geo/reverse?lat=${lat}&lng=${lng}`),
  },
  getServiceById: (id: number): Promise<ApiService> => http(`/api/services/${id}`),
  getServiceSlots: (id: number, date: string): Promise<{
    date: string;
    duree_minutes: number;
    horaires_definis: boolean;
    ouvert: boolean;
    slots: Array<{ heure_debut: string; heure_fin: string; disponible: boolean }>;
  }> => http(`/api/services/${id}/slots?date=${date}`),
  auth: {
    register: (payload: { email: string; password: string; nom: string; prenom: string; telephone?: string; role_id: number; nom_commercial?: string; ville?: string; adresse?: string; latitude?: number; longitude?: number }): Promise<{ user: any }> =>
      http('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload: { email: string; password: string }): Promise<{ user: any }> =>
      http('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    me: (): Promise<{ user: any }> => http('/api/auth/me'),
    logout: (): Promise<{ ok: boolean }> => http('/api/auth/logout', { method: 'POST' }),
    forgotPassword: (email: string): Promise<{ ok: boolean; message: string }> =>
      http('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, new_password: string): Promise<{ ok: boolean; message: string }> =>
      http('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password }) }),
  },
  prestataires: {
    setup: (payload: {
      nom_commercial: string;
      ville?: string;
      bio?: string;
      telephone_pro?: string;
      adresse?: string;
      latitude?: number;
      longitude?: number;
      horaires_ouverture?: any;
      photos_etablissement?: any;
    }): Promise<{ ok: boolean }> =>
      http('/api/prestataires/setup', { method: 'POST', body: JSON.stringify(payload) }),
    getProfile: (): Promise<any> => http('/api/prestataires/profile'),
    updateProfile: (payload: any): Promise<{ message: string, prestataire: any }> =>
      http('/api/prestataires/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    getById: (id: number): Promise<any> => http(`/api/prestataires/${id}`),
    submitVerification: (document: string): Promise<{ ok: boolean; message: string }> =>
      http('/api/prestataires/me/verification', { method: 'POST', body: JSON.stringify({ document }) }),
  },
  subscription: {
    getPlans: (): Promise<any[]> => http('/api/subscription/plans'),
    getCurrent: (): Promise<{ subscription: any }> => http('/api/subscription'),
  },
  reservations: {
    list: (filter?: 'all' | 'upcoming' | 'completed' | 'cancelled'): Promise<any[]> =>
      http(`/api/reservations${filter ? `?filter=${filter}` : ''}`),
    cancel: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/reservations/${id}/cancel`, { method: 'PUT' }),
    create: (data: any): Promise<{ id: number }> =>
      http('/api/reservations', { method: 'POST', body: JSON.stringify(data) }),
    confirmCompletion: (id: number): Promise<{ ok: boolean; message: string }> =>
      http(`/api/reservations/${id}/confirm-completion`, { method: 'PUT' }),
  },
  publications: {
    list: (mine?: boolean): Promise<any[]> => http(`/api/publications${mine ? '?mine=1' : ''}`),
    create: (payload: { prestataire_id: number; service_id?: number; description: string; photos?: string[], videos?: string[] }): Promise<{ id: number }> =>
      http('/api/publications', { method: 'POST', body: JSON.stringify(payload) }),
    like: (id: number): Promise<{ ok: boolean }> => http(`/api/publications/${id}/like`, { method: 'POST' }),
    unlike: (id: number): Promise<{ ok: boolean }> => http(`/api/publications/${id}/like`, { method: 'DELETE' }),
    getComments: (id: number): Promise<any[]> => http(`/api/publications/${id}/comments`),
    addComment: (id: number, contenu: string): Promise<any> => http(`/api/publications/${id}/comments`, { method: 'POST', body: JSON.stringify({ contenu }) }),
  },
  favorites: {
    listProviders: (): Promise<any[]> => http('/api/favorites/providers'),
    addProvider: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/providers/${id}`, { method: 'POST' }),
    removeProvider: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/providers/${id}`, { method: 'DELETE' }),
    listServices: (): Promise<any[]> => http('/api/favorites/services'),
    addService: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/services/${id}`, { method: 'POST' }),
    removeService: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/services/${id}`, { method: 'DELETE' }),
    listPublications: (): Promise<any[]> => http('/api/favorites/publications'),
    addPublication: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/publications/${id}`, { method: 'POST' }),
    removePublication: (id: number): Promise<{ ok: boolean }> => http(`/api/favorites/publications/${id}`, { method: 'DELETE' }),
  },
  reviews: {
    forPrestataire: (prestataireId: number): Promise<any[]> => http(`/api/avis/prestataire/${prestataireId}`),
    forService: (serviceId: number): Promise<any[]> => http(`/api/avis/service/${serviceId}`)
  },
  users: {
    getMe: (): Promise<{ user: any }> => http('/api/users/me'),
    getParrainage: (): Promise<{ code: string; filleuls: number }> => http('/api/users/me/parrainage'),
    updateMe: (payload: { nom?: string; prenom?: string; telephone?: string; ville?: string; photo_profil?: string }): Promise<{ user: any }> =>
      http('/api/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
  },
  dashboard: {
    getStats: (): Promise<any> => http('/api/dashboard/stats'),
    getAnalytics: (): Promise<any> => http('/api/dashboard/analytics'),
    getRecentReservations: (limit?: number): Promise<any[]> => {
      const q = limit ? `?limit=${limit}` : '';
      return http(`/api/dashboard/recent-reservations${q}`);
    }
  },
  services: {
    list: (): Promise<any[]> => http('/api/services/my-services'),
    getById: (id: number): Promise<any> => http(`/api/services/${id}`),
    create: (payload: { sous_categorie_id: number; nom: string; description?: string; prix: number; devise?: string; duree_minutes: number; is_domicile?: boolean; is_active?: boolean }): Promise<{ id: number }> =>
      http('/api/services', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: any): Promise<{ ok: boolean }> =>
      http(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    delete: (id: number): Promise<{ ok: boolean; message?: string; deleted?: boolean; deactivated?: boolean }> =>
      http(`/api/services/${id}`, { method: 'DELETE' }),
    toggleStatus: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/services/${id}/toggle`, { method: 'PUT' })
  },
  prestataireReservations: {
    list: (filter?: 'all' | 'en_attente' | 'confirmee' | 'terminee' | 'annulee'): Promise<any[]> => {
      const q = filter ? `?filter=${filter}` : '';
      return http(`/api/prestataire/reservations${q}`);
    },
    accept: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/prestataire/reservations/${id}/accept`, { method: 'PUT' }),
    reject: (id: number, motif?: string): Promise<{ ok: boolean }> =>
      http(`/api/prestataire/reservations/${id}/reject`, { method: 'PUT', body: JSON.stringify({ motif }) }),
    complete: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/prestataire/reservations/${id}/complete`, { method: 'PUT' })
  },
  pushTokens: {
    register: (payload: { token: string; device_type: 'android' | 'ios' | 'web'; device_id?: string }): Promise<{ ok: boolean; id?: number }> =>
      http('/api/push-tokens', { method: 'POST', body: JSON.stringify(payload) }),
    list: (): Promise<any[]> => http('/api/push-tokens'),
    toggle: (id: number): Promise<{ ok: boolean; is_active: boolean }> =>
      http(`/api/push-tokens/${id}/toggle`, { method: 'PUT' }),
    delete: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/push-tokens/${id}`, { method: 'DELETE' }),
    cleanup: (): Promise<{ ok: boolean; deleted: number }> =>
      http('/api/push-tokens/cleanup', { method: 'POST' })
  },
  notifications: {
    list: (params?: { limit?: number; unread?: boolean }): Promise<any[]> => {
      const query = new URLSearchParams();
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.unread) query.append('unread', 'true');
      const queryString = query.toString();
      return http(`/api/notifications${queryString ? '?' + queryString : ''}`);
    },
    getUnreadCount: (): Promise<{ count: number }> => http('/api/notifications/count'),
    markAsRead: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: (): Promise<{ ok: boolean; count: number }> =>
      http('/api/notifications/read-all', { method: 'PUT' }),
    delete: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/notifications/${id}`, { method: 'DELETE' }),
    createTest: (): Promise<{ ok: boolean; id: number }> =>
      http('/api/notifications/test', { method: 'POST' }),
    cleanup: (days?: number): Promise<{ ok: boolean; deleted: number }> =>
      http('/api/notifications/cleanup', { method: 'POST', body: JSON.stringify({ days: days || 30 }) })
  },
  admin: {
    getSettings: (): Promise<Record<string, { value: any; description: string }>> =>
      http('/api/admin/settings'),
    updateSetting: (key: string, value: any, description?: string): Promise<{ ok: boolean }> =>
      http(`/api/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value, description }) }),
    deleteSetting: (key: string): Promise<{ ok: boolean }> =>
      http(`/api/admin/settings/${key}`, { method: 'DELETE' }),
    resetSettings: (): Promise<{ ok: boolean; count: number }> =>
      http('/api/admin/settings/reset', { method: 'POST' }),
    getStats: (): Promise<{
      users: { total_users: number; clients: number; prestataires: number; admins: number };
      services: { total_services: number; services_actifs: number };
      reservations: { total_reservations: number; confirmees: number; en_attente: number };
      notifications: { total_notifications: number; non_lues: number };
    }> => http('/api/admin/stats'),
    // Gestion des utilisateurs
    getUsers: (params?: { role?: string; search?: string; page?: number; limit?: number }): Promise<{
      users: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> => {
      const query = new URLSearchParams();
      if (params?.role) query.append('role', params.role);
      if (params?.search) query.append('search', params.search);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());
      const queryString = query.toString();
      return http(`/api/admin/users${queryString ? '?' + queryString : ''}`);
    },
    getUserStats: (): Promise<{ total_users: number; clients: number; prestataires: number; admins: number; nouveaux_30j: number }> =>
      http('/api/admin/users/stats'),
    toggleUserStatus: (userId: number): Promise<{ ok: boolean; message: string }> =>
      http(`/api/admin/users/${userId}/toggle-status`, { method: 'PUT' }),
    deleteUser: (userId: number): Promise<{ ok: boolean; message: string }> =>
      http(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    // Gestion des transactions Wave
    getWaveTransactions: (params?: { statut?: string; page?: number; limit?: number }): Promise<{
      transactions: any[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }> => {
      const query = new URLSearchParams();
      if (params?.statut) query.append('statut', params.statut);
      if (params?.page) query.append('page', params.page.toString());
      if (params?.limit) query.append('limit', params.limit.toString());
      const queryString = query.toString();
      return http(`/api/admin/wave-transactions${queryString ? '?' + queryString : ''}`);
    },
    validateWaveTransaction: (transactionId: number): Promise<{ ok: boolean; message: string }> =>
      http(`/api/admin/wave-transactions/${transactionId}/validate`, { method: 'PUT' }),
    rejectWaveTransaction: (transactionId: number, motif: string): Promise<{ ok: boolean; message: string }> =>
      http(`/api/admin/wave-transactions/${transactionId}/reject`, { method: 'PUT', body: JSON.stringify({ motif_rejet: motif }) }),
    
    // Nouvelles routes admin complètes
    services: {
      getAll: (params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<any> => {
        const query = new URLSearchParams();
        if (params?.status) query.append('status', params.status);
        if (params?.search) query.append('search', params.search);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        const queryString = query.toString();
        return http(`/api/admin/services${queryString ? '?' + queryString : ''}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/services/${id}`),
      updateStatus: (id: number, is_active: boolean, reason?: string): Promise<any> =>
        http(`/api/admin/services/${id}/status`, { method: 'PUT', body: JSON.stringify({ is_active, reason }) }),
      delete: (id: number, reason?: string): Promise<any> =>
        http(`/api/admin/services/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
      getStats: (): Promise<any> => http('/api/admin/services/stats/overview')
    },
    
    categories: {
      getAll: (include_inactive?: boolean): Promise<any> => {
        const query = include_inactive ? '?include_inactive=true' : '';
        return http(`/api/admin/categories${query}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/categories/${id}`),
      create: (data: { nom: string; description: string; icone?: string; couleur?: string }): Promise<any> =>
        http('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: any): Promise<any> =>
        http(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: number): Promise<any> =>
        http(`/api/admin/categories/${id}`, { method: 'DELETE' }),
      getSubCategories: (params?: { categorie_id?: number; include_inactive?: boolean }): Promise<any> => {
        const query = new URLSearchParams();
        if (params?.categorie_id) query.append('categorie_id', params.categorie_id.toString());
        if (params?.include_inactive) query.append('include_inactive', 'true');
        const queryString = query.toString();
        return http(`/api/admin/categories/subcategories/all${queryString ? '?' + queryString : ''}`);
      },
      createSubCategory: (categorieId: number, data: { nom: string; description: string }): Promise<any> =>
        http(`/api/admin/categories/${categorieId}/subcategories`, { method: 'POST', body: JSON.stringify(data) }),
      updateSubCategory: (id: number, data: any): Promise<any> =>
        http(`/api/admin/categories/subcategories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      deleteSubCategory: (id: number): Promise<any> =>
        http(`/api/admin/categories/subcategories/${id}`, { method: 'DELETE' }),
      reorderSubCategories: (categorieId: number, order: Array<{ id: number; ordre_affichage?: number }>): Promise<any> =>
        http(`/api/admin/categories/${categorieId}/subcategories/reorder`, { 
          method: 'PUT', 
          body: JSON.stringify({ order }) 
        })
    },
    
    reservations: {
      getAll: (params?: any): Promise<any> => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value) query.append(key, value.toString());
        });
        const queryString = query.toString();
        return http(`/api/admin/reservations${queryString ? '?' + queryString : ''}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/reservations/${id}`),
      updateStatus: (id: number, statut: string, reason?: string): Promise<any> =>
        http(`/api/admin/reservations/${id}/status`, { method: 'PUT', body: JSON.stringify({ statut, reason }) }),
      delete: (id: number, reason?: string): Promise<any> =>
        http(`/api/admin/reservations/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
      getStats: (): Promise<any> => http('/api/admin/reservations/stats/overview'),
      getConflicts: (): Promise<any> => http('/api/admin/reservations/conflicts')
    },
    
    avis: {
      getAll: (params?: any): Promise<any> => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value) query.append(key, value.toString());
        });
        const queryString = query.toString();
        return http(`/api/admin/avis${queryString ? '?' + queryString : ''}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/avis/${id}`),
      moderate: (id: number, is_approved: boolean, reason?: string): Promise<any> =>
        http(`/api/admin/avis/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ is_approved, reason }) }),
      delete: (id: number, reason?: string): Promise<any> =>
        http(`/api/admin/avis/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
      bulkModerate: (avis_ids: number[], is_approved: boolean, reason?: string): Promise<any> =>
        http('/api/admin/avis/bulk-moderate', { method: 'POST', body: JSON.stringify({ avis_ids, is_approved, reason }) }),
      getStats: (): Promise<any> => http('/api/admin/avis/stats/overview')
    },
    notifications: {
      getAll: (params?: any): Promise<any> => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value) query.append(key, value.toString());
        });
        const queryString = query.toString();
        return http(`/api/admin/notifications${queryString ? '?' + queryString : ''}`);
      },
      broadcast: (data: { title: string; message: string; type?: string; target_roles?: string[] }): Promise<any> =>
        http('/api/admin/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),
      targeted: (data: { user_ids: number[]; title: string; message: string; type?: string }): Promise<any> =>
        http('/api/admin/notifications/targeted', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: number): Promise<any> =>
        http(`/api/admin/notifications/${id}`, { method: 'DELETE' }),
      bulkDelete: (notification_ids: number[]): Promise<any> =>
        http('/api/admin/notifications/bulk-delete', { method: 'POST', body: JSON.stringify({ notification_ids }) }),
      getStats: (): Promise<any> => http('/api/admin/notifications/stats/overview'),
      getTemplates: (): Promise<any> => http('/api/admin/notifications/templates'),
      sendFromTemplate: (data: any): Promise<any> =>
        http('/api/admin/notifications/template', { method: 'POST', body: JSON.stringify(data) })
    },
    
    statistics: {
      getOverview: (period?: string): Promise<any> => {
        const query = period ? `?period=${period}` : '';
        return http(`/api/admin/statistics/overview${query}`);
      },
      getRevenue: (params?: { period?: string; group_by?: string }): Promise<any> => {
        const query = new URLSearchParams();
        if (params?.period) query.append('period', params.period);
        if (params?.group_by) query.append('group_by', params.group_by);
        const queryString = query.toString();
        return http(`/api/admin/statistics/revenue${queryString ? '?' + queryString : ''}`);
      },
      getUsers: (period?: string): Promise<any> => {
        const query = period ? `?period=${period}` : '';
        return http(`/api/admin/statistics/users${query}`);
      },
      getServices: (period?: string): Promise<any> => {
        const query = period ? `?period=${period}` : '';
        return http(`/api/admin/statistics/services${query}`);
      },
      getPerformance: (period?: string): Promise<any> => {
        const query = period ? `?period=${period}` : '';
        return http(`/api/admin/statistics/performance${query}`);
      },
      export: (type: string, period?: string, format?: string): Promise<any> => {
        const query = new URLSearchParams();
        query.append('type', type);
        if (period) query.append('period', period);
        if (format) query.append('format', format);
        return http(`/api/admin/statistics/export?${query.toString()}`);
      }
    },
    
    plans: {
      getAll: (include_inactive?: boolean): Promise<any> => {
        const query = include_inactive ? '?include_inactive=true' : '';
        return http(`/api/admin/plans${query}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/plans/${id}`),
      create: (data: any): Promise<any> =>
        http('/api/admin/plans', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: number, data: any): Promise<any> =>
        http(`/api/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: number): Promise<any> =>
        http(`/api/admin/plans/${id}`, { method: 'DELETE' }),
      getTransactions: (params?: any): Promise<any> => {
        const query = new URLSearchParams();
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value) query.append(key, value.toString());
        });
        const queryString = query.toString();
        return http(`/api/admin/wave-transactions${queryString ? '?' + queryString : ''}`);
      },
      updateTransactionStatus: (id: number, statut: string, reason?: string): Promise<any> =>
        http(`/api/admin/wave-transactions/${id}/${statut === 'valide' ? 'validate' : 'reject'}`, { 
          method: 'PUT', 
          body: JSON.stringify(statut === 'rejete' ? { motif_rejet: reason } : {}) 
        }),
      getStats: (): Promise<any> => http('/api/admin/plans/stats/overview')
    },
    
    signalements: {
      getAll: (params?: { statut?: string; type_cible?: string; page?: number; limit?: number }): Promise<any> => {
        const query = new URLSearchParams();
        if (params?.statut) query.append('statut', params.statut);
        if (params?.type_cible) query.append('type_cible', params.type_cible);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        const queryString = query.toString();
        return http(`/api/admin/signalements${queryString ? '?' + queryString : ''}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/signalements/${id}`),
      getStats: (): Promise<any> => http('/api/admin/signalements/stats'),
      traiter: (id: number, data: { statut: string; resolution_note?: string; action_prise?: string }): Promise<any> =>
        http(`/api/admin/signalements/${id}/traiter`, { method: 'PUT', body: JSON.stringify(data) }),
    },
    verifications: {
      getAll: (params?: { statut?: string; page?: number; limit?: number }): Promise<{ verifications: any[]; pagination: any }> => {
        const query = new URLSearchParams();
        if (params?.statut) query.append('statut', params.statut);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        const queryString = query.toString();
        return http(`/api/admin/verifications${queryString ? '?' + queryString : ''}`);
      },
      approve: (id: number): Promise<{ ok: boolean; message: string }> =>
        http(`/api/admin/verifications/${id}/approve`, { method: 'PUT' }),
      reject: (id: number, motif: string): Promise<{ ok: boolean; message: string }> =>
        http(`/api/admin/verifications/${id}/reject`, { method: 'PUT', body: JSON.stringify({ motif }) }),
    },
    tickets: {
      getAll: (params?: { statut?: string; page?: number; limit?: number }): Promise<{ tickets: any[]; pagination: any }> => {
        const query = new URLSearchParams();
        if (params?.statut) query.append('statut', params.statut);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        const queryString = query.toString();
        return http(`/api/admin/tickets${queryString ? '?' + queryString : ''}`);
      },
      getById: (id: number): Promise<any> => http(`/api/admin/tickets/${id}`),
      getStats: (): Promise<{ total: number; ouvert: number; en_cours: number; resolu: number; ferme: number }> =>
        http('/api/admin/tickets/stats'),
      update: (id: number, data: { statut?: string; priorite?: string }): Promise<{ ok: boolean }> =>
        http(`/api/admin/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      addMessage: (id: number, contenu: string): Promise<{ ok: boolean }> =>
        http(`/api/admin/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ contenu }) }),
    },
    maintenance: {
      getStatus: (): Promise<any> => http('/api/admin/maintenance/status'),
      clearCache: (cacheType: 'all' | 'database' | 'sessions' | 'notifications' | 'logs' = 'all'): Promise<any> =>
        http('/api/admin/maintenance/cache/clear', {
          method: 'POST',
          body: JSON.stringify({ cache_type: cacheType })
        }),
      createBackup: (options?: { backup_type?: string; include_data?: boolean }): Promise<any> =>
        http('/api/admin/maintenance/backup', { 
          method: 'POST',
          body: JSON.stringify(options || {})
        }),
      getLogs: (params?: { level?: string; search?: string; page?: number; limit?: number; date_debut?: string; date_fin?: string }): Promise<{ logs: any[]; pagination?: any }> => {
        const query = new URLSearchParams();
        if (params?.level && params.level !== 'all') query.append('level', params.level);
        if (params?.search) query.append('search', params.search);
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.date_debut) query.append('date_debut', params.date_debut);
        if (params?.date_fin) query.append('date_fin', params.date_fin);
        const queryString = query.toString();
        return http(`/api/admin/maintenance/logs${queryString ? `?${queryString}` : ''}`);
      },
      toggleMode: (enabled: boolean, options?: { message?: string; estimated_duration?: string | number }): Promise<any> =>
        http('/api/admin/maintenance/mode', {
          method: 'POST',
          body: JSON.stringify({ enabled, ...(options || {}) })
        })
    }
  },
  signalements: {
    create: (payload: { type_cible: string; cible_id: number; motif: string; description: string; preuves?: string[] }): Promise<{ ok: boolean; id: number; message: string }> =>
      http('/api/signalements', { method: 'POST', body: JSON.stringify(payload) }),
    mine: (): Promise<any[]> => http('/api/signalements/mine'),
  },
  avis: {
    create: (payload: { reservation_id: number; note: number; commentaire?: string; photos?: string[] }): Promise<{ ok: boolean; id: number; message: string }> =>
      http('/api/avis', { method: 'POST', body: JSON.stringify(payload) }),
    getByPrestataire: (prestataire_id: number): Promise<any[]> =>
      http(`/api/avis/prestataire/${prestataire_id}`),
    getByService: (service_id: number): Promise<any[]> =>
      http(`/api/avis/service/${service_id}`),
    getMyAvis: (): Promise<any[]> =>
      http('/api/avis/client'),
    delete: (id: number): Promise<{ ok: boolean; message: string }> =>
      http(`/api/avis/${id}`, { method: 'DELETE' })
  },
  notificationPreferences: {
    get: (): Promise<any> =>
      http('/api/notification-preferences'),
    update: (preferences: any): Promise<{ ok: boolean; message: string; preferences: any }> =>
      http('/api/notification-preferences', { method: 'PUT', body: JSON.stringify(preferences) }),
    reset: (): Promise<{ ok: boolean; message: string; preferences: any }> =>
      http('/api/notification-preferences/reset', { method: 'POST' })
  },
  waveTransactions: {
    create: (data: { plan_id: number; transaction_id_wave: string; montant: number; devise?: string; duree_abonnement_jours?: number }): Promise<{ ok: boolean; message: string; transaction_id: number }> =>
      http('/api/wave-transactions', { method: 'POST', body: JSON.stringify(data) }),
    getMyTransactions: (): Promise<any[]> =>
      http('/api/wave-transactions/my-transactions'),
    getStatus: (): Promise<{ hasTransaction: boolean; transaction?: any }> =>
      http('/api/wave-transactions/status')
  },
  avisClient: {
    create: (payload: { reservation_id: number; note: number; commentaire?: string }): Promise<{ ok: boolean; id: number; message: string }> =>
      http('/api/avis-client', { method: 'POST', body: JSON.stringify(payload) }),
    checkReservation: (reservationId: number): Promise<{ a_note: boolean; note: number | null }> =>
      http(`/api/avis-client/reservation/${reservationId}`),
    getByClient: (clientId: number): Promise<any[]> =>
      http(`/api/avis-client/client/${clientId}`),
  },
  conversations: {
    start: (prestataire_id: number): Promise<{ id: number }> =>
      http('/api/conversations', { method: 'POST', body: JSON.stringify({ prestataire_id }) }),
    list: (): Promise<any[]> => http('/api/conversations'),
    getUnreadCount: (): Promise<{ count: number }> => http('/api/conversations/unread-count'),
    getMessages: (id: number, afterId?: number): Promise<{
      messages: any[];
      mes_messages_lus_jusqua: number;
      interlocuteur_ecrit: boolean;
    }> => http(`/api/conversations/${id}/messages${afterId ? `?after_id=${afterId}` : ''}`),
    sendMessage: (id: number, contenu: string, image?: string): Promise<any> =>
      http(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ contenu, image }) }),
    deleteMessage: (id: number, messageId: number): Promise<{ ok: boolean }> =>
      http(`/api/conversations/${id}/messages/${messageId}`, { method: 'DELETE' }),
    typing: (id: number): Promise<{ ok: boolean }> =>
      http(`/api/conversations/${id}/typing`, { method: 'POST' }),
    sendDevis: (id: number, payload: { service_id: number; montant: number; date: string; heure?: string; description?: string }): Promise<any> =>
      http(`/api/conversations/${id}/devis`, { method: 'POST', body: JSON.stringify(payload) }),
    respondDevis: (id: number, messageId: number, action: 'accepte' | 'refuse'): Promise<{ ok: boolean; statut: string; reservation_id?: number }> =>
      http(`/api/conversations/${id}/devis/${messageId}`, { method: 'PUT', body: JSON.stringify({ action }) }),
  },
  demandes: {
    create: (payload: { titre: string; description: string; categorie_id: number; sous_categorie_id?: number; ville?: string; budget_max?: number; date_souhaitee?: string }): Promise<{ id: number; prestataires_notifies: number }> =>
      http('/api/demandes', { method: 'POST', body: JSON.stringify(payload) }),
    mine: (): Promise<any[]> => http('/api/demandes/mes'),
    opportunites: (): Promise<any[]> => http('/api/demandes/opportunites'),
    repondre: (id: number, message?: string): Promise<{ ok: boolean; conversation_id: number }> =>
      http(`/api/demandes/${id}/repondre`, { method: 'POST', body: JSON.stringify({ message }) }),
    cloturer: (id: number, statut: 'pourvue' | 'annulee'): Promise<{ ok: boolean; statut: string }> =>
      http(`/api/demandes/${id}/cloturer`, { method: 'PUT', body: JSON.stringify({ statut }) }),
  },
  tickets: {
    create: (payload: { sujet: string; categorie: string; message: string; reservation_id?: number; priorite?: string }): Promise<{ ok: boolean; id: number; message: string }> =>
      http('/api/tickets', { method: 'POST', body: JSON.stringify(payload) }),
    list: (): Promise<any[]> => http('/api/tickets'),
    getById: (id: number): Promise<{ ticket: any; messages: any[] }> => http(`/api/tickets/${id}`),
    addMessage: (id: number, contenu: string): Promise<{ ok: boolean }> =>
      http(`/api/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify({ contenu }) }),
  },
};

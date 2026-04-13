// Database Models
export interface User {
  id: number;
  email: string;
  password_hash: string;
  role_id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  ville?: string;
  photo_profil?: string;
  is_active: number;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface Prestataire {
  id: number;
  user_id: number;
  nom_commercial: string;
  ville?: string;
  bio?: string;
  telephone_pro?: string;
  adresse?: string;
  pays?: string;
  latitude?: number;
  longitude?: number;
  horaires_ouverture?: any;
  photos_etablissement?: any;
  is_verified: number;
  note_moyenne?: number;
  nombre_avis: number;
  plan_actuel_id?: number;
  abonnement_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: number;
  prestataire_id: number;
  sous_categorie_id: number;
  nom: string;
  description?: string;
  prix: number;
  devise: string;
  duree_minutes: number;
  photos?: any;
  is_domicile: number;
  is_active: number;
  note_moyenne?: number;
  nombre_avis: number;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  nom: string;
  description?: string;
  icone?: string;
  couleur?: string;
  ordre_affichage?: number;
  is_active: number;
}

export interface SubCategory {
  id: number;
  categorie_id: number;
  nom: string;
  description?: string;
  icone?: string;
  ordre_affichage?: number;
  is_active: number;
}

export interface Publication {
  id: number;
  client_id: number;
  prestataire_id: number;
  service_id?: number;
  description: string;
  photos?: string[];
  videos?: string[];
  nombre_likes: number;
  is_visible: number;
  created_at: Date;
  updated_at: Date;
}

export interface Reservation {
  id: number;
  client_id: number;
  prestataire_id: number;
  service_id: number;
  statut_id: number;
  date_reservation: Date;
  heure_debut: string;
  heure_fin: string;
  prix_final: number;
  notes_client?: string;
  a_domicile: number;
  adresse_rdv?: string;
  created_at: Date;
  updated_at: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Request Types
export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role_id: number;
  nom_commercial?: string;
  ville?: string;
  adresse?: string;
  latitude?: number;
  longitude?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  nom?: string;
  prenom?: string;
  telephone?: string;
  ville?: string;
  photo_profil?: string;
}

export interface CreateServiceRequest {
  sous_categorie_id: number;
  nom: string;
  description?: string;
  prix: number;
  devise?: string;
  duree_minutes: number;
  photos?: string[];
  is_domicile?: number;
}

export interface CreatePublicationRequest {
  prestataire_id: number;
  service_id?: number;
  description: string;
  photos?: string[];
}

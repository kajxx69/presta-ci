export interface User {
  id: number;
  email: string;
  password_hash?: string;
  role_id: number;
  nom: string;
  prenom: string;
  telephone: string;
  photo_profil?: string;
  date_naissance?: string;
  genre?: 'M' | 'F' | 'Autre';
  ville?: string;
  pays: string;
  langue_preferee: string;
  is_active: boolean;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: number;
  nom: string;
  description: string;
  created_at: string;
}

export interface Category {
  id: number;
  nom: string;
  description: string;
  icone: string;
  couleur: string;
  ordre_affichage: number;
  is_active: boolean;
  created_at: string;
}

export interface SubCategory {
  id: number;
  categorie_id: number;
  nom: string;
  description: string;
  icone: string;
  ordre_affichage: number;
  is_active: boolean;
  created_at: string;
}

export interface PlanAbonnement {
  id: number;
  nom: string;
  description: string;
  prix: number;
  prix_promo?: number;
  devise: string;
  duree_jours: number;
  max_services: number;
  max_reservations_mois: number;
  max_photos_par_service: number;
  mise_en_avant: boolean;
  support_prioritaire: boolean;
  analytics_avances: boolean;
  personnalisation_profil: boolean;
  badge_premium: boolean;
  avantages: string[];
  is_active: boolean;
  created_at: string;
}

export interface Prestataire {
  id: number;
  user_id: number;
  nom_commercial: string;
  bio?: string;
  adresse: string;
  ville: string;
  pays: string;
  latitude?: number;
  longitude?: number;
  telephone_professionnel?: string;
  email_professionnel?: string;
  site_web?: string;
  horaires_ouverture: Record<string, { ouvert: boolean; debut?: string; fin?: string; pause_debut?: string; pause_fin?: string }>;
  photos_etablissement: string[];
  licence_numero?: string;
  plan_actuel_id?: number;
  abonnement_expires_at?: string;
  total_services_utilises: number;
  total_reservations_mois: number;
  note_moyenne: number;
  nombre_avis: number;
  total_vues_profil: number;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  prestataire_id: number;
  sous_categorie_id: number;
  nom: string;
  description: string;
  prix: number;
  devise: string;
  duree_minutes: number;
  photos: string[];
  is_domicile: boolean;
  is_en_salon: boolean;
  tarif_deplacement?: number;
  zone_deplacement_km?: number;
  max_clients_simultanes: number;
  delai_annulation_heures: number;
  total_reservations: number;
  note_moyenne: number;
  nombre_avis: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: number;
  client_id: number;
  prestataire_id: number;
  service_id: number;
  statut_id: number;
  date_reservation: string;
  heure_debut: string;
  heure_fin: string;
  prix_final: number;
  devise: string;
  nombre_personnes: number;
  notes_client?: string;
  notes_prestataire?: string;
  a_domicile: boolean;
  adresse_rdv?: string;
  latitude_rdv?: number;
  longitude_rdv?: number;
  telephone_contact?: string;
  code_annulation?: string;
  created_at: string;
  updated_at: string;
}

export interface StatutReservation {
  id: number;
  nom: string;
  couleur: string;
  description: string;
  ordre: number;
  is_active: boolean;
}

export interface Publication {
  id: number;
  client_id: number;
  prestataire_id: number;
  service_id?: number;
  description: string;
  photos: string[];
  videos: string[];
  nombre_likes: number;
  nombre_commentaires: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: number;
  publication_id: number;
  user_id: number;
  created_at: string;
}

export interface FavoriPrestataire {
  id: number;
  client_id: number;
  prestataire_id: number;
  created_at: string;
}

export interface FavoriService {
  id: number;
  client_id: number;
  service_id: number;
  created_at: string;
}

export interface TransactionWave {
  id: number;
  prestataire_id: number;
  plan_id: number;
  transaction_id_wave: string;
  montant: number;
  devise: string;
  statut: 'en_attente' | 'valide' | 'rejete' | 'expire';
  date_paiement: string;
  date_validation?: string;
  duree_abonnement_jours: number;
  commentaire_admin?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  template_id?: number;
  titre: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'reservation' | 'publication' | 'abonnement';
  is_read: boolean;
  data: Record<string, any>;
  created_at: string;
}
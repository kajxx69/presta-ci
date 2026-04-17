import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Counter } from './models/Counter.js';
import { Role } from './models/Role.js';
import { Plan } from './models/Plan.js';
import { StatutReservation } from './models/Reservation.js';
import { Category, SubCategory } from './models/Category.js';
import { NotificationTemplate } from './models/Notification.js';
import { Configuration } from './models/Settings.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/prestation';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Reset counters for seeded collections
  await Counter.deleteMany({});

  // --- Roles ---
  await Role.deleteMany({});
  const roles = [
    { _id: 1, nom: 'client', description: 'Utilisateur client de la plateforme' },
    { _id: 2, nom: 'prestataire', description: 'Prestataire de services' },
    { _id: 3, nom: 'admin', description: 'Administrateur de la plateforme' }
  ];
  await Role.insertMany(roles);
  await Counter.findByIdAndUpdate('roles', { seq: 3 }, { upsert: true });
  console.log('✅ Roles seeded');

  // --- Plans d'abonnement ---
  await Plan.deleteMany({});
  const plans = [
    {
      _id: 1, nom: 'Gratuit', prix: 0, prix_promo: null, devise: 'FCFA',
      max_services: 3, max_reservations_mois: 15, max_photos_par_service: 3,
      mise_en_avant: false, is_popular: false,
      description: 'Lancez-vous gratuitement et recevez vos premiers clients',
      avantages: [
        '3 services maximum',
        '15 réservations/mois',
        '3 photos par service',
        '2 publications/mois',
        'Visible sur la carte',
        'Statistiques basiques',
        'Support communauté'
      ],
      features: ['map_visibility', 'basic_stats', 'community_support']
    },
    {
      _id: 2, nom: 'Pro', prix: 1500, prix_promo: 990, devise: 'FCFA',
      max_services: 10, max_reservations_mois: 50, max_photos_par_service: 5,
      mise_en_avant: false, is_popular: true,
      description: 'Développez votre activité et touchez plus de clients',
      avantages: [
        '10 services maximum',
        '50 réservations/mois',
        '5 photos par service',
        '10 publications/mois',
        'Statistiques détaillées',
        'Support WhatsApp',
        'Notifications clients'
      ],
      features: ['map_visibility', 'detailed_stats', 'whatsapp_support', 'client_notifications']
    },
    {
      _id: 3, nom: 'Business', prix: 4900, prix_promo: 2900, devise: 'FCFA',
      max_services: 30, max_reservations_mois: 150, max_photos_par_service: 10,
      mise_en_avant: false, is_popular: false,
      description: 'La solution complète pour les salons et équipes',
      avantages: [
        '30 services maximum',
        '150 réservations/mois',
        '10 photos par service',
        '30 publications/mois',
        'Badge vérifié ✓',
        'Statistiques avancées',
        'Support prioritaire',
        'Rappels automatiques clients'
      ],
      features: ['map_visibility', 'advanced_stats', 'priority_support', 'verified_badge', 'auto_reminders']
    },
    {
      _id: 4, nom: 'Elite', prix: 9900, prix_promo: 5900, devise: 'FCFA',
      max_services: -1, max_reservations_mois: -1, max_photos_par_service: 15,
      mise_en_avant: true, is_popular: false,
      description: 'Dominez votre zone et attirez un maximum de clients',
      avantages: [
        'Services illimités',
        'Réservations illimitées',
        '15 photos par service',
        'Publications illimitées',
        'Mise en avant prioritaire ⭐',
        'Badge vérifié ✓',
        'Statistiques complètes + export',
        'Support VIP dédié',
        'Profil mis en avant en premier',
        'Accès anticipé aux nouveautés'
      ],
      features: ['map_visibility', 'full_stats', 'export', 'vip_support', 'verified_badge', 'featured_profile', 'auto_reminders', 'early_access']
    }
  ];
  await Plan.insertMany(plans);
  await Counter.findByIdAndUpdate('plans_abonnement', { seq: 4 }, { upsert: true });
  console.log('✅ Plans seeded');

  // --- Statuts de réservation ---
  await StatutReservation.deleteMany({});
  const statuts = [
    { _id: 1, nom: 'en_attente', couleur: '#FFA500', description: 'Réservation en attente de validation' },
    { _id: 2, nom: 'acceptee', couleur: '#28A745', description: 'Réservation acceptée par le prestataire' },
    { _id: 3, nom: 'refusee', couleur: '#DC3545', description: 'Réservation refusée par le prestataire' },
    { _id: 4, nom: 'terminee', couleur: '#17A2B8', description: 'Prestation terminée' },
    { _id: 5, nom: 'annulee', couleur: '#6C757D', description: 'Réservation annulée' },
    { _id: 6, nom: 'confirmee', couleur: '#007BFF', description: 'Réservation confirmée (rappel envoyé)' }
  ];
  await StatutReservation.insertMany(statuts);
  await Counter.findByIdAndUpdate('statuts_reservation', { seq: 6 }, { upsert: true });
  console.log('✅ Statuts de réservation seeded');

  // --- Catégories ---
  await Category.deleteMany({});
  const categories = [
    { _id: 1, nom: 'Beauté & Esthétique', description: 'Maquillage, épilation, soins du visage', icone: 'beauty.svg', couleur: '#FF69B4', ordre_affichage: 1 },
    { _id: 2, nom: 'Bien-être', description: 'Services de détente et bien-être', icone: 'wellness.svg', couleur: '#9370DB', ordre_affichage: 2 },
    { _id: 3, nom: 'Coiffure Femme', description: 'Tresses, défrisage, extensions, coloration', icone: 'hair.svg', couleur: '#EC4899', ordre_affichage: 3 },
    { _id: 4, nom: 'Ongles', description: 'Services de manucure et pédicure', icone: 'nails.svg', couleur: '#FF6347', ordre_affichage: 4 },
    { _id: 5, nom: 'Massage', description: 'Services de massage thérapeutique', icone: 'massage.svg', couleur: '#32CD32', ordre_affichage: 5 },
    { _id: 6, nom: 'Coiffure Homme', description: 'Coupe, dégradé, barbe, rasage', icone: 'hair.svg', couleur: '#6366F1', ordre_affichage: 6 },
    { _id: 7, nom: 'Imprimerie & Design', description: 'Cartes de visite, flyers, infographie, logo', icone: 'photography.svg', couleur: '#3B82F6', ordre_affichage: 7 },
    { _id: 8, nom: 'Traiteur & Restauration', description: 'Buffets, plats cuisinés, pâtisserie', icone: 'cooking.svg', couleur: '#F59E0B', ordre_affichage: 8 },
    { _id: 9, nom: 'Fleuriste & Décoration', description: 'Compositions florales, décoration événementielle', icone: 'wellness.svg', couleur: '#10B981', ordre_affichage: 9 },
    { _id: 10, nom: 'Nettoyage & Ménage', description: 'Entretien domicile, bureaux, pressing', icone: 'cleaning.svg', couleur: '#14B8A6', ordre_affichage: 10 },
    { _id: 11, nom: 'Fitness', description: 'Services de remise en forme', icone: 'fitness.svg', couleur: '#FF4500', ordre_affichage: 11 },
  ];
  await Category.insertMany(categories);
  await Counter.findByIdAndUpdate('categories', { seq: 11 }, { upsert: true });
  console.log('✅ Catégories seeded');

  // --- Sous-catégories ---
  await SubCategory.deleteMany({});
  const sousCategories = [
    // Beauté & Esthétique (1)
    { _id: 1, categorie_id: 1, nom: 'Maquillage', description: 'Services de maquillage professionnel', ordre_affichage: 1 },
    { _id: 2, categorie_id: 1, nom: 'Épilation', description: "Services d'épilation", ordre_affichage: 2 },
    { _id: 3, categorie_id: 1, nom: 'Soins du visage', description: 'Nettoyage et soins faciaux', ordre_affichage: 3 },
    // Bien-être (2)
    { _id: 4, categorie_id: 2, nom: 'Relaxation & Détente', description: 'Soins de relaxation et détente profonde', ordre_affichage: 1 },
    { _id: 5, categorie_id: 2, nom: 'Soins corporels', description: 'Enveloppements, gommages et soins du corps', ordre_affichage: 2 },
    { _id: 6, categorie_id: 2, nom: 'Aromathérapie', description: "Thérapies par les huiles essentielles", ordre_affichage: 3 },
    // Coiffure Femme (3)
    { _id: 7, categorie_id: 3, nom: 'Coupe & Brushing', description: 'Coupe de cheveux et mise en forme', ordre_affichage: 1 },
    { _id: 8, categorie_id: 3, nom: 'Tresses & Nattes', description: 'Tresses africaines, vanilles, box braids', ordre_affichage: 2 },
    { _id: 9, categorie_id: 3, nom: 'Défrisage & Extensions', description: 'Lissage, défrisage, pose de rajouts', ordre_affichage: 3 },
    { _id: 10, categorie_id: 3, nom: 'Coloration', description: 'Coloration et mèches', ordre_affichage: 4 },
    { _id: 11, categorie_id: 3, nom: 'Tissage & Perruques', description: 'Pose tissage, entretien perruques', ordre_affichage: 5 },
    // Ongles (4)
    { _id: 12, categorie_id: 4, nom: 'Manucure', description: 'Soins des mains et ongles', ordre_affichage: 1 },
    { _id: 13, categorie_id: 4, nom: 'Pédicure', description: 'Soins des pieds et ongles', ordre_affichage: 2 },
    { _id: 14, categorie_id: 4, nom: 'Nail art', description: "Décoration d'ongles artistique", ordre_affichage: 3 },
    // Massage (5)
    { _id: 15, categorie_id: 5, nom: 'Massage relaxant', description: 'Massage doux pour la détente et le stress', ordre_affichage: 1 },
    { _id: 16, categorie_id: 5, nom: 'Massage thérapeutique', description: 'Massage ciblé pour douleurs et tensions musculaires', ordre_affichage: 2 },
    { _id: 17, categorie_id: 5, nom: 'Réflexologie', description: 'Stimulation des points réflexes des pieds et des mains', ordre_affichage: 3 },
    // Coiffure Homme (6)
    { _id: 18, categorie_id: 6, nom: 'Coupe & Dégradé', description: 'Coupes masculines classiques et modernes', ordre_affichage: 1 },
    { _id: 19, categorie_id: 6, nom: 'Barbe & Rasage', description: 'Taille de barbe, rasage traditionnel', ordre_affichage: 2 },
    // Imprimerie & Design (7)
    { _id: 20, categorie_id: 7, nom: 'Cartes de visite', description: 'Conception et impression de cartes de visite', ordre_affichage: 1 },
    { _id: 21, categorie_id: 7, nom: 'Flyers & Affiches', description: 'Flyers, affiches publicitaires, kakémonos', ordre_affichage: 2 },
    { _id: 22, categorie_id: 7, nom: 'Logo & Identité visuelle', description: 'Création de logo, charte graphique', ordre_affichage: 3 },
    { _id: 23, categorie_id: 7, nom: 'Infographie', description: 'Retouches photo, montages, bannières réseaux sociaux', ordre_affichage: 4 },
    // Traiteur & Restauration (8)
    { _id: 24, categorie_id: 8, nom: 'Buffet & Réception', description: 'Organisation de buffets pour événements', ordre_affichage: 1 },
    { _id: 25, categorie_id: 8, nom: 'Plats cuisinés à domicile', description: 'Cuisine à domicile, repas livrés', ordre_affichage: 2 },
    { _id: 26, categorie_id: 8, nom: 'Pâtisserie & Gâteaux', description: 'Gâteaux de fête, wedding cake, viennoiseries', ordre_affichage: 3 },
    // Fleuriste & Décoration (9)
    { _id: 27, categorie_id: 9, nom: 'Bouquets & Compositions', description: 'Fleurs fraîches et artificielles', ordre_affichage: 1 },
    { _id: 28, categorie_id: 9, nom: 'Décoration événementielle', description: 'Scénographie mariage, anniversaire, inauguration', ordre_affichage: 2 },
    // Nettoyage & Ménage (10)
    { _id: 29, categorie_id: 10, nom: 'Ménage à domicile', description: 'Entretien régulier du domicile', ordre_affichage: 1 },
    { _id: 30, categorie_id: 10, nom: 'Nettoyage après travaux', description: 'Grand nettoyage post-chantier', ordre_affichage: 2 },
    { _id: 31, categorie_id: 10, nom: 'Pressing & Blanchisserie', description: 'Lavage, repassage, pressing vêtements', ordre_affichage: 3 },
    // Fitness (11)
    { _id: 32, categorie_id: 11, nom: 'Coaching personnel', description: 'Accompagnement sportif personnalisé', ordre_affichage: 1 },
    { _id: 33, categorie_id: 11, nom: 'Cours collectifs', description: 'Zumba, yoga, pilates et sports collectifs', ordre_affichage: 2 },
    { _id: 34, categorie_id: 11, nom: 'Nutrition & Diététique', description: 'Conseils nutritionnels et plans alimentaires', ordre_affichage: 3 },
  ];
  await SubCategory.insertMany(sousCategories);
  await Counter.findByIdAndUpdate('sous_categories', { seq: 34 }, { upsert: true });
  console.log('✅ Sous-catégories seeded');

  // --- Templates de notifications ---
  await NotificationTemplate.deleteMany({});
  const templates = [
    { _id: 1, nom: 'reservation_confirmee', titre: 'Réservation confirmée !', message: 'Votre réservation pour {{service_nom}} le {{date}} à {{heure}} a été confirmée.', variables: ['service_nom', 'date', 'heure', 'prestataire_nom'] },
    { _id: 2, nom: 'reservation_acceptee', titre: 'Réservation acceptée', message: '{{prestataire_nom}} a accepté votre demande de réservation pour {{service_nom}}.', variables: ['prestataire_nom', 'service_nom', 'date', 'heure'] },
    { _id: 3, nom: 'reservation_refusee', titre: 'Réservation refusée', message: "Désolé, {{prestataire_nom}} n'est pas disponible pour ce créneau.", variables: ['prestataire_nom', 'service_nom'] },
    { _id: 4, nom: 'rappel_rdv', titre: 'Rappel de rendez-vous', message: "N'oubliez pas votre rendez-vous demain à {{heure}} chez {{prestataire_nom}}.", variables: ['heure', 'prestataire_nom', 'service_nom'] },
    { _id: 5, nom: 'nouvelle_reservation', titre: 'Nouvelle demande de réservation', message: '{{client_nom}} souhaite réserver {{service_nom}} pour le {{date}} à {{heure}}.', variables: ['client_nom', 'service_nom', 'date', 'heure'] },
    { _id: 6, nom: 'paiement_valide', titre: 'Paiement validé', message: 'Votre abonnement {{plan_nom}} a été activé avec succès !', variables: ['plan_nom', 'duree'] }
  ];
  await NotificationTemplate.insertMany(templates);
  await Counter.findByIdAndUpdate('notification_templates', { seq: 6 }, { upsert: true });
  console.log('✅ Templates de notifications seeded');

  // --- Configurations ---
  await Configuration.deleteMany({});
  const configs = [
    { _id: 1, cle: 'app_name', valeur: 'Prestations PWA', type: 'string', description: "Nom de l'application" },
    { _id: 2, cle: 'wave_number', valeur: '+225 XX XX XX XX XX', type: 'string', description: 'Numéro Wave pour les paiements' },
    { _id: 3, cle: 'max_photos_publication', valeur: '5', type: 'integer', description: 'Nombre maximum de photos par publication' },
    { _id: 4, cle: 'session_duration_hours', valeur: '24', type: 'integer', description: 'Durée de session en heures' },
    { _id: 5, cle: 'email_admin', valeur: 'admin@prestations-pwa.com', type: 'string', description: "Email de l'administrateur principal" },
    { _id: 6, cle: 'maintenance_mode', valeur: 'false', type: 'boolean', description: 'Mode maintenance activé' },
    { _id: 7, cle: 'timezone', valeur: 'Africa/Abidjan', type: 'string', description: "Fuseau horaire de l'application" }
  ];
  await Configuration.insertMany(configs);
  await Counter.findByIdAndUpdate('configurations', { seq: 7 }, { upsert: true });
  console.log('✅ Configurations seeded');

  console.log('\n🎉 Seed completed successfully!');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

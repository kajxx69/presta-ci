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
    { _id: 1,  nom: 'Beauté & Esthétique',        description: 'Maquillage, épilation, soins du visage et du corps',    icone: 'beauty.svg',       couleur: '#FF69B4', ordre_affichage: 1  },
    { _id: 2,  nom: 'Bien-être & Spa',             description: 'Relaxation, aromathérapie, méditation, soins zen',       icone: 'wellness.svg',     couleur: '#9370DB', ordre_affichage: 2  },
    { _id: 3,  nom: 'Coiffure Femme',              description: 'Tresses, défrisage, extensions, coloration, tissage',    icone: 'hair.svg',         couleur: '#EC4899', ordre_affichage: 3  },
    { _id: 4,  nom: 'Coiffure Homme',              description: 'Coupe, dégradé, barbe, rasage, soins capillaires',       icone: 'hair.svg',         couleur: '#6366F1', ordre_affichage: 4  },
    { _id: 5,  nom: 'Ongles & Nail Art',           description: 'Manucure, pédicure, poses gel, nail art',                icone: 'nails.svg',        couleur: '#FF6347', ordre_affichage: 5  },
    { _id: 6,  nom: 'Massage & Kinésithérapie',    description: 'Massages relaxants, thérapeutiques, sportifs',           icone: 'massage.svg',      couleur: '#32CD32', ordre_affichage: 6  },
    { _id: 7,  nom: 'Fitness & Sport',             description: 'Coaching, cours collectifs, arts martiaux, natation',    icone: 'fitness.svg',      couleur: '#FF4500', ordre_affichage: 7  },
    { _id: 8,  nom: 'Santé & Médecine douce',      description: 'Ostéopathie, naturopathie, acupuncture, diététique',     icone: 'health.svg',       couleur: '#00CED1', ordre_affichage: 8  },
    { _id: 9,  nom: 'Éducation & Formation',       description: 'Cours particuliers, langues, informatique, musique',     icone: 'education.svg',    couleur: '#4CAF50', ordre_affichage: 9  },
    { _id: 10, nom: 'Informatique & Tech',         description: 'Dépannage PC, développement web, réseaux, cybersécurité',icone: 'security.svg',     couleur: '#2196F3', ordre_affichage: 10 },
    { _id: 11, nom: 'Imprimerie & Design',         description: 'Cartes, flyers, logo, charte graphique, photos',         icone: 'photography.svg',  couleur: '#3B82F6', ordre_affichage: 11 },
    { _id: 12, nom: 'Audiovisuel & Médias',        description: 'Photo, vidéo, drone, montage, studio d\'enregistrement', icone: 'music.svg',        couleur: '#7C3AED', ordre_affichage: 12 },
    { _id: 13, nom: 'Événementiel & Animation',    description: 'Organisation fêtes, DJ, décoration, sono, traiteur',     icone: 'wellness.svg',     couleur: '#F59E0B', ordre_affichage: 13 },
    { _id: 14, nom: 'Traiteur & Restauration',     description: 'Buffets, plats cuisinés, pâtisserie, livraison repas',   icone: 'cooking.svg',      couleur: '#EF4444', ordre_affichage: 14 },
    { _id: 15, nom: 'Fleuriste & Décoration',      description: 'Bouquets, compositions, décoration événementielle',      icone: 'wellness.svg',     couleur: '#10B981', ordre_affichage: 15 },
    { _id: 16, nom: 'Nettoyage & Entretien',       description: 'Ménage, vitres, jardinage, désinfection, pressing',      icone: 'cleaning.svg',     couleur: '#14B8A6', ordre_affichage: 16 },
    { _id: 17, nom: 'Travaux & Artisanat',         description: 'Plomberie, électricité, peinture, menuiserie, maçonnerie',icone: 'plumbing.svg',    couleur: '#F97316', ordre_affichage: 17 },
    { _id: 18, nom: 'Transport & Déménagement',    description: 'VTC, coursier, déménagement, livraison, taxi moto',      icone: 'transport.svg',    couleur: '#0EA5E9', ordre_affichage: 18 },
    { _id: 19, nom: 'Sécurité & Surveillance',     description: 'Gardiennage, alarmes, caméras, protection rapprochée',   icone: 'security.svg',     couleur: '#DC2626', ordre_affichage: 19 },
    { _id: 20, nom: 'Juridique & Administratif',   description: 'Avocat, notaire, comptable, conseiller fiscal',           icone: 'education.svg',    couleur: '#6B7280', ordre_affichage: 20 },
    { _id: 21, nom: 'Immobilier',                  description: 'Location, vente, gestion locative, expertise immobilière',icone: 'plumbing.svg',    couleur: '#84CC16', ordre_affichage: 21 },
    { _id: 22, nom: 'Mode & Couture',              description: 'Couture, retouches, création vêtements, stylisme',        icone: 'beauty.svg',       couleur: '#F472B6', ordre_affichage: 22 },
    { _id: 23, nom: 'Animaux & Vétérinaire',       description: 'Vétérinaire, toilettage, pension, dressage, promenade',   icone: 'wellness.svg',     couleur: '#A3E635', ordre_affichage: 23 },
    { _id: 24, nom: 'Mariage & Cérémonies',        description: 'Organisation, officiant, maquillage, traiteur, photos',   icone: 'wellness.svg',     couleur: '#FB7185', ordre_affichage: 24 },
    { _id: 25, nom: 'Enfants & Garde',             description: 'Babysitting, crèche, aide aux devoirs, loisirs enfants',  icone: 'education.svg',    couleur: '#FCD34D', ordre_affichage: 25 },
    { _id: 26, nom: 'Agriculture & Jardinage',     description: 'Jardinage, maraîchage, livraison produits frais',         icone: 'wellness.svg',     couleur: '#65A30D', ordre_affichage: 26 },
    { _id: 27, nom: 'Énergie & Climatisation',     description: 'Climatiseurs, panneaux solaires, installations, réparations', icone: 'electricity.svg', couleur: '#FBBF24', ordre_affichage: 27 },
    { _id: 28, nom: 'Beauté Masculine',            description: 'Soins visage homme, épilation masculine, modelage',        icone: 'beauty.svg',       couleur: '#818CF8', ordre_affichage: 28 },
    { _id: 29, nom: 'Marketing & Communication',   description: 'Community management, pub, branding, copywriting',         icone: 'photography.svg',  couleur: '#F43F5E', ordre_affichage: 29 },
    { _id: 30, nom: 'Divers & Autres',             description: 'Services variés ne correspondant pas aux autres catégories', icone: 'wellness.svg',   couleur: '#94A3B8', ordre_affichage: 30 },
  ];
  await Category.insertMany(categories);
  await Counter.findByIdAndUpdate('categories', { seq: 30 }, { upsert: true });
  console.log('✅ Catégories seeded (30)');

  // --- Sous-catégories ---
  await SubCategory.deleteMany({});
  const sousCategories = [
    // ── 1. Beauté & Esthétique ──────────────────────────────────────
    { _id: 1,   categorie_id: 1,  nom: 'Maquillage',                  description: 'Maquillage de jour, de soirée, mariée',                ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 2,   categorie_id: 1,  nom: 'Épilation',                   description: "Épilation cire, fil, laser, lumière pulsée",           ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 3,   categorie_id: 1,  nom: 'Soins du visage',             description: 'Nettoyage, hydratation, anti-âge, masques',            ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 4,   categorie_id: 1,  nom: 'Sourcils & Cils',             description: 'Henna sourcils, micro-blading, extensions de cils',    ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 5,   categorie_id: 1,  nom: 'Bronzage & UV',               description: 'Bronzage en cabine, autobronzant, spray tan',          ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 6,   categorie_id: 1,  nom: 'Piercing & Tatouage',         description: 'Tatouage artistique, piercing, dermographie',          ordre_affichage: 6, booking_type: 'appointment' },

    // ── 2. Bien-être & Spa ──────────────────────────────────────────
    { _id: 7,   categorie_id: 2,  nom: 'Relaxation & Détente',        description: 'Soins de relaxation profonde, gommages, enveloppements',ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 8,   categorie_id: 2,  nom: 'Soins corporels',             description: 'Soins du corps, enveloppements, bains de vapeur',      ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 9,   categorie_id: 2,  nom: 'Aromathérapie',               description: 'Thérapies par les huiles essentielles',                ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 10,  categorie_id: 2,  nom: 'Méditation & Yoga',           description: 'Séances de méditation, yoga, pleine conscience',       ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 11,  categorie_id: 2,  nom: 'Hammam & Sauna',              description: 'Sessions hammam, sauna traditionnel, bains turcs',     ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 12,  categorie_id: 2,  nom: 'Chromothérapie & Luminothérapie', description: 'Thérapies par la lumière et les couleurs',         ordre_affichage: 6, booking_type: 'appointment' },

    // ── 3. Coiffure Femme ───────────────────────────────────────────
    { _id: 13,  categorie_id: 3,  nom: 'Coupe & Brushing',            description: 'Coupe de cheveux et mise en forme',                   ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 14,  categorie_id: 3,  nom: 'Tresses & Nattes',            description: 'Tresses africaines, vanilles, box braids, locks',     ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 15,  categorie_id: 3,  nom: 'Défrisage & Lissage',         description: 'Défrisage, lissage brésilien, kératine',              ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 16,  categorie_id: 3,  nom: 'Coloration & Mèches',         description: 'Coloration, balayage, tie-and-dye, mèches',           ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 17,  categorie_id: 3,  nom: 'Tissage & Perruques',         description: 'Pose tissage, entretien perruques, lace front',       ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 18,  categorie_id: 3,  nom: 'Extensions',                  description: 'Pose d\'extensions kératine, clips, bandes',          ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 19,  categorie_id: 3,  nom: 'Chignon & Coiffure de fête',  description: 'Chignons, coiffures de mariée, tresses de soirée',    ordre_affichage: 7, booking_type: 'appointment' },
    { _id: 20,  categorie_id: 3,  nom: 'Soins capillaires',           description: 'Traitements, masques, bains d\'huile, cure',          ordre_affichage: 8, booking_type: 'appointment' },

    // ── 4. Coiffure Homme ───────────────────────────────────────────
    { _id: 21,  categorie_id: 4,  nom: 'Coupe & Dégradé',             description: 'Coupes masculines classiques et modernes',            ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 22,  categorie_id: 4,  nom: 'Barbe & Rasage',              description: 'Taille barbe, rasage traditionnel, soin barbe',       ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 23,  categorie_id: 4,  nom: 'Soins du cuir chevelu',       description: 'Traitements anti-chute, antipelliculaires, massages',  ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 24,  categorie_id: 4,  nom: 'Coloration homme',            description: 'Coloration masculine, camouflage cheveux blancs',      ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 25,  categorie_id: 4,  nom: 'Tresses & Locks homme',       description: 'Tresses, locks, vanilles masculines',                  ordre_affichage: 5, booking_type: 'appointment' },

    // ── 5. Ongles & Nail Art ────────────────────────────────────────
    { _id: 26,  categorie_id: 5,  nom: 'Manucure',                    description: 'Soin des mains, mise en forme ongles, vernis',        ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 27,  categorie_id: 5,  nom: 'Pédicure',                    description: 'Soin des pieds, ongles, vernis, callosités',          ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 28,  categorie_id: 5,  nom: 'Pose gel & acrylique',        description: 'Capsules, gel UV, faux ongles, renforts',             ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 29,  categorie_id: 5,  nom: 'Nail art',                    description: 'Décoration artistique, stamping, chromes, nail art 3D',ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 30,  categorie_id: 5,  nom: 'Vernis semi-permanent',       description: 'Pose, retrait vernis semi-permanent',                 ordre_affichage: 5, booking_type: 'appointment' },

    // ── 6. Massage & Kinésithérapie ─────────────────────────────────
    { _id: 31,  categorie_id: 6,  nom: 'Massage relaxant',            description: 'Massage doux pour la détente et le stress',           ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 32,  categorie_id: 6,  nom: 'Massage thérapeutique',       description: 'Massage ciblé pour douleurs et tensions musculaires', ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 33,  categorie_id: 6,  nom: 'Massage sportif',             description: 'Préparation, récupération sportive, drainage',        ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 34,  categorie_id: 6,  nom: 'Réflexologie',                description: 'Stimulation des points réflexes pieds et mains',      ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 35,  categorie_id: 6,  nom: 'Kinésithérapie',              description: 'Rééducation, physiothérapie, électrostimulation',     ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 36,  categorie_id: 6,  nom: 'Massage prénatal',            description: 'Massage adapté aux femmes enceintes',                 ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 37,  categorie_id: 6,  nom: 'Massage bébé & enfant',       description: 'Massage doux nourrissons et enfants, parents-bébés',  ordre_affichage: 7, booking_type: 'appointment' },

    // ── 7. Fitness & Sport ──────────────────────────────────────────
    { _id: 38,  categorie_id: 7,  nom: 'Coaching personnel',          description: 'Accompagnement sportif individualisé',                ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 39,  categorie_id: 7,  nom: 'Cours collectifs',            description: 'Zumba, step, aerobic, cardio box',                    ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 40,  categorie_id: 7,  nom: 'Yoga & Pilates',              description: 'Yoga vinyasa, hatha, pilates, stretching',            ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 41,  categorie_id: 7,  nom: 'Arts martiaux & Boxe',        description: 'Karaté, taekwondo, judo, muay thai, boxe anglaise',   ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 42,  categorie_id: 7,  nom: 'Natation & Aquagym',          description: 'Cours de natation adultes et enfants, aquagym',       ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 43,  categorie_id: 7,  nom: 'Danse',                       description: 'Salsa, afrobeats, hip-hop, rumba, danses africaines', ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 44,  categorie_id: 7,  nom: 'Nutrition & Diététique',      description: 'Bilan nutritionnel, plans alimentaires, coaching',    ordre_affichage: 7, booking_type: 'appointment' },
    { _id: 45,  categorie_id: 7,  nom: 'Préparation physique',        description: 'Préparation athlètes, renforcement musculaire',       ordre_affichage: 8, booking_type: 'appointment' },

    // ── 8. Santé & Médecine douce ───────────────────────────────────
    { _id: 46,  categorie_id: 8,  nom: 'Ostéopathie',                 description: 'Consultations ostéopathiques, manipulations',         ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 47,  categorie_id: 8,  nom: 'Naturopathie',                description: 'Consultations naturo, phytothérapie, hygiène de vie', ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 48,  categorie_id: 8,  nom: 'Acupuncture',                 description: 'Séances d\'acupuncture traditionnelle et moderne',    ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 49,  categorie_id: 8,  nom: 'Diététique & Nutrition',      description: 'Consultations diététiques, programmes alimentaires',  ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 50,  categorie_id: 8,  nom: 'Psychologie & Coaching',      description: 'Séances psy, coaching de vie, thérapies brèves',      ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 51,  categorie_id: 8,  nom: 'Infirmier à domicile',        description: 'Soins infirmiers, prises de sang, pansements',        ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 52,  categorie_id: 8,  nom: 'Sophrologie & Hypnothérapie', description: 'Gestion du stress, phobies, arrêt tabac',             ordre_affichage: 7, booking_type: 'appointment' },

    // ── 9. Éducation & Formation ────────────────────────────────────
    { _id: 53,  categorie_id: 9,  nom: 'Cours de maths & sciences',   description: 'Soutien scolaire maths, physique, chimie, SVT',       ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 54,  categorie_id: 9,  nom: 'Cours de langues',            description: 'Anglais, français, arabe, chinois, espagnol',         ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 55,  categorie_id: 9,  nom: 'Aide aux devoirs',            description: 'Accompagnement scolaire, préparation examens',        ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 56,  categorie_id: 9,  nom: 'Formation professionnelle',   description: 'Comptabilité, bureautique, gestion, management',      ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 57,  categorie_id: 9,  nom: 'Cours de musique',            description: 'Piano, guitare, percussions, chant, djembé',          ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 58,  categorie_id: 9,  nom: 'Cours d\'informatique',       description: 'Excel, Word, internet, programmation de base',        ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 59,  categorie_id: 9,  nom: 'Préparation concours',        description: 'Préparation BEPC, BAC, concours grandes écoles',      ordre_affichage: 7, booking_type: 'appointment' },
    { _id: 60,  categorie_id: 9,  nom: 'Cours d\'art & dessin',       description: 'Dessin, peinture, aquarelle, arts plastiques',        ordre_affichage: 8, booking_type: 'appointment' },

    // ── 10. Informatique & Tech ─────────────────────────────────────
    { _id: 61,  categorie_id: 10, nom: 'Dépannage informatique',      description: 'Réparation PC, Mac, résolution problèmes logiciels',  ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 62,  categorie_id: 10, nom: 'Développement web',           description: 'Sites web, e-commerce, landing pages, CMS',           ordre_affichage: 2, booking_type: 'order' },
    { _id: 63,  categorie_id: 10, nom: 'Développement mobile',        description: 'Applications iOS, Android, React Native, Flutter',    ordre_affichage: 3, booking_type: 'order' },
    { _id: 64,  categorie_id: 10, nom: 'Réseaux & Infrastructure',    description: 'Installation réseaux, wifi, serveurs, câblage',       ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 65,  categorie_id: 10, nom: 'Cybersécurité',               description: 'Audit sécurité, antivirus, récupération données',     ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 66,  categorie_id: 10, nom: 'Récupération de données',     description: 'Récupération données disques durs, téléphones',       ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 67,  categorie_id: 10, nom: 'Réparation téléphone',        description: 'Écran cassé, batterie, connecteur, logiciel',         ordre_affichage: 7, booking_type: 'appointment' },

    // ── 11. Imprimerie & Design ─────────────────────────────────────
    { _id: 68,  categorie_id: 11, nom: 'Cartes de visite',            description: 'Conception et impression de cartes de visite',        ordre_affichage: 1, booking_type: 'order' },
    { _id: 69,  categorie_id: 11, nom: 'Flyers & Affiches',           description: 'Flyers, affiches publicitaires, kakémonos',           ordre_affichage: 2, booking_type: 'order' },
    { _id: 70,  categorie_id: 11, nom: 'Logo & Identité visuelle',    description: 'Création logo, charte graphique, branding',           ordre_affichage: 3, booking_type: 'order' },
    { _id: 71,  categorie_id: 11, nom: 'Infographie & Retouche',      description: 'Retouches photo, montages, bannières réseaux sociaux',ordre_affichage: 4, booking_type: 'order' },
    { _id: 72,  categorie_id: 11, nom: 'Impression grand format',     description: 'Bâches, banderoles, roll-up, enseignes',              ordre_affichage: 5, booking_type: 'order' },
    { _id: 73,  categorie_id: 11, nom: 'Faire-part & Invitations',    description: 'Faire-part mariage, baptême, anniversaire imprimés',  ordre_affichage: 6, booking_type: 'order' },
    { _id: 74,  categorie_id: 11, nom: 'Packaging & Étiquettes',      description: 'Boîtes, sachets, étiquettes produits personnalisés',  ordre_affichage: 7, booking_type: 'order' },

    // ── 12. Audiovisuel & Médias ────────────────────────────────────
    { _id: 75,  categorie_id: 12, nom: 'Photographie',                description: 'Portrait, événements, produits, reportage',           ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 76,  categorie_id: 12, nom: 'Vidéo & Cinéma',              description: 'Films événements, clips, pubs, reportages',           ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 77,  categorie_id: 12, nom: 'Drone & Aérien',              description: 'Prises de vues aériennes par drone',                  ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 78,  categorie_id: 12, nom: 'Montage vidéo',               description: 'Montage, étalonnage, sous-titrage, effets spéciaux',  ordre_affichage: 4, booking_type: 'order' },
    { _id: 79,  categorie_id: 12, nom: 'Studio d\'enregistrement',    description: 'Enregistrement voix, musique, podcast',               ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 80,  categorie_id: 12, nom: 'Animation & Motion design',   description: 'Animations 2D/3D, motion graphics, GIF',              ordre_affichage: 6, booking_type: 'order' },

    // ── 13. Événementiel & Animation ───────────────────────────────
    { _id: 81,  categorie_id: 13, nom: 'Organisation événements',     description: 'Planification, coordination, logistique événements',  ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 82,  categorie_id: 13, nom: 'DJ & Sonorisation',           description: 'DJ, sono, éclairage, mix événementiel',               ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 83,  categorie_id: 13, nom: 'Animation & Show',            description: 'Animateurs, magiciens, clowns, orchestre',            ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 84,  categorie_id: 13, nom: 'Location de matériel',        description: 'Tentes, chaises, tables, vaisselle, podium',          ordre_affichage: 4, booking_type: 'order' },
    { _id: 85,  categorie_id: 13, nom: 'Maître de cérémonie',         description: 'Animation mariages, anniversaires, galas',            ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 86,  categorie_id: 13, nom: 'Décoration fêtes',            description: 'Ballons, arches, tables, décorations thématiques',    ordre_affichage: 6, booking_type: 'order' },

    // ── 14. Traiteur & Restauration ─────────────────────────────────
    { _id: 87,  categorie_id: 14, nom: 'Buffet & Réception',          description: 'Organisation de buffets pour événements',             ordre_affichage: 1, booking_type: 'order' },
    { _id: 88,  categorie_id: 14, nom: 'Plats cuisinés à domicile',   description: 'Cuisine à domicile, repas livrés, chef à domicile',   ordre_affichage: 2, booking_type: 'order' },
    { _id: 89,  categorie_id: 14, nom: 'Pâtisserie & Gâteaux',        description: 'Gâteaux de fête, wedding cake, viennoiseries',        ordre_affichage: 3, booking_type: 'order' },
    { _id: 90,  categorie_id: 14, nom: 'Brochettes & Grillades',      description: 'Brochettes, poulet braisé, viandes grillées',         ordre_affichage: 4, booking_type: 'order' },
    { _id: 91,  categorie_id: 14, nom: 'Cuisine africaine',           description: 'Attiéké, foutou, kedjenou, riz sauce, thiéboudienne', ordre_affichage: 5, booking_type: 'order' },
    { _id: 92,  categorie_id: 14, nom: 'Sandwichs & Snacks',          description: 'Snacks, paninis, sandwichs, salades pour bureaux',    ordre_affichage: 6, booking_type: 'order' },
    { _id: 93,  categorie_id: 14, nom: 'Jus & Boissons',              description: 'Jus frais, bissap, gingembre, cocktails sans alcool', ordre_affichage: 7, booking_type: 'order' },

    // ── 15. Fleuriste & Décoration ──────────────────────────────────
    { _id: 94,  categorie_id: 15, nom: 'Bouquets & Compositions',     description: 'Fleurs fraîches, séchées, artificielles',             ordre_affichage: 1, booking_type: 'order' },
    { _id: 95,  categorie_id: 15, nom: 'Décoration événementielle',   description: 'Scénographie mariage, anniversaire, inauguration',    ordre_affichage: 2, booking_type: 'order' },
    { _id: 96,  categorie_id: 15, nom: 'Plantes & Végétaux',          description: 'Vente et entretien plantes d\'intérieur et extérieur',ordre_affichage: 3, booking_type: 'order' },
    { _id: 97,  categorie_id: 15, nom: 'Couronnes & Gerbes',          description: 'Couronnes funéraires, gerbes de fleurs',              ordre_affichage: 4, booking_type: 'order' },
    { _id: 98,  categorie_id: 15, nom: 'Déco intérieure',             description: 'Conseil déco, home staging, relooking intérieur',     ordre_affichage: 5, booking_type: 'appointment' },

    // ── 16. Nettoyage & Entretien ───────────────────────────────────
    { _id: 99,  categorie_id: 16, nom: 'Ménage à domicile',           description: 'Entretien régulier domicile, repassage',              ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 100, categorie_id: 16, nom: 'Grand nettoyage',             description: 'Nettoyage post-travaux, déménagement, fond de teint', ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 101, categorie_id: 16, nom: 'Nettoyage bureaux & locaux',  description: 'Entretien bureaux, commerces, restaurants',           ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 102, categorie_id: 16, nom: 'Pressing & Blanchisserie',    description: 'Lavage, repassage, pressing vêtements et linge',      ordre_affichage: 4, booking_type: 'order' },
    { _id: 103, categorie_id: 16, nom: 'Lavage vitres',               description: 'Nettoyage vitres, façades, panneaux solaires',        ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 104, categorie_id: 16, nom: 'Désinfection & Traitement',   description: 'Désinsectisation, dératisation, désinfection',        ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 105, categorie_id: 16, nom: 'Jardinage',                   description: 'Tonte, taille haies, entretien jardins, espaces verts',ordre_affichage: 7, booking_type: 'appointment' },

    // ── 17. Travaux & Artisanat ─────────────────────────────────────
    { _id: 106, categorie_id: 17, nom: 'Plomberie',                   description: 'Fuite, installation sanitaire, tuyauterie',           ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 107, categorie_id: 17, nom: 'Électricité',                 description: 'Installation électrique, dépannage, tableaux',        ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 108, categorie_id: 17, nom: 'Peinture',                    description: 'Peinture intérieure, extérieure, ravalement',         ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 109, categorie_id: 17, nom: 'Menuiserie',                  description: 'Portes, fenêtres, meubles, parquet, charpente',       ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 110, categorie_id: 17, nom: 'Maçonnerie',                  description: 'Construction, rénovation, carrelage, enduit',         ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 111, categorie_id: 17, nom: 'Serrurerie',                  description: 'Remplacement serrures, blindage, ouverture urgence',  ordre_affichage: 6, booking_type: 'appointment' },
    { _id: 112, categorie_id: 17, nom: 'Carrelage & Sol',             description: 'Pose carrelage, parquet, vinyle, époxy',              ordre_affichage: 7, booking_type: 'appointment' },
    { _id: 113, categorie_id: 17, nom: 'Toiture & Étanchéité',        description: 'Réparation toits, étanchéité, gouttières',            ordre_affichage: 8, booking_type: 'appointment' },
    { _id: 114, categorie_id: 17, nom: 'Soudure & Ferronnerie',       description: 'Grilles, portails, escaliers métalliques, soudure',   ordre_affichage: 9, booking_type: 'appointment' },

    // ── 18. Transport & Déménagement ────────────────────────────────
    { _id: 115, categorie_id: 18, nom: 'VTC & Taxi',                  description: 'Transport en voiture confortable avec chauffeur',     ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 116, categorie_id: 18, nom: 'Taxi-moto',                   description: 'Transport rapide en moto dans la ville',              ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 117, categorie_id: 18, nom: 'Déménagement',                description: 'Déménagement domicile, entreprise, stockage',         ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 118, categorie_id: 18, nom: 'Livraison express',           description: 'Livraison de colis, courses, petits achats',          ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 119, categorie_id: 18, nom: 'Location véhicule',           description: 'Location voiture, minibus, camionnette',              ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 120, categorie_id: 18, nom: 'Transport scolaire',          description: 'Ramassage et dépose d\'enfants à l\'école',           ordre_affichage: 6, booking_type: 'appointment' },

    // ── 19. Sécurité & Surveillance ─────────────────────────────────
    { _id: 121, categorie_id: 19, nom: 'Gardiennage',                 description: 'Agents de sécurité pour locaux, événements',         ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 122, categorie_id: 19, nom: 'Installation alarmes',        description: 'Systèmes d\'alarme, détecteurs, sirènes',             ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 123, categorie_id: 19, nom: 'Vidéosurveillance',           description: 'Caméras CCTV, enregistreurs, monitoring',             ordre_affichage: 3, booking_type: 'order' },
    { _id: 124, categorie_id: 19, nom: 'Protection rapprochée',       description: 'Bodyguard, escorte, protection VIP',                  ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 125, categorie_id: 19, nom: 'Contrôle d\'accès',           description: 'Badges, interphones, portiques, biométrie',           ordre_affichage: 5, booking_type: 'order' },

    // ── 20. Juridique & Administratif ──────────────────────────────
    { _id: 126, categorie_id: 20, nom: 'Conseil juridique',           description: 'Consultation avocat, droit des affaires, civil',      ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 127, categorie_id: 20, nom: 'Comptabilité',                description: 'Tenue comptabilité, déclarations fiscales, bilan',    ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 128, categorie_id: 20, nom: 'Notariat',                    description: 'Actes notariés, transactions immobilières',            ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 129, categorie_id: 20, nom: 'Conseil fiscal',              description: 'Optimisation fiscale, TVA, impôts entreprises',       ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 130, categorie_id: 20, nom: 'Assistance administrative',   description: 'Formalités, dossiers, démarches administratives',     ordre_affichage: 5, booking_type: 'appointment' },
    { _id: 131, categorie_id: 20, nom: 'Traduction & Interprétariat', description: 'Traduction documents, interprétariat conférences',    ordre_affichage: 6, booking_type: 'order' },

    // ── 21. Immobilier ──────────────────────────────────────────────
    { _id: 132, categorie_id: 21, nom: 'Location & Vente',            description: 'Recherche de biens, visites, transactions',           ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 133, categorie_id: 21, nom: 'Gestion locative',            description: 'Gestion de biens, encaissement loyers, état des lieux',ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 134, categorie_id: 21, nom: 'Expertise immobilière',       description: 'Estimation valeur bien, diagnostic, expertise',       ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 135, categorie_id: 21, nom: 'Syndic de copropriété',       description: 'Gestion copropriétés, assemblées générales',          ordre_affichage: 4, booking_type: 'appointment' },

    // ── 22. Mode & Couture ──────────────────────────────────────────
    { _id: 136, categorie_id: 22, nom: 'Couture sur mesure',          description: 'Confection vêtements sur mesure, boubous, robes',     ordre_affichage: 1, booking_type: 'order' },
    { _id: 137, categorie_id: 22, nom: 'Retouches',                   description: 'Raccourcissement, rétrecissement, réparations',       ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 138, categorie_id: 22, nom: 'Stylisme & Relooking',        description: 'Conseil en image, relooking, shopping accompagné',    ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 139, categorie_id: 22, nom: 'Broderie & Ornements',        description: 'Broderie traditionnelle, perlage, dorure',            ordre_affichage: 4, booking_type: 'order' },
    { _id: 140, categorie_id: 22, nom: 'Bijoux & Accessoires',        description: 'Fabrication bijoux artisanaux, personnalisés',        ordre_affichage: 5, booking_type: 'order' },

    // ── 23. Animaux & Vétérinaire ───────────────────────────────────
    { _id: 141, categorie_id: 23, nom: 'Consultation vétérinaire',    description: 'Soins animaux, vaccinations, diagnostics',            ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 142, categorie_id: 23, nom: 'Toilettage animalier',        description: 'Bain, coupe, épilation chien et chat',                ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 143, categorie_id: 23, nom: 'Pension & Garde animaux',     description: 'Garde animaux à domicile ou en pension',              ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 144, categorie_id: 23, nom: 'Dressage & Comportement',     description: 'Éducation, dressage, rééducation comportementale',    ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 145, categorie_id: 23, nom: 'Promenade animaux',           description: 'Promenade quotidienne chiens, animaux de compagnie',  ordre_affichage: 5, booking_type: 'appointment' },

    // ── 24. Mariage & Cérémonies ────────────────────────────────────
    { _id: 146, categorie_id: 24, nom: 'Organisation mariage',        description: 'Wedding planner, coordination complète du mariage',   ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 147, categorie_id: 24, nom: 'Maquillage & Coiffure mariée',description: 'Maquillage nuptial, coiffure de cérémonie',           ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 148, categorie_id: 24, nom: 'Officiant de cérémonie',      description: 'Animation cérémonie, discours, célébrant laïque',     ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 149, categorie_id: 24, nom: 'Robes & Costumes',            description: 'Location ou couture robe de mariée, costume',        ordre_affichage: 4, booking_type: 'order' },
    { _id: 150, categorie_id: 24, nom: 'Faire-part mariage',          description: 'Impression et design faire-part, menus, programmes',  ordre_affichage: 5, booking_type: 'order' },
    { _id: 151, categorie_id: 24, nom: 'Orchestre & Groupe musical',  description: 'Musique live, orchestre, chorale, griot',             ordre_affichage: 6, booking_type: 'appointment' },

    // ── 25. Enfants & Garde ─────────────────────────────────────────
    { _id: 152, categorie_id: 25, nom: 'Babysitting',                 description: 'Garde enfants à domicile, sortie école',              ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 153, categorie_id: 25, nom: 'Aide aux devoirs enfants',    description: 'Soutien scolaire primaire, collège, lycée',           ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 154, categorie_id: 25, nom: 'Activités & Loisirs',         description: 'Ateliers artistiques, sportifs, éveil, créativité',   ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 155, categorie_id: 25, nom: 'Crèche & Halte-garderie',     description: 'Accueil collectif petite enfance journée ou demi',    ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 156, categorie_id: 25, nom: 'Fête d\'anniversaire',        description: 'Animation, organisation anniversaire enfants',        ordre_affichage: 5, booking_type: 'appointment' },

    // ── 26. Agriculture & Jardinage ─────────────────────────────────
    { _id: 157, categorie_id: 26, nom: 'Maraîchage & Légumes',        description: 'Livraison légumes frais, paniers bio, maraîchage',    ordre_affichage: 1, booking_type: 'order' },
    { _id: 158, categorie_id: 26, nom: 'Fruits frais',                description: 'Vente et livraison de fruits locaux de saison',       ordre_affichage: 2, booking_type: 'order' },
    { _id: 159, categorie_id: 26, nom: 'Entretien espaces verts',     description: 'Tonte, taille, plantation, aménagement jardin',       ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 160, categorie_id: 26, nom: 'Paysagiste',                  description: 'Conception et réalisation jardins, allées, pelouses', ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 161, categorie_id: 26, nom: 'Élevage & Produits fermiers',  description: 'Volailles, œufs, viande, produits laitiers locaux',  ordre_affichage: 5, booking_type: 'order' },

    // ── 27. Énergie & Climatisation ─────────────────────────────────
    { _id: 162, categorie_id: 27, nom: 'Climatisation',               description: 'Installation, entretien, réparation climatiseurs',    ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 163, categorie_id: 27, nom: 'Panneaux solaires',           description: 'Installation et maintenance panneaux photovoltaïques',ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 164, categorie_id: 27, nom: 'Groupes électrogènes',        description: 'Installation, entretien, location groupes électrogènes',ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 165, categorie_id: 27, nom: 'Réparation électroménager',   description: 'Réfrigérateur, machine à laver, four, TV, hi-fi',    ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 166, categorie_id: 27, nom: 'Onduleurs & Stabilisateurs',  description: 'Installation UPS, onduleurs, stabilisateurs tension', ordre_affichage: 5, booking_type: 'appointment' },

    // ── 28. Beauté Masculine ────────────────────────────────────────
    { _id: 167, categorie_id: 28, nom: 'Soins visage homme',          description: 'Nettoyage, hydratation, anti-âge pour hommes',        ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 168, categorie_id: 28, nom: 'Épilation masculine',         description: 'Épilation torse, dos, sourcils, bras hommes',         ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 169, categorie_id: 28, nom: 'Modelage & Détente',          description: 'Massage relaxant spécial homme, soins corps',         ordre_affichage: 3, booking_type: 'appointment' },
    { _id: 170, categorie_id: 28, nom: 'Onglerie homme',              description: 'Manucure et pédicure pour hommes',                    ordre_affichage: 4, booking_type: 'appointment' },

    // ── 29. Marketing & Communication ──────────────────────────────
    { _id: 171, categorie_id: 29, nom: 'Community management',        description: 'Gestion réseaux sociaux, contenus, stratégie',        ordre_affichage: 1, booking_type: 'order' },
    { _id: 172, categorie_id: 29, nom: 'Publicité & Annonces',        description: 'Facebook Ads, Google Ads, campagnes publicitaires',   ordre_affichage: 2, booking_type: 'order' },
    { _id: 173, categorie_id: 29, nom: 'Copywriting & Rédaction',     description: 'Rédaction web, slogans, scripts, newsletters',        ordre_affichage: 3, booking_type: 'order' },
    { _id: 174, categorie_id: 29, nom: 'Branding & Stratégie',        description: 'Positionnement marque, naming, stratégie marketing',  ordre_affichage: 4, booking_type: 'appointment' },
    { _id: 175, categorie_id: 29, nom: 'Influencer marketing',        description: 'Mise en relation marques et influenceurs locaux',      ordre_affichage: 5, booking_type: 'appointment' },

    // ── 30. Divers & Autres ─────────────────────────────────────────
    { _id: 176, categorie_id: 30, nom: 'Services à la personne',      description: 'Aide-ménagère, accompagnement personnes âgées',        ordre_affichage: 1, booking_type: 'appointment' },
    { _id: 177, categorie_id: 30, nom: 'Courses & Achats',            description: 'Faire les courses, commissions diverses',             ordre_affichage: 2, booking_type: 'appointment' },
    { _id: 178, categorie_id: 30, nom: 'Rédaction & Secrétariat',     description: 'Frappe, saisie, secrétariat, rédaction documents',    ordre_affichage: 3, booking_type: 'order' },
    { _id: 179, categorie_id: 30, nom: 'Autre service',               description: 'Tout autre service non listé',                        ordre_affichage: 4, booking_type: 'appointment' },
  ];

  await SubCategory.insertMany(sousCategories);
  await Counter.findByIdAndUpdate('sous_categories', { seq: 179 }, { upsert: true });
  console.log('✅ Sous-catégories seeded (179)');

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

  console.log('\n🎉 Seed completed successfully! 30 catégories, 179 sous-catégories.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

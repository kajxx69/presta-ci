# PrestaCI Backend

API Node.js + Express + TypeScript + MySQL pour l'application PrestaCI - Plateforme de prestations de services en Côte d'Ivoire.

## 🚀 Fonctionnalités

- **Authentification complète** : Inscription, connexion, gestion des sessions
- **Gestion des prestataires** : Profils, services, abonnements
- **Système de réservations** : Réservation de services avec statuts
- **Publications sociales** : Partage de réalisations avec likes
- **Favoris** : Sauvegarde de prestataires, services et publications
- **Catégorisation** : Organisation des services par catégories
- **API RESTful** complète avec TypeScript

## 📋 Prérequis

- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

## ⚙️ Installation

1. **Cloner et installer les dépendances**
```bash
cd backend
npm install
```

2. **Configuration de la base de données**
```bash
# Créer la base de données MySQL
mysql -u root -p < database/init.sql
```

3. **Configuration des variables d'environnement**
Le fichier `.env` est déjà configuré avec :
```
DB_HOST=localhost
DB_PORT=8889
DB_USER=root
DB_PASSWORD=root
DB_NAME=prestations_pwa
PORT=4000
# Liste d'origines autorisées (local + tunnel Cloudflare)
FRONTEND_ORIGIN=http://localhost:5173,https://lawrence-clause-airport-throat.trycloudflare.com
```

Ce backend accepte désormais plusieurs origines séparées par des virgules pour laisser passer les requêtes locales et celles venant du tunnel Cloudflare dédié au frontend.

4. **Démarrer le serveur**
```bash
# Mode développement
npm run dev

# Mode production
npm run build
npm start
```

Le serveur démarre sur `http://localhost:4000`

## 📚 API Endpoints

### 🔐 Authentification (`/api/auth`)
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/logout` - Déconnexion

### 👥 Utilisateurs (`/api/users`)
- `GET /api/users/me` - Profil utilisateur
- `PUT /api/users/me` - Mise à jour du profil

### 🏢 Prestataires (`/api/prestataires`)
- `GET /api/prestataires` - Liste des prestataires
- `POST /api/prestataires/setup` - Configuration du profil prestataire

### 🛠️ Services (`/api/services`)
- `GET /api/services` - Liste des services
- `POST /api/services` - Créer un service
- `PUT /api/services/:id` - Modifier un service
- `DELETE /api/services/:id` - Supprimer un service

### 📅 Réservations (`/api/reservations`)
- `GET /api/reservations` - Liste des réservations
- `PUT /api/reservations/:id/cancel` - Annuler une réservation

### 📱 Publications (`/api/publications`)
- `GET /api/publications` - Liste des publications
- `POST /api/publications` - Créer une publication
- `POST /api/publications/:id/like` - Liker une publication
- `DELETE /api/publications/:id/like` - Retirer le like

### ⭐ Favoris (`/api/favorites`)
- `GET /api/favorites/providers` - Prestataires favoris
- `POST /api/favorites/providers/:id` - Ajouter aux favoris
- `DELETE /api/favorites/providers/:id` - Retirer des favoris
- `GET /api/favorites/services` - Services favoris
- `GET /api/favorites/publications` - Publications favorites

### 💳 Abonnements (`/api/subscription`)
- `GET /api/subscription/plans` - Plans disponibles
- `GET /api/subscription` - Abonnement actuel
- `POST /api/subscription/start` - Démarrer un abonnement

### 📂 Données de base (`/api`)
- `GET /api/categories` - Catégories de services
- `GET /api/sous_categories` - Sous-catégories
- `GET /api/health` - État de santé de l'API

## 🏗️ Architecture

```
src/
├── middleware/          # Middlewares (auth, etc.)
├── routes/             # Routes API
├── types/              # Types TypeScript
├── db.ts              # Configuration base de données
└── index.ts           # Point d'entrée
```

## 🔒 Sécurité

- Authentification par cookies sécurisés
- Hachage des mots de passe avec bcrypt
- Sessions avec expiration automatique
- Validation des données d'entrée
- Protection CORS configurée

## 🗄️ Base de données

La base de données est automatiquement initialisée avec :
- Tables utilisateurs et rôles
- Catégories et sous-catégories de services
- Plans d'abonnement
- Données de test

## 🔗 Tunnel Cloudflare (accès distant)

Les tunnels actuellement exposent :

- **Frontend** : `https://lawrence-clause-airport-throat.trycloudflare.com`
- **Backend** : `https://quantitative-shortly-happens-transparency.trycloudflare.com`

Ajoutez la partie frontend à `FRONTEND_ORIGIN` pour autoriser les requêtes cross-origin et partagez la base `https://quantitative-shortly-happens-transparency.trycloudflare.com/api` avec vos collaborateurs éloignés.

## 🚀 Déploiement

1. Configurer les variables d'environnement de production
2. Construire le projet : `npm run build`
3. Démarrer : `npm start`

## 🤝 Intégration Frontend

Ce backend est parfaitement intégré avec le frontend PrestaCI. Toutes les routes API correspondent aux appels définis dans `frontend/src/lib/api.ts`.

## 📝 Logs

Les logs incluent :
- Requêtes HTTP avec timestamps
- Erreurs de base de données
- Authentification et sessions

---

✅ **Backend PrestaCI prêt pour la production !**

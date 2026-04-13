#!/bin/bash

# PrestaCI Backend Setup Script
echo "🚀 Configuration du backend PrestaCI..."

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 18+ d'abord."
    exit 1
fi

# Vérifier si MySQL est installé
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL n'est pas installé. Veuillez installer MySQL 8.0+ d'abord."
    exit 1
fi

echo "✅ Node.js et MySQL détectés"

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo "✅ Dépendances installées"

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo "❌ Fichier .env manquant. Veuillez créer le fichier .env avec vos paramètres de base de données."
    echo "Exemple de contenu pour .env :"
    echo "DB_HOST=localhost"
    echo "DB_PORT=3306"
    echo "DB_USER=root"
    echo "DB_PASSWORD=votre_mot_de_passe"
    echo "DB_NAME=prestations_pwa"
    echo "PORT=4000"
    echo "FRONTEND_ORIGIN=http://localhost:5173"
    exit 1
fi

echo "✅ Fichier .env trouvé"

# Charger les variables d'environnement
source .env

# Créer la base de données
echo "🗄️ Configuration de la base de données..."
echo "Création de la base de données $DB_NAME..."

mysql -h$DB_HOST -P$DB_PORT -u$DB_USER -p$DB_PASSWORD < database/init.sql

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la création de la base de données"
    echo "Veuillez vérifier vos paramètres de connexion MySQL dans le fichier .env"
    exit 1
fi

echo "✅ Base de données configurée avec succès"

# Compiler TypeScript
echo "🔨 Compilation TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la compilation TypeScript"
    exit 1
fi

echo "✅ Compilation réussie"

echo ""
echo "🎉 Configuration terminée avec succès !"
echo ""
echo "Pour démarrer le serveur :"
echo "  Mode développement: npm run dev"
echo "  Mode production:    npm start"
echo ""
echo "Le serveur sera accessible sur http://localhost:$PORT"
echo ""
echo "📚 Consultez le README.md pour plus d'informations"

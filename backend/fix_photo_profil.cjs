// Script pour corriger la colonne photo_profil dans la base de données
// Exécuter avec: cd backend && node fix_photo_profil.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixPhotoProfilColumn() {
  let connection;
  
  try {
    // Connexion à la base de données
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'prestaci'
    });

    console.log('✅ Connexion à la base de données établie');

    // Vérifier la structure actuelle
    const [currentStructure] = await connection.execute('DESCRIBE users');
    const photoProfilColumn = currentStructure.find(col => col.Field === 'photo_profil');
    
    console.log('📋 Structure actuelle de la colonne photo_profil:', photoProfilColumn);

    if (photoProfilColumn && photoProfilColumn.Type !== 'longtext') {
      console.log('🔧 Modification de la colonne photo_profil...');
      
      // Modifier la colonne pour accepter des images plus grandes
      await connection.execute('ALTER TABLE users MODIFY COLUMN photo_profil LONGTEXT');
      
      console.log('✅ Colonne photo_profil modifiée avec succès !');
      
      // Vérifier la nouvelle structure
      const [newStructure] = await connection.execute('DESCRIBE users');
      const newPhotoProfilColumn = newStructure.find(col => col.Field === 'photo_profil');
      console.log('📋 Nouvelle structure:', newPhotoProfilColumn);
      
    } else {
      console.log('ℹ️ La colonne photo_profil est déjà au bon format (LONGTEXT)');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la modification:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
fixPhotoProfilColumn()
  .then(() => {
    console.log('🎉 Migration terminée avec succès !');
    console.log('💡 Vous pouvez maintenant uploader des photos de profil sans problème.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

// Script pour ajouter la table user_notification_preferences
// Exécuter avec: cd backend && node add_notification_preferences.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addNotificationPreferencesTable() {
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

    // Vérifier si la table existe déjà
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'user_notification_preferences'"
    );

    if (tables.length > 0) {
      console.log('ℹ️ La table user_notification_preferences existe déjà');
      return;
    }

    console.log('🔧 Création de la table user_notification_preferences...');

    // Créer la table
    await connection.execute(`
      CREATE TABLE user_notification_preferences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        push_enabled TINYINT DEFAULT 1,
        email_enabled TINYINT DEFAULT 1,
        sms_enabled TINYINT DEFAULT 0,
        new_reservation TINYINT DEFAULT 1,
        reservation_confirmed TINYINT DEFAULT 1,
        reservation_cancelled TINYINT DEFAULT 1,
        new_publication TINYINT DEFAULT 0,
        new_like TINYINT DEFAULT 0,
        new_comment TINYINT DEFAULT 0,
        new_follower TINYINT DEFAULT 0,
        promotions TINYINT DEFAULT 1,
        tips TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_preferences (user_id)
      )
    `);

    console.log('✅ Table user_notification_preferences créée avec succès !');

    // Créer l'index
    await connection.execute(`
      CREATE INDEX idx_notification_prefs_user ON user_notification_preferences(user_id)
    `);

    console.log('✅ Index créé avec succès !');

    // Vérifier la structure
    const [structure] = await connection.execute('DESCRIBE user_notification_preferences');
    console.log('📋 Structure de la table:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default ? `default: ${col.Default}` : ''}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
addNotificationPreferencesTable()
  .then(() => {
    console.log('🎉 Migration terminée avec succès !');
    console.log('💡 La table user_notification_preferences est maintenant disponible.');
    console.log('🚀 Vous pouvez maintenant utiliser les préférences de notifications dynamiques !');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

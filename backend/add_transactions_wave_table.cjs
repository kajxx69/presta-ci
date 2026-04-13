// Script pour ajouter la table transactions_wave
// Exécuter avec: cd backend && node add_transactions_wave_table.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTransactionsWaveTable() {
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
      "SHOW TABLES LIKE 'transactions_wave'"
    );

    if (tables.length > 0) {
      console.log('ℹ️ La table transactions_wave existe déjà');
      return;
    }

    console.log('🔧 Création de la table transactions_wave...');

    // Créer la table
    await connection.execute(`
      CREATE TABLE transactions_wave (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prestataire_id INT NOT NULL,
        plan_id INT NOT NULL,
        transaction_id_wave VARCHAR(100) NOT NULL,
        montant DECIMAL(10,2) NOT NULL,
        devise VARCHAR(10) DEFAULT 'FCFA',
        statut ENUM('en_attente', 'valide', 'rejete', 'rembourse') DEFAULT 'en_attente',
        validee_par_admin_id INT NULL,
        motif_rejet TEXT NULL,
        date_paiement TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        date_validation TIMESTAMP NULL,
        duree_abonnement_jours INT DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (prestataire_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES plans_abonnement(id) ON DELETE CASCADE,
        FOREIGN KEY (validee_par_admin_id) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY unique_transaction_wave (transaction_id_wave)
      )
    `);

    console.log('✅ Table transactions_wave créée avec succès !');

    // Créer les index pour optimiser les performances
    await connection.execute(`
      CREATE INDEX idx_transactions_wave_prestataire ON transactions_wave(prestataire_id)
    `);
    
    await connection.execute(`
      CREATE INDEX idx_transactions_wave_statut ON transactions_wave(statut)
    `);
    
    await connection.execute(`
      CREATE INDEX idx_transactions_wave_date ON transactions_wave(created_at)
    `);

    console.log('✅ Index créés avec succès !');

    // Vérifier la structure
    const [structure] = await connection.execute('DESCRIBE transactions_wave');
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
addTransactionsWaveTable()
  .then(() => {
    console.log('🎉 Migration terminée avec succès !');
    console.log('💡 La table transactions_wave est maintenant disponible.');
    console.log('🚀 Le système de paiement Wave est prêt !');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

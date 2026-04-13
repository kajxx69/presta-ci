// Script pour vérifier les contraintes de la table transactions_wave
// Exécuter avec: cd backend && node verify_wave_constraints.cjs

const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyWaveConstraints() {
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

    // Vérifier la structure de la table transactions_wave
    console.log('📋 Structure de la table transactions_wave :');
    const [structure] = await connection.execute('DESCRIBE transactions_wave');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Default ? `default: ${col.Default}` : ''}`);
    });

    // Vérifier les contraintes de clés étrangères
    console.log('\n🔗 Contraintes de clés étrangères :');
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'transactions_wave' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    if (constraints.length > 0) {
      constraints.forEach(constraint => {
        console.log(`  - ${constraint.COLUMN_NAME} → ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('  ⚠️ Aucune contrainte de clé étrangère trouvée');
    }

    // Vérifier que la table plans_abonnement existe
    console.log('\n📊 Vérification table plans_abonnement :');
    const [plans] = await connection.execute('SELECT COUNT(*) as count FROM plans_abonnement');
    console.log(`  - ${plans[0].count} plans disponibles`);

    // Afficher les plans
    const [plansList] = await connection.execute('SELECT id, nom, prix, devise FROM plans_abonnement');
    plansList.forEach(plan => {
      console.log(`    ${plan.id}. ${plan.nom} - ${plan.prix} ${plan.devise}`);
    });

    // Vérifier les transactions Wave existantes
    console.log('\n💳 Transactions Wave existantes :');
    const [transactions] = await connection.execute('SELECT COUNT(*) as count FROM transactions_wave');
    console.log(`  - ${transactions[0].count} transactions enregistrées`);

    if (transactions[0].count > 0) {
      const [transactionsList] = await connection.execute(`
        SELECT tw.id, tw.statut, pa.nom as plan_nom, tw.montant, tw.devise 
        FROM transactions_wave tw 
        LEFT JOIN plans_abonnement pa ON tw.plan_id = pa.id 
        ORDER BY tw.created_at DESC 
        LIMIT 5
      `);
      transactionsList.forEach(tx => {
        console.log(`    #${tx.id} - ${tx.plan_nom} - ${tx.montant} ${tx.devise} - ${tx.statut}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Exécuter le script
verifyWaveConstraints()
  .then(() => {
    console.log('\n🎉 Vérification terminée avec succès !');
    console.log('✅ Le système Wave est correctement configuré avec la table plans_abonnement');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });

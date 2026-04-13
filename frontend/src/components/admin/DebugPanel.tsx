import { useState } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function DebugPanel() {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, role } = useAuthStore();

  const testAdminAPI = async () => {
    setLoading(true);
    let output = '';

    try {
      // Debug localStorage
      output += '🔍 DEBUG LOCALSTORAGE:\n';
      
      // Vérifier toutes les clés du localStorage
      output += 'Clés dans localStorage:\n';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        output += `  - ${key}\n`;
      }
      output += '\n';
      
      // Vérifier prestaci-auth
      const authData = localStorage.getItem('prestaci-auth');
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          output += `✅ prestaci-auth trouvé:\n`;
          output += `  - Token: ${auth.token ? 'Oui (' + auth.token.length + ' caractères)' : 'Non'}\n`;
          output += `  - User: ${auth.user ? auth.user.email : 'Non'}\n`;
          output += `  - Role: ${auth.role ? auth.role.nom : 'Non'}\n`;
          
          if (auth.token) {
            output += `  - Début token: ${auth.token.substring(0, 50)}...\n`;
          }
        } catch (e) {
          output += `❌ Erreur parsing prestaci-auth: ${e}\n`;
        }
      } else {
        output += `❌ prestaci-auth non trouvé dans localStorage\n`;
      }
      output += '\n';

      // Test API admin/stats
      output += '🧪 TEST API /api/admin/stats:\n';
      try {
        const data = await api.admin.getStats();
        output += '✅ Succès !\n';
        output += `Données reçues: ${JSON.stringify(data, null, 2)}\n\n`;
        
        output += '📊 ANALYSE:\n';
        output += `👥 Total utilisateurs: ${data.users?.total_users || 'N/A'}\n`;
        output += `🧑‍💼 Clients: ${data.users?.clients || 'N/A'}\n`;
        output += `🏢 Prestataires: ${data.users?.prestataires || 'N/A'}\n`;
        output += `👑 Admins: ${data.users?.admins || 'N/A'}\n`;
        output += `📦 Services: ${data.services?.total_services || 'N/A'}\n`;
        output += `🔔 Notifications: ${data.notifications?.total_notifications || 'N/A'}\n`;
        
      } catch (error: any) {
        output += `❌ Erreur: ${error.message}\n`;
        output += `Détails: ${JSON.stringify(error, null, 2)}\n`;
      }

      // Test API statistics/overview
      output += '\n🧪 TEST API /api/admin/statistics/overview:\n';
      try {
        const data = await api.admin.statistics.getOverview();
        output += '✅ Succès !\n';
        output += `Données: ${JSON.stringify(data, null, 2)}\n`;
      } catch (error: any) {
        output += `❌ Erreur: ${error.message}\n`;
      }

    } catch (error: any) {
      output += `❌ Erreur générale: ${error.message}\n`;
    }

    setResults(output);
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        🔧 Debug Admin API
      </h2>
      
      {/* État de l'authentification */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">État de l'authentification :</h3>
        <div className="space-y-1 text-sm">
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Connecté :</span> {isAuthenticated ? '✅ Oui' : '❌ Non'}
          </p>
          {user && (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Email :</span> {user.email}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Nom :</span> {user.nom} {user.prenom}
              </p>
            </>
          )}
          {role && (
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Rôle :</span> {role.nom} (ID: {role.id})
            </p>
          )}
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/login')}
              className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              Se connecter
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={testAdminAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          {loading ? '🔄 Test en cours...' : '🧪 Tester API Admin'}
        </button>

        {results && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Résultats :</h3>
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
              {results}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

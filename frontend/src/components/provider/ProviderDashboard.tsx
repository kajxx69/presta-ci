import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, TrendingUp, Zap, ArrowRight, Check } from 'lucide-react';

export default function ProviderDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-8 pt-8 pb-20">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl mb-4 animate-bounce">
            <Crown className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Espace Prestataire Pro
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Gérez votre activité, développez votre visibilité et augmentez vos revenus avec PrestaCI
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Dashboard complet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Suivez vos statistiques, réservations et performances en temps réel
            </p>
            <button
              onClick={() => navigate('/app')}
              className="text-blue-600 dark:text-blue-400 font-medium flex items-center space-x-2 group-hover:translate-x-2 transition-transform"
            >
              <span>Accéder au dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Gestion des services</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Créez et gérez vos services pour attirer plus de clients
            </p>
            <button
              onClick={() => navigate('/app')}
              className="text-purple-600 dark:text-purple-400 font-medium flex items-center space-x-2 group-hover:translate-x-2 transition-transform"
            >
              <span>Gérer mes services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 group">
            <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Plans Premium</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Boostez votre visibilité avec nos offres premium
            </p>
            <button
              onClick={() => navigate('/app')}
              className="text-orange-600 dark:text-orange-400 font-medium flex items-center space-x-2 group-hover:translate-x-2 transition-transform"
            >
              <span>Voir les plans</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CTA Card */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Prêt à développer votre activité ?</h2>
            <p className="text-lg mb-6 text-white/90">
              Accédez à tous les outils pour gérer votre établissement et augmenter vos réservations
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span>Gestion complète des réservations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span>Statistiques détaillées</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span>Services illimités (plan premium)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
                <span>Badge vérifié</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/app')}
              className="px-8 py-4 rounded-xl bg-white text-blue-600 font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Accéder à mon espace Pro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

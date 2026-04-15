import { ChevronLeft, Search, Calendar, Star, CreditCard, Shield, Headphones, UserCheck, AlertTriangle, CheckCircle } from 'lucide-react';

export default function GuidePage({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Guide de démarrage</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tout savoir pour bien utiliser PrestaCI</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 text-sm">

        {/* Intro */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 text-white">
          <h2 className="text-lg font-bold mb-1">Bienvenue sur PrestaCI</h2>
          <p className="text-blue-100 text-sm">La première plateforme de services à domicile en Côte d'Ivoire. Trouvez, réservez et évaluez des prestataires de confiance en quelques clics.</p>
        </div>

        {/* Pour les clients */}
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Je suis client
          </h2>
          <div className="space-y-3">
            <StepCard
              icon={<Search className="w-5 h-5 text-blue-600" />}
              step="1"
              title="Trouvez un service"
              desc="Utilisez la barre de recherche ou parcourez les catégories (ménage, plomberie, coiffure, livraison…). Filtrez par localisation, prix ou note."
              color="blue"
            />
            <StepCard
              icon={<Calendar className="w-5 h-5 text-purple-600" />}
              step="2"
              title="Réservez"
              desc="Sélectionnez le créneau qui vous convient et validez votre réservation. Vous recevrez une confirmation par notification."
              color="purple"
            />
            <StepCard
              icon={<CreditCard className="w-5 h-5 text-green-600" />}
              step="3"
              title="Payez via Wave"
              desc="Réglez directement et en toute sécurité via Wave Money. Aucune donnée bancaire n'est stockée sur nos serveurs."
              color="green"
            />
            <StepCard
              icon={<CheckCircle className="w-5 h-5 text-orange-600" />}
              step="4"
              title="Confirmez la fin de prestation"
              desc="Lorsque le prestataire déclare avoir terminé, vous recevez une demande de confirmation. Validez depuis l'onglet Réservations. Cette étape protège les deux parties."
              color="orange"
            />
            <StepCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              step="5"
              title="Évaluez"
              desc="Notez le prestataire sur 5 étoiles et laissez un commentaire. Vos avis aident la communauté et améliorent la qualité des services."
              color="yellow"
            />
          </div>
        </div>

        {/* Pour les prestataires */}
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-base mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Je suis prestataire
          </h2>
          <div className="space-y-3">
            <StepCard
              icon={<UserCheck className="w-5 h-5 text-purple-600" />}
              step="1"
              title="Créez votre profil pro"
              desc='Inscrivez-vous puis accédez à l\'espace "Pro". Renseignez votre nom commercial, vos spécialités, votre zone d\'intervention et vos tarifs.'
              color="purple"
            />
            <StepCard
              icon={<Calendar className="w-5 h-5 text-blue-600" />}
              step="2"
              title="Gérez vos réservations"
              desc="Acceptez, confirmez ou refusez les demandes reçues. Suivez l'état de chaque mission depuis votre tableau de bord."
              color="blue"
            />
            <StepCard
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              step="3"
              title="Déclarez la fin de mission"
              desc='Une fois la prestation effectuée, cliquez sur "Terminer la mission". Le client recevra une demande de confirmation.'
              color="green"
            />
            <StepCard
              icon={<Star className="w-5 h-5 text-yellow-500" />}
              step="4"
              title="Évaluez le client"
              desc="Notez le comportement du client (ponctualité, communication, respect). Ces évaluations permettent de maintenir un haut niveau de qualité sur la plateforme."
              color="yellow"
            />
          </div>
        </div>

        {/* Système de notation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Comprendre le système de notation
          </h3>
          <div className="space-y-2 text-gray-600 dark:text-gray-400">
            <p>Les évaluations sont mutuelles : les clients notent les prestataires, et les prestataires notent les clients.</p>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-100 dark:border-orange-800 mt-3">
              <p className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4" /> Restriction d'accès
              </p>
              <p className="text-orange-700 dark:text-orange-400 text-xs">
                Un client avec une note inférieure à 2,5/5 (minimum 3 avis) ne pourra pas réserver chez des prestataires très bien notés (≥ 4/5, minimum 5 avis). Cette règle vise à protéger les prestataires de qualité.
              </p>
            </div>
            <p className="text-xs mt-2">Les notes sont calculées sur la base des 10 derniers avis reçus. Une note non représentative peut être contestée via le support.</p>
          </div>
        </div>

        {/* Paiements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-600" />
            Paiements et sécurité financière
          </h3>
          <div className="space-y-2 text-gray-600 dark:text-gray-400 text-xs">
            <p>Tous les paiements sont traités par <strong className="text-gray-800 dark:text-gray-200">Wave Mobile Money</strong>, service agréé par la BCEAO (Banque Centrale des États de l'Afrique de l'Ouest).</p>
            <p>PrestaCI ne conserve aucun de vos identifiants Wave ou données financières. Vos fonds sont sécurisés et les transactions sont irréversibles une fois validées.</p>
            <p>En cas de litige, contactez le support PrestaCI dans les <strong className="text-gray-800 dark:text-gray-200">30 jours</strong> suivant la transaction.</p>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Headphones className="w-4 h-4 text-blue-600" />
            Obtenir de l'aide
          </h3>
          <div className="space-y-2 text-gray-600 dark:text-gray-400 text-xs">
            <p>Notre équipe support est disponible du lundi au vendredi de 8h à 18h (heure d'Abidjan, GMT+0).</p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                <p className="font-semibold text-blue-700 dark:text-blue-400">Ticket in-app</p>
                <p className="text-blue-600 dark:text-blue-500">Réponse sous 24h</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                <p className="font-semibold text-green-700 dark:text-green-400">Email</p>
                <p className="text-green-600 dark:text-green-500">support@prestaci.com</p>
              </div>
            </div>
            <p className="mt-2">Pour tout litige grave (fraude, prestation non réalisée, problème de paiement), indiquez la catégorie appropriée lors de la création de votre ticket afin de bénéficier d'un traitement prioritaire.</p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800 p-4">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">Conseils pour une bonne expérience</h3>
          <ul className="space-y-1 text-yellow-700 dark:text-yellow-400 text-xs list-disc pl-4">
            <li>Vérifiez toujours la note et les avis d'un prestataire avant de réserver</li>
            <li>Précisez clairement vos attentes dans les notes de réservation</li>
            <li>Confirmez la prestation uniquement lorsqu'elle est réellement terminée</li>
            <li>Laissez un avis honnête après chaque prestation — cela aide toute la communauté</li>
            <li>En cas de problème, utilisez le support plutôt que de laisser un avis négatif sans explication</li>
          </ul>
        </div>

        <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
          PrestaCI v1.0 · Abidjan, Côte d'Ivoire · support@prestaci.com
        </div>
      </div>
    </div>
  );
}

function StepCard({ icon, step, title, desc, color }: {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
  color: string;
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800',
  };
  return (
    <div className={`rounded-xl border p-3 flex gap-3 ${bg[color] || bg.blue}`}>
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow flex items-center justify-center">{icon}</div>
        <span className="text-[10px] font-bold text-gray-400">{step}</span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{title}</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

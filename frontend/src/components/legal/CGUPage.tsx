import { ChevronLeft } from 'lucide-react';

export default function CGUPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conditions Générales d'Utilisation</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dernière mise à jour : 1er janvier 2025</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 text-sm text-gray-700 dark:text-gray-300">

        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-300 font-medium">
            En utilisant l'application PrestaCI, vous acceptez sans réserve les présentes Conditions Générales d'Utilisation (CGU). Veuillez les lire attentivement avant tout usage de la plateforme.
          </p>
        </section>

        <Section title="1. Présentation de PrestaCI">
          <p>PrestaCI est une plateforme numérique de mise en relation entre des clients particuliers et des prestataires de services professionnels en Côte d'Ivoire. La société exploitant PrestaCI est une entreprise de droit ivoirien, soumise au droit OHADA et à la législation ivoirienne en vigueur.</p>
          <p className="mt-2">PrestaCI agit en qualité d'intermédiaire technique et n'est pas partie aux contrats conclus entre clients et prestataires. À ce titre, PrestaCI ne peut être tenue responsable de la qualité des prestations réalisées.</p>
        </Section>

        <Section title="2. Conditions d'accès">
          <p>L'accès et l'utilisation de PrestaCI sont réservés aux personnes physiques ayant la capacité juridique, c'est-à-dire âgées d'au moins 18 ans ou émancipées. Conformément au Code Civil ivoirien, toute personne mineure non émancipée ne peut s'inscrire sans l'accord préalable de son représentant légal.</p>
          <p className="mt-2">L'inscription est gratuite et ouverte à tout utilisateur disposant d'un accès à internet. L'utilisateur s'engage à fournir des informations exactes, complètes et à jour lors de son inscription.</p>
        </Section>

        <Section title="3. Création de compte">
          <p>Pour accéder aux services de PrestaCI, vous devez créer un compte personnel en fournissant :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Votre nom et prénom</li>
            <li>Une adresse email valide</li>
            <li>Un numéro de téléphone mobile</li>
            <li>Un mot de passe sécurisé d'au moins 6 caractères</li>
          </ul>
          <p className="mt-2">Vous êtes seul responsable de la confidentialité de vos identifiants. Toute utilisation du compte avec vos identifiants est présumée faite par vous. En cas de perte ou de compromission de vos identifiants, vous devez contacter immédiatement le support PrestaCI.</p>
        </Section>

        <Section title="4. Services proposés">
          <p><strong>Pour les clients :</strong> Recherche et réservation de prestataires de services à domicile ou en déplacement (ménage, réparations, beauté, livraison, etc.), consultation des avis, gestion des réservations et paiements via Wave Money.</p>
          <p className="mt-2"><strong>Pour les prestataires :</strong> Création d'un profil professionnel, publication d'offres de services, gestion des réservations, consultation des évaluations clients et accès aux statistiques d'activité.</p>
        </Section>

        <Section title="5. Réservations et contrat de prestation">
          <p>Lorsqu'un client effectue une réservation, un contrat de prestation de services est formé directement entre le client et le prestataire, conformément aux articles 1583 et suivants du Code Civil applicable en Côte d'Ivoire par renvoi de l'OHADA.</p>
          <p className="mt-2">PrestaCI ne garantit pas la disponibilité du prestataire ni la bonne exécution de la prestation. Le prestataire reste seul responsable de la qualité de ses services.</p>
          <p className="mt-2"><strong>Validation en deux étapes :</strong> À l'issue d'une prestation, le prestataire marque la mission comme terminée. Le client dispose alors d'un délai raisonnable pour confirmer ou contester la fin de la prestation depuis l'application.</p>
        </Section>

        <Section title="6. Paiements">
          <p>Les paiements sur PrestaCI sont effectués exclusivement via le service de paiement mobile Wave, opéré par Wave Mobile Money CI SAS, société agréée par la Banque Centrale des États de l'Afrique de l'Ouest (BCEAO). L'utilisation de Wave est soumise aux conditions générales propres à ce service.</p>
          <p className="mt-2">PrestaCI ne stocke aucune donnée bancaire ou de carte de paiement. Les transactions sont sécurisées et chiffrées conformément aux normes PCI-DSS applicables.</p>
          <p className="mt-2">En cas de litige sur un paiement, l'utilisateur doit contacter le support PrestaCI dans un délai de 30 jours suivant la transaction.</p>
        </Section>

        <Section title="7. Système d'évaluation">
          <p>Après chaque prestation confirmée, les clients peuvent attribuer une note de 1 à 5 étoiles et laisser un commentaire sur la prestation du prestataire. Les prestataires peuvent également évaluer le comportement des clients.</p>
          <p className="mt-2">PrestaCI se réserve le droit de modérer ou supprimer tout avis contenant des propos injurieux, diffamatoires ou contraires aux bonnes mœurs, conformément à la Loi n° 2013-451 du 19 juin 2013 relative à la lutte contre la cybercriminalité en Côte d'Ivoire.</p>
          <p className="mt-2"><strong>Restriction basée sur la note :</strong> Un client dont la note moyenne est inférieure à 2,5/5 (sur la base d'au moins 3 évaluations) peut se voir restreindre l'accès aux prestataires ayant une note supérieure ou égale à 4/5 (sur la base d'au moins 5 évaluations), afin de garantir une expérience de qualité pour tous.</p>
        </Section>

        <Section title="8. Obligations des utilisateurs">
          <p>En utilisant PrestaCI, vous vous engagez à :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Ne pas publier de contenu illicite, offensant, trompeur ou portant atteinte aux droits de tiers</li>
            <li>Ne pas tenter de contourner les systèmes de sécurité de la plateforme</li>
            <li>Ne pas utiliser la plateforme à des fins frauduleuses ou déloyales</li>
            <li>Respecter les autres utilisateurs et maintenir un comportement civique</li>
            <li>Ne pas proposer de services illégaux ou contraires à la réglementation ivoirienne</li>
            <li>Ne pas effectuer de transactions en dehors de la plateforme pour contourner les frais de service</li>
          </ul>
        </Section>

        <Section title="9. Responsabilité de PrestaCI">
          <p>PrestaCI met tout en œuvre pour assurer la disponibilité de la plateforme 24h/24 et 7j/7, mais ne peut garantir une disponibilité sans interruption. PrestaCI ne saurait être tenue responsable :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Des dommages résultant d'une indisponibilité temporaire de la plateforme</li>
            <li>De la qualité ou de la non-exécution des prestations par les prestataires</li>
            <li>Des préjudices indirects liés à l'utilisation de la plateforme</li>
            <li>Des actes frauduleux commis par des tiers</li>
          </ul>
        </Section>

        <Section title="10. Propriété intellectuelle">
          <p>L'ensemble des éléments constituant la plateforme PrestaCI (logo, design, code source, textes, images) sont la propriété exclusive de PrestaCI et sont protégés par les dispositions de l'Accord de Bangui du 2 mars 1977 instituant l'Organisation Africaine de la Propriété Intellectuelle (OAPI), dont la Côte d'Ivoire est membre signataire.</p>
          <p className="mt-2">Toute reproduction, représentation ou distribution sans autorisation préalable est strictement interdite et constitue une contrefaçon passible de poursuites judiciaires.</p>
        </Section>

        <Section title="11. Suspension et résiliation de compte">
          <p>PrestaCI se réserve le droit de suspendre ou de supprimer tout compte en cas de violation des présentes CGU, de comportement frauduleux ou d'atteinte aux droits de tiers, sans préavis ni indemnité. L'utilisateur peut lui-même demander la suppression de son compte en contactant le support. La suppression entraîne la perte de l'historique des réservations et des données de profil, sous réserve des obligations légales de conservation.</p>
        </Section>

        <Section title="12. Droit applicable et juridiction compétente">
          <p>Les présentes CGU sont régies par le droit ivoirien et le droit OHADA. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents du district d'Abidjan (Côte d'Ivoire) seront seuls compétents, conformément au Code de Procédure Civile, Commerciale et Administrative ivoirien.</p>
        </Section>

        <Section title="13. Modification des CGU">
          <p>PrestaCI se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification significative par notification dans l'application. L'utilisation continue de la plateforme après notification vaut acceptation des nouvelles conditions.</p>
        </Section>

        <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          PrestaCI — Société de droit ivoirien · Abidjan, Côte d'Ivoire<br />
          Contact : support@prestaci.com
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-bold text-gray-900 dark:text-white text-base mb-2">{title}</h2>
      <div className="text-gray-600 dark:text-gray-400">{children}</div>
    </section>
  );
}

import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Politique de Confidentialité</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Dernière mise à jour : 1er janvier 2025</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 text-sm text-gray-700 dark:text-gray-300">

        <section className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
          <p className="text-green-800 dark:text-green-300 font-medium">
            PrestaCI s'engage à protéger vos données personnelles conformément à la Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en Côte d'Ivoire et aux recommandations de l'Autorité de Régulation des Télécommunications / TIC de Côte d'Ivoire (ARTCI).
          </p>
        </section>

        <Section title="1. Responsable du traitement">
          <p>Le responsable du traitement de vos données personnelles est la société exploitant PrestaCI, société de droit ivoirien, dont le siège social est situé à Abidjan, Côte d'Ivoire.</p>
          <p className="mt-2">Pour toute question relative à vos données personnelles, vous pouvez contacter notre Délégué à la Protection des Données (DPD) à l'adresse : <strong>privacy@prestaci.com</strong></p>
        </Section>

        <Section title="2. Données collectées">
          <p>PrestaCI collecte les catégories de données personnelles suivantes :</p>
          <div className="mt-2 space-y-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Données d'identification</p>
              <p>Nom, prénom, adresse email, numéro de téléphone, ville de résidence, photo de profil (facultative).</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Données de transaction</p>
              <p>Historique des réservations, montants des prestations, méthodes de paiement utilisées (identifiants Wave, non données bancaires).</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Données de géolocalisation</p>
              <p>Localisation approximative fournie lors de la configuration du profil ou lors de la sélection d'une adresse de prestation. La géolocalisation en temps réel n'est pas collectée sans votre consentement explicite.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Données de navigation</p>
              <p>Adresse IP, type d'appareil, système d'exploitation, pages consultées, temps de session — à des fins statistiques et de sécurité.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Évaluations et avis</p>
              <p>Notes et commentaires laissés sur les prestataires et/ou les clients après une prestation.</p>
            </div>
          </div>
        </Section>

        <Section title="3. Finalités du traitement">
          <p>Vos données sont collectées et traitées pour les finalités suivantes :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Création, gestion et sécurisation de votre compte utilisateur</li>
            <li>Mise en relation entre clients et prestataires</li>
            <li>Traitement des réservations et paiements</li>
            <li>Envoi de notifications liées à votre activité sur la plateforme</li>
            <li>Amélioration des services et personnalisation de l'expérience utilisateur</li>
            <li>Prévention des fraudes et sécurisation de la plateforme</li>
            <li>Respect des obligations légales et réglementaires</li>
            <li>Envoi de communications commerciales avec votre consentement</li>
          </ul>
        </Section>

        <Section title="4. Base légale du traitement">
          <p>Conformément à la Loi n° 2013-450, le traitement de vos données est fondé sur :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>L'exécution du contrat :</strong> pour les données nécessaires à la fourniture des services PrestaCI</li>
            <li><strong>Votre consentement :</strong> pour les communications marketing et la géolocalisation précise</li>
            <li><strong>L'intérêt légitime :</strong> pour la prévention des fraudes et l'amélioration des services</li>
            <li><strong>L'obligation légale :</strong> pour la conservation des données de transaction conformément au Code du Commerce OHADA</li>
          </ul>
        </Section>

        <Section title="5. Durée de conservation">
          <p>Vos données personnelles sont conservées pour les durées suivantes :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Données de compte actif :</strong> pendant toute la durée de la relation contractuelle</li>
            <li><strong>Données après suppression du compte :</strong> 3 ans pour les données de transaction (obligation comptable OHADA)</li>
            <li><strong>Données de navigation :</strong> 13 mois maximum</li>
            <li><strong>Données relatives aux litiges :</strong> jusqu'à la prescription légale applicable (5 ans en droit ivoirien)</li>
          </ul>
        </Section>

        <Section title="6. Partage des données">
          <p>PrestaCI ne vend, ne loue ni ne cède vos données personnelles à des tiers à des fins commerciales. Vos données peuvent être partagées avec :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Les prestataires de services :</strong> votre nom, téléphone et adresse de prestation nécessaires à l'exécution de la réservation</li>
            <li><strong>Wave Mobile Money CI SAS :</strong> pour le traitement des paiements, soumis à leurs propres conditions</li>
            <li><strong>Nos prestataires techniques :</strong> hébergement, maintenance, envoi de notifications (sous contrat de confidentialité)</li>
            <li><strong>Les autorités compétentes :</strong> sur réquisition judiciaire ou administrative légale</li>
          </ul>
        </Section>

        <Section title="7. Vos droits">
          <p>Conformément à la Loi n° 2013-450, vous disposez des droits suivants sur vos données personnelles :</p>
          <ul className="list-disc pl-5 mt-2 space-y-2">
            <li><strong>Droit d'accès (art. 31) :</strong> obtenir une copie de vos données personnelles traitées</li>
            <li><strong>Droit de rectification (art. 32) :</strong> corriger des données inexactes ou incomplètes</li>
            <li><strong>Droit d'opposition (art. 34) :</strong> vous opposer au traitement pour des motifs légitimes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données dans les cas prévus par la loi</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et lisible par machine</li>
          </ul>
          <p className="mt-2">Pour exercer ces droits, contactez-nous à : <strong>privacy@prestaci.com</strong> en joignant une copie de votre pièce d'identité. Nous répondrons dans un délai de 30 jours.</p>
          <p className="mt-2">En cas de litige non résolu, vous pouvez saisir l'ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire).</p>
        </Section>

        <Section title="8. Sécurité des données">
          <p>PrestaCI met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte, destruction ou divulgation. Ces mesures comprennent notamment :</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Chiffrement des mots de passe (bcrypt)</li>
            <li>Transmission sécurisée via protocole HTTPS/TLS</li>
            <li>Authentification par jeton JWT avec expiration</li>
            <li>Accès restreint aux données par habilitation du personnel</li>
            <li>Audits de sécurité réguliers</li>
          </ul>
        </Section>

        <Section title="9. Cookies et traceurs">
          <p>PrestaCI utilise des cookies strictement nécessaires au fonctionnement de l'application (session, authentification, préférences d'affichage). Aucun cookie publicitaire tiers n'est utilisé sans votre consentement explicite.</p>
        </Section>

        <Section title="10. Transfert international de données">
          <p>Vos données sont hébergées sur des serveurs situés en dehors de la Côte d'Ivoire. Ces transferts sont encadrés par des clauses contractuelles types garantissant un niveau de protection équivalent à celui exigé par la Loi n° 2013-450.</p>
        </Section>

        <Section title="11. Modification de la politique">
          <p>PrestaCI se réserve le droit de modifier la présente politique à tout moment. En cas de modification substantielle, vous serez informé par notification dans l'application au moins 15 jours avant l'entrée en vigueur des changements.</p>
        </Section>

        <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          PrestaCI · Abidjan, Côte d'Ivoire<br />
          DPD : privacy@prestaci.com · ARTCI : www.artci.ci
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

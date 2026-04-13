import { useState } from 'react';
import { ChevronLeft, Mail, Phone, MessageCircle, Book, FileQuestion, Send, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

export default function HelpSupportTab({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { addNotification } = useAppStore();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!subject || !message) return;
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubject('');
      setMessage('');
      addNotification({
        id: Date.now(),
        user_id: user?.id,
        titre: 'Message envoyé',
        message: 'Notre équipe vous répondra dans les 24h',
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString()
      });
    }, 500);
  };

  const faqItems = [
    {
      question: 'Comment réserver un service ?',
      answer: 'Parcourez les services, sélectionnez celui qui vous intéresse, choisissez une date et confirmez votre réservation.'
    },
    {
      question: 'Comment annuler une réservation ?',
      answer: 'Allez dans "Réservations", sélectionnez la réservation et cliquez sur "Annuler". Les conditions d\'annulation varient selon le prestataire.'
    },
    {
      question: 'Comment devenir prestataire ?',
      answer: 'Créez un compte, accédez à l\'espace Pro et complétez votre profil professionnel avec vos services.'
    },
    {
      question: 'Les paiements sont-ils sécurisés ?',
      answer: 'Oui, tous les paiements sont sécurisés via Wave et cryptés selon les normes bancaires.'
    }
  ];

  return (
    <div className="max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Aide & Support
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nous sommes là pour vous aider
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Contact rapide */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Nous contacter</h3>
          
          <div className="space-y-3">
            <a
              href="mailto:support@prestaci.com"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Email</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">support@prestaci.com</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="tel:+2250707080809"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Téléphone</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">+225 07 07 08 08 09</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>

            <a
              href="https://wa.me/2250707080809"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">WhatsApp</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Chat en direct</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <FileQuestion className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Questions fréquentes</h3>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="group rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <summary className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors list-none">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{item.question}</span>
                    <svg
                      className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Documentation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Book className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Documentation</h3>
          </div>

          <div className="space-y-2">
            <a
              href="#"
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white">Guide de démarrage</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </a>
            <a
              href="#"
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white">Conditions d'utilisation</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </a>
            <a
              href="#"
              className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-900 dark:text-white">Politique de confidentialité</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </div>
            </a>
          </div>
        </div>

        {/* Formulaire de contact */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Envoyer un message</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sujet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Quel est votre problème ?"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre problème en détail..."
                rows={4}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!subject || !message || loading}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors text-white ${
                !subject || !message || loading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Envoi...' : 'Envoyer le message'}</span>
            </button>
          </div>
        </div>

        {/* Version de l'app */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">
          PrestaCI v0.1.0
        </div>
      </div>
    </div>
  );
}

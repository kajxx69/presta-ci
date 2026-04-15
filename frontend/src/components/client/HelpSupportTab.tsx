import { useState, useEffect } from 'react';
import { ChevronLeft, Mail, Phone, MessageCircle, Book, FileQuestion, Send, ExternalLink, Headphones, Plus, Clock, CheckCircle, Circle, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import SupportTicketModal from '../common/SupportTicketModal';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ouvert: { label: 'Ouvert', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', icon: Circle },
  en_cours: { label: 'En cours', color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20', icon: Clock },
  resolu: { label: 'Résolu', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20', icon: CheckCircle },
  ferme: { label: 'Fermé', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800', icon: AlertCircle },
};

export default function HelpSupportTab({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'tickets' | 'ticket-detail'>('home');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetail, setTicketDetail] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const loadTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const data = await api.tickets.list();
      setTickets(data);
    } catch {
      // ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketDetail = async (ticketId: number) => {
    try {
      const data = await api.tickets.getById(ticketId);
      setTicketDetail(data);
    } catch {
      showToast('Erreur lors du chargement du ticket', 'error');
    }
  };

  useEffect(() => {
    if (activeView === 'tickets') loadTickets();
  }, [activeView]);

  useEffect(() => {
    if (activeView === 'ticket-detail' && selectedTicket) {
      loadTicketDetail(selectedTicket.id || selectedTicket._id);
    }
  }, [activeView, selectedTicket]);

  const handleReply = async () => {
    if (!replyText.trim() || !ticketDetail) return;
    setReplyLoading(true);
    try {
      const ticketId = ticketDetail.ticket.id || ticketDetail.ticket._id;
      await api.tickets.addMessage(ticketId, replyText);
      setReplyText('');
      await loadTicketDetail(ticketId);
    } catch {
      showToast('Erreur lors de l\'envoi', 'error');
    } finally {
      setReplyLoading(false);
    }
  };

  const faqItems = [
    { question: 'Comment réserver un service ?', answer: 'Parcourez les services, sélectionnez celui qui vous intéresse, choisissez une date et confirmez votre réservation.' },
    { question: 'Comment annuler une réservation ?', answer: 'Allez dans "Réservations", sélectionnez la réservation et cliquez sur "Annuler". Les conditions d\'annulation varient selon le prestataire.' },
    { question: 'Comment confirmer la fin d\'une prestation ?', answer: 'Quand le prestataire marque la prestation comme terminée, vous recevez une demande de confirmation. Allez dans vos réservations et cliquez sur "Confirmer".' },
    { question: 'Comment devenir prestataire ?', answer: 'Créez un compte, accédez à l\'espace Pro et complétez votre profil professionnel avec vos services.' },
    { question: 'Les paiements sont-ils sécurisés ?', answer: 'Oui, tous les paiements sont sécurisés via Wave et cryptés selon les normes bancaires.' },
  ];

  // Ticket detail view
  if (activeView === 'ticket-detail' && ticketDetail) {
    const t = ticketDetail.ticket;
    const sc = statusConfig[t.statut] || statusConfig.ouvert;
    const StatusIcon = sc.icon;
    const isClosed = ['resolu', 'ferme'].includes(t.statut);
    return (
      <div className="max-w-md mx-auto pb-20 flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => { setActiveView('tickets'); setTicketDetail(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">{t.sujet}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                <StatusIcon className="w-3 h-3" /> {sc.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {ticketDetail.messages.map((msg: any) => (
            <div key={msg._id || msg.id} className={`flex ${msg.is_admin ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.is_admin ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : 'bg-blue-600 text-white'}`}>
                {msg.is_admin && (
                  <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Support PrestaCI</p>
                )}
                <p className={`text-sm ${msg.is_admin ? 'text-gray-800 dark:text-gray-200' : 'text-white'}`}>{msg.contenu}</p>
                <p className={`text-[10px] mt-1 ${msg.is_admin ? 'text-gray-400' : 'text-blue-100'}`}>
                  {new Date(msg.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {!isClosed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
              placeholder="Répondre..."
              className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleReply}
              disabled={replyLoading || !replyText.trim()}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
            >
              {replyLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
        {isClosed && (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Ce ticket est fermé.</div>
        )}
      </div>
    );
  }

  // Tickets list view
  if (activeView === 'tickets') {
    return (
      <div className="max-w-md mx-auto pb-20">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={() => setActiveView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mes tickets</h1>
            </div>
            <button
              onClick={() => setTicketModalOpen(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Nouveau
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loadingTickets ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <Headphones className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">Aucun ticket de support</p>
              <button onClick={() => setTicketModalOpen(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium">
                Ouvrir un ticket
              </button>
            </div>
          ) : tickets.map((ticket: any) => {
            const tid = ticket.id || ticket._id;
            const sc = statusConfig[ticket.statut] || statusConfig.ouvert;
            const StatusIcon = sc.icon;
            return (
              <button
                key={tid}
                onClick={() => { setSelectedTicket(ticket); setActiveView('ticket-detail'); }}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{ticket.sujet}</p>
                    {ticket.dernier_message && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{ticket.dernier_message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                      <StatusIcon className="w-3 h-3" /> {sc.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <SupportTicketModal
          open={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          onSuccess={() => { showToast('Ticket créé avec succès', 'success'); loadTickets(); }}
        />
      </div>
    );
  }

  // Home view
  return (
    <div className="max-w-md mx-auto pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Aide & Support</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nous sommes là pour vous aider</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Ticket support button */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Besoin d'aide ?</h3>
              <p className="text-sm text-blue-100 mt-0.5">Créez un ticket et notre équipe vous répond sous 24h</p>
            </div>
            <Headphones className="w-10 h-10 text-white/60 flex-shrink-0" />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setTicketModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Nouveau ticket
            </button>
            <button
              onClick={() => setActiveView('tickets')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-semibold"
            >
              Mes tickets
            </button>
          </div>
        </div>

        {/* Contact rapide */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Nous contacter</h3>
          <div className="space-y-3">
            <a href="mailto:support@prestaci.com" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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

            <a href="tel:+2250707080809" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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

            <a href="https://wa.me/2250707080809" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
              <details key={index} className="group rounded-lg border border-gray-200 dark:border-gray-700">
                <summary className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors list-none">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">{item.question}</span>
                    <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </summary>
                <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400">{item.answer}</div>
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
            {['Guide de démarrage', 'Conditions d\'utilisation', 'Politique de confidentialité'].map(item => (
              <a key={item} href="#" className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 dark:text-white">{item}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </div>
              </a>
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4">PrestaCI v0.1.0</div>
      </div>

      <SupportTicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        onSuccess={() => showToast('Ticket créé avec succès. Nous vous répondrons sous 24h.', 'success')}
      />
    </div>
  );
}

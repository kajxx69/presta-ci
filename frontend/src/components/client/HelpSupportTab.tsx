import { useState, useEffect } from 'react';
import {
  ChevronLeft, Mail, Phone, MessageCircle, Book, FileQuestion, Send,
  Headphones, Plus, Clock, CheckCircle, Circle, AlertCircle, ChevronRight,
  FileText, Shield, BookOpen, ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { api } from '../../lib/api';
import SupportTicketModal from '../common/SupportTicketModal';
import CGUPage from '../legal/CGUPage';
import PrivacyPolicyPage from '../legal/PrivacyPolicyPage';
import GuidePage from '../legal/GuidePage';

type SubView = 'home' | 'tickets' | 'ticket-detail' | 'cgu' | 'privacy' | 'guide';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  ouvert: { label: 'Ouvert', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', icon: Circle },
  en_cours: { label: 'En cours', color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20', icon: Clock },
  resolu: { label: 'Résolu', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20', icon: CheckCircle },
  ferme: { label: 'Fermé', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800', icon: AlertCircle },
};

const faqItems = [
  {
    question: 'Comment réserver un service ?',
    answer: 'Depuis l\'accueil, recherchez le service souhaité ou parcourez les catégories. Cliquez sur un prestataire, consultez ses avis et ses tarifs, puis cliquez sur "Réserver". Choisissez la date, l\'heure et validez. Le paiement s\'effectue via Wave Money.'
  },
  {
    question: 'Comment annuler une réservation ?',
    answer: 'Allez dans l\'onglet "Réservations", ouvrez la réservation concernée et cliquez sur "Annuler". Les conditions d\'annulation varient selon chaque prestataire. Certaines annulations tardives (moins de 24h avant la prestation) peuvent entraîner des frais.'
  },
  {
    question: 'Comment confirmer la fin d\'une prestation ?',
    answer: 'Lorsque le prestataire déclare avoir terminé sa mission, vous recevez une notification. Allez dans "Réservations", ouvrez la réservation et cliquez sur "Confirmer la fin". Cette étape déclenche le versement final au prestataire. Ne confirmez que si la prestation est réellement effectuée.'
  },
  {
    question: 'Pourquoi ne puis-je pas réserver chez certains prestataires ?',
    answer: 'Si votre note client est inférieure à 2,5/5 (calculée sur au moins 3 évaluations), vous ne pouvez pas réserver chez des prestataires très bien notés (≥ 4/5). Cette restriction protège les prestataires de qualité. Pour améliorer votre note, assurez-vous d\'être respectueux, ponctuel et de payer en temps et en heure.'
  },
  {
    question: 'Comment devenir prestataire ?',
    answer: 'Créez un compte, puis dans votre profil, accédez à "Espace Pro". Complétez votre profil professionnel : nom commercial, services proposés, zone d\'intervention, tarifs. Après validation, votre profil sera visible par les clients.'
  },
  {
    question: 'Les paiements sont-ils sécurisés ?',
    answer: 'Oui. Tous les paiements sont traités exclusivement via Wave Mobile Money, service agréé par la BCEAO. PrestaCI ne stocke aucune donnée bancaire. Les transactions sont chiffrées et sécurisées selon les normes bancaires en vigueur en Zone UEMOA.'
  },
  {
    question: 'Comment signaler un problème ?',
    answer: 'Dans l\'onglet "Réservations", ouvrez la réservation concernée et cliquez sur "Signaler un problème". Vous pouvez aussi créer un ticket depuis cette page Aide. Notre équipe traite les signalements sous 24h en jours ouvrés.'
  },
  {
    question: 'Puis-je modifier un avis laissé ?',
    answer: 'Les avis publiés ne peuvent pas être modifiés pour garantir leur authenticité. Si vous pensez qu\'un avis vous concernant est injuste ou diffamatoire, contactez le support via un ticket — notre équipe examine chaque cas.'
  },
  {
    question: 'Comment supprimer mon compte ?',
    answer: 'Contactez notre support via un ticket ou par email à support@prestaci.com avec votre demande de suppression. Conformément à la Loi n° 2013-450 sur la protection des données, vos données seront supprimées dans un délai de 30 jours, à l\'exception des données de transaction conservées 3 ans pour obligation comptable.'
  },
];

export default function HelpSupportTab({ onBack }: { onBack: () => void }) {
  const { user } = useAuthStore();
  const { showToast } = useAppStore();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeView, setActiveView] = useState<SubView>('home');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketDetail, setTicketDetail] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  // ── Legal / doc sub-pages ──────────────────────────────────────────────────
  if (activeView === 'cgu') return <CGUPage onBack={() => setActiveView('home')} />;
  if (activeView === 'privacy') return <PrivacyPolicyPage onBack={() => setActiveView('home')} />;
  if (activeView === 'guide') return <GuidePage onBack={() => setActiveView('home')} />;

  // ── Ticket detail ──────────────────────────────────────────────────────────
  if (activeView === 'ticket-detail' && ticketDetail) {
    const t = ticketDetail.ticket;
    const sc = statusConfig[t.statut] || statusConfig.ouvert;
    const StatusIcon = sc.icon;
    const isClosed = ['resolu', 'ferme'].includes(t.statut);
    return (
      <div className="max-w-md mx-auto pb-20 flex flex-col" style={{ minHeight: '80vh' }}>
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
          {ticketDetail.messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">Aucun message pour le moment.</p>
          )}
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

        {!isClosed ? (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
              placeholder="Répondre au support..."
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
        ) : (
          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            Ce ticket est <strong>{t.statut === 'resolu' ? 'résolu' : 'fermé'}</strong>. Pour un nouveau problème, ouvrez un nouveau ticket.
          </div>
        )}
      </div>
    );
  }

  // ── Tickets list ───────────────────────────────────────────────────────────
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
          {!user ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <Headphones className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">Connectez-vous pour voir vos tickets</p>
            </div>
          ) : loadingTickets ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-center">
              <Headphones className="w-12 h-12 text-gray-300" />
              <p className="font-semibold text-gray-700 dark:text-gray-300">Aucun ticket de support</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Créez un ticket si vous rencontrez un problème.</p>
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
                      {new Date(ticket.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
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

  // ── Home view ──────────────────────────────────────────────────────────────
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

        {/* Ticket banner */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg">Besoin d'aide ?</h3>
              <p className="text-sm text-blue-100 mt-0.5">Notre équipe vous répond sous 24h en jours ouvrés (lun–ven, 8h–18h GMT)</p>
            </div>
            <Headphones className="w-10 h-10 text-white/50 flex-shrink-0 mt-1" />
          </div>
          <div className="flex gap-2 mt-4">
            {user ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-blue-100 italic">Connectez-vous pour créer un ticket</p>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Nous contacter directement</h3>
          <div className="space-y-2">
            <a href="mailto:support@prestaci.com" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Email</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">support@prestaci.com</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>

            <a href="tel:+2250707080809" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Téléphone</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">+225 07 07 08 08 09 · Lun–Ven 8h–18h</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>

            <a href="https://wa.me/2250707080809" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">WhatsApp</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Réponse rapide en journée</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
              <FileQuestion className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Questions fréquentes</h3>
          </div>
          <div className="space-y-2">
            {faqItems.map((item, index) => (
              <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  className="w-full text-left cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm">{item.question}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Documentation légale */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <Book className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Documentation</h3>
          </div>
          <div className="space-y-1">
            <DocLink
              icon={<BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              label="Guide de démarrage"
              sub="Comment utiliser PrestaCI"
              onClick={() => setActiveView('guide')}
            />
            <DocLink
              icon={<FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
              label="Conditions Générales d'Utilisation"
              sub="CGU — Loi ivoirienne & droit OHADA"
              onClick={() => setActiveView('cgu')}
            />
            <DocLink
              icon={<Shield className="w-4 h-4 text-green-600 dark:text-green-400" />}
              label="Politique de Confidentialité"
              sub="Loi n° 2013-450 · Protection des données"
              onClick={() => setActiveView('privacy')}
            />
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2">
          PrestaCI v1.0 · Abidjan, Côte d'Ivoire<br />
          Plateforme soumise au droit ivoirien et au droit OHADA
        </div>
      </div>

      <SupportTicketModal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        onSuccess={() => showToast('Ticket créé. Notre équipe vous répond sous 24h.', 'success')}
      />
    </div>
  );
}

function DocLink({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{sub}</div>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

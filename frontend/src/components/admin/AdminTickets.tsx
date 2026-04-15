import { useState, useEffect, useCallback } from 'react';
import { Headphones, Clock, CheckCircle, Circle, AlertCircle, ChevronRight, Send, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ouvert: { label: 'Ouvert', color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30', dot: 'bg-blue-500' },
  en_cours: { label: 'En cours', color: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30', dot: 'bg-orange-500' },
  resolu: { label: 'Résolu', color: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30', dot: 'bg-green-500' },
  ferme: { label: 'Fermé', color: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800', dot: 'bg-gray-400' },
};

const categorieLabels: Record<string, string> = {
  probleme_reservation: 'Réservation',
  probleme_paiement: 'Paiement',
  probleme_prestataire: 'Prestataire',
  probleme_client: 'Client',
  probleme_compte: 'Compte',
  autre: 'Autre',
};

const prioriteConfig: Record<string, { label: string; color: string }> = {
  faible: { label: 'Faible', color: 'text-gray-500' },
  normale: { label: 'Normale', color: 'text-blue-600' },
  haute: { label: 'Haute', color: 'text-orange-600' },
  urgente: { label: 'Urgente', color: 'text-red-600 font-bold' },
};

export default function AdminTickets() {
  const { showToast } = useAppStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statutFilter, setStatutFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [prioriteUpdate, setPrioriteUpdate] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        api.admin.tickets.getAll({ statut: statutFilter || undefined, page }),
        api.admin.tickets.getStats()
      ]);
      setTickets(ticketsRes.tickets);
      setPagination(ticketsRes.pagination);
      setStats(statsRes);
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, [statutFilter, page]);

  const loadDetail = async (ticketId: number) => {
    try {
      const data = await api.admin.tickets.getById(ticketId);
      setDetail(data);
      setStatusUpdate(data.ticket.statut);
      setPrioriteUpdate(data.ticket.priorite);
    } catch {
      showToast('Erreur lors du chargement du ticket', 'error');
    }
  };

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const handleSelectTicket = (ticket: any) => {
    setSelected(ticket);
    loadDetail(ticket.id || ticket._id);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !detail) return;
    setReplyLoading(true);
    try {
      const tid = detail.ticket.id || detail.ticket._id;
      await api.admin.tickets.addMessage(tid, replyText);
      setReplyText('');
      await loadDetail(tid);
    } catch {
      showToast('Erreur lors de l\'envoi', 'error');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!detail) return;
    setUpdating(true);
    try {
      const tid = detail.ticket.id || detail.ticket._id;
      await api.admin.tickets.update(tid, { statut: statusUpdate, priorite: prioriteUpdate });
      showToast('Ticket mis à jour', 'success');
      await loadDetail(tid);
      await loadTickets();
    } catch {
      showToast('Erreur lors de la mise à jour', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
            { label: 'Ouverts', value: stats.ouvert, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
            { label: 'En cours', value: stats.en_cours, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' },
            { label: 'Résolus', value: stats.resolu, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
            { label: 'Fermés', value: stats.ferme, color: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Tickets de support</h3>
            <div className="flex gap-2">
              <select
                value={statutFilter}
                onChange={e => { setStatutFilter(e.target.value); setPage(1); }}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">Tous les statuts</option>
                <option value="ouvert">Ouverts</option>
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolus</option>
                <option value="ferme">Fermés</option>
              </select>
              <button onClick={loadTickets} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><span className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2 text-gray-400">
              <Headphones className="w-10 h-10" />
              <p className="text-sm">Aucun ticket</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket: any) => {
                const tid = ticket.id || ticket._id;
                const sc = statusConfig[ticket.statut] || statusConfig.ouvert;
                const pc = prioriteConfig[ticket.priorite] || prioriteConfig.normale;
                const isSelected = selected && (selected.id === tid || selected._id === tid);
                return (
                  <button
                    key={tid}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium ${pc.color}`}>{pc.label}</span>
                          <span className="text-xs text-gray-400">#{tid}</span>
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">{ticket.sujet}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticket.user_nom || 'Utilisateur inconnu'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {categorieLabels[ticket.categorie] || ticket.categorie} · {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Préc.</button>
                  <span className="px-3 py-1 text-sm text-gray-500">{page}/{pagination.totalPages}</span>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Suiv.</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ticket detail */}
        <div>
          {!detail ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              <Headphones className="w-10 h-10 mb-2" />
              <p className="text-sm">Sélectionnez un ticket</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              {/* Detail header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{detail.ticket.sujet}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {detail.user?.prenom} {detail.user?.nom} · {(detail.user as any)?.email}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusConfig[detail.ticket.statut]?.color || ''}`}>
                    {statusConfig[detail.ticket.statut]?.label}
                  </span>
                </div>

                {/* Status + Priority update */}
                <div className="flex gap-2 mt-3">
                  <select
                    value={statusUpdate}
                    onChange={e => setStatusUpdate(e.target.value)}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  >
                    <option value="ouvert">Ouvert</option>
                    <option value="en_cours">En cours</option>
                    <option value="resolu">Résolu</option>
                    <option value="ferme">Fermé</option>
                  </select>
                  <select
                    value={prioriteUpdate}
                    onChange={e => setPrioriteUpdate(e.target.value)}
                    className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  >
                    <option value="faible">Faible</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="urgente">Urgente</option>
                  </select>
                  <button
                    onClick={handleUpdate}
                    disabled={updating}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {updating ? '...' : 'Mettre à jour'}
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-72">
                {detail.messages.map((msg: any) => (
                  <div key={msg._id || msg.id} className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.is_admin ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                      {!msg.is_admin && (
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">{msg.auteur_nom || 'Utilisateur'}</p>
                      )}
                      <p className="text-sm">{msg.contenu}</p>
                      <p className={`text-[10px] mt-1 ${msg.is_admin ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {!['resolu', 'ferme'].includes(detail.ticket.statut) && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                    placeholder="Répondre au client..."
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

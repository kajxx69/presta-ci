import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, ChevronLeft, Loader2, FileText, Check, CheckCheck,
  X, CalendarCheck, ImagePlus, Trash2, Search,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';

interface Conversation {
  id: number;
  interlocuteur_nom: string;
  dernier_message: string | null;
  dernier_message_at: string | null;
  non_lus: number;
  mon_role: 'client' | 'prestataire';
}

interface Devis {
  service_id: number;
  service_nom?: string;
  devise?: string;
  montant: number;
  date: string;
  heure?: string | null;
  description?: string | null;
  statut: 'propose' | 'accepte' | 'refuse';
  reservation_id?: number;
}

interface Message {
  id: number;
  contenu: string;
  est_moi: boolean;
  created_at: string;
  type?: 'text' | 'devis' | 'image';
  devis?: Devis | null;
  image?: string | null;
  deleted?: boolean;
  lu?: boolean;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Redimensionne une image côté client (max 1280px) et retourne un data-URI JPEG */
async function compressImage(file: File): Promise<string> {
  const dataUri: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUri;
  });
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 500 * 1024) return dataUri;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export default function MessagesTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [convSearch, setConvSearch] = useState('');
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [luJusqua, setLuJusqua] = useState(0);
  const [interlocuteurEcrit, setInterlocuteurEcrit] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef(0);
  const lastMessageIdRef = useRef(0);
  const { showToast } = useAppStore();

  // — Devis (côté prestataire) —
  const [devisOpen, setDevisOpen] = useState(false);
  const [myServices, setMyServices] = useState<any[]>([]);
  const [devisForm, setDevisForm] = useState({ service_id: 0, montant: '', date: '', heure: '', description: '' });
  const [devisSending, setDevisSending] = useState(false);
  const [respondingDevis, setRespondingDevis] = useState<number | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await api.conversations.list();
      setConversations(rows);
      return rows;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial + ouverture automatique (bouton "Contacter" d'une fiche prestataire)
  useEffect(() => {
    (async () => {
      const rows = await loadConversations();
      const pendingId = sessionStorage.getItem('prestaci-open-conversation');
      if (pendingId) {
        sessionStorage.removeItem('prestaci-open-conversation');
        const conv = rows.find((c: Conversation) => c.id === Number(pendingId));
        if (conv) setActiveConv(conv);
      }
    })();
  }, [loadConversations]);

  // Poll de la liste toutes les 15s
  useEffect(() => {
    const interval = setInterval(loadConversations, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Services du prestataire pour le composeur de devis
  useEffect(() => {
    if (devisOpen && myServices.length === 0) {
      api.services.list().then(rows => {
        const actifs = rows.filter((s: any) => s.is_active);
        setMyServices(actifs);
        if (actifs.length > 0) setDevisForm(f => ({ ...f, service_id: actifs[0].id }));
      }).catch(() => {});
    }
  }, [devisOpen, myServices.length]);

  const isNearBottom = () => {
    const box = scrollBoxRef.current;
    if (!box) return true;
    return box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  };

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Messages : chargement initial complet puis polling incrémental (2.5s)
  useEffect(() => {
    if (!activeConv) return;
    let cancelled = false;
    setMessagesLoading(true);
    setMessages([]);
    lastMessageIdRef.current = 0;

    const load = async (initial: boolean) => {
      try {
        const res = await api.conversations.getMessages(activeConv.id, initial ? undefined : lastMessageIdRef.current);
        if (cancelled) return;
        setLuJusqua(res.mes_messages_lus_jusqua);
        setInterlocuteurEcrit(res.interlocuteur_ecrit);
        if (res.messages.length > 0) {
          const wasNearBottom = isNearBottom();
          setMessages(prev => {
            const seen = new Set(prev.map(m => m.id));
            const nouveaux = res.messages.filter((m: Message) => !seen.has(m.id));
            const merged = initial ? res.messages : [...prev, ...nouveaux];
            const maxId = Math.max(lastMessageIdRef.current, ...merged.map((m: Message) => m.id));
            lastMessageIdRef.current = maxId;
            return merged;
          });
          if (initial || wasNearBottom) setTimeout(() => scrollToBottom(!initial), 50);
        }
      } catch { /* réessaiera au prochain tick */ }
      if (!cancelled && initial) setMessagesLoading(false);
    };

    load(true);
    const interval = setInterval(() => load(false), 2500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeConv]);

  // Signaler la frappe (throttle 3s)
  const notifyTyping = () => {
    if (!activeConv) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now;
      api.conversations.typing(activeConv.id).catch(() => {});
    }
  };

  // Textarea auto-grow
  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Seules les images sont acceptées', 'error');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch {
      showToast("Impossible de lire l'image", 'error');
    }
  };

  const handleSend = async () => {
    const contenu = draft.trim();
    if ((!contenu && !pendingImage) || !activeConv || sending) return;
    setSending(true);
    try {
      const msg = await api.conversations.sendMessage(activeConv.id, contenu, pendingImage || undefined);
      setMessages(prev => [...prev, msg]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
      setDraft('');
      setPendingImage(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setTimeout(() => scrollToBottom(), 50);
      loadConversations();
    } catch (e: any) {
      showToast(e.message?.includes('volumineux') ? 'Image trop volumineuse' : "Échec de l'envoi", 'error');
    }
    setSending(false);
  };

  const handleDelete = async (messageId: number) => {
    if (!activeConv) return;
    try {
      await api.conversations.deleteMessage(activeConv.id, messageId);
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, deleted: true, contenu: '', image: null, devis: null, type: 'text' } : m
      ));
      loadConversations();
    } catch (e: any) {
      showToast(e.message?.includes('accepté') ? 'Impossible de supprimer un devis accepté' : 'Suppression impossible', 'error');
    }
  };

  const handleSendDevis = async () => {
    if (!activeConv || !devisForm.service_id || !devisForm.montant || !devisForm.date) return;
    setDevisSending(true);
    try {
      const msg = await api.conversations.sendDevis(activeConv.id, {
        service_id: devisForm.service_id,
        montant: Number(devisForm.montant),
        date: devisForm.date,
        heure: devisForm.heure || undefined,
        description: devisForm.description || undefined,
      });
      setMessages(prev => [...prev, msg]);
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, msg.id);
      setDevisOpen(false);
      setDevisForm(f => ({ ...f, montant: '', description: '' }));
      setTimeout(() => scrollToBottom(), 50);
    } catch (e: any) {
      showToast(e.message || "Impossible d'envoyer le devis", 'error');
    }
    setDevisSending(false);
  };

  const handleRespondDevis = async (messageId: number, action: 'accepte' | 'refuse') => {
    if (!activeConv) return;
    setRespondingDevis(messageId);
    try {
      const res = await api.conversations.respondDevis(activeConv.id, messageId, action);
      setMessages(prev => prev.map(m =>
        m.id === messageId && m.devis
          ? { ...m, devis: { ...m.devis, statut: res.statut as Devis['statut'], reservation_id: res.reservation_id } }
          : m
      ));
      if (action === 'accepte') showToast('Devis accepté — réservation confirmée ! 🎉', 'success');
    } catch (e: any) {
      showToast(e.message?.includes('409') || e.message?.includes('disponible')
        ? "Ce créneau n'est plus disponible"
        : 'Erreur lors de la réponse au devis', 'error');
    }
    setRespondingDevis(null);
  };

  // Messages groupés par jour (séparateurs)
  const grouped = useMemo(() => {
    const out: Array<{ day: string; items: Message[] }> = [];
    for (const m of messages) {
      const day = dayLabel(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(m);
      else out.push({ day, items: [m] });
    }
    return out;
  }, [messages]);

  const filteredConversations = useMemo(() => {
    const q = convSearch.toLowerCase().trim();
    if (!q) return conversations;
    return conversations.filter(c =>
      c.interlocuteur_nom.toLowerCase().includes(q) ||
      (c.dernier_message || '').toLowerCase().includes(q)
    );
  }, [conversations, convSearch]);

  // ── Vue conversation ──
  if (activeConv) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-2xl">
          <button
            onClick={() => { setActiveConv(null); setMessages([]); loadConversations(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {activeConv.interlocuteur_nom.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{activeConv.interlocuteur_nom}</p>
            <p className="text-xs text-gray-400 h-4">
              {interlocuteurEcrit
                ? <span className="text-blue-500 font-medium animate-pulse">est en train d'écrire…</span>
                : (activeConv.mon_role === 'client' ? 'Prestataire' : 'Client')}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollBoxRef} className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 dark:bg-gray-900">
          {messagesLoading && messages.length === 0 && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
          {!messagesLoading && messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              Démarrez la conversation en envoyant un message.
            </p>
          )}

          {grouped.map(group => (
            <div key={group.day}>
              {/* Séparateur de jour */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-200/70 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {group.day}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map(m => (
                  <div key={m.id} className={`group flex items-end gap-1.5 ${m.est_moi ? 'justify-end' : 'justify-start'}`}>
                    {/* Suppression (mes messages non supprimés) */}
                    {m.est_moi && !m.deleted && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        title="Supprimer"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {m.deleted ? (
                      <div className="px-3.5 py-2 rounded-2xl text-xs italic text-gray-400 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700">
                        Message supprimé
                      </div>
                    ) : m.type === 'devis' && m.devis ? (
                      /* ── Carte devis ── */
                      <div className="max-w-[85%] w-72 rounded-2xl overflow-hidden border border-blue-200 dark:border-blue-800/50 bg-white dark:bg-gray-800 shadow-soft">
                        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wide">Devis</span>
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.devis.statut === 'accepte' ? 'bg-emerald-400/90 text-emerald-950'
                            : m.devis.statut === 'refuse' ? 'bg-red-400/90 text-red-950'
                            : 'bg-white/25'
                          }`}>
                            {m.devis.statut === 'accepte' ? 'Accepté' : m.devis.statut === 'refuse' ? 'Refusé' : 'En attente'}
                          </span>
                        </div>
                        <div className="p-4 space-y-1.5">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.devis.service_nom}</p>
                          <p className="text-xl font-extrabold text-gradient">
                            {Number(m.devis.montant).toLocaleString()} {m.devis.devise || 'FCFA'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            📅 {new Date(`${m.devis.date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {m.devis.heure ? ` à ${m.devis.heure}` : ''}
                          </p>
                          {m.devis.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{m.devis.description}</p>
                          )}

                          {!m.est_moi && m.devis.statut === 'propose' && activeConv.mon_role === 'client' && (
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleRespondDevis(m.id, 'accepte')}
                                disabled={respondingDevis === m.id}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                              >
                                {respondingDevis === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Accepter
                              </button>
                              <button
                                onClick={() => handleRespondDevis(m.id, 'refuse')}
                                disabled={respondingDevis === m.id}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                Refuser
                              </button>
                            </div>
                          )}

                          {m.devis.statut === 'accepte' && (
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Réservation confirmée
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 text-right">{formatTime(m.created_at)}</p>
                        </div>
                      </div>
                    ) : (
                      /* ── Bulle texte / image ── */
                      <div className={`max-w-[75%] rounded-2xl text-sm overflow-hidden ${
                        m.est_moi
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md'
                      }`}>
                        {m.image && (
                          <button onClick={() => setViewerImage(m.image!)} className="block w-full">
                            <img
                              src={m.image}
                              alt="Photo partagée"
                              loading="lazy"
                              className="w-full max-h-64 object-cover hover:opacity-95 transition-opacity"
                            />
                          </button>
                        )}
                        {(m.contenu || !m.image) && (
                          <p className="px-3.5 pt-2 whitespace-pre-wrap break-words">{m.contenu}</p>
                        )}
                        <p className={`px-3.5 pb-1.5 pt-0.5 text-[10px] text-right flex items-center justify-end gap-1 ${
                          m.est_moi ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {formatTime(m.created_at)}
                          {/* Accusé de lecture sur mes messages */}
                          {m.est_moi && (
                            m.id <= luJusqua
                              ? <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                              : <Check className="w-3.5 h-3.5 opacity-70" />
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Indicateur de frappe en bas du fil */}
          {interlocuteurEcrit && (
            <div className="flex justify-start mt-2">
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composeur de devis (prestataire) */}
        <AnimatePresence>
          {devisOpen && activeConv.mon_role === 'prestataire' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Proposer un devis
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={devisForm.service_id}
                    onChange={e => setDevisForm(f => ({ ...f, service_id: Number(e.target.value) }))}
                    className="col-span-2 px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  >
                    {myServices.length === 0 && <option value={0}>Chargement des services…</option>}
                    {myServices.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                  <input
                    type="number"
                    min={1}
                    placeholder="Montant (FCFA)"
                    value={devisForm.montant}
                    onChange={e => setDevisForm(f => ({ ...f, montant: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={devisForm.date}
                    onChange={e => setDevisForm(f => ({ ...f, date: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="time"
                    value={devisForm.heure}
                    onChange={e => setDevisForm(f => ({ ...f, heure: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Précisions (optionnel)"
                    value={devisForm.description}
                    onChange={e => setDevisForm(f => ({ ...f, description: e.target.value }))}
                    className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendDevis}
                    disabled={devisSending || !devisForm.service_id || !devisForm.montant || !devisForm.date}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold disabled:opacity-50 shadow-brand"
                  >
                    {devisSending ? 'Envoi…' : 'Envoyer le devis'}
                  </button>
                  <button
                    onClick={() => setDevisOpen(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aperçu de la photo à envoyer */}
        <AnimatePresence>
          {pendingImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <div className="p-3 flex items-center gap-3">
                <img src={pendingImage} alt="Aperçu" className="w-16 h-16 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700" />
                <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  Photo prête à envoyer — ajoutez une légende si vous voulez.
                </p>
                <button
                  onClick={() => setPendingImage(null)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone de saisie */}
        <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
          {activeConv.mon_role === 'prestataire' && (
            <button
              onClick={() => setDevisOpen(o => !o)}
              title="Proposer un devis"
              className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
                devisOpen
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <FileText className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Envoyer une photo"
            className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
          >
            <ImagePlus className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); notifyTyping(); autoGrow(); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Écrivez votre message…"
            className="flex-1 resize-none px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={(!draft.trim() && !pendingImage) || sending}
            className="p-2.5 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>

        {/* Visionneuse d'image */}
        <AnimatePresence>
          {viewerImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewerImage(null)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm p-4 cursor-zoom-out"
            >
              <img src={viewerImage} alt="Photo" className="max-w-full max-h-full rounded-2xl object-contain" />
              <button className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Vue liste ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-blue-500" />
        Messages
      </h1>

      {/* Recherche de conversation */}
      {conversations.length > 3 && (
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={convSearch}
            onChange={e => setConvSearch(e.target.value)}
            placeholder="Rechercher une conversation…"
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="text-center py-14">
          <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune conversation</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Contactez un prestataire depuis sa fiche pour démarrer une discussion.
          </p>
        </div>
      )}

      <AnimatePresence>
        {filteredConversations.map(conv => (
          <motion.button
            key={conv.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setActiveConv(conv)}
            className="w-full flex items-center gap-3 p-3 mb-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {conv.interlocuteur_nom.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{conv.interlocuteur_nom}</p>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{formatTime(conv.dernier_message_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs truncate ${conv.non_lus > 0 ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                  {conv.dernier_message || 'Nouvelle conversation'}
                </p>
                {conv.non_lus > 0 && (
                  <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {conv.non_lus > 9 ? '9+' : conv.non_lus}
                  </span>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

import express, { Request, Response } from 'express';
import { Conversation, Message, Prestataire, User, Service, Reservation, StatutReservation, HistoriqueReservation } from '../models/index.js';
import { SubCategory } from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';
import { hasSlotConflict } from '../utils/availability.js';
import { saveDataUri } from '../utils/uploads.js';

const router = express.Router();
router.use(requireAuth);

/** Retourne la conversation si l'utilisateur en est participant, avec son rôle dedans */
async function getConversationForUser(conversationId: number, userId: number) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return null;

  if (conversation.client_id === userId) {
    return { conversation, side: 'client' as const };
  }
  const prestataire = await Prestataire.findById(conversation.prestataire_id);
  if (prestataire && prestataire.user_id === userId) {
    return { conversation, side: 'prestataire' as const };
  }
  return null;
}

// POST /api/conversations — démarrer (ou retrouver) une conversation avec un prestataire
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const prestataire_id = Number(req.body?.prestataire_id);
    if (!prestataire_id) return res.status(400).json({ error: 'prestataire_id requis' });

    const prestataire = await Prestataire.findById(prestataire_id);
    if (!prestataire) return res.status(404).json({ error: 'Prestataire introuvable' });
    if (prestataire.user_id === userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas démarrer une conversation avec vous-même' });
    }

    let conversation = await Conversation.findOne({ client_id: userId, prestataire_id });
    if (!conversation) {
      conversation = await Conversation.create({ client_id: userId, prestataire_id });
    }

    res.status(201).json({ id: conversation._id });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/conversations — mes conversations (côté client et côté prestataire)
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const myPrestataire = await Prestataire.findOne({ user_id: userId });

    const or: any[] = [{ client_id: userId }];
    if (myPrestataire) or.push({ prestataire_id: myPrestataire._id });

    const conversations = await Conversation.find({ $or: or }).sort({ dernier_message_at: -1, updated_at: -1 });

    // Enrichissement groupé : nom de l'interlocuteur selon le côté
    const prestataireIds = [...new Set(conversations.map(c => c.prestataire_id))];
    const clientIds = [...new Set(conversations.map(c => c.client_id))];
    const [prestataires, clients] = await Promise.all([
      Prestataire.find({ _id: { $in: prestataireIds } }).select('nom_commercial user_id'),
      User.find({ _id: { $in: clientIds } }).select('nom prenom photo_profil'),
    ]);
    const prestataireById = new Map(prestataires.map(p => [p._id as number, p]));
    const clientById = new Map(clients.map(c => [c._id as number, c]));

    const results = conversations.map(c => {
      const isClientSide = c.client_id === userId;
      const prestataire = prestataireById.get(c.prestataire_id);
      const client = clientById.get(c.client_id);
      return {
        ...c.toJSON(),
        mon_role: isClientSide ? 'client' : 'prestataire',
        interlocuteur_nom: isClientSide
          ? (prestataire?.nom_commercial || 'Prestataire')
          : `${client?.prenom || ''} ${client?.nom || ''}`.trim() || 'Client',
        non_lus: isClientSide ? c.non_lus_client : c.non_lus_prestataire,
      };
    });

    res.json(results);
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/conversations/unread-count — badge global
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const myPrestataire = await Prestataire.findOne({ user_id: userId });

    const [asClient, asPrestataire] = await Promise.all([
      Conversation.aggregate([
        { $match: { client_id: userId } },
        { $group: { _id: null, total: { $sum: '$non_lus_client' } } },
      ]),
      myPrestataire
        ? Conversation.aggregate([
            { $match: { prestataire_id: myPrestataire._id } },
            { $group: { _id: null, total: { $sum: '$non_lus_prestataire' } } },
          ])
        : Promise.resolve([] as any[]),
    ]);

    const count = (asClient[0]?.total || 0) + (asPrestataire[0]?.total || 0);
    res.json({ count });
  } catch (e: any) {
    serverError(res, e);
  }
});

// Indicateur "en train d'écrire" (éphémère, en mémoire)
const typingState = new Map<string, number>(); // `${convId}:${userId}` → timestamp
const TYPING_TTL_MS = 6000;

function isOtherTyping(conversationId: number, myUserId: number): boolean {
  const now = Date.now();
  for (const [key, at] of typingState) {
    if (now - at > TYPING_TTL_MS) {
      typingState.delete(key);
      continue;
    }
    const [convId, uid] = key.split(':').map(Number);
    if (convId === conversationId && uid !== myUserId) return true;
  }
  return false;
}

// POST /api/conversations/:id/typing — signaler que je suis en train d'écrire
router.post('/:id/typing', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    typingState.set(`${found.conversation._id}:${userId}`, Date.now());
    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/conversations/:id/messages?after_id= — messages (incrémental) + marquage lu
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    const { conversation, side } = found;

    const afterId = Number(req.query.after_id) || 0;
    const query: any = { conversation_id: conversation._id };
    if (afterId > 0) query._id = { $gt: afterId };

    const messages = await Message.find(query).sort({ _id: 1 }).limit(afterId > 0 ? 200 : 500);

    // Marquer comme lus les messages de l'autre partie
    await Promise.all([
      Message.updateMany(
        { conversation_id: conversation._id, sender_user_id: { $ne: userId }, lu: false },
        { lu: true }
      ),
      Conversation.updateOne(
        { _id: conversation._id },
        side === 'client' ? { non_lus_client: 0 } : { non_lus_prestataire: 0 }
      ),
    ]);

    // Jusqu'où l'interlocuteur a lu MES messages (pour les ✓✓)
    const lastRead = await Message.findOne({
      conversation_id: conversation._id,
      sender_user_id: userId,
      lu: true,
    }).sort({ _id: -1 }).select('_id');

    res.json({
      messages: messages.map(m => ({ ...m.toJSON(), est_moi: m.sender_user_id === userId })),
      mes_messages_lus_jusqua: (lastRead?._id as number) || 0,
      interlocuteur_ecrit: isOtherTyping(conversation._id as number, userId),
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/conversations/:id/messages — envoyer un message (texte et/ou photo)
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const contenu = String(req.body?.contenu || '').trim();
    const imageInput = req.body?.image;
    if (!contenu && !imageInput) return res.status(400).json({ error: 'Message vide' });
    if (contenu.length > 2000) return res.status(400).json({ error: 'Message trop long (2000 caractères max)' });

    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    const { conversation, side } = found;

    // Photo : base64 → fichier /uploads
    let imageUrl: string | null = null;
    if (imageInput && typeof imageInput === 'string') {
      try {
        imageUrl = await saveDataUri(imageInput);
      } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Image invalide' });
      }
    }

    const message = await Message.create({
      conversation_id: conversation._id as number,
      sender_user_id: userId,
      contenu,
      type: imageUrl ? 'image' : 'text',
      image: imageUrl,
    });

    // L'expéditeur a forcément lu tout ce qui précède
    typingState.delete(`${conversation._id}:${userId}`);

    const unreadField = side === 'client' ? 'non_lus_prestataire' : 'non_lus_client';
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        dernier_message: imageUrl ? `📷 Photo${contenu ? ` — ${contenu.slice(0, 100)}` : ''}` : contenu.slice(0, 120),
        dernier_message_at: new Date(),
        updated_at: new Date(),
        $inc: { [unreadField]: 1 },
      }
    );

    // Notification in-app pour le destinataire (best-effort)
    try {
      let recipientUserId: number | null = null;
      let senderName = 'Nouveau message';
      if (side === 'client') {
        const prestataire = await Prestataire.findById(conversation.prestataire_id);
        recipientUserId = prestataire?.user_id ?? null;
        const sender = await User.findById(userId).select('nom prenom');
        senderName = `${sender?.prenom || ''} ${sender?.nom || ''}`.trim() || 'Un client';
      } else {
        recipientUserId = conversation.client_id;
        const prestataire = await Prestataire.findById(conversation.prestataire_id).select('nom_commercial');
        senderName = prestataire?.nom_commercial || 'Un prestataire';
      }
      if (recipientUserId) {
        await InAppNotificationService.createCustom(
          recipientUserId,
          `💬 Message de ${senderName}`,
          imageUrl ? '📷 Photo' : contenu.slice(0, 120),
          'info'
        );
      }
    } catch { /* ne pas bloquer l'envoi pour une notif */ }

    res.status(201).json({ ...message.toJSON(), est_moi: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// DELETE /api/conversations/:id/messages/:messageId — supprimer son propre message
router.delete('/:id/messages/:messageId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    const { conversation } = found;

    const message = await Message.findOne({ _id: Number(req.params.messageId), conversation_id: conversation._id });
    if (!message) return res.status(404).json({ error: 'Message introuvable' });
    if (message.sender_user_id !== userId) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres messages' });
    }
    if (message.type === 'devis' && (message.devis as any)?.statut === 'accepte') {
      return res.status(400).json({ error: 'Impossible de supprimer un devis accepté' });
    }

    const wasLast = conversation.dernier_message_at &&
      Math.abs(new Date(message.created_at).getTime() - new Date(conversation.dernier_message_at).getTime()) < 2000;

    await Message.updateOne(
      { _id: message._id },
      { deleted: true, contenu: '', image: null, devis: null, type: 'text' }
    );
    if (wasLast) {
      await Conversation.updateOne({ _id: conversation._id }, { dernier_message: 'Message supprimé' });
    }

    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/conversations/:id/devis — le prestataire propose un devis structuré
router.post('/:id/devis', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    const { conversation, side } = found;
    if (side !== 'prestataire') {
      return res.status(403).json({ error: 'Seul le prestataire peut proposer un devis' });
    }

    const { service_id, montant, date, heure, description } = req.body || {};
    if (!service_id || !montant || !date) {
      return res.status(400).json({ error: 'service_id, montant et date sont requis' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'Date invalide (format YYYY-MM-DD)' });
    }
    const montantNum = Number(montant);
    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    const service = await Service.findOne({ _id: Number(service_id), prestataire_id: conversation.prestataire_id });
    if (!service) return res.status(404).json({ error: 'Ce service ne vous appartient pas' });

    const message = await Message.create({
      conversation_id: conversation._id as number,
      sender_user_id: userId,
      contenu: `📋 Devis : ${service.nom} — ${montantNum.toLocaleString()} ${service.devise || 'FCFA'}`,
      type: 'devis',
      devis: {
        service_id: service._id,
        service_nom: service.nom,
        devise: service.devise || 'FCFA',
        montant: montantNum,
        date: String(date),
        heure: heure || null,
        description: description || null,
        statut: 'propose',
      },
    });

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        dernier_message: '📋 Devis proposé',
        dernier_message_at: new Date(),
        updated_at: new Date(),
        $inc: { non_lus_client: 1 },
      }
    );

    try {
      const prestataire = await Prestataire.findById(conversation.prestataire_id).select('nom_commercial');
      await InAppNotificationService.createCustom(
        conversation.client_id,
        '📋 Nouveau devis reçu',
        `${prestataire?.nom_commercial || 'Un prestataire'} vous propose ${service.nom} à ${montantNum.toLocaleString()} ${service.devise || 'FCFA'}`,
        'info'
      );
    } catch { /* non bloquant */ }

    res.status(201).json({ ...message.toJSON(), est_moi: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/conversations/:id/devis/:messageId — le client accepte ou refuse un devis
router.put('/:id/devis/:messageId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const found = await getConversationForUser(Number(req.params.id), userId);
    if (!found) return res.status(404).json({ error: 'Conversation introuvable' });
    const { conversation, side } = found;
    if (side !== 'client') {
      return res.status(403).json({ error: 'Seul le client peut répondre à un devis' });
    }

    const action = String(req.body?.action || '');
    if (!['accepte', 'refuse'].includes(action)) {
      return res.status(400).json({ error: "action doit être 'accepte' ou 'refuse'" });
    }

    const message = await Message.findOne({ _id: Number(req.params.messageId), conversation_id: conversation._id, type: 'devis' });
    if (!message || !message.devis) return res.status(404).json({ error: 'Devis introuvable' });
    if ((message.devis as any).statut !== 'propose') {
      return res.status(400).json({ error: 'Ce devis a déjà reçu une réponse' });
    }

    const devis = message.devis as any;

    if (action === 'refuse') {
      await Message.updateOne({ _id: message._id }, { devis: { ...devis, statut: 'refuse' } });
      res.json({ ok: true, statut: 'refuse' });
    } else {
      // Acceptation → création de la réservation déjà confirmée
      const service = await Service.findById(devis.service_id);
      if (!service) return res.status(404).json({ error: 'Service introuvable' });

      // Anti double-booking si un créneau est précisé
      let heure_fin: string | undefined;
      if (devis.heure) {
        const startTime = new Date(`${devis.date}T${devis.heure}`);
        const endTime = new Date(startTime.getTime() + service.duree_minutes * 60000);
        heure_fin = endTime.toTimeString().slice(0, 5);
        const conflict = await hasSlotConflict(conversation.prestataire_id, startTime, devis.heure, heure_fin);
        if (conflict) {
          return res.status(409).json({ error: 'Ce créneau n\'est plus disponible. Demandez un nouveau devis.' });
        }
      }

      const confirmee = await StatutReservation.findOne({ nom: 'confirmee' });
      if (!confirmee) return res.status(500).json({ error: 'Statut confirmee introuvable' });

      const subCat = await SubCategory.findById(service.sous_categorie_id);
      const reservation = await Reservation.create({
        client_id: userId,
        prestataire_id: conversation.prestataire_id,
        service_id: service._id as number,
        booking_type: (subCat as any)?.booking_type === 'order' ? 'order' : 'appointment',
        statut_id: confirmee._id as number,
        date_reservation: new Date(devis.date),
        heure_debut: devis.heure || undefined,
        heure_fin,
        prix_final: devis.montant,
        prix_total: devis.montant,
        quantite: 1,
        notes_client: devis.description ? `Devis accepté : ${devis.description}` : 'Devis accepté via messagerie',
      });
      await HistoriqueReservation.create({
        reservation_id: reservation._id as number,
        nouveau_statut_id: confirmee._id as number,
        commentaire: 'Réservation créée par acceptation de devis',
        changed_by_user_id: userId,
      });

      await Message.updateOne({ _id: message._id }, { devis: { ...devis, statut: 'accepte', reservation_id: reservation._id } });

      try {
        const prestataire = await Prestataire.findById(conversation.prestataire_id).select('user_id');
        const client = await User.findById(userId).select('nom prenom');
        if (prestataire?.user_id) {
          await InAppNotificationService.createCustom(
            prestataire.user_id,
            '✅ Devis accepté !',
            `${client?.prenom || 'Le client'} a accepté votre devis (${Number(devis.montant).toLocaleString()} ${devis.devise || 'FCFA'}). Réservation confirmée.`,
            'success'
          );
        }
      } catch { /* non bloquant */ }

      res.json({ ok: true, statut: 'accepte', reservation_id: reservation._id });
    }
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;

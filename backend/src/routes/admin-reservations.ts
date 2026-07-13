import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Reservation, StatutReservation, User, Prestataire, Service, Avis, Notification } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/reservations
// La recherche texte (nom/email client, prestataire, service) porte sur des champs
// répartis sur 3 collections différentes (User, Prestataire, Service). On résout
// d'abord les ids qui matchent le texte, puis on filtre les réservations sur ces
// ids — la pagination reste 100% serveur, contrairement à un filtre appliqué
// après un `.limit()` qui perdrait des résultats situés sur d'autres pages.
router.get('/', async (req, res) => {
  try {
    const { statut = 'all', search = '', page = 1, limit = 20, date_debut, date_fin, date_filter, prestataire_id, client_id } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (statut !== 'all') {
      const statutDoc = await StatutReservation.findOne({ nom: String(statut) });
      if (statutDoc) filter.statut_id = statutDoc._id;
    }
    if (date_debut) filter.date_reservation = { ...filter.date_reservation, $gte: new Date(date_debut as string) };
    if (date_fin) filter.date_reservation = { ...filter.date_reservation, $lte: new Date(date_fin as string) };
    if (date_filter && date_filter !== 'all') {
      const now = new Date();
      if (date_filter === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        filter.date_reservation = { $gte: start, $lte: end };
      } else if (date_filter === 'week') {
        const end = new Date(now); end.setDate(end.getDate() + 7);
        filter.date_reservation = { $gte: now, $lte: end };
      } else if (date_filter === 'month') {
        const end = new Date(now); end.setMonth(end.getMonth() + 1);
        filter.date_reservation = { $gte: now, $lte: end };
      }
    }
    if (prestataire_id) filter.prestataire_id = parseInt(prestataire_id as string);
    if (client_id) filter.client_id = parseInt(client_id as string);

    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [matchingClients, matchingPrestataires, matchingServices] = await Promise.all([
        User.find({ $or: [{ nom: rx }, { prenom: rx }, { email: rx }] }).select('_id'),
        Prestataire.find({ nom_commercial: rx }).select('_id'),
        Service.find({ nom: rx }).select('_id'),
      ]);
      filter.$or = [
        { client_id: { $in: matchingClients.map(c => c._id) } },
        { prestataire_id: { $in: matchingPrestataires.map(p => p._id) } },
        { service_id: { $in: matchingServices.map(s => s._id) } },
      ];
    }

    const [reservations, total] = await Promise.all([
      Reservation.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      Reservation.countDocuments(filter)
    ]);

    const results = await Promise.all(reservations.map(async (r) => {
      const [client, prestataire, service, avis] = await Promise.all([
        User.findById(r.client_id).select('nom prenom email telephone'),
        Prestataire.findById(r.prestataire_id).select('nom_commercial user_id'),
        Service.findById(r.service_id).select('nom prix'),
        Avis.findOne({ reservation_id: r._id })
      ]);
      const prestUser = prestataire?.user_id ? await User.findById(prestataire.user_id).select('email') : null;
      return {
        ...r.toJSON(),
        client_nom: client?.nom || null,
        client_prenom: client?.prenom || null,
        client_email: client?.email || null,
        client_telephone: client?.telephone || null,
        prestataire_nom: prestataire?.nom_commercial || null,
        prestataire_email: prestUser?.email || null,
        service_nom: service?.nom || null,
        service_prix: service?.prix || null,
        has_avis: !!avis,
        avis_note: avis?.note || null,
        avis_commentaire: avis?.commentaire || null
      };
    }));

    const totalPages = Math.ceil(total / limitNum);
    res.json({ reservations: results, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/reservations/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const allStatuts = await StatutReservation.find();
    const statutMap: Record<string, number> = {};
    allStatuts.forEach(s => { statutMap[s.nom] = s._id as number; });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const next30 = new Date(now); next30.setDate(next30.getDate() + 30);

    const [all, terminees, annulees, todayCount, next30Count] = await Promise.all([
      Reservation.find().select('statut_id prix_final created_at'),
      Reservation.find({ statut_id: statutMap['terminee'] }).select('prix_final'),
      Reservation.find({ statut_id: statutMap['annulee'] }).select('_id'),
      Reservation.countDocuments({ date_reservation: { $gte: todayStart, $lte: todayEnd } }),
      Reservation.countDocuments({ date_reservation: { $gte: now, $lte: next30 } }),
    ]);

    const en_attente = all.filter(r => r.statut_id === statutMap['en_attente']).length;
    const confirmees = all.filter(r => r.statut_id === statutMap['confirmee']).length;
    const revenus_totaux = terminees.reduce((s, r) => s + (r.prix_final || 0), 0);
    const panier_moyen = terminees.length > 0 ? revenus_totaux / terminees.length : 0;
    const nouvelles_ce_mois = all.filter(r => r.created_at >= thirtyDaysAgo).length;
    const taux_completion = all.length > 0 ? Math.round((terminees.length / all.length) * 100) : 0;

    res.json({
      overview: {
        total_reservations: all.length,
        en_attente,
        confirmees,
        terminees: terminees.length,
        annulees: annulees.length,
        nouvelles_ce_mois,
        revenus_totaux,
        panier_moyen,
        today_count: todayCount,
        next_30_jours: next30Count,
        taux_completion,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/reservations/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ error: 'Réservation non trouvée' });

    const [client, prestataire, service, avis] = await Promise.all([
      User.findById(r.client_id).select('nom email telephone'),
      Prestataire.findById(r.prestataire_id).select('nom_commercial user_id'),
      Service.findById(r.service_id).select('nom description prix duree'),
      Avis.findOne({ reservation_id: r._id })
    ]);
    const prestUser = prestataire?.user_id ? await User.findById(prestataire.user_id).select('email telephone') : null;

    res.json({
      ...r.toJSON(),
      client_nom: client?.nom || null,
      client_email: client?.email || null,
      client_telephone: client?.telephone || null,
      prestataire_nom: prestataire?.nom_commercial || null,
      prestataire_email: prestUser?.email || null,
      prestataire_telephone: prestUser?.telephone || null,
      service_nom: service?.nom || null,
      service_description: service?.description || null,
      service_prix: service?.prix || null,
      service_duree: service?.duree || null,
      has_avis: !!avis,
      avis_note: avis?.note || null,
      avis_commentaire: avis?.commentaire || null,
      avis_date: avis?.created_at || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/reservations/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { statut, reason } = req.body;

    const validStatuts = ['en_attente', 'confirmee', 'terminee', 'annulee'];
    if (!validStatuts.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });

    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ error: 'Réservation non trouvée' });

    const statutDoc = await StatutReservation.findOne({ nom: statut });
    if (!statutDoc) return res.status(400).json({ error: 'Statut introuvable' });

    const [service] = await Promise.all([Service.findById(r.service_id).select('nom')]);
    await Reservation.updateOne({ _id: id }, { statut_id: statutDoc._id, updated_at: new Date() });

    const prestataire = await Prestataire.findById(r.prestataire_id).select('user_id');
    const notifData = JSON.stringify({ reservation_id: id, new_status: statut, reason: reason || 'Modification administrative' });
    const notifs = [
      { user_id: r.client_id, titre: 'Statut de réservation modifié', message: `Le statut de votre réservation "${service?.nom}" a été modifié par un administrateur.`, data: notifData },
      { user_id: prestataire?.user_id || r.prestataire_id, titre: 'Statut de réservation modifié', message: `Le statut de la réservation "${service?.nom}" a été modifié par un administrateur.`, data: notifData }
    ];
    await Promise.all(notifs.map(n => Notification.create({ ...n, type: 'reservation_status_changed', is_read: false })));

    res.json({ success: true, message: `Statut de la réservation modifié vers "${statut}"` });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/reservations/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const r = await Reservation.findById(id);
    if (!r) return res.status(404).json({ error: 'Réservation non trouvée' });

    const termineeStatut = await StatutReservation.findOne({ nom: 'terminee' });
    if (termineeStatut && r.statut_id === termineeStatut._id) {
      return res.status(400).json({ error: 'Impossible de supprimer une réservation terminée' });
    }

    const [service, prestataire] = await Promise.all([
      Service.findById(r.service_id).select('nom'),
      Prestataire.findById(r.prestataire_id).select('user_id')
    ]);

    await Avis.deleteMany({ reservation_id: id });
    await Reservation.deleteOne({ _id: id });

    const notifMsg = reason ? `Raison: ${reason}` : '';
    const notifData = JSON.stringify({ service_nom: service?.nom, reason });
    await Promise.all([
      Notification.create({ user_id: r.client_id, type: 'reservation_deleted', titre: 'Réservation supprimée', message: `Votre réservation "${service?.nom}" a été supprimée par un administrateur. ${notifMsg}`, data: notifData, is_read: false }),
      Notification.create({ user_id: prestataire?.user_id || r.prestataire_id, type: 'reservation_deleted', titre: 'Réservation supprimée', message: `La réservation "${service?.nom}" a été supprimée par un administrateur. ${notifMsg}`, data: notifData, is_read: false })
    ]);

    res.json({ success: true, message: 'Réservation supprimée' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

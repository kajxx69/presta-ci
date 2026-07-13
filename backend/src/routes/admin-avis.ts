import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Avis, Reservation, User, Prestataire, Service, Notification } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/avis
// La recherche texte porte sur des champs répartis sur 3 collections (User,
// Prestataire via Reservation, Service) : on résout d'abord les ids qui
// matchent, puis on filtre les avis sur ces ids — la pagination reste 100%
// serveur (un filtre appliqué après un `.limit()` perdrait des résultats).
router.get('/', async (req, res) => {
  try {
    const { status = 'all', search = '', page = 1, limit = 20, note_min, note_max, prestataire_id, service_id } = req.query;
    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status === 'rejected' || status === 'pending') filter.is_visible = false;
    else if (status === 'approved') filter.is_visible = true;
    if (note_min) filter.note = { ...filter.note, $gte: Number(note_min) };
    if (note_max) filter.note = { ...filter.note, $lte: Number(note_max) };
    if (prestataire_id) filter.prestataire_id = parseInt(prestataire_id as string);
    if (service_id) filter.service_id = parseInt(service_id as string);

    if (search) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [matchingClients, matchingServices, matchingPrestataires] = await Promise.all([
        User.find({ $or: [{ nom: rx }, { prenom: rx }, { email: rx }] }).select('_id'),
        Service.find({ nom: rx }).select('_id'),
        Prestataire.find({ nom_commercial: rx }).select('_id'),
      ]);
      const matchingReservations = await Reservation.find({ prestataire_id: { $in: matchingPrestataires.map(p => p._id) } }).select('_id');
      filter.$or = [
        { client_id: { $in: matchingClients.map(c => c._id) } },
        { service_id: { $in: matchingServices.map(s => s._id) } },
        { reservation_id: { $in: matchingReservations.map(r => r._id) } },
        { commentaire: rx },
      ];
    }

    const [avisList, total] = await Promise.all([
      Avis.find(filter).sort({ created_at: -1 }).skip(offset).limit(limitNum),
      Avis.countDocuments(filter)
    ]);

    const results = await Promise.all(avisList.map(async (a) => {
      const [client, service, reservation] = await Promise.all([
        User.findById(a.client_id).select('nom prenom email'),
        a.service_id ? Service.findById(a.service_id).select('nom') : null,
        Reservation.findById(a.reservation_id).select('prestataire_id')
      ]);
      const prestataire = reservation ? await Prestataire.findById(reservation.prestataire_id).select('user_id') : null;
      const prestUser = prestataire?.user_id ? await User.findById(prestataire.user_id).select('nom email') : null;
      return {
        ...a.toJSON(),
        client_nom: client?.nom || null,
        client_prenom: client?.prenom || null,
        client_email: client?.email || null,
        prestataire_nom: prestUser?.nom || null,
        prestataire_email: prestUser?.email || null,
        service_nom: service?.nom || null
      };
    }));

    const totalPages = Math.ceil(total / limitNum);
    res.json({ avis: results, pagination: { page: pageNum, limit: limitNum, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/avis/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const all = await Avis.find().select('note is_visible created_at');
    const total = all.length;
    const approuves = all.filter(a => a.is_visible).length;
    const rejetes = total - approuves;
    const nouveaux = all.filter(a => a.created_at >= thirtyDaysAgo).length;
    const note_moyenne = total > 0 ? all.reduce((s, a) => s + a.note, 0) / total : 0;
    const notes_5 = all.filter(a => a.note === 5).length;
    const notes_1 = all.filter(a => a.note === 1).length;

    const distrib = [1, 2, 3, 4, 5].map(n => {
      const count = all.filter(a => a.is_visible && a.note === n).length;
      return { note: n, nombre_avis: count, pourcentage: total > 0 ? parseFloat((count * 100 / total).toFixed(2)) : 0 };
    }).reverse();

    res.json({
      overview: { total_avis: total, approuves, rejetes, nouveaux_ce_mois: nouveaux, note_moyenne_globale: parseFloat(note_moyenne.toFixed(1)), notes_5_etoiles: notes_5, notes_1_etoile: notes_1 },
      notesDistribution: distrib
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/avis/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const a = await Avis.findById(id);
    if (!a) return res.status(404).json({ error: 'Avis non trouvé' });

    const [client, service, reservation] = await Promise.all([
      User.findById(a.client_id).select('nom email telephone'),
      a.service_id ? Service.findById(a.service_id).select('nom description') : null,
      Reservation.findById(a.reservation_id).select('prestataire_id date_reservation prix_final')
    ]);
    const prestataire = reservation ? await Prestataire.findById(reservation.prestataire_id).select('user_id') : null;
    const prestUser = prestataire?.user_id ? await User.findById(prestataire.user_id).select('nom email telephone') : null;

    res.json({
      ...a.toJSON(),
      client_nom: client?.nom || null, client_email: client?.email || null, client_telephone: client?.telephone || null,
      prestataire_nom: prestUser?.nom || null, prestataire_email: prestUser?.email || null, prestataire_telephone: prestUser?.telephone || null,
      service_nom: service?.nom || null, service_description: service?.description || null,
      date_reservation: reservation?.date_reservation || null, prix_final: reservation?.prix_final || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/admin/avis/:id/moderate
router.put('/:id/moderate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { is_approved, reason } = req.body;
    if (typeof is_approved !== 'boolean') return res.status(400).json({ error: 'is_approved doit être un booléen' });

    const a = await Avis.findById(id);
    if (!a) return res.status(404).json({ error: 'Avis non trouvé' });

    const reservation = await Reservation.findById(a.reservation_id).select('prestataire_id');
    const service = a.service_id ? await Service.findById(a.service_id).select('nom') : null;

    await Avis.updateOne({ _id: id }, { is_visible: is_approved, updated_at: new Date() });

    const notifMsg = is_approved
      ? `Votre avis sur "${service?.nom}" a été approuvé et est maintenant visible.`
      : `Votre avis sur "${service?.nom}" a été rejeté. Raison: ${reason || "Non conforme aux conditions d'utilisation"}`;

    await Notification.create({
      user_id: a.client_id, type: is_approved ? 'avis_approved' : 'avis_rejected',
      titre: is_approved ? 'Avis approuvé' : 'Avis rejeté', message: notifMsg,
      data: JSON.stringify({ avis_id: id, service_nom: service?.nom, reason: reason || null }), is_read: false
    });

    if (is_approved && reservation?.prestataire_id) {
      const prestataire = await Prestataire.findById(reservation.prestataire_id).select('user_id');
      if (prestataire?.user_id) {
        await Notification.create({
          user_id: prestataire.user_id, type: 'new_avis', titre: 'Nouvel avis approuvé',
          message: `Un nouvel avis ${a.note}/5 étoiles a été publié sur votre service "${service?.nom}".`,
          data: JSON.stringify({ avis_id: id, service_nom: service?.nom, note: a.note }), is_read: false
        });
      }
    }

    res.json({ success: true, message: is_approved ? 'Avis approuvé' : 'Avis rejeté' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/admin/avis/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const a = await Avis.findById(id);
    if (!a) return res.status(404).json({ error: 'Avis non trouvé' });

    const [service, reservation] = await Promise.all([
      a.service_id ? Service.findById(a.service_id).select('nom') : null,
      Reservation.findById(a.reservation_id).select('prestataire_id')
    ]);
    const prestataire = reservation ? await Prestataire.findById(reservation.prestataire_id).select('user_id') : null;

    await Avis.deleteOne({ _id: id });

    const notifData = JSON.stringify({ service_nom: service?.nom, reason });
    const notifReason = reason || "Violation des conditions d'utilisation";
    await Promise.all([
      Notification.create({ user_id: a.client_id, type: 'avis_deleted', titre: 'Avis supprimé', message: `Votre avis sur "${service?.nom}" a été supprimé. Raison: ${notifReason}`, data: notifData, is_read: false }),
      prestataire?.user_id ? Notification.create({ user_id: prestataire.user_id, type: 'avis_deleted', titre: 'Avis supprimé', message: `Un avis sur votre service "${service?.nom}" a été supprimé par un administrateur.`, data: notifData, is_read: false }) : null
    ]);

    res.json({ success: true, message: 'Avis supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/avis/bulk-moderate
router.post('/bulk-moderate', async (req, res) => {
  try {
    const { avis_ids, is_approved, reason } = req.body;
    if (!Array.isArray(avis_ids) || avis_ids.length === 0) return res.status(400).json({ error: "Liste d'IDs d'avis requise" });
    if (typeof is_approved !== 'boolean') return res.status(400).json({ error: 'is_approved doit être un booléen' });

    const avisList = await Avis.find({ _id: { $in: avis_ids } });
    if (avisList.length !== avis_ids.length) return res.status(400).json({ error: "Certains avis n'existent pas" });

    await Avis.updateMany({ _id: { $in: avis_ids } }, { is_visible: is_approved, updated_at: new Date() });

    await Promise.all(avisList.map(async (a) => {
      const service = a.service_id ? await Service.findById(a.service_id).select('nom') : null;
      const msg = is_approved
        ? `Votre avis sur "${service?.nom}" a été approuvé et est maintenant visible.`
        : `Votre avis sur "${service?.nom}" a été rejeté. Raison: ${reason || "Non conforme aux conditions d'utilisation"}`;
      return Notification.create({ user_id: a.client_id, type: is_approved ? 'avis_approved' : 'avis_rejected', titre: is_approved ? 'Avis approuvé' : 'Avis rejeté', message: msg, data: JSON.stringify({ service_nom: service?.nom, reason: reason || null }), is_read: false });
    }));

    res.json({ success: true, message: `${avis_ids.length} avis ${is_approved ? 'approuvés' : 'rejetés'}` });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

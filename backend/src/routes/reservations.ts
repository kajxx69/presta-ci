import express, { Request, Response } from 'express';
import { Reservation, StatutReservation, HistoriqueReservation, Service, Prestataire, Avis, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reservations?filter=all|upcoming|completed|cancelled
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const filter = String(req.query.filter || 'all');

    // Build statut name filter
    let statutNames: string[] = [];
    if (filter === 'upcoming') statutNames = ['en_attente', 'confirmee', 'acceptee'];
    else if (filter === 'completed') statutNames = ['terminee'];
    else if (filter === 'cancelled') statutNames = ['annulee', 'refusee'];

    // Get statut IDs for filter
    let statutFilter: any = {};
    if (statutNames.length > 0) {
      const statuts = await StatutReservation.find({ nom: { $in: statutNames } });
      const statutIds = statuts.map(s => s._id);
      statutFilter = { statut_id: { $in: statutIds } };
    }

    const reservations = await Reservation.find({ client_id: userId, ...statutFilter })
      .sort({ date_reservation: -1, heure_debut: -1 });

    // Enrich with related data
    const results = await Promise.all(reservations.map(async (r) => {
      const statut = await StatutReservation.findById(r.statut_id);
      const service = await Service.findById(r.service_id);
      const prestataire = await Prestataire.findById(r.prestataire_id);

      const rObj: any = r.toJSON();
      // Format date_reservation as YYYY-MM-DD string
      if (rObj.date_reservation instanceof Date) {
        rObj.date_reservation = rObj.date_reservation.toISOString().split('T')[0];
      }
      const a_laisse_avis = !!(await Avis.exists({ reservation_id: r._id }));
      return {
        ...rObj,
        statut_nom: statut?.nom || null,
        statut_couleur: statut?.couleur || null,
        service_nom: service?.nom || null,
        devise: service?.devise || null,
        duree_minutes: service?.duree_minutes || null,
        prestataire_nom: prestataire?.nom_commercial || null,
        prestataire_adresse: prestataire?.adresse || null,
        prestataire_telephone: prestataire?.telephone_pro || null,
        a_laisse_avis,
        peut_confirmer_fin: statut?.nom === 'en_attente_confirmation'
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/reservations/:id/cancel
router.put('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);

    const reservation = await Reservation.findOne({ _id: id, client_id: userId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const statut = await StatutReservation.findById(reservation.statut_id);
    if (['terminee', 'annulee', 'refusee'].includes(statut?.nom || '')) {
      return res.status(400).json({ error: 'Réservation non annulable' });
    }

    const cancelledStatut = await StatutReservation.findOne({ nom: 'annulee' });
    if (!cancelledStatut) return res.status(500).json({ error: 'Statut annulee introuvable' });

    await Reservation.updateOne({ _id: id }, { statut_id: cancelledStatut._id as number, updated_at: new Date() });
    await HistoriqueReservation.create({
      reservation_id: id,
      ancien_statut_id: reservation.statut_id,
      nouveau_statut_id: cancelledStatut._id as number,
      commentaire: 'Annulation par le client',
      changed_by_user_id: userId
    });

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/reservations/:id/confirm-completion — le client confirme que la prestation est terminée
router.put('/:id/confirm-completion', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = Number(req.params.id);

    const reservation = await Reservation.findOne({ _id: id, client_id: userId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const statut = await StatutReservation.findById(reservation.statut_id);
    if (statut?.nom !== 'en_attente_confirmation') {
      return res.status(400).json({ error: 'Cette réservation n\'est pas en attente de confirmation' });
    }

    let termineeStatut = await StatutReservation.findOne({ nom: 'terminee' });
    if (!termineeStatut) return res.status(500).json({ error: 'Statut terminee introuvable' });

    await Reservation.updateOne({ _id: id }, { statut_id: termineeStatut._id as number, updated_at: new Date() });
    await HistoriqueReservation.create({
      reservation_id: id,
      ancien_statut_id: reservation.statut_id,
      nouveau_statut_id: termineeStatut._id as number,
      commentaire: 'Prestation confirmée par le client',
      changed_by_user_id: userId
    });

    res.json({ ok: true, message: 'Prestation confirmée. Vous pouvez maintenant laisser un avis.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/reservations
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { service_id, date_reservation, heure_debut, notes_client, a_domicile, adresse_rdv, publication_id } = req.body;

    const service = await Service.findOne({ _id: service_id, is_active: true });
    if (!service) return res.status(404).json({ error: 'Service introuvable ou inactif' });

    // Vérification de réputation: si le client a une mauvaise note (< 2.5) et le prestataire est bien noté (≥ 4)
    const clientUser = await User.findById(userId).select('note_moyenne_client nombre_avis_client');
    const prestataire = await Prestataire.findById(service.prestataire_id).select('note_moyenne nombre_avis');
    if (
      clientUser &&
      (clientUser as any).note_moyenne_client !== null &&
      (clientUser as any).nombre_avis_client >= 3 &&
      (clientUser as any).note_moyenne_client < 2.5 &&
      prestataire &&
      prestataire.note_moyenne >= 4 &&
      prestataire.nombre_avis >= 5
    ) {
      return res.status(403).json({
        error: 'Votre réputation sur la plateforme ne vous permet pas de réserver chez ce prestataire très bien noté. Améliorez votre comportement pour accéder à ces prestataires.'
      });
    }

    // Calculate end time
    const startTime = new Date(`${date_reservation}T${heure_debut}`);
    const endTime = new Date(startTime.getTime() + service.duree_minutes * 60000);
    const heure_fin = endTime.toTimeString().slice(0, 5);

    const enAttenteStatut = await StatutReservation.findOne({ nom: 'en_attente' });
    if (!enAttenteStatut) return res.status(500).json({ error: 'Statut par défaut introuvable' });

    const reservation = await Reservation.create({
      client_id: userId,
      prestataire_id: service.prestataire_id,
      service_id,
      statut_id: enAttenteStatut._id as number,
      date_reservation: new Date(date_reservation),
      heure_debut,
      heure_fin,
      prix_final: service.prix,
      notes_client,
      a_domicile,
      adresse_rdv: a_domicile ? adresse_rdv : undefined,
      publication_id: publication_id || null
    });

    await HistoriqueReservation.create({
      reservation_id: reservation._id as number,
      nouveau_statut_id: enAttenteStatut._id as number,
      commentaire: 'Création de la réservation',
      changed_by_user_id: userId
    });

    res.status(201).json({ id: reservation._id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

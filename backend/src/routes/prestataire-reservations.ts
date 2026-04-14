import { Router, Request, Response } from 'express';
import { Reservation, StatutReservation, HistoriqueReservation, Service, Prestataire, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { ClientNotifications } from '../services/notifications.js';
import { ClientInAppNotifications } from '../services/in-app-notifications.js';

const router = Router();
router.use(requireAuth);

async function getPrestataireIdByUserId(userId: number): Promise<number | null> {
  const p = await Prestataire.findOne({ user_id: userId });
  return p ? (p._id as number) : null;
}

async function getStatutId(nom: string): Promise<number | null> {
  const s = await StatutReservation.findOne({ nom });
  return s ? (s._id as number) : null;
}

// GET /api/prestataire/reservations
router.get('/', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const filter = req.query.filter as string || 'all';

    // Build statut filter
    let statutNames: string[] = [];
    if (filter === 'en_attente') statutNames = ['en_attente'];
    else if (filter === 'confirmee') statutNames = ['confirmee', 'acceptee'];
    else if (filter === 'terminee') statutNames = ['terminee'];
    else if (filter === 'annulee') statutNames = ['annulee', 'refusee'];

    const query: any = { prestataire_id: prestataireId };
    if (statutNames.length > 0) {
      const statuts = await StatutReservation.find({ nom: { $in: statutNames } });
      query.statut_id = { $in: statuts.map(s => s._id) };
    }

    const reservations = await Reservation.find(query).sort({ date_reservation: -1, heure_debut: -1 });

    const results = await Promise.all(reservations.map(async (r) => {
      const client = await User.findById(r.client_id).select('nom prenom telephone email');
      const service = await Service.findById(r.service_id);
      const statut = await StatutReservation.findById(r.statut_id);
      return {
        id: r._id,
        date_reservation: r.date_reservation instanceof Date ? r.date_reservation.toISOString().split('T')[0] : r.date_reservation,
        heure_debut: r.heure_debut,
        heure_fin: r.heure_fin,
        prix_final: r.prix_final,
        notes_client: r.notes_client,
        a_domicile: r.a_domicile,
        adresse_rdv: r.adresse_rdv,
        client_id: r.client_id,
        client_nom: client?.nom || null,
        client_prenom: client?.prenom || null,
        client_telephone: client?.telephone || null,
        client_email: (client as any)?.email || null,
        service_nom: service?.nom || null,
        duree_minutes: service?.duree_minutes || null,
        statut: statut?.nom || null,
        statut_couleur: statut?.couleur || null,
        created_at: r.created_at
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/prestataire/reservations/:id/accept
router.put('/:id/accept', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const reservationId = parseInt(req.params.id);
    const reservation = await Reservation.findOne({ _id: reservationId, prestataire_id: prestataireId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const currentStatut = await StatutReservation.findById(reservation.statut_id);
    if (currentStatut?.nom !== 'en_attente') return res.status(400).json({ error: 'Cette réservation ne peut plus être acceptée' });

    const confirmedId = await getStatutId('confirmee');
    if (!confirmedId) return res.status(500).json({ error: 'Statut confirmee introuvable' });

    await Reservation.updateOne({ _id: reservationId }, { statut_id: confirmedId, updated_at: new Date() });
    await HistoriqueReservation.create({
      reservation_id: reservationId, ancien_statut_id: reservation.statut_id,
      nouveau_statut_id: confirmedId, commentaire: 'Réservation acceptée par le prestataire', changed_by_user_id: req.userId
    });

    try {
      const prest = await Prestataire.findById(prestataireId);
      const prestUser = prest?.user_id ? await User.findById(prest.user_id).select('nom prenom') : null;
      const service = await Service.findById(reservation.service_id);
      const prestNom = prestUser ? `${prestUser.prenom} ${prestUser.nom}` : 'Le prestataire';
      const serviceNom = service?.nom || 'votre service';
      const date = reservation.date_reservation instanceof Date ? reservation.date_reservation.toLocaleDateString('fr-FR') : String(reservation.date_reservation);

      await ClientNotifications.reservationConfirmee(reservation.client_id, prestNom, serviceNom, date);
      await ClientInAppNotifications.reservationConfirmee(reservation.client_id, prestNom, serviceNom, date, reservation.heure_debut || '');
    } catch { /* ne pas bloquer pour une notif */ }

    res.json({ ok: true, message: 'Réservation acceptée avec succès' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/prestataire/reservations/:id/reject
router.put('/:id/reject', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const reservationId = parseInt(req.params.id);
    const { motif } = req.body;

    const reservation = await Reservation.findOne({ _id: reservationId, prestataire_id: prestataireId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const currentStatut = await StatutReservation.findById(reservation.statut_id);
    if (!['en_attente', 'confirmee'].includes(currentStatut?.nom || '')) return res.status(400).json({ error: 'Cette réservation ne peut plus être refusée' });

    const refuseeId = await getStatutId('refusee');
    if (!refuseeId) return res.status(500).json({ error: 'Statut refusee introuvable' });

    await Reservation.updateOne({ _id: reservationId }, { statut_id: refuseeId, updated_at: new Date() });
    await HistoriqueReservation.create({
      reservation_id: reservationId, ancien_statut_id: reservation.statut_id,
      nouveau_statut_id: refuseeId,
      commentaire: motif ? `Réservation refusée: ${motif}` : 'Réservation refusée par le prestataire',
      changed_by_user_id: req.userId
    });

    try {
      const prestataire = await Prestataire.findById(prestataireId);
      const prestUser = prestataire ? await User.findById(prestataire.user_id).select('nom prenom') : null;
      const service = await Service.findById(reservation.service_id);
      const prestNom = prestUser ? `${prestUser.prenom} ${prestUser.nom}` : 'Le prestataire';
      const serviceNom = service?.nom || 'votre service';
      await ClientNotifications.reservationRefusee(reservation.client_id, prestNom, serviceNom, motif);
      await ClientInAppNotifications.reservationRefusee(reservation.client_id, prestNom, serviceNom, motif);
    } catch { /* ne pas bloquer */ }

    res.json({ ok: true, message: 'Réservation refusée avec succès' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/prestataire/reservations/:id/complete
router.put('/:id/complete', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const reservationId = parseInt(req.params.id);
    const reservation = await Reservation.findOne({ _id: reservationId, prestataire_id: prestataireId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const currentStatut = await StatutReservation.findById(reservation.statut_id);
    if (currentStatut?.nom !== 'confirmee') return res.status(400).json({ error: 'Seules les réservations confirmées peuvent être marquées comme terminées' });

    const termineeId = await getStatutId('terminee');
    if (!termineeId) return res.status(500).json({ error: 'Statut terminee introuvable' });

    await Reservation.updateOne({ _id: reservationId }, { statut_id: termineeId, updated_at: new Date() });
    await HistoriqueReservation.create({
      reservation_id: reservationId, ancien_statut_id: reservation.statut_id,
      nouveau_statut_id: termineeId, commentaire: 'Service terminé', changed_by_user_id: req.userId
    });

    try {
      const prestataire = await Prestataire.findById(prestataireId);
      const prestUser = prestataire ? await User.findById(prestataire.user_id).select('nom prenom') : null;
      const service = await Service.findById(reservation.service_id);
      const prestNom = prestUser ? `${prestUser.prenom} ${prestUser.nom}` : 'Le prestataire';
      const serviceNom = service?.nom || 'votre service';
      await ClientNotifications.serviceTermine(reservation.client_id, prestNom, serviceNom);
      await ClientInAppNotifications.serviceTermine(reservation.client_id, prestNom, serviceNom);
    } catch { /* ne pas bloquer */ }

    res.json({ ok: true, message: 'Réservation marquée comme terminée' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

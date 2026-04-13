import { Router, Request, Response } from 'express';
import { Prestataire, Reservation, StatutReservation, Service, Avis, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });

    const prestataireId = prestataire._id as number;

    // Get all statut IDs
    const allStatuts = await StatutReservation.find();
    const statutMap: Record<string, number> = {};
    allStatuts.forEach(s => { statutMap[s.nom] = s._id as number; });

    // Reservation stats
    const reservations = await Reservation.find({ prestataire_id: prestataireId });
    const reservations_total = reservations.length;
    const reservations_en_attente = reservations.filter(r => r.statut_id === statutMap['en_attente']).length;
    const reservations_confirmees = reservations.filter(r => r.statut_id === statutMap['confirmee']).length;
    const reservations_terminees = reservations.filter(r => r.statut_id === statutMap['terminee']).length;

    // Service stats
    const services = await Service.find({ prestataire_id: prestataireId });
    const services_total = services.length;
    const services_actifs = services.filter(s => s.is_active).length;

    // Avis stats
    const avis = await Avis.find({ prestataire_id: prestataireId });
    const nombre_avis = avis.length;
    const note_moyenne = nombre_avis > 0 ? avis.reduce((sum, a) => sum + a.note, 0) / nombre_avis : 0;

    // Revenus du mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const termineId = statutMap['terminee'];
    const revenus_mois = reservations
      .filter(r => r.statut_id === termineId && r.date_reservation >= startOfMonth)
      .reduce((sum, r) => sum + (r.prix_final || 0), 0);

    res.json({
      reservations_total, reservations_en_attente, reservations_confirmees, reservations_terminees,
      services_total, services_actifs,
      note_moyenne: parseFloat(note_moyenne.toFixed(1)),
      nombre_avis,
      revenus_mois
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/dashboard/recent-reservations
router.get('/recent-reservations', async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 5;

    const prestataire = await Prestataire.findOne({ user_id: userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });

    const reservations = await Reservation.find({ prestataire_id: prestataire._id })
      .sort({ created_at: -1 })
      .limit(limit);

    const results = await Promise.all(reservations.map(async (r) => {
      const client = await User.findById(r.client_id).select('nom prenom');
      const service = await Service.findById(r.service_id);
      const statut = await StatutReservation.findById(r.statut_id);

      return {
        id: r._id,
        date_reservation: r.date_reservation,
        heure_debut: r.heure_debut,
        heure_fin: r.heure_fin,
        prix_final: r.prix_final,
        notes_client: r.notes_client,
        client_nom: client?.nom || null,
        client_prenom: client?.prenom || null,
        service_nom: service?.nom || null,
        statut_nom: statut?.nom || null,
        statut_couleur: statut?.couleur || null
      };
    }));

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

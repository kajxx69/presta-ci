import { Router, Request, Response } from 'express';
import { Prestataire, Reservation, StatutReservation, Service, Avis, User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

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
    serverError(res, e);
  }
});

// GET /api/dashboard/analytics — statistiques enrichies du prestataire
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const prestataire = await Prestataire.findOne({ user_id: req.userId });
    if (!prestataire) return res.status(403).json({ error: 'Profil prestataire requis' });
    const prestataireId = prestataire._id as number;

    const allStatuts = await StatutReservation.find();
    const statutMap: Record<string, number> = {};
    allStatuts.forEach(s => { statutMap[s.nom] = s._id as number; });

    const reservations = await Reservation.find({ prestataire_id: prestataireId })
      .select('statut_id date_reservation heure_debut prix_final prix_total created_at');

    const isTerminee = (r: any) => r.statut_id === statutMap['terminee'];
    const montant = (r: any) => r.prix_total ?? r.prix_final ?? 0;

    // Revenus des 6 derniers mois (réservations terminées)
    const now = new Date();
    const revenus_par_mois: Array<{ mois: string; revenus: number; reservations: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const duMois = reservations.filter(r => isTerminee(r) && r.date_reservation >= start && r.date_reservation < end);
      revenus_par_mois.push({
        mois: start.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        revenus: duMois.reduce((s, r) => s + montant(r), 0),
        reservations: duMois.length,
      });
    }

    // Taux d'acceptation : (tout sauf refusée) / demandes traitées
    const traitees = reservations.filter(r => r.statut_id !== statutMap['en_attente']);
    const refusees = traitees.filter(r => r.statut_id === statutMap['refusee']).length;
    const taux_acceptation = traitees.length > 0
      ? Math.round(((traitees.length - refusees) / traitees.length) * 100)
      : null;

    // Créneaux les plus demandés
    const parHeure: Record<string, number> = {};
    reservations.forEach(r => {
      if (r.heure_debut) {
        const h = `${r.heure_debut.split(':')[0]}h`;
        parHeure[h] = (parHeure[h] || 0) + 1;
      }
    });
    const creneaux_populaires = Object.entries(parHeure)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([heure, count]) => ({ heure, count }));

    // Comparaison mois courant vs précédent
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrec = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const moisCourant = reservations.filter(r => r.created_at >= debutMois);
    const moisPrecedent = reservations.filter(r => r.created_at >= debutMoisPrec && r.created_at < debutMois);
    const revCourant = reservations.filter(r => isTerminee(r) && r.date_reservation >= debutMois).reduce((s, r) => s + montant(r), 0);
    const revPrecedent = reservations.filter(r => isTerminee(r) && r.date_reservation >= debutMoisPrec && r.date_reservation < debutMois).reduce((s, r) => s + montant(r), 0);

    res.json({
      vues_profil: (prestataire as any).vues || 0,
      taux_acceptation,
      revenus_par_mois,
      creneaux_populaires,
      comparaison: {
        reservations_mois_courant: moisCourant.length,
        reservations_mois_precedent: moisPrecedent.length,
        revenus_mois_courant: revCourant,
        revenus_mois_precedent: revPrecedent,
        evolution_revenus_pct: revPrecedent > 0 ? Math.round(((revCourant - revPrecedent) / revPrecedent) * 100) : null,
      },
    });
  } catch (e: any) {
    serverError(res, e);
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
    serverError(res, e);
  }
});

export default router;

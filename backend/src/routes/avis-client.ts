import express, { Request, Response } from 'express';
import { AvisClient, Reservation, StatutReservation, User, Prestataire } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

const router = express.Router();
router.use(requireAuth);

async function getPrestataireIdByUserId(userId: number): Promise<number | null> {
  const p = await Prestataire.findOne({ user_id: userId });
  return p ? (p._id as number) : null;
}

async function updateClientAverageRating(client_id: number) {
  const avisClients = await AvisClient.find({ client_id });
  const note_moyenne = avisClients.length > 0
    ? avisClients.reduce((s, a) => s + a.note, 0) / avisClients.length : 0;
  await User.updateOne({ _id: client_id }, {
    note_moyenne_client: parseFloat(note_moyenne.toFixed(1)),
    nombre_avis_client: avisClients.length
  });
}

// POST /api/avis-client — prestataire note un client après prestation terminée
router.post('/', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const { reservation_id, note, commentaire } = req.body;

    if (!note || note < 1 || note > 5) return res.status(400).json({ error: 'La note doit être entre 1 et 5' });

    const reservation = await Reservation.findOne({ _id: reservation_id, prestataire_id: prestataireId });
    if (!reservation) return res.status(404).json({ error: 'Réservation introuvable' });

    const statut = await StatutReservation.findById(reservation.statut_id);
    if (!['terminee', 'en_attente_confirmation'].includes(statut?.nom || '')) {
      return res.status(400).json({ error: 'Vous ne pouvez noter que les prestations terminées' });
    }

    const existing = await AvisClient.findOne({ reservation_id });
    if (existing) return res.status(400).json({ error: 'Vous avez déjà noté ce client pour cette réservation' });

    const avis = await AvisClient.create({
      reservation_id,
      client_id: reservation.client_id,
      prestataire_id: prestataireId,
      note,
      commentaire: commentaire || null
    });

    await updateClientAverageRating(reservation.client_id);

    res.json({ ok: true, id: avis._id, message: 'Note client enregistrée' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/avis-client/reservation/:id — vérifier si déjà noté pour cette réservation
router.get('/reservation/:id', async (req: Request, res: Response) => {
  try {
    const prestataireId = await getPrestataireIdByUserId(req.userId!);
    if (!prestataireId) return res.status(403).json({ error: 'Profil prestataire requis' });

    const reservation_id = parseInt(req.params.id);
    const avis = await AvisClient.findOne({ reservation_id, prestataire_id: prestataireId });
    res.json({ a_note: !!avis, note: avis?.note || null });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/avis-client/client/:id — notes d'un client (pour prestataires/admin)
router.get('/client/:id', async (req: Request, res: Response) => {
  try {
    const client_id = parseInt(req.params.id);
    const avisList = await AvisClient.find({ client_id }).sort({ created_at: -1 });

    const results = await Promise.all(avisList.map(async (a) => {
      const prestataire = await Prestataire.findById(a.prestataire_id).select('nom_commercial');
      return {
        ...a.toJSON(),
        prestataire_nom: prestataire?.nom_commercial || null
      };
    }));

    res.json(results);
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;

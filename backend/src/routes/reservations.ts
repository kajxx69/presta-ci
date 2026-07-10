import express, { Request, Response } from 'express';
import { Reservation, StatutReservation, HistoriqueReservation, Service, Prestataire, Avis, User, SlotLock } from '../models/index.js';
import { SubCategory } from '../models/Category.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';
import { hasSlotConflict, getHorairesForDate } from '../utils/availability.js';
import { EmailNotifications } from '../services/email-notifications.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';

const router = express.Router();

// GET /api/reservations?filter=all|upcoming|completed|cancelled
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
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

    // Enrichissement par requêtes groupées (évite N+1)
    const statutIds = [...new Set(reservations.map(r => r.statut_id))];
    const serviceIds = [...new Set(reservations.map(r => r.service_id))];
    const prestataireIds = [...new Set(reservations.map(r => r.prestataire_id))];
    const reservationIds = reservations.map(r => r._id);

    const [statuts, services, prestataires, avisList] = await Promise.all([
      StatutReservation.find({ _id: { $in: statutIds } }),
      Service.find({ _id: { $in: serviceIds } }),
      Prestataire.find({ _id: { $in: prestataireIds } }),
      Avis.find({ reservation_id: { $in: reservationIds } }).select('reservation_id'),
    ]);
    const statutById = new Map(statuts.map(s => [s._id as number, s]));
    const serviceById = new Map(services.map(s => [s._id as number, s]));
    const prestataireById = new Map(prestataires.map(p => [p._id as number, p]));
    const avisByReservation = new Set(avisList.map(a => a.reservation_id));

    const results = reservations.map((r) => {
      const statut = statutById.get(r.statut_id) || null;
      const service = serviceById.get(r.service_id) || null;
      const prestataire = prestataireById.get(r.prestataire_id) || null;

      const rObj: any = r.toJSON();
      // Format date_reservation as YYYY-MM-DD string
      if (rObj.date_reservation instanceof Date) {
        rObj.date_reservation = rObj.date_reservation.toISOString().split('T')[0];
      }
      const a_laisse_avis = avisByReservation.has(r._id as number);
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
        booking_type: rObj.booking_type || 'appointment',
        quantite: rObj.quantite || 1,
        prix_total: rObj.prix_total ?? rObj.prix_final,
        specifications: rObj.specifications || null,
        a_laisse_avis,
        peut_confirmer_fin: statut?.nom === 'en_attente_confirmation'
      };
    });

    res.json(results);
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/reservations/:id/cancel
router.put('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
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

    // Restituer le stock si c'était une commande d'article suivi en stock
    const service = await Service.findById(reservation.service_id);
    if (service && service.type_service === 'produit' && service.stock !== null && service.stock !== undefined) {
      await Service.updateOne({ _id: reservation.service_id }, { $inc: { stock: reservation.quantite || 1 } });
    }

    // Libérer le créneau (sinon il reste verrouillé jusqu'au TTL d'1h de SlotLock)
    await SlotLock.deleteOne({ reservation_id: id });

    res.json({ ok: true });
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/reservations/:id/confirm-completion — le client confirme que la prestation est terminée
router.put('/:id/confirm-completion', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
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
    serverError(res, e);
  }
});

// POST /api/reservations
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { service_id, date_reservation, heure_debut, notes_client, specifications, a_domicile, adresse_rdv, adresse_rdv_lat, adresse_rdv_lng, publication_id, quantite, recurrence_semaines } = req.body;

    if (!service_id || !date_reservation) {
      return res.status(400).json({ error: 'service_id et date_reservation sont requis' });
    }

    const service = await Service.findOne({ _id: service_id, is_active: true });
    if (!service) return res.status(404).json({ error: 'Service introuvable ou inactif' });

    // Déterminer le booking_type depuis la sous-catégorie
    const subCat = await SubCategory.findById(service.sous_categorie_id);
    const bookingType: 'appointment' | 'order' = (subCat as any)?.booking_type === 'order' ? 'order' : 'appointment';

    if (bookingType === 'appointment' && !heure_debut) {
      return res.status(400).json({ error: 'heure_debut est requise pour un rendez-vous' });
    }

    // Vérification de réputation
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
        error: 'Votre réputation sur la plateforme ne vous permet pas de réserver chez ce prestataire très bien noté.'
      });
    }

    const enAttenteStatut = await StatutReservation.findOne({ nom: 'en_attente' });
    if (!enAttenteStatut) return res.status(500).json({ error: 'Statut par défaut introuvable' });

    const qty = Math.max(1, Number(quantite) || 1);

    // Article en stock suivi : décrémenter atomiquement pour éviter la survente en cas de commandes concurrentes
    const isProduitAvecStock = service.type_service === 'produit' && service.stock !== null && service.stock !== undefined;
    if (isProduitAvecStock) {
      const decremented = await Service.findOneAndUpdate(
        { _id: service_id, stock: { $gte: qty } },
        { $inc: { stock: -qty } }
      );
      if (!decremented) {
        return res.status(409).json({ error: 'Stock insuffisant pour cette quantité.' });
      }
    }

    // Calcul heure_fin uniquement pour les rendez-vous
    let heure_fin: string | undefined;
    if (bookingType === 'appointment' && heure_debut) {
      const startTime = new Date(`${date_reservation}T${heure_debut}`);
      if (isNaN(startTime.getTime())) {
        return res.status(400).json({ error: 'Date ou heure invalide' });
      }
      if (startTime.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Impossible de réserver un créneau dans le passé' });
      }
      const endTime = new Date(startTime.getTime() + (service.duree_minutes || 0) * 60000);
      heure_fin = endTime.toTimeString().slice(0, 5);

      // Vérifier les horaires d'ouverture du prestataire (si définis)
      const prestataireDoc = await Prestataire.findById(service.prestataire_id).select('horaires_ouverture');
      const horairesJour = getHorairesForDate(prestataireDoc?.horaires_ouverture as any, startTime);
      const horairesDefinis = prestataireDoc?.horaires_ouverture && Object.keys(prestataireDoc.horaires_ouverture).length > 0;
      if (horairesDefinis) {
        if (!horairesJour) {
          return res.status(400).json({ error: 'Le prestataire est fermé à cette date' });
        }
        if (heure_debut < horairesJour.debut || heure_fin > horairesJour.fin) {
          return res.status(400).json({ error: `Ce créneau est en dehors des horaires d'ouverture (${horairesJour.debut} - ${horairesJour.fin})` });
        }
      }
    }

    // Anti double-booking : un index unique Mongo (prestataire_id, date, heure_debut)
    // sur SlotLock garantit qu'une seule requête concurrente peut poser le verrou sur un
    // même créneau exact — contrairement à une simple lecture-puis-écriture (hasSlotConflict
    // seul), qui laisse une fenêtre où deux requêtes passent toutes les deux la vérification
    // avant qu'aucune n'ait encore créé sa réservation. hasSlotConflict reste utilisé en
    // complément pour détecter les chevauchements partiels (durées de service différentes).
    let reservation: any;
    if (bookingType === 'appointment' && heure_debut && heure_fin) {
      const startTime = new Date(`${date_reservation}T${heure_debut}`);
      const conflict = await hasSlotConflict(service.prestataire_id, startTime, heure_debut, heure_fin);
      if (conflict) {
        return res.status(409).json({ error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' });
      }

      try {
        await SlotLock.create({
          prestataire_id: service.prestataire_id,
          date_reservation,
          heure_debut,
          reservation_id: 0, // mis à jour juste après la création de la réservation
        });
      } catch (lockErr: any) {
        if (lockErr?.code === 11000) {
          return res.status(409).json({ error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' });
        }
        throw lockErr;
      }

      // Revérification post-verrou : couvre le cas d'un chevauchement partiel avec un
      // créneau de durée différente qui aurait été créé entre le check et la pose du lock.
      const conflictAfterLock = await hasSlotConflict(service.prestataire_id, startTime, heure_debut, heure_fin);
      if (conflictAfterLock) {
        await SlotLock.deleteOne({ prestataire_id: service.prestataire_id, date_reservation, heure_debut });
        return res.status(409).json({ error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' });
      }
    }

    reservation = await Reservation.create({
      client_id: userId,
      prestataire_id: service.prestataire_id,
      service_id,
      booking_type: bookingType,
      statut_id: enAttenteStatut._id as number,
      date_reservation: new Date(date_reservation),
      heure_debut: heure_debut || undefined,
      heure_fin: heure_fin || undefined,
      prix_final: service.prix,
      prix_total: service.prix * qty,
      quantite: qty,
      notes_client: notes_client || undefined,
      specifications: specifications || undefined,
      a_domicile: !!a_domicile,
      adresse_rdv: a_domicile ? adresse_rdv : undefined,
      adresse_rdv_lat: a_domicile && Number.isFinite(Number(adresse_rdv_lat)) ? Number(adresse_rdv_lat) : null,
      adresse_rdv_lng: a_domicile && Number.isFinite(Number(adresse_rdv_lng)) ? Number(adresse_rdv_lng) : null,
      publication_id: publication_id || null
    });

    if (bookingType === 'appointment' && heure_debut && heure_fin) {
      await SlotLock.updateOne(
        { prestataire_id: service.prestataire_id, date_reservation, heure_debut },
        { reservation_id: reservation._id as number }
      );
    }

    await HistoriqueReservation.create({
      reservation_id: reservation._id as number,
      nouveau_statut_id: enAttenteStatut._id as number,
      commentaire: 'Création de la réservation',
      changed_by_user_id: userId
    });

    // Réservation récurrente : répéter le même créneau les semaines suivantes
    const occurrences: number[] = [reservation._id as number];
    const semaines_ignorees: string[] = [];
    const nbSemaines = Math.min(8, Math.max(0, Number(recurrence_semaines) || 0));
    if (bookingType === 'appointment' && heure_debut && heure_fin && nbSemaines >= 2) {
      for (let semaine = 1; semaine < nbSemaines; semaine++) {
        const dateOcc = new Date(date_reservation);
        dateOcc.setDate(dateOcc.getDate() + semaine * 7);
        const dateOccStr = dateOcc.toISOString().split('T')[0];
        const startOcc = new Date(`${dateOccStr}T${heure_debut}`);

        // Chaque occurrence pose son propre verrou ; on saute celles qui coincent
        const conflictOcc = await hasSlotConflict(service.prestataire_id, startOcc, heure_debut, heure_fin);
        if (conflictOcc) {
          semaines_ignorees.push(dateOccStr);
          continue;
        }
        let occLockAcquired = true;
        try {
          await SlotLock.create({
            prestataire_id: service.prestataire_id,
            date_reservation: dateOccStr,
            heure_debut,
            reservation_id: 0,
          });
        } catch (lockErr: any) {
          if (lockErr?.code === 11000) { occLockAcquired = false; } else { throw lockErr; }
        }
        if (!occLockAcquired) {
          semaines_ignorees.push(dateOccStr);
          continue;
        }

        const occ = await Reservation.create({
          client_id: userId,
          prestataire_id: service.prestataire_id,
          service_id,
          booking_type: bookingType,
          statut_id: enAttenteStatut._id as number,
          date_reservation: dateOcc,
          heure_debut,
          heure_fin,
          prix_final: service.prix,
          prix_total: service.prix * qty,
          quantite: qty,
          notes_client: notes_client ? `${notes_client} (récurrence hebdo)` : 'Réservation récurrente hebdomadaire',
          a_domicile: !!a_domicile,
          adresse_rdv: a_domicile ? adresse_rdv : undefined,
        });
        await SlotLock.updateOne(
          { prestataire_id: service.prestataire_id, date_reservation: dateOccStr, heure_debut },
          { reservation_id: occ._id as number }
        );
        await HistoriqueReservation.create({
          reservation_id: occ._id as number,
          nouveau_statut_id: enAttenteStatut._id as number,
          commentaire: `Occurrence récurrente (semaine ${semaine + 1}/${nbSemaines})`,
          changed_by_user_id: userId,
        });
        occurrences.push(occ._id as number);
      }
    }

    // Notifier le prestataire (in-app + email, best-effort)
    try {
      const prestataireOwner = await Prestataire.findById(service.prestataire_id).select('user_id');
      if (prestataireOwner?.user_id) {
        const client = await User.findById(userId).select('nom prenom');
        const clientNom = client ? `${client.prenom} ${client.nom}` : 'Un client';
        const dateFr = new Date(date_reservation).toLocaleDateString('fr-FR');
        await InAppNotificationService.createCustom(
          prestataireOwner.user_id,
          bookingType === 'order' ? '🛒 Nouvelle commande' : '📅 Nouvelle réservation',
          `${clientNom} — ${service.nom} le ${dateFr}${heure_debut ? ` à ${heure_debut}` : ''}`,
          'info'
        );
        await EmailNotifications.nouvelleReservation(prestataireOwner.user_id, clientNom, service.nom, dateFr, heure_debut);
      }
    } catch { /* ne pas bloquer la réservation pour une notif */ }

    res.status(201).json({
      id: reservation._id,
      occurrences: occurrences.length > 1 ? occurrences : undefined,
      semaines_ignorees: semaines_ignorees.length > 0 ? semaines_ignorees : undefined,
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;

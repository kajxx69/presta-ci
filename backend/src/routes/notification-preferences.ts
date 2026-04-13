import express from 'express';
import { NotificationPreference } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_PREFS = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  reservation_updates: true,
  promotions: true,
  newsletter: false
};

// GET /api/notification-preferences
router.get('/', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    let prefs = await NotificationPreference.findOne({ user_id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ user_id, ...DEFAULT_PREFS });
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/notification-preferences
router.put('/', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const { email_notifications, push_notifications, sms_notifications, reservation_updates, promotions, newsletter } = req.body;

    const update: any = { updated_at: new Date() };
    if (email_notifications !== undefined) update.email_notifications = email_notifications;
    if (push_notifications !== undefined) update.push_notifications = push_notifications;
    if (sms_notifications !== undefined) update.sms_notifications = sms_notifications;
    if (reservation_updates !== undefined) update.reservation_updates = reservation_updates;
    if (promotions !== undefined) update.promotions = promotions;
    if (newsletter !== undefined) update.newsletter = newsletter;

    const prefs = await NotificationPreference.findOneAndUpdate(
      { user_id },
      update,
      { returnDocument: 'after', upsert: true }
    );

    res.json({ ok: true, message: 'Préférences mises à jour avec succès', preferences: prefs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/notification-preferences/reset
router.post('/reset', requireAuth, async (req, res) => {
  try {
    const user_id = req.user!.id;
    const prefs = await NotificationPreference.findOneAndUpdate(
      { user_id },
      { ...DEFAULT_PREFS, updated_at: new Date() },
      { returnDocument: 'after', upsert: true }
    );
    res.json({ ok: true, message: 'Préférences réinitialisées aux valeurs par défaut', preferences: prefs });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

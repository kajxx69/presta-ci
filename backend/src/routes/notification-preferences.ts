import express from 'express';
import { NotificationPreference } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_PREFS = {
  push_notifications: true,
  email_notifications: true,
  sms_notifications: false,
  new_reservation: true,
  reservation_confirmed: true,
  reservation_cancelled: true,
  reservation_updates: true,
  new_publication: false,
  new_like: false,
  new_comment: false,
  new_follower: false,
  promotions: true,
  tips: true,
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
    const fields = [
      'push_notifications', 'email_notifications', 'sms_notifications',
      'new_reservation', 'reservation_confirmed', 'reservation_cancelled', 'reservation_updates',
      'new_publication', 'new_like', 'new_comment', 'new_follower',
      'promotions', 'tips', 'newsletter'
    ];

    const update: any = { updated_at: new Date() };
    for (const field of fields) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

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

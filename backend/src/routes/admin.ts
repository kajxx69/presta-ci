import { Router, Request, Response, NextFunction } from 'express';
import { Configuration, User, Service, Reservation, Notification, StatutReservation, TransactionWave } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

const router = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    await new Promise<void>((resolve) => requireAuth(req, res, resolve as NextFunction));
    if (!req.user) return;
    if (req.user.role_id !== 3) {
      return res.status(403).json({ error: 'Accès administrateur requis' });
    }
    next();
  } catch (e: any) {
    serverError(res, e);
  }
}

async function upsertSetting(key: string, value: string, description?: string) {
  await Configuration.findOneAndUpdate(
    { cle: key },
    { cle: key, valeur: value, description: description || undefined, updated_at: new Date() },
    { upsert: true, returnDocument: 'after' }
  );
}

// GET /api/admin/settings
router.get('/settings', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await Configuration.find().sort({ cle: 1 });
    const settings: Record<string, any> = {};
    rows.forEach((row) => {
      let value: any = row.valeur || '';
      try { value = JSON.parse(value); } catch {}
      settings[row.cle] = { value, description: row.description };
    });
    res.json(settings);
  } catch (e: any) {
    serverError(res, e);
  }
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'Clé et valeur requises' });
    const valueString = typeof value === 'string' ? value : JSON.stringify(value);
    await upsertSetting(key, valueString, description || null);
    res.json({ ok: true, message: 'Paramètre mis à jour' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// DELETE /api/admin/settings/:key
router.delete('/settings/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await Configuration.deleteOne({ cle: req.params.key });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Paramètre introuvable' });
    res.json({ ok: true, message: 'Paramètre supprimé' });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/admin/settings/reset
router.post('/settings/reset', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const defaultSettings = [
      { cle: 'session_duration_hours', valeur: '24', description: 'Durée des sessions en heures' },
      { cle: 'maintenance_mode', valeur: 'false', description: 'Mode maintenance activé' },
      { cle: 'max_file_size_mb', valeur: '10', description: 'Taille maximale des fichiers en MB' },
      { cle: 'notifications_enabled', valeur: 'true', description: 'Notifications activées' },
      { cle: 'default_currency', valeur: 'XOF', description: 'Devise par défaut' },
      { cle: 'max_services_free', valeur: '2', description: 'Nombre max de services gratuits' },
      { cle: 'app_version', valeur: '1.0.0', description: "Version de l'application" },
      { cle: 'terms_version', valeur: '1.0', description: "Version des conditions d'utilisation" }
    ];
    await Configuration.deleteMany({});
    for (const s of defaultSettings) {
      await Configuration.create({ cle: s.cle, valeur: s.valeur, description: s.description });
    }
    res.json({ ok: true, message: 'Paramètres réinitialisés', count: defaultSettings.length });
  } catch (e: any) {
    serverError(res, e);
  }
});

// Note: les routes /maintenance/* (status, cache, backup, logs, mode) vivent
// exclusivement dans admin-maintenance.ts, monté sur /api/admin/maintenance.
// Ne pas les redéclarer ici : ce routeur est monté sur /api/admin en premier
// et absorberait silencieusement ces requêtes avec une réponse différente
// (shape incompatible avec ce qu'attend le frontend).

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const [
      users, services, reservations, notifications,
      confirmeeStatut, enAttenteStatut, termineeStatut,
      wavesToday, wavesMonth,
    ] = await Promise.all([
      // deleted_at exclut les comptes supprimés par un admin (anonymisés, mais
      // toujours en base pour l'intégrité référentielle) — sans ce filtre le
      // total d'utilisateurs restait gonflé de comptes qui n'existent plus.
      User.find({ deleted_at: null }).select('role_id'),
      Service.find({ deleted_at: null }).select('is_active'),
      Reservation.find().select('statut_id date_reservation'),
      Notification.find().select('is_read'),
      StatutReservation.findOne({ nom: 'confirmee' }),
      StatutReservation.findOne({ nom: 'en_attente' }),
      StatutReservation.findOne({ nom: 'terminee' }),
      TransactionWave.find({ statut: 'valide', created_at: { $gte: todayStart } }).select('montant'),
      TransactionWave.find({ statut: 'valide', created_at: { $gte: monthStart } }).select('montant'),
    ]);

    const clients = users.filter(u => u.role_id === 1).length;
    const prestataires = users.filter(u => u.role_id === 2).length;
    const admins = users.filter(u => u.role_id === 3).length;

    const confirmeeId = confirmeeStatut?._id;
    const enAttenteId = enAttenteStatut?._id;
    const termineeId = termineeStatut?._id;
    const todayEnd = new Date(todayStart); todayEnd.setHours(23, 59, 59, 999);

    const montantOf = (t: any) => parseFloat(String(t.montant)) || 0;

    res.json({
      users: { total_users: users.length, clients, prestataires, admins },
      services: {
        total_services: services.length,
        services_actifs: services.filter(s => s.is_active).length
      },
      reservations: {
        total_reservations: reservations.length,
        confirmees: confirmeeId ? reservations.filter(r => String(r.statut_id) === String(confirmeeId)).length : 0,
        en_attente: enAttenteId ? reservations.filter(r => String(r.statut_id) === String(enAttenteId)).length : 0,
        terminees: termineeId ? reservations.filter(r => String(r.statut_id) === String(termineeId)).length : 0,
        today: reservations.filter(r => new Date(r.date_reservation) >= todayStart && new Date(r.date_reservation) <= todayEnd).length,
      },
      // Revenu = abonnements Wave réellement validés par un admin (le seul
      // argent qui transite réellement sur la plateforme, cf. wave-transactions.ts)
      financial: {
        revenue_today: wavesToday.reduce((s, t) => s + montantOf(t), 0),
        revenue_month: wavesMonth.reduce((s, t) => s + montantOf(t), 0),
      },
      notifications: {
        total_notifications: notifications.length,
        non_lues: notifications.filter(n => !n.is_read).length
      },
      generated_at: new Date().toISOString()
    });
  } catch (e: any) {
    serverError(res, e);
  }
});

export default router;

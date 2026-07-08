import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';
import { Configuration, User, Service, Reservation, Notification } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { serverError } from '../utils/http.js';

const router = Router();
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const LOG_FILE = path.resolve(process.cwd(), 'logs/app.log');
const CACHE_DIRS = [
  path.resolve(process.cwd(), 'tmp/cache'),
  path.resolve(process.cwd(), '.cache')
];

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

// GET /api/admin/maintenance/status
router.get('/maintenance/status', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const modeRow = await Configuration.findOne({ cle: 'maintenance_mode' });
    const backupRow = await Configuration.findOne({ cle: 'maintenance_last_backup' });
    const cacheRow = await Configuration.findOne({ cle: 'maintenance_last_cache_clear' });

    const maintenanceMode = (modeRow?.valeur || 'false') === 'true';
    let lastBackupAt: string | null = null;
    let lastBackupFile: string | null = null;
    if (backupRow?.valeur) {
      try {
        const parsed = JSON.parse(backupRow.valeur);
        lastBackupAt = parsed.created_at || parsed.timestamp || null;
        lastBackupFile = parsed.file || null;
      } catch { lastBackupAt = backupRow.valeur; }
    }
    let lastCacheClearAt: string | null = null;
    if (cacheRow?.valeur) {
      try {
        const parsed = JSON.parse(cacheRow.valeur);
        lastCacheClearAt = parsed.cleared_at || parsed.timestamp || null;
      } catch { lastCacheClearAt = cacheRow.valeur; }
    }
    res.json({ maintenanceMode, lastBackupAt, lastBackupFile, lastCacheClearAt });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/admin/maintenance/clear-cache
router.post('/maintenance/clear-cache', requireAdmin, async (_req: Request, res: Response) => {
  try {
    for (const dir of CACHE_DIRS) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      await fs.mkdir(dir, { recursive: true });
    }
    const clearedAt = new Date().toISOString();
    await upsertSetting('maintenance_last_cache_clear', JSON.stringify({ cleared_at: clearedAt }), 'Dernier vidage du cache');
    res.json({ ok: true, clearedAt });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/admin/maintenance/backup
router.post('/maintenance/backup', requireAdmin, async (_req: Request, res: Response) => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString();
    const safeName = timestamp.replace(/[:.]/g, '-');

    const [userCount, serviceCount, reservationCount, configs] = await Promise.all([
      User.countDocuments(),
      Service.countDocuments({ deleted_at: null }),
      Reservation.countDocuments(),
      Configuration.find().sort({ cle: 1 })
    ]);

    const payload = {
      generatedAt: timestamp,
      settings: configs.map(c => ({ cle: c.cle, valeur: c.valeur, description: c.description })),
      summary: { users: userCount, services: serviceCount, reservations: reservationCount }
    };

    const fileName = `admin-backup-${safeName}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    await upsertSetting('maintenance_last_backup', JSON.stringify({ file: fileName, created_at: timestamp }), 'Dernière sauvegarde');
    res.json({ ok: true, file: fileName, createdAt: timestamp });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/maintenance/logs
router.get('/maintenance/logs', requireAdmin, async (_req: Request, res: Response) => {
  try {
    let logs = 'Aucun journal disponible';
    try {
      const content = await fs.readFile(LOG_FILE, 'utf-8');
      const lines = content.trim().split(/\r?\n/);
      logs = lines.slice(-200).join('\n') || logs;
    } catch {}
    res.json({ ok: true, logs });
  } catch (e: any) {
    serverError(res, e);
  }
});

// POST /api/admin/maintenance/maintenance-mode
router.post('/maintenance/maintenance-mode', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Valeur booléenne requise' });
    await upsertSetting('maintenance_mode', enabled ? 'true' : 'false', 'Mode maintenance global');
    res.json({ ok: true, maintenanceMode: enabled });
  } catch (e: any) {
    serverError(res, e);
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const [users, services, reservations, notifications] = await Promise.all([
      User.find().select('role_id'),
      Service.find({ deleted_at: null }).select('is_active'),
      Reservation.find().select('statut_id'),
      Notification.find().select('is_read')
    ]);

    const clients = users.filter(u => u.role_id === 1).length;
    const prestataires = users.filter(u => u.role_id === 2).length;
    const admins = users.filter(u => u.role_id === 3).length;

    res.json({
      users: { total_users: users.length, clients, prestataires, admins },
      services: {
        total_services: services.length,
        services_actifs: services.filter(s => s.is_active).length
      },
      reservations: {
        total_reservations: reservations.length,
        confirmees: reservations.filter(r => r.statut_id === 2).length,
        en_attente: reservations.filter(r => r.statut_id === 1).length
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

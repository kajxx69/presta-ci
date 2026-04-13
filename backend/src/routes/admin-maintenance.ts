import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Notification, Configuration, UserSession } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/maintenance/status
router.get('/status', async (_req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = db ? await db.listCollections().toArray() : [];
    const collStats = await Promise.all(
      collections.map(async (col) => {
        try {
          const stats = await db!.collection(col.name).estimatedDocumentCount();
          return { name: col.name, count: stats };
        } catch { return { name: col.name, count: 0 }; }
      })
    );

    const [total_notifs, non_lues, notifs_1h] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ is_read: false }),
      Notification.countDocuments({ sent_at: { $gte: new Date(Date.now() - 3600000) } })
    ]);

    res.json({
      system_status: 'operational',
      timestamp: new Date().toISOString(),
      database: {
        connected: mongoose.connection.readyState === 1,
        collections: collStats
      },
      notifications: { total_notifications: total_notifs, notifications_non_lues: non_lues, notifications_derniere_heure: notifs_1h },
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      node_version: process.version
    });
  } catch (error) {
    res.status(500).json({ system_status: 'error', error: 'Erreur lors de la vérification du statut système' });
  }
});

// GET /api/admin/maintenance/health
router.get('/health', async (_req, res) => {
  try {
    const startTime = Date.now();
    const dbOk = mongoose.connection.readyState === 1;
    const memUsage = process.memoryUsage();
    const memPct = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const responseTime = Date.now() - startTime;

    const checks = { database: dbOk, memory: memPct < 90, response_time: responseTime < 1000, disk_space: true };
    const overall = Object.values(checks).every(Boolean);

    res.json({
      status: overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      response_time_ms: responseTime,
      checks,
      system_info: { uptime_seconds: process.uptime(), memory_usage: memUsage, memory_usage_percent: memPct.toFixed(2), node_version: process.version, platform: process.platform }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: 'Erreur lors de la vérification de santé' });
  }
});

// POST /api/admin/maintenance/cache/clear
router.post('/cache/clear', async (req, res) => {
  try {
    const { cache_type = 'all' } = req.body;
    const cleared: string[] = [];

    if (cache_type === 'all' || cache_type === 'sessions') {
      await UserSession.deleteMany({ expires_at: { $lt: new Date() } });
      cleared.push('expired_sessions');
    }

    if (cache_type === 'all' || cache_type === 'notifications') {
      const cutoff = new Date(Date.now() - 90 * 86400000);
      await Notification.deleteMany({ is_read: true, sent_at: { $lt: cutoff } });
      cleared.push('old_notifications');
    }

    res.json({ success: true, message: 'Cache vidé avec succès', cleared_caches: cleared, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du vidage du cache' });
  }
});

// POST /api/admin/maintenance/backup
router.post('/backup', async (req, res) => {
  try {
    const { backup_type = 'full' } = req.body;
    const backupDir = path.join(process.cwd(), 'backups');

    try { await fs.access(backupDir); } catch { await fs.mkdir(backupDir, { recursive: true }); }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `prestaci_backup_${backup_type}_${timestamp}.json`;
    const backupPath = path.join(backupDir, fileName);

    const db = mongoose.connection.db;
    const collections = db ? await db.listCollections().toArray() : [];
    const payload: Record<string, any> = { generatedAt: new Date().toISOString(), backup_type };

    for (const col of collections) {
      payload[col.name] = await db!.collection(col.name).find({}).toArray();
    }

    await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), 'utf8');
    const stats = await fs.stat(backupPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    res.json({ success: true, message: 'Sauvegarde créée avec succès', backup_info: { file_name: fileName, file_size_mb: fileSizeMB, collections_count: collections.length, backup_type, created_at: new Date().toISOString() } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde' });
  }
});

// GET /api/admin/maintenance/backups
router.get('/backups', async (_req, res) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.sql')) {
          const fp = path.join(backupDir, file);
          const s = await fs.stat(fp);
          backups.push({ file_name: file, file_size_mb: (s.size / (1024 * 1024)).toFixed(2), created_at: s.birthtime, modified_at: s.mtime });
        }
      }
      backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json({ backups, total_count: backups.length, backup_directory: backupDir });
    } catch {
      res.json({ backups: [], total_count: 0, backup_directory: backupDir, message: 'Aucune sauvegarde trouvée' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du listage des sauvegardes' });
  }
});

// DELETE /api/admin/maintenance/backups/:filename
router.delete('/backups/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if ((!filename.endsWith('.json') && !filename.endsWith('.sql')) || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Nom de fichier invalide' });
    }
    const filePath = path.join(process.cwd(), 'backups', filename);
    try { await fs.access(filePath); } catch { return res.status(404).json({ error: 'Fichier non trouvé' }); }
    await fs.unlink(filePath);
    res.json({ success: true, message: 'Sauvegarde supprimée', deleted_file: filename });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// GET /api/admin/maintenance/logs
router.get('/logs', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const logFile = path.join(process.cwd(), 'logs/app.log');
    let logs = 'Aucun journal disponible';
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.trim().split(/\r?\n/);
      const filtered = search ? lines.filter(l => l.toLowerCase().includes((search as string).toLowerCase())) : lines;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const total = filtered.length;
      const slice = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
      return res.json({ logs: slice, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
    } catch {}
    res.json({ logs, total: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la consultation des logs' });
  }
});

// POST /api/admin/maintenance/mode
router.post('/mode', async (req, res) => {
  try {
    const { enabled, message = 'Maintenance en cours', estimated_duration } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Le paramètre "enabled" doit être un booléen' });

    await Configuration.findOneAndUpdate(
      { cle: 'maintenance_mode' },
      { cle: 'maintenance_mode', valeur: enabled ? '1' : '0', description: 'Mode maintenance activé/désactivé', updated_at: new Date() },
      { upsert: true }
    );

    if (enabled) {
      await Configuration.findOneAndUpdate(
        { cle: 'maintenance_message' },
        { cle: 'maintenance_message', valeur: message || 'Maintenance en cours...', updated_at: new Date() },
        { upsert: true }
      );
      if (estimated_duration) {
        await Configuration.findOneAndUpdate(
          { cle: 'maintenance_duration' },
          { cle: 'maintenance_duration', valeur: String(estimated_duration), updated_at: new Date() },
          { upsert: true }
        );
      }
    }

    res.json({
      success: true,
      message: enabled ? 'Mode maintenance activé' : 'Mode maintenance désactivé',
      maintenance_mode: { enabled, message: enabled ? message : null, estimated_duration: enabled ? estimated_duration : null, activated_at: enabled ? new Date().toISOString() : null }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la gestion du mode maintenance' });
  }
});

export default router;

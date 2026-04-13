import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { InAppNotificationService } from '../services/in-app-notifications.js';

const router = Router();

// Middleware d'authentification pour toutes les routes
router.use(requireAuth);

// GET /api/notifications - Récupérer les notifications de l'utilisateur
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const onlyUnread = req.query.unread === 'true';
    
    const notifications = await InAppNotificationService.getUserNotifications(userId, limit, onlyUnread);
    
    res.json(notifications);
  } catch (e: any) {
    console.error('Erreur récupération notifications:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/notifications/count - Compter les notifications non lues
router.get('/count', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const count = await InAppNotificationService.getUnreadCount(userId);
    
    res.json({ count });
  } catch (e: any) {
    console.error('Erreur comptage notifications:', e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/notifications/:id/read - Marquer une notification comme lue
router.put('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }
    
    const success = await InAppNotificationService.markAsRead(notificationId, userId);
    
    if (success) {
      res.json({ ok: true, message: 'Notification marquée comme lue' });
    } else {
      res.status(404).json({ error: 'Notification introuvable' });
    }
  } catch (e: any) {
    console.error('Erreur marquage notification lue:', e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const count = await InAppNotificationService.markAllAsRead(userId);
    
    res.json({ ok: true, count, message: `${count} notification(s) marquée(s) comme lue(s)` });
  } catch (e: any) {
    console.error('Erreur marquage toutes notifications lues:', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/notifications/:id - Supprimer une notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const notificationId = parseInt(req.params.id);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'ID de notification invalide' });
    }
    
    const success = await InAppNotificationService.deleteNotification(notificationId, userId);
    
    if (success) {
      res.json({ ok: true, message: 'Notification supprimée' });
    } else {
      res.status(404).json({ error: 'Notification introuvable' });
    }
  } catch (e: any) {
    console.error('Erreur suppression notification:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/test - Créer une notification de test
router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    
    const notificationId = await InAppNotificationService.createCustom(
      userId,
      '🧪 Notification de test',
      'Ceci est une notification de test pour vérifier que le système fonctionne correctement.',
      'info',
      { test: true, timestamp: new Date().toISOString() }
    );
    
    if (notificationId) {
      res.json({ ok: true, id: notificationId, message: 'Notification de test créée' });
    } else {
      res.status(500).json({ error: 'Erreur création notification de test' });
    }
  } catch (e: any) {
    console.error('Erreur création notification test:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/notifications/cleanup - Nettoyer les anciennes notifications
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const daysOld = parseInt(req.body.days) || 30;
    
    const deletedCount = await InAppNotificationService.cleanupOldNotifications(daysOld);
    
    res.json({ 
      ok: true, 
      deleted: deletedCount, 
      message: `${deletedCount} ancienne(s) notification(s) supprimée(s)` 
    });
  } catch (e: any) {
    console.error('Erreur nettoyage notifications:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

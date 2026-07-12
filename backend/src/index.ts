// ⚠️ doit être le tout premier import : charge le .env AVANT l'évaluation des autres modules
// (les imports ES sont hoistés, un `dotenv.config()` classique s'exécuterait trop tard)
import 'dotenv/config';

import './mongoose-setup.js'; // Must be before any model/route imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import coreRoutes from './routes/core.js';
import authRoutes from './routes/auth.js';
import prestatairesRoutes from './routes/prestataires.js';
import servicesRoutes from './routes/services.js';
import subscriptionRoutes from './routes/subscription.js';
import reservationsRoutes from './routes/reservations.js';
import publicationsRoutes from './routes/publications.js';
import favoritesRoutes from './routes/favorites.js';
import usersRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import prestataireReservationsRoutes from './routes/prestataire-reservations.js';
import pushTokensRoutes from './routes/push-tokens.js';
import notificationsRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import avisRoutes from './routes/avis.js';
import notificationPreferencesRoutes from './routes/notification-preferences.js';
import waveTransactionsRoutes from './routes/wave-transactions.js';
import adminWaveTransactionsRoutes from './routes/admin-wave-transactions.js';
import adminUsersRoutes from './routes/admin-users.js';
import adminServicesRoutes from './routes/admin-services.js';
import adminCategoriesRoutes from './routes/admin-categories.js';
import adminReservationsRoutes from './routes/admin-reservations.js';
import adminAvisRoutes from './routes/admin-avis.js';
import adminNotificationsRoutes from './routes/admin-notifications.js';
import adminStatisticsRoutes from './routes/admin-statistics.js';
import adminPlansRoutes from './routes/admin-plans.js';
import adminMaintenanceRoutes from './routes/admin-maintenance.js';
import signalementsRoutes from './routes/signalements.js';
import adminSignalementsRoutes from './routes/admin-signalements.js';
import adminVerificationsRoutes from './routes/admin-verifications.js';
import avisClientRoutes from './routes/avis-client.js';
import ticketsSupportRoutes from './routes/tickets-support.js';
import conversationsRoutes from './routes/conversations.js';
import demandesRoutes from './routes/demandes.js';
import geoRoutes from './routes/geo.js';
import adminTicketsSupportRoutes from './routes/admin-tickets-support.js';
import { connectDB } from './db.js';
import { logger } from './logger.js';
import { UPLOADS_DIR, getUploadsBucket } from './utils/uploads.js';
import { startReminderLoop } from './services/reminders.js';

const app = express();
const normalizeOrigin = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed;
  }
};

const RAW_FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => normalizeOrigin(origin))
  .filter(Boolean) as string[];

const corsLogger = (origin: string | undefined) => {
  const formatted = origin ? normalizeOrigin(origin) : 'local (same origin)';
  console.log(`CORS check for origin: ${formatted}`);
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    corsLogger(origin);
    if (!origin) {
      return callback(null, true);
    }
    const normalized = normalizeOrigin(origin);
    if (normalized && RAW_FRONTEND_ORIGINS.includes(normalized)) {
      return callback(null, true);
    }
    // Tunnels de démo (Cloudflare Quick Tunnel) : domaine aléatoire à chaque lancement,
    // impossible à figer dans FRONTEND_ORIGIN. Autorisé uniquement hors production.
    if (process.env.NODE_ENV !== 'production' && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // handled by frontend
}));

// Rate limiting — global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans quelques minutes' },
});
app.use(globalLimiter);

// Rate limiting — auth (strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Request logging middleware (writes to logs/app.log)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.request(req.method, req.path, res.statusCode, ms);
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Fichiers uploadés (photos de services, profils, publications…)
// Source primaire : GridFS (MongoDB) — survit aux redéploiements, contrairement
// au disque éphémère de Render. Le statique disque reste en fallback pour les
// anciens fichiers locaux de dev.
app.get('/uploads/:name', async (req, res, next) => {
  try {
    const name = req.params.name;
    if (!/^[\w][\w.-]*$/.test(name)) return res.status(400).json({ error: 'Nom de fichier invalide' });
    const bucket = getUploadsBucket();
    const files = await bucket.find({ filename: name }).limit(1).toArray();
    if (files.length === 0) return next();
    res.setHeader('Content-Type', (files[0].metadata as any)?.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(files[0].length));
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    bucket.openDownloadStreamByName(name)
      .on('error', () => { if (!res.headersSent) next(); else res.end(); })
      .pipe(res);
  } catch {
    next();
  }
});
app.use('/uploads', express.static(UPLOADS_DIR, {
  maxAge: '30d',
  immutable: true,
  fallthrough: true,
}));

// 🔹 Routes
app.use('/api', coreRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/prestataires', prestatairesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/publications', publicationsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prestataire/reservations', prestataireReservationsRoutes);
app.use('/api/push-tokens', pushTokensRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/avis', avisRoutes);
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/wave-transactions', waveTransactionsRoutes);
app.use('/api/admin/wave-transactions', adminWaveTransactionsRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/services', adminServicesRoutes);
app.use('/api/admin/categories', adminCategoriesRoutes);
app.use('/api/admin/reservations', adminReservationsRoutes);
app.use('/api/admin/avis', adminAvisRoutes);
app.use('/api/admin/notifications', adminNotificationsRoutes);
app.use('/api/admin/statistics', adminStatisticsRoutes);
app.use('/api/admin/plans', adminPlansRoutes);
app.use('/api/admin/maintenance', adminMaintenanceRoutes);
app.use('/api/signalements', signalementsRoutes);
app.use('/api/admin/signalements', adminSignalementsRoutes);
app.use('/api/admin/verifications', adminVerificationsRoutes);
app.use('/api/avis-client', avisClientRoutes);
app.use('/api/tickets', ticketsSupportRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/admin/tickets', adminTicketsSupportRoutes);

// Sitemap accessible à la racine (les crawlers cherchent /sitemap.xml)
app.get('/sitemap.xml', (_req, res) => res.redirect(301, '/api/sitemap.xml'));

// Root endpoint with API info
app.get('/', (_req, res) => res.json({ 
  name: 'PrestaCI Backend', 
  version: '0.1.0',
  status: 'running',
  timestamp: new Date().toISOString(),
  endpoints: {
    health: '/api/health',
    auth: '/api/auth',
    categories: '/api/categories',
    prestataires: '/api/prestataires',
    services: '/api/services',
    reservations: '/api/reservations',
    publications: '/api/publications',
    favorites: '/api/favorites',
    users: '/api/users',
    subscription: '/api/subscription'
  }
}));

// 404 handler for undefined routes
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Global error handling middleware (must be last)
app.use((err: any, req: any, res: any, next: any) => {
  logger.error(`Global error handler: ${err.message || err}`);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message 
  });
});

const port = Number(process.env.PORT || 4000);

(async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB Atlas');
    startReminderLoop();
    app.listen(port, () => logger.info(`Server running on http://localhost:${port}`));
  } catch (err: any) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }
})();

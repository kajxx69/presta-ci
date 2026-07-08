import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { User, Service, Reservation, Avis, StatutReservation, Category, SubCategory, Prestataire } from '../models/index.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireRole('admin'));

// GET /api/admin/statistics/overview
// Shape unifiée consommée à la fois par AdminDashboard.tsx et AdminStatistics.tsx
// (deux composants historiquement écrits contre des shapes différentes du même endpoint).
router.get('/overview', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;
    const since = new Date(Date.now() - days * 86400000);
    const prevSince = new Date(Date.now() - days * 2 * 86400000);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const monthAgo = new Date(Date.now() - 30 * 86400000);

    const [termineeStatut, confirmeeStatut, enAttenteStatut] = await Promise.all([
      StatutReservation.findOne({ nom: 'terminee' }),
      StatutReservation.findOne({ nom: 'confirmee' }),
      StatutReservation.findOne({ nom: 'en_attente' })
    ]);
    const termineeId = termineeStatut?._id;
    const confirmeeId = confirmeeStatut?._id;
    const enAttenteId = enAttenteStatut?._id;

    const [
      total_clients, total_prestataires, total_services, services_actifs, all_reservations,
      avis_all, nouveaux_users, nouveaux_services, nouveaux_avis,
      users_today, users_week, users_month,
      prev_users, prev_services, prestataires_actifs
    ] = await Promise.all([
      User.countDocuments({ role_id: 1 }),
      User.countDocuments({ role_id: 2 }),
      Service.countDocuments({ deleted_at: null }),
      Service.countDocuments({ deleted_at: null, is_active: true }),
      Reservation.find().select('statut_id prix_final created_at client_id prestataire_id'),
      Avis.find({ is_visible: true }).select('note'),
      User.countDocuments({ created_at: { $gte: since } }),
      Service.countDocuments({ deleted_at: null, created_at: { $gte: since } }),
      Avis.countDocuments({ is_visible: true, created_at: { $gte: since } }),
      User.countDocuments({ created_at: { $gte: today } }),
      User.countDocuments({ created_at: { $gte: weekAgo } }),
      User.countDocuments({ created_at: { $gte: monthAgo } }),
      User.countDocuments({ created_at: { $gte: prevSince, $lt: since } }),
      Service.countDocuments({ deleted_at: null, created_at: { $gte: prevSince, $lt: since } }),
      Prestataire.countDocuments({ abonnement_expires_at: { $gte: new Date() } })
    ]);

    const terminees = termineeId ? all_reservations.filter(r => String(r.statut_id) === String(termineeId)) : [];
    const confirmees = confirmeeId ? all_reservations.filter(r => String(r.statut_id) === String(confirmeeId)) : [];
    const enAttente = enAttenteId ? all_reservations.filter(r => String(r.statut_id) === String(enAttenteId)) : [];
    const revenus_totaux = terminees.reduce((s, r) => s + (r.prix_final || 0), 0);
    const note_moyenne = avis_all.length > 0 ? avis_all.reduce((s, a) => s + a.note, 0) / avis_all.length : 0;

    const nouvelles_reservations = all_reservations.filter(r => r.created_at >= since).length;
    const prev_reservations = all_reservations.filter(r => r.created_at >= prevSince && r.created_at < since).length;
    const revenus_periode = terminees.filter(r => r.created_at >= since).reduce((s, r) => s + (r.prix_final || 0), 0);
    const prev_revenus = terminees.filter(r => r.created_at >= prevSince && r.created_at < since).reduce((s, r) => s + (r.prix_final || 0), 0);

    const taux_completion = all_reservations.length > 0 ? parseFloat(((terminees.length / all_reservations.length) * 100).toFixed(2)) : 0;

    const growthPercent = (current: number, previous: number) =>
      previous > 0 ? parseFloat((((current - previous) / previous) * 100).toFixed(1)) : (current > 0 ? 100 : 0);

    // Revenue by month (last 6 months) — sert de base au graphe "data"/"revenue_trend"
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
    const recentTerminees = terminees.filter(r => r.created_at >= sixMonthsAgo);
    const revenueByMonth: Record<string, number> = {};
    recentTerminees.forEach(r => {
      const key = r.created_at.toISOString().slice(0, 7);
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (r.prix_final || 0);
    });
    const revenue_by_month = Object.entries(revenueByMonth)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const alerts: { type: string; message: string; severity: 'info' | 'warning' | 'error' }[] = [];
    if (enAttente.length > 0) alerts.push({ type: 'reservations_pending', message: `${enAttente.length} réservation(s) en attente`, severity: 'warning' });

    res.json({
      // Legacy (conservé pour compatibilité avec d'éventuels autres consommateurs)
      general: { total_clients, total_prestataires, total_services, total_reservations: all_reservations.length, reservations_terminees: terminees.length, revenus_totaux, note_moyenne_globale: parseFloat(note_moyenne.toFixed(1)), total_avis_approuves: avis_all.length },
      charts: { revenue_by_month, new_users_today: users_today, new_users_week: users_week, new_users_month: users_month },

      // Shape attendue par AdminDashboard.tsx
      users: { total: total_clients + total_prestataires, new_period: nouveaux_users, growth_percent: growthPercent(nouveaux_users, prev_users) },
      services: { total: total_services, active: services_actifs, growth_percent: growthPercent(nouveaux_services, prev_services) },
      reservations: {
        total: all_reservations.length, confirmed: confirmees.length, pending: enAttente.length,
        growth_percent: growthPercent(nouvelles_reservations, prev_reservations)
      },
      revenue: {
        total: revenus_totaux, period_total: revenus_periode, growth_percent: growthPercent(revenus_periode, prev_revenus),
        data: revenue_by_month.map(r => ({ label: r.month, value: r.revenue }))
      },
      performance: {
        conversion_rate: taux_completion, avg_rating: parseFloat(note_moyenne.toFixed(1)), avg_response_time: 0,
        completion_rate: taux_completion, conversion_prestataires: total_prestataires > 0 ? parseFloat(((prestataires_actifs / total_prestataires) * 100).toFixed(1)) : 0,
        avis_rate: all_reservations.length > 0 ? parseFloat(((avis_all.length / terminees.length || 0) * 100).toFixed(1)) : 0,
        note_moyenne: parseFloat(note_moyenne.toFixed(1))
      },

      // Shape attendue par AdminStatistics.tsx
      revenue_trend: revenue_by_month.map(r => ({ period: r.month, amount: r.revenue })),
      growth: {
        nouveaux_utilisateurs: nouveaux_users, nouveaux_services, nouvelles_reservations, revenus_periode, nouveaux_avis,
        new_users: nouveaux_users, new_services: nouveaux_services, new_reservations: nouvelles_reservations, revenue: revenus_periode,
        snapshot: { today: users_today, week: users_week, month: users_month }
      },
      conversion: { taux_completion_reservations: taux_completion },
      alerts,

      period
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/admin/statistics/revenue
router.get('/revenue', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;
    else if (period === '1y') days = 365;
    const since = new Date(Date.now() - days * 86400000);

    const termineeStatut = await StatutReservation.findOne({ nom: 'terminee' });
    const termineeId = termineeStatut?._id;
    const terminees = termineeId
      ? await Reservation.find({ statut_id: termineeId, created_at: { $gte: since } }).select('prix_final created_at client_id prestataire_id service_id')
      : [];

    // Revenue by day
    const revenueByDay: Record<string, { count: number; revenue: number; clients: Set<number>; prestataires: Set<number> }> = {};
    terminees.forEach(r => {
      const key = r.created_at.toISOString().slice(0, 10);
      if (!revenueByDay[key]) revenueByDay[key] = { count: 0, revenue: 0, clients: new Set(), prestataires: new Set() };
      revenueByDay[key].count++;
      revenueByDay[key].revenue += r.prix_final || 0;
      revenueByDay[key].clients.add(r.client_id);
      revenueByDay[key].prestataires.add(r.prestataire_id);
    });
    const revenueByPeriod = Object.entries(revenueByDay).map(([periode, v]) => ({
      periode,
      nombre_reservations: v.count,
      revenus_totaux: v.revenue,
      panier_moyen: v.count > 0 ? parseFloat((v.revenue / v.count).toFixed(0)) : 0,
      clients_uniques: v.clients.size,
      prestataires_actifs: v.prestataires.size
    })).sort((a, b) => b.periode.localeCompare(a.periode));

    // Revenue by category — service_id (sur Reservation) référence Service._id, pas SubCategory._id :
    // il faut passer par Service pour retrouver quels services appartiennent à chaque catégorie.
    const categories = await Category.find();
    const revenueByCategory = await Promise.all(categories.map(async (c) => {
      const subCats = await SubCategory.find({ categorie_id: c._id }).select('_id');
      const subCatIds = subCats.map(s => s._id);
      const services = subCatIds.length > 0 ? await Service.find({ sous_categorie_id: { $in: subCatIds } }).select('_id') : [];
      const serviceIds = new Set(services.map(s => s._id));
      const catReservations = terminees.filter(r => serviceIds.has(r.service_id));
      const rev = catReservations.reduce((s, r) => s + (r.prix_final || 0), 0);
      return { categorie: c.nom, nombre_reservations: catReservations.length, revenus_totaux: rev };
    }));

    res.json({ revenueByPeriod, revenueByCategory: revenueByCategory.filter(c => c.revenus_totaux > 0).sort((a, b) => b.revenus_totaux - a.revenus_totaux), period });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

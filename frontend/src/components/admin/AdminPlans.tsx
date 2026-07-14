import { useState, useEffect, useCallback } from 'react';
import { Package, Check, Crown, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, LoadingSpinner, EmptyState,
  SectionHeader, RefreshButton, Modal,
  formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: number;
  nom: string;
  description: string;
  prix: number;
  devise: string;
  max_services?: number;
  max_reservations_mois?: number;
  max_photos_par_service?: number;
  avantages?: string[];
  is_active: boolean;
  is_popular?: boolean;
}

interface PlanFormState {
  nom: string;
  description: string;
  prix: string;
  max_services: string;
  max_reservations_mois: string;
  max_photos_par_service: string;
  avantages: string; // une ligne par avantage dans le textarea, jointes par \n
  is_popular: boolean;
}

const EMPTY_FORM: PlanFormState = {
  nom: '', description: '', prix: '', max_services: '',
  max_reservations_mois: '', max_photos_par_service: '5', avantages: '', is_popular: false,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPlans() {
  const { showToast } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ── Data loader ──────────────────────────────────────────────────────────

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.plans.getAll(true);
      const list = Array.isArray(data) ? data : data?.plans || [];
      setPlans(list);
    } catch (err: any) {
      showToast('Erreur chargement des plans: ' + (err.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingPlan(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      nom: plan.nom,
      description: plan.description || '',
      prix: String(plan.prix),
      max_services: plan.max_services != null ? String(plan.max_services) : '',
      max_reservations_mois: plan.max_reservations_mois != null ? String(plan.max_reservations_mois) : '',
      max_photos_par_service: plan.max_photos_par_service != null ? String(plan.max_photos_par_service) : '5',
      avantages: (plan.avantages || []).join('\n'),
      is_popular: !!plan.is_popular,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.description.trim() || form.prix === '' || !form.max_services) {
      showToast('Nom, description, prix et nombre max de services sont requis', 'error');
      return;
    }
    const prix = Number(form.prix);
    const max_services = Number(form.max_services);
    if (!Number.isFinite(prix) || prix < 0) { showToast('Prix invalide', 'error'); return; }
    if (!Number.isInteger(max_services) || max_services <= 0) { showToast('Nombre max de services invalide', 'error'); return; }

    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim(),
      prix,
      max_services,
      max_reservations_mois: form.max_reservations_mois ? Number(form.max_reservations_mois) : null,
      max_photos_par_service: form.max_photos_par_service ? Number(form.max_photos_par_service) : 5,
      avantages: form.avantages.split('\n').map(l => l.trim()).filter(Boolean),
      is_popular: form.is_popular,
    };

    setSaving(true);
    try {
      if (editingPlan) {
        await api.admin.plans.update(editingPlan.id, payload);
        showToast('Plan mis à jour', 'success');
      } else {
        await api.admin.plans.create(payload);
        showToast('Plan créé', 'success');
      }
      setFormOpen(false);
      await loadPlans();
    } catch (err: any) {
      showToast(err.message || "Erreur lors de l'enregistrement", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    setTogglingId(plan.id);
    try {
      await api.admin.plans.update(plan.id, { is_active: !plan.is_active });
      showToast(plan.is_active ? 'Plan désactivé' : 'Plan réactivé', 'success');
      await loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du changement de statut', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.plans.delete(deleteTarget.id);
      showToast('Plan supprimé', 'success');
      setDeleteTarget(null);
      await loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Impossible de supprimer ce plan', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Chargement des plans..." />;

  const inputClass = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Plans d'abonnement" subtitle={`${plans.length} plan(s) configures`}>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau plan
        </button>
        <RefreshButton onClick={loadPlans} loading={loading} />
      </SectionHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total plans"
          value={plans.length}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Plans actifs"
          value={plans.filter(p => p.is_active).length}
          icon={Check}
          color="green"
        />
        <StatCard
          title="Plan le plus cher"
          value={plans.length > 0 ? formatCurrency(Math.max(...plans.map(p => p.prix)), plans[0]?.devise || 'FCFA') : '—'}
          icon={Crown}
          color="purple"
        />
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <EmptyState icon={Package} message="Aucun plan d'abonnement configure" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Plan header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.nom}</h3>
                  <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="px-6 py-4 border-t border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(plan.prix, plan.devise || 'FCFA')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  pour 30 jours — le prestataire choisit sa durée réelle (1, 3, 6 ou 12 mois) au paiement
                </p>
              </div>

              {/* Features */}
              <div className="p-6 pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    Max services :{' '}
                    <span className="font-medium">
                      {plan.max_services != null ? plan.max_services : 'Illimite'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>
                    Max photos/service :{' '}
                    <span className="font-medium">
                      {plan.max_photos_par_service != null ? plan.max_photos_par_service : 'Illimite'}
                    </span>
                  </span>
                </div>
                {plan.avantages && plan.avantages.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    {plan.avantages.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex items-center gap-2">
                <button
                  onClick={() => openEditForm(plan)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Modifier
                </button>
                <button
                  onClick={() => handleToggleActive(plan)}
                  disabled={togglingId === plan.id}
                  title={plan.is_active ? 'Désactiver' : 'Réactiver'}
                  className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
                    plan.is_active
                      ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(plan)}
                  title="Supprimer"
                  className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit form modal */}
      {formOpen && (
        <Modal
          title={editingPlan ? 'Modifier le plan' : 'Nouveau plan'}
          subtitle="Abonnement prestataire"
          onClose={() => setFormOpen(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nom *</label>
              <input className={inputClass} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex : Premium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Description *</label>
              <textarea className={inputClass} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Prix (FCFA) *</label>
                <input type="number" min={0} className={inputClass} value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Max services *</label>
                <input type="number" min={1} className={inputClass} value={form.max_services} onChange={e => setForm(f => ({ ...f, max_services: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Max réservations/mois</label>
                <input type="number" min={0} className={inputClass} value={form.max_reservations_mois} onChange={e => setForm(f => ({ ...f, max_reservations_mois: e.target.value }))} placeholder="Illimité si vide" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Max photos/service</label>
                <input type="number" min={0} className={inputClass} value={form.max_photos_par_service} onChange={e => setForm(f => ({ ...f, max_photos_par_service: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Avantages affichés au prestataire (un par ligne)</label>
              <textarea
                className={inputClass}
                rows={5}
                value={form.avantages}
                onChange={e => setForm(f => ({ ...f, avantages: e.target.value }))}
                placeholder={'Ex :\n10 services maximum\nBadge vérifié ✓\nDemandes Express en accès anticipé'}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} />
              Mettre en avant comme plan populaire
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : editingPlan ? 'Mettre à jour' : 'Créer le plan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal title="Confirmation" subtitle="Suppression du plan" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Etes-vous sur de vouloir supprimer le plan <span className="font-semibold">{deleteTarget.nom}</span> ?
              Cette action est impossible s'il a des abonnements actifs.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

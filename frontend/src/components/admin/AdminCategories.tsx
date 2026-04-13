import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, FolderOpen, GripVertical, ChevronRight,
  Layers, Tag, Palette, AlertTriangle, ToggleLeft, ToggleRight, Package
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, SearchInput, FilterSelect, LoadingSpinner, EmptyState,
  Pagination, Modal, SectionHeader, RefreshButton, ResetButton,
  formatDate, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: number;
  nom: string;
  description: string;
  icone?: string;
  couleur?: string;
  services_count: number;
  sous_categories_count: number;
}

interface SubCategory {
  id: number;
  nom: string;
  description?: string;
  is_active: boolean;
  nombre_services?: number;
  categorie_id?: number;
  icone?: string;
  ordre_affichage?: number;
}

interface CategoryFormData {
  nom: string;
  description: string;
  icone: string;
  couleur: string;
}

interface SubCategoryFormData {
  nom: string;
  description: string;
}

interface ConfirmAction {
  type: 'delete_category' | 'delete_subcategory';
  id: number;
  name: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminCategories() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');

  // Category form modal
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({ nom: '', description: '', icone: '', couleur: '#3B82F6' });

  // Subcategory modal
  const [subModalCategory, setSubModalCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm] = useState<SubCategoryFormData>({ nom: '', description: '' });
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.categories.getAll(true);
      setCategories(data.categories || data || []);
    } catch (err: any) {
      showToast('Erreur lors du chargement des categories', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const loadSubCategories = useCallback(async (categoryId: number) => {
    setSubLoading(true);
    try {
      const data = await api.admin.categories.getSubCategories({ categorie_id: categoryId, include_inactive: true });
      setSubCategories(data.subCategories || data.sous_categories || data || []);
    } catch (err: any) {
      showToast('Erreur lors du chargement des sous-categories', 'error');
      console.error(err);
    } finally {
      setSubLoading(false);
    }
  }, [showToast]);

  // ── Filtered categories ──────────────────────────────────────────────────

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [categories, search]);

  // ── Category CRUD ────────────────────────────────────────────────────────

  const openCategoryForm = useCallback((category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ nom: category.nom, description: category.description, icone: category.icone || '', couleur: category.couleur || '#3B82F6' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ nom: '', description: '', icone: '', couleur: '#3B82F6' });
    }
    setShowCategoryForm(true);
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!categoryForm.nom.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const payload: any = {
        nom: categoryForm.nom.trim(),
        description: categoryForm.description.trim(),
      };
      if (categoryForm.icone.trim()) payload.icone = categoryForm.icone.trim();
      if (categoryForm.couleur) payload.couleur = categoryForm.couleur;

      if (editingCategory) {
        await api.admin.categories.update(editingCategory.id, payload);
        showToast('Categorie modifiee avec succes', 'success');
      } else {
        await api.admin.categories.create(payload);
        showToast('Categorie creee avec succes', 'success');
      }
      setShowCategoryForm(false);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [categoryForm, editingCategory, loadCategories, showToast]);

  const handleDeleteCategory = useCallback(async (id: number) => {
    setActionLoading(true);
    try {
      await api.admin.categories.delete(id);
      showToast('Categorie supprimee avec succes', 'success');
      setConfirmAction(null);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadCategories, showToast]);

  // ── SubCategory CRUD ─────────────────────────────────────────────────────

  const openSubModal = useCallback((category: Category) => {
    setSubModalCategory(category);
    setSubForm({ nom: '', description: '' });
    setEditingSub(null);
    loadSubCategories(category.id);
  }, [loadSubCategories]);

  const handleAddSubCategory = useCallback(async () => {
    if (!subModalCategory || !subForm.nom.trim()) {
      showToast('Le nom est requis', 'error');
      return;
    }
    setActionLoading(true);
    try {
      if (editingSub) {
        await api.admin.categories.updateSubCategory(editingSub.id, {
          nom: subForm.nom.trim(),
          description: subForm.description.trim(),
        });
        showToast('Sous-categorie modifiee', 'success');
        setEditingSub(null);
      } else {
        await api.admin.categories.createSubCategory(subModalCategory.id, {
          nom: subForm.nom.trim(),
          description: subForm.description.trim(),
        });
        showToast('Sous-categorie ajoutee', 'success');
      }
      setSubForm({ nom: '', description: '' });
      loadSubCategories(subModalCategory.id);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [subModalCategory, subForm, editingSub, loadSubCategories, loadCategories, showToast]);

  const handleToggleSubCategory = useCallback(async (sub: SubCategory) => {
    if (!subModalCategory) return;
    try {
      await api.admin.categories.updateSubCategory(sub.id, { is_active: !sub.is_active });
      showToast(sub.is_active ? 'Sous-categorie desactivee' : 'Sous-categorie activee', 'success');
      loadSubCategories(subModalCategory.id);
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'error');
    }
  }, [subModalCategory, loadSubCategories, showToast]);

  const handleDeleteSubCategory = useCallback(async (id: number) => {
    if (!subModalCategory) return;
    setActionLoading(true);
    try {
      await api.admin.categories.deleteSubCategory(id);
      showToast('Sous-categorie supprimee', 'success');
      setConfirmAction(null);
      loadSubCategories(subModalCategory.id);
      loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [subModalCategory, loadSubCategories, loadCategories, showToast]);

  const startEditSub = useCallback((sub: SubCategory) => {
    setEditingSub(sub);
    setSubForm({ nom: sub.nom, description: sub.description || '' });
  }, []);

  const cancelEditSub = useCallback(() => {
    setEditingSub(null);
    setSubForm({ nom: '', description: '' });
  }, []);

  // ── Drag & drop ──────────────────────────────────────────────────────────

  const onDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDrop = useCallback(async (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex || !subModalCategory) return;

    const reordered = [...subCategories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setSubCategories(reordered);
    setDragIndex(null);

    try {
      const order = reordered.map((s, i) => ({ id: s.id, ordre_affichage: i + 1 }));
      await api.admin.categories.reorderSubCategories(subModalCategory.id, order);
      showToast('Ordre mis a jour', 'success');
    } catch (err: any) {
      showToast('Erreur lors du reordonnancement', 'error');
      loadSubCategories(subModalCategory.id);
    }
  }, [dragIndex, subCategories, subModalCategory, loadSubCategories, showToast]);

  // ── Confirm action handler ───────────────────────────────────────────────

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete_category') {
      await handleDeleteCategory(confirmAction.id);
    } else if (confirmAction.type === 'delete_subcategory') {
      await handleDeleteSubCategory(confirmAction.id);
    }
  }, [confirmAction, handleDeleteCategory, handleDeleteSubCategory]);

  // ── Icon helper ──────────────────────────────────────────────────────────

  const getCategoryIcon = (category: Category) => {
    const color = category.couleur || '#3B82F6';
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {category.icone || category.nom.charAt(0).toUpperCase()}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && !categories.length) return <LoadingSpinner message="Chargement des categories..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Categories et sous-categories" subtitle="Gerer les categories de services">
        <RefreshButton onClick={loadCategories} loading={loading} />
      </SectionHeader>

      {/* Search + Add button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher une categorie..."
          className="flex-1"
        />
        <button
          onClick={() => openCategoryForm()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Nouvelle categorie
        </button>
      </div>

      {/* Category list */}
      {filteredCategories.length === 0 ? (
        <EmptyState icon={FolderOpen} message="Aucune categorie trouvee" action={{ label: 'Creer une categorie', onClick: () => openCategoryForm() }} />
      ) : (
        <div className="space-y-3">
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                {getCategoryIcon(category)}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{category.nom}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{category.description}</p>
                </div>

                {/* Counts */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{category.sous_categories_count} sous-cat.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>{category.services_count} services</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openSubModal(category)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Sous-categories</span>
                  </button>
                  <button
                    onClick={() => openCategoryForm(category)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ type: 'delete_category', id: category.id, name: category.nom })}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {showCategoryForm && (
        <Modal
          onClose={() => setShowCategoryForm(false)}
          title={editingCategory ? 'Modifier la categorie' : 'Nouvelle categorie'}
          subtitle="Formulaire categorie"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
              <input
                type="text"
                value={categoryForm.nom}
                onChange={(e) => setCategoryForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Nom de la categorie"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description de la categorie"
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icone (emoji/texte)</label>
                <input
                  type="text"
                  value={categoryForm.icone}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, icone: e.target.value }))}
                  placeholder="Ex: B, H, ..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Couleur</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={categoryForm.couleur}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, couleur: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryForm.couleur}
                    onChange={(e) => setCategoryForm((f) => ({ ...f, couleur: e.target.value }))}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCategoryForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={actionLoading || !categoryForm.nom.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors"
              >
                {actionLoading ? 'En cours...' : editingCategory ? 'Modifier' : 'Creer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subcategory Modal */}
      {subModalCategory && (
        <Modal
          onClose={() => { setSubModalCategory(null); setEditingSub(null); }}
          title={`Sous-categories : ${subModalCategory.nom}`}
          subtitle={subModalCategory.description}
        >
          <div className="space-y-4">
            {/* Summary card */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{subCategories.length} sous-categories</span>
                <span className="text-gray-400">|</span>
                <span>{subCategories.reduce((sum, s) => sum + (s.nombre_services || 0), 0)} services</span>
              </div>
              <RefreshButton onClick={() => loadSubCategories(subModalCategory.id)} loading={subLoading} label="Actualiser" />
            </div>

            {/* Add / Edit form */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-3">
                {editingSub ? 'Modifier la sous-categorie' : 'Ajouter une sous-categorie'}
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={subForm.nom}
                  onChange={(e) => setSubForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Nom de la sous-categorie"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                <input
                  type="text"
                  value={subForm.description}
                  onChange={(e) => setSubForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optionnel)"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                />
                <div className="flex items-center gap-2">
                  {editingSub && (
                    <button
                      onClick={cancelEditSub}
                      className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleAddSubCategory}
                    disabled={actionLoading || !subForm.nom.trim()}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                  >
                    {actionLoading ? 'En cours...' : editingSub ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </div>

            {/* Subcategory list */}
            {subLoading ? (
              <LoadingSpinner message="Chargement..." />
            ) : subCategories.length === 0 ? (
              <EmptyState icon={Layers} message="Aucune sous-categorie" />
            ) : (
              <div className="space-y-2">
                {subCategories.map((sub, index) => (
                  <div
                    key={sub.id}
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop(index)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${
                      dragIndex === index
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 opacity-60'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{sub.nom}</div>
                      {sub.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub.description}</div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      <span>{sub.nombre_services ?? 0} serv.</span>
                      {sub.ordre_affichage != null && (
                        <span className="text-gray-400">#{sub.ordre_affichage}</span>
                      )}
                    </div>

                    {/* Status */}
                    <StatusBadge status={sub.is_active ? 'active' : 'inactive'} />

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEditSub(sub)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleSubCategory(sub)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sub.is_active
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={sub.is_active ? 'Desactiver' : 'Activer'}
                      >
                        {sub.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'delete_subcategory', id: sub.id, name: sub.nom })}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmAction && (
        <Modal
          onClose={() => setConfirmAction(null)}
          title={confirmAction.type === 'delete_category' ? 'Supprimer la categorie' : 'Supprimer la sous-categorie'}
          subtitle="Confirmation"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Etes-vous sur de vouloir supprimer <strong>"{confirmAction.name}"</strong> ?
                {confirmAction.type === 'delete_category' && ' Toutes les sous-categories associees seront egalement supprimees.'}
                {' '}Cette action est irreversible.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl transition-colors"
              >
                {actionLoading ? 'En cours...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

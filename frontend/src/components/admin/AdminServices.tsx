import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase, CheckCircle, DollarSign, BarChart3, Eye, Trash2,
  Ban, PlayCircle, Star, AlertTriangle, Package
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  StatCard, StatusBadge, SearchInput, FilterSelect, LoadingSpinner, EmptyState,
  Pagination, Modal, SectionHeader, RefreshButton, ResetButton,
  TableContainer, TableHead,
  formatDate, formatCurrency
} from './AdminShared';

// ── Types ────────────────────────────────────────────────────────────────────

interface Service {
  id: number;
  nom: string;
  description: string;
  prix: number;
  devise?: string;
  categorie_nom: string;
  sous_categorie_nom?: string;
  prestataire_nom: string;
  prestataire_email?: string;
  is_active: boolean;
  created_at: string;
  total_reservations?: number;
  moyenne_avis?: number;
}

interface ServiceStatsOverview {
  overview: {
    total_services: number;
    services_actifs: number;
    services_suspendus: number;
    nouveaux_ce_mois: number;
    prix_moyen: number;
  };
  topCategories: Array<{ categorie: string; nombre_services: number }>;
  topPrestataires: Array<{ prestataire: string; email: string; nombre_services: number; moyenne_avis: number }>;
}

interface ConfirmAction {
  type: 'suspend' | 'activate' | 'delete';
  service: Service;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SortOption = 'recent' | 'price_desc' | 'price_asc' | 'rating';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminServices() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ServiceStatsOverview | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const LIMIT = 15;

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const [servicesData, statsData] = await Promise.all([
        api.admin.services.getAll(params),
        api.admin.services.getStats(),
      ]);

      setServices(servicesData.services || servicesData.data || []);
      setTotalPages(servicesData.pagination?.totalPages || 1);
      setTotal(servicesData.pagination?.total || 0);
      setStats(statsData);
    } catch (err: any) {
      showToast('Erreur lors du chargement des services', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // ── Filtered & sorted ────────────────────────────────────────────────────

  const filteredServices = useMemo(() => {
    let result = [...services];

    if (sort === 'price_desc') result.sort((a, b) => b.prix - a.prix);
    else if (sort === 'price_asc') result.sort((a, b) => a.prix - b.prix);
    else if (sort === 'rating') result.sort((a, b) => (b.moyenne_avis || 0) - (a.moyenne_avis || 0));
    // 'recent' keeps server order

    return result;
  }, [services, sort]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleViewDetails = useCallback(async (service: Service) => {
    try {
      const detail = await api.admin.services.getById(service.id);
      setSelectedService(detail.service || detail);
    } catch {
      setSelectedService(service);
    }
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'delete') {
        await api.admin.services.delete(confirmAction.service.id);
        showToast('Service supprime avec succes', 'success');
      } else {
        const newActive = confirmAction.type === 'activate';
        await api.admin.services.updateStatus(confirmAction.service.id, newActive);
        showToast(newActive ? 'Service active avec succes' : 'Service suspendu avec succes', 'success');
      }
      setConfirmAction(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l\'action', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [confirmAction, loadData, showToast]);

  // ── Stats cards ──────────────────────────────────────────────────────────

  const topCategory = useMemo(() => {
    if (!stats?.topCategories?.length) return 'N/A';
    return stats.topCategories[0].categorie;
  }, [stats]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && !services.length) return <LoadingSpinner message="Chargement des services..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Gestion des services" subtitle="Superviser et gerer les services proposes par les prestataires">
        <ResetButton onClick={() => { setSearch(''); setStatusFilter('all'); setSort('recent'); setPage(1); }} label="Reinitialiser" />
        <RefreshButton onClick={loadData} loading={loading} />
      </SectionHeader>

      {/* Stats */}
      {stats?.overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total services"
            value={stats.overview.total_services}
            icon={Briefcase}
            color="blue"
          />
          <StatCard
            title="Services actifs"
            value={stats.overview.services_actifs}
            icon={CheckCircle}
            color="green"
            subtitle={`${stats.overview.services_suspendus} suspendu(s)`}
          />
          <StatCard
            title="Prix moyen"
            value={formatCurrency(stats.overview.prix_moyen)}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Top categorie"
            value={topCategory}
            icon={BarChart3}
            color="orange"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un service, prestataire..."
          className="flex-1"
        />
        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          options={[
            { value: 'all', label: 'Tous les statuts' },
            { value: 'active', label: 'Actifs' },
            { value: 'inactive', label: 'Inactifs' },
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v as SortOption)}
          options={[
            { value: 'recent', label: 'Plus recents' },
            { value: 'price_desc', label: 'Prix decroissant' },
            { value: 'price_asc', label: 'Prix croissant' },
            { value: 'rating', label: 'Meilleure note' },
          ]}
        />
      </div>

      {/* Table */}
      {filteredServices.length === 0 ? (
        <EmptyState icon={Package} message="Aucun service trouve" action={{ label: 'Actualiser', onClick: loadData }} />
      ) : (
        <TableContainer>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <TableHead columns={['Service', 'Prestataire', 'Prix', 'Reservations', 'Statut', 'Actions']} />
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* Service */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{service.nom}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {service.categorie_nom}
                      {service.sous_categorie_nom && ` / ${service.sous_categorie_nom}`}
                    </div>
                  </td>
                  {/* Prestataire */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{service.prestataire_nom}</div>
                    {service.prestataire_email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{service.prestataire_email}</div>
                    )}
                  </td>
                  {/* Prix */}
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(service.prix, service.devise || 'FCFA')}
                  </td>
                  {/* Reservations + Rating */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{service.total_reservations ?? 0} reserv.</div>
                    {service.moyenne_avis != null && service.moyenne_avis > 0 && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600 mt-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        {service.moyenne_avis.toFixed(1)}
                      </div>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={service.is_active ? 'active' : 'inactive'} />
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewDetails(service)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Voir details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: service.is_active ? 'suspend' : 'activate',
                            service,
                          })
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          service.is_active
                            ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                        title={service.is_active ? 'Suspendre' : 'Activer'}
                      >
                        {service.is_active ? <Ban className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'delete', service })}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableContainer>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="services"
          onPageChange={(dir) => setPage((p) => (dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1)))}
        />
      )}

      {/* Top Categories & Prestataires */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          {stats.topCategories?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top categories</h3>
              <div className="space-y-4">
                {stats.topCategories.map((cat, i) => {
                  const maxCount = stats.topCategories[0].nombre_services || 1;
                  const pct = Math.round((cat.nombre_services / maxCount) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{cat.categorie}</span>
                        <span className="text-gray-500 dark:text-gray-400">{cat.nombre_services} services</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Prestataires */}
          {stats.topPrestataires?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top prestataires</h3>
              <div className="space-y-3">
                {stats.topPrestataires.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{p.prestataire}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{p.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{p.nombre_services} services</div>
                      {p.moyenne_avis > 0 && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 justify-end">
                          <Star className="w-3 h-3 fill-current" />
                          {p.moyenne_avis.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Detail Modal */}
      {selectedService && (
        <Modal onClose={() => setSelectedService(null)} title={selectedService.nom} subtitle="Detail du service">
          <div className="space-y-5">
            {/* Prestataire info */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Prestataire</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedService.prestataire_nom}</p>
              {selectedService.prestataire_email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedService.prestataire_email}</p>
              )}
            </div>

            {/* Performance stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedService.prix, selectedService.devise || 'FCFA')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prix</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="text-lg font-bold text-green-600">{selectedService.total_reservations ?? 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reservations</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-lg font-bold text-yellow-600">
                  {selectedService.moyenne_avis ? selectedService.moyenne_avis.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Note moy.</p>
              </div>
            </div>

            {/* Category & Status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Categorie</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {selectedService.categorie_nom}
                  {selectedService.sous_categorie_nom && ` / ${selectedService.sous_categorie_nom}`}
                </p>
              </div>
              <StatusBadge status={selectedService.is_active ? 'active' : 'inactive'} />
            </div>

            {/* Description */}
            {selectedService.description && (
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedService.description}</p>
              </div>
            )}

            {/* Date */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Cree le {formatDate(selectedService.created_at)}
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <Modal
          onClose={() => setConfirmAction(null)}
          title={
            confirmAction.type === 'delete'
              ? 'Supprimer le service'
              : confirmAction.type === 'suspend'
                ? 'Suspendre le service'
                : 'Activer le service'
          }
          subtitle="Confirmation"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${confirmAction.type === 'delete' ? 'text-red-500' : 'text-orange-500'}`} />
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {confirmAction.type === 'delete'
                    ? `Etes-vous sur de vouloir supprimer le service "${confirmAction.service.nom}" ? Cette action est irreversible.`
                    : confirmAction.type === 'suspend'
                      ? `Etes-vous sur de vouloir suspendre le service "${confirmAction.service.nom}" ?`
                      : `Etes-vous sur de vouloir activer le service "${confirmAction.service.nom}" ?`
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Prestataire : {confirmAction.service.prestataire_nom}
                </p>
              </div>
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
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmAction.type === 'suspend'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading
                  ? 'En cours...'
                  : confirmAction.type === 'delete'
                    ? 'Supprimer'
                    : confirmAction.type === 'suspend'
                      ? 'Suspendre'
                      : 'Activer'
                }
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

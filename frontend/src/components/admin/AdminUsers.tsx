import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Shield, Crown, Eye, Trash2,
  Mail, Phone, MapPin, Calendar, Ban, CheckCircle, AlertTriangle
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

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role_id: number;
  role_nom?: string;
  is_active?: number;
  created_at: string;
  ville?: string;
  photo_profil?: string;
  nom_commercial?: string;
  plan_nom?: string;
  plan_id?: number;
}

interface UserStats {
  total_users: number;
  clients: number;
  prestataires: number;
  admins: number;
  nouveaux_30j: number;
}

interface ConfirmAction {
  type: 'suspend' | 'delete';
  user: User;
}

type RoleFilter = 'all' | 'client' | 'prestataire' | 'admin';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortOption = 'recent' | 'alphabetical' | 'role';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const { showToast } = useAppStore();

  // State
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const LIMIT = 15;

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();

      const [usersData, statsData] = await Promise.all([
        api.admin.getUsers(params),
        api.admin.getUserStats(),
      ]);

      setUsers(usersData.users || []);
      setTotalPages(usersData.pagination?.totalPages || 1);
      setTotal(usersData.pagination?.total || 0);
      setUserStats(statsData);
    } catch (err: any) {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, search, showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, sort]);

  // ── Filtered & sorted users ──────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Client-side status filter (API may not support it)
    if (statusFilter === 'active') {
      result = result.filter(u => u.is_active !== 0);
    } else if (statusFilter === 'inactive') {
      result = result.filter(u => u.is_active === 0);
    }

    // Sort
    if (sort === 'alphabetical') {
      result.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
    } else if (sort === 'role') {
      result.sort((a, b) => (a.role_id ?? 0) - (b.role_id ?? 0));
    }
    // 'recent' is the default API sort

    return result;
  }, [users, statusFilter, sort]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleToggleStatus = useCallback(async (user: User) => {
    setActionLoading(true);
    try {
      await api.admin.toggleUserStatus(user.id);
      showToast(`Statut de ${user.prenom} ${user.nom} modifie`, 'success');
      setConfirmAction(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      showToast('Erreur lors de la modification du statut', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadUsers, showToast]);

  const handleDeleteUser = useCallback(async (user: User) => {
    setActionLoading(true);
    try {
      await api.admin.deleteUser(user.id);
      showToast(`Utilisateur ${user.prenom} ${user.nom} supprime`, 'success');
      setConfirmAction(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setActionLoading(false);
    }
  }, [loadUsers, showToast]);

  const getRoleLabel = (user: User): string => {
    if (user.role_nom) return user.role_nom;
    switch (user.role_id) {
      case 1: return 'Client';
      case 2: return 'Prestataire';
      case 3: return 'Admin';
      default: return 'Inconnu';
    }
  };

  const getRoleIcon = (user: User) => {
    switch (user.role_id) {
      case 3: return <Shield className="w-3.5 h-3.5 text-red-500" />;
      case 2: return <Crown className="w-3.5 h-3.5 text-purple-500" />;
      default: return <Users className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSort('recent');
    setPage(1);
  };

  // ── Options ──────────────────────────────────────────────────────────────

  const roleOptions = [
    { value: 'all', label: 'Tous les roles' },
    { value: 'client', label: 'Clients' },
    { value: 'prestataire', label: 'Prestataires' },
    { value: 'admin', label: 'Admins' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'active', label: 'Actifs' },
    { value: 'inactive', label: 'Inactifs' },
  ];

  const sortOptions = [
    { value: 'recent', label: 'Plus recents' },
    { value: 'alphabetical', label: 'Alphabetique' },
    { value: 'role', label: 'Par role' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading && users.length === 0) return <LoadingSpinner message="Chargement des utilisateurs..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader title="Gestion des utilisateurs" subtitle={`${total} utilisateurs au total`}>
        <RefreshButton onClick={loadUsers} loading={loading} />
      </SectionHeader>

      {/* Stat Cards */}
      {userStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total" value={userStats.total_users} icon={Users} color="blue"
            subtitle={`+${userStats.nouveaux_30j} ce mois`} />
          <StatCard title="Clients" value={userStats.clients} icon={UserCheck} color="green" />
          <StatCard title="Prestataires" value={userStats.prestataires} icon={Crown} color="purple" />
          <StatCard title="Admins" value={userStats.admins} icon={Shield} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un utilisateur..."
          className="flex-1 min-w-[200px]"
        />
        <FilterSelect value={roleFilter} onChange={(v) => setRoleFilter(v as RoleFilter)} options={roleOptions} />
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={statusOptions} />
        <FilterSelect value={sort} onChange={(v) => setSort(v as SortOption)} options={sortOptions} />
        <ResetButton onClick={resetFilters} />
      </div>

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState icon={Users} message="Aucun utilisateur trouve" action={{ label: 'Reinitialiser les filtres', onClick: resetFilters }} />
      ) : (
        <TableContainer>
          <table className="w-full">
            <TableHead columns={['Utilisateur', 'Role & Plan', 'Inscription', 'Statut', 'Actions']} />
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* User info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {user.prenom?.[0]}{user.nom?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {user.prenom} {user.nom}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        {user.telephone && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{user.telephone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Role & Plan */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      {getRoleIcon(user)}
                      <span className="font-medium text-gray-700 dark:text-gray-300">{getRoleLabel(user)}</span>
                    </div>
                    {user.plan_nom && (
                      <span className="text-xs text-purple-600 dark:text-purple-400">{user.plan_nom}</span>
                    )}
                  </td>
                  {/* Inscription */}
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(user.created_at)}
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    <StatusBadge status={user.is_active === 0 ? 'inactive' : 'active'} />
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'suspend', user })}
                        className="p-2 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                        title={user.is_active === 0 ? 'Activer' : 'Suspendre'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'delete', user })}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
      {filteredUsers.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          label="utilisateurs"
          onPageChange={(dir) => setPage(p => dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1))}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal
          title={`${selectedUser.prenom} ${selectedUser.nom}`}
          subtitle="Detail utilisateur"
          onClose={() => setSelectedUser(null)}
        >
          <div className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {selectedUser.prenom?.[0]}{selectedUser.nom?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {getRoleIcon(selectedUser)}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{getRoleLabel(selectedUser)}</span>
                </div>
                <StatusBadge status={selectedUser.is_active === 0 ? 'inactive' : 'active'} />
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{selectedUser.email}</span>
              </div>
              {selectedUser.telephone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedUser.telephone}</span>
                </div>
              )}
              {selectedUser.ville && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{selectedUser.ville}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Inscrit le {formatDate(selectedUser.created_at)}</span>
              </div>
            </div>

            {/* Plan info */}
            {(selectedUser.plan_nom || selectedUser.nom_commercial) && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {selectedUser.nom_commercial && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Nom commercial</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedUser.nom_commercial}</span>
                  </div>
                )}
                {selectedUser.plan_nom && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Plan</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">{selectedUser.plan_nom}</span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setConfirmAction({ type: 'suspend', user: selectedUser });
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  selectedUser.is_active === 0
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30'
                }`}
              >
                {selectedUser.is_active === 0 ? (
                  <><CheckCircle className="w-4 h-4" /> Activer</>
                ) : (
                  <><Ban className="w-4 h-4" /> Suspendre</>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setConfirmAction({ type: 'delete', user: selectedUser });
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <Modal
          title={confirmAction.type === 'delete' ? 'Confirmer la suppression' : 'Confirmer le changement de statut'}
          subtitle="Confirmation requise"
          onClose={() => setConfirmAction(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {confirmAction.type === 'delete' ? (
                  <>Vous etes sur le point de supprimer definitivement l'utilisateur <strong>{confirmAction.user.prenom} {confirmAction.user.nom}</strong>. Cette action est irreversible.</>
                ) : (
                  <>Vous etes sur le point de {confirmAction.user.is_active === 0 ? 'activer' : 'suspendre'} l'utilisateur <strong>{confirmAction.user.prenom} {confirmAction.user.nom}</strong>.</>
                )}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'delete') {
                    handleDeleteUser(confirmAction.user);
                  } else {
                    handleToggleStatus(confirmAction.user);
                  }
                }}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {actionLoading ? 'En cours...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

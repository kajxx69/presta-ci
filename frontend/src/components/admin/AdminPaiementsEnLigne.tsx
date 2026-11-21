import { useCallback, useEffect, useState } from 'react';
import { Zap, CheckCircle, Clock, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import {
  StatCard, FilterSelect, LoadingSpinner, EmptyState, Pagination, SectionHeader,
  RefreshButton, TableContainer, TableHead, formatCurrency, formatDateTime,
} from './AdminShared';

// Paiements d'abonnement en ligne (GeniusPay). Lecture seule : ils sont
// vérifiés auprès de GeniusPay et activés automatiquement, sans action admin.

const STATUTS: Record<string, { label: string; cls: string }> = {
  paye: { label: 'Payé', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  en_attente: { label: 'En cours', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  echoue: { label: 'Échoué', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  expire: { label: 'Abandonné', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

export default function AdminPaiementsEnLigne() {
  const [loading, setLoading] = useState(true);
  const [statut, setStatut] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.paiements.admin>> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await api.paiements.admin({ statut, page, limit: 20 }));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [statut, page]);

  useEffect(() => { load(); }, [load]);

  const s = data?.stats || {};
  const tentatives = Object.values(s).reduce((n, x) => n + x.count, 0);
  const conversion = tentatives ? Math.round(((s.paye?.count || 0) / tentatives) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader title="Paiements en ligne" subtitle="GeniusPay — Wave, Orange Money, MTN, Moov, carte · activation automatique">
        <RefreshButton onClick={load} loading={loading} />
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Encaissé (brut)" value={formatCurrency(s.paye?.montant || 0)} subtitle={`Net : ${formatCurrency(s.paye?.net || 0)}`} icon={CheckCircle} color="green" />
        <StatCard title="Paiements réussis" value={s.paye?.count || 0} icon={Zap} color="blue" />
        <StatCard title="En cours" value={s.en_attente?.count || 0} icon={Clock} color="orange" />
        <StatCard title="Taux de conversion" value={`${conversion} %`} subtitle={`${tentatives} tentatives`} icon={XCircle} color="purple" />
      </div>

      <FilterSelect
        value={statut}
        onChange={(v) => { setStatut(v); setPage(1); }}
        options={[
          { value: 'all', label: 'Tous les statuts' },
          { value: 'paye', label: 'Payés' },
          { value: 'en_attente', label: 'En cours' },
          { value: 'echoue', label: 'Échoués' },
          { value: 'expire', label: 'Abandonnés' },
        ]}
      />

      {loading && !data ? <LoadingSpinner /> : !data?.paiements.length ? (
        <EmptyState icon={Zap} message="Aucun paiement en ligne pour le moment" />
      ) : (
        <>
          <TableContainer>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <TableHead columns={['Prestataire', 'Plan', 'Montant', 'Moyen', 'Statut', 'Date', 'Référence']} />
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.paiements.map((p) => (
                  <tr key={p.id} className="text-sm">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{p.prestataire_nom || '—'}</p>
                      <p className="text-xs text-gray-500">{p.prestataire_telephone || p.prestataire_email || ''}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-700 dark:text-gray-300">{p.plan_nom} · {p.duree_abonnement_jours} j</td>
                    <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{formatCurrency(p.montant)}</td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{p.moyen_paiement || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUTS[p.statut]?.cls || ''}`}>
                        {STATUTS[p.statut]?.label || p.statut}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{formatDateTime(p.paye_at || p.created_at)}</td>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableContainer>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            label="paiements"
            onPageChange={(dir) => setPage((p) => (dir === 'next' ? p + 1 : Math.max(1, p - 1)))}
          />
        </>
      )}
    </div>
  );
}

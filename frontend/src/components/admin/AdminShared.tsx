import { Search, TrendingUp, ChevronLeft, ChevronRight, X } from 'lucide-react';

// Types
export interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

export const StatCard = ({ title, value, icon: Icon, trend, subtitle, color = 'blue' }: StatCardProps) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20'
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center text-xs mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'transform rotate-180' : ''}`} />
              {Math.abs(trend)}% vs mois dernier
            </div>
          )}
        </div>
        <div className={`p-3.5 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: string }> = {
    active: { label: 'Actif', color: 'green' },
    inactive: { label: 'Inactif', color: 'red' },
    pending: { label: 'En attente', color: 'yellow' },
    approved: { label: 'Approuve', color: 'green' },
    rejected: { label: 'Rejete', color: 'red' },
    confirmed: { label: 'Confirme', color: 'blue' },
    cancelled: { label: 'Annule', color: 'red' },
    completed: { label: 'Termine', color: 'purple' },
    en_attente: { label: 'En attente', color: 'yellow' },
    valide: { label: 'Valide', color: 'green' },
    rejete: { label: 'Rejete', color: 'red' },
    confirmee: { label: 'Confirmee', color: 'blue' },
    terminee: { label: 'Terminee', color: 'purple' },
    annulee: { label: 'Annulee', color: 'red' }
  };
  const config = statusConfig[status] || { label: status, color: 'gray' };
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colorClasses[config.color] || colorClasses.gray}`}>
      {config.label}
    </span>
  );
};

export const SearchInput = ({ value, onChange, placeholder = "Rechercher...", className = "" }: {
  value: string; onChange: (value: string) => void; placeholder?: string; className?: string;
}) => (
  <div className={`relative ${className}`}>
    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
    />
  </div>
);

export const FilterSelect = ({ value, onChange, options, className = "" }: {
  value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; className?: string;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>{option.label}</option>
    ))}
  </select>
);

export const LoadingSpinner = ({ message = "Chargement..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="relative">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600"></div>
    </div>
    <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm">{message}</p>
  </div>
);

export const EmptyState = ({ icon: Icon, message, action }: { icon: any; message: string; action?: { label: string; onClick: () => void } }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
      <Icon className="w-12 h-12 text-gray-400" />
    </div>
    <p className="text-gray-500 dark:text-gray-400 text-sm">{message}</p>
    {action && (
      <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
        {action.label}
      </button>
    )}
  </div>
);

export const Pagination = ({ page, totalPages, total, label, onPageChange }: {
  page: number; totalPages: number; total: number; label: string; onPageChange: (dir: 'prev' | 'next') => void;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500 dark:text-gray-400 pt-2">
    <span>Page {page} / {totalPages || 1} — {total} {label}</span>
    <div className="flex items-center gap-2">
      <button onClick={() => onPageChange('prev')} disabled={page <= 1}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Precedent
      </button>
      <button onClick={() => onPageChange('next')} disabled={page >= (totalPages || 1)}
        className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        Suivant <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export const Modal = ({ children, onClose, title, subtitle }: {
  children: React.ReactNode; onClose: () => void; title: string; subtitle?: string;
}) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-start justify-between mb-4">
        <div>
          {subtitle && <p className="text-xs uppercase text-gray-400 mb-1">{subtitle}</p>}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const SectionHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
    {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
  </div>
);

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon?: any; children?: React.ReactNode }) => (
  <div className="flex items-center justify-between p-6 pb-4">
    <div>
      {subtitle && <p className="text-xs uppercase text-gray-500 dark:text-gray-400">{subtitle}</p>}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
    </div>
    <div className="flex items-center gap-2">
      {children}
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
    </div>
  </div>
);

// Utility functions
export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (value?: string | null) => {
  if (!value) return 'Jamais';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (amount: number, currency: string = 'FCFA') =>
  new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;

export const parseBooleanSetting = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  return !!value;
};

export const parseSettingTimestamp = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); return p?.created_at || p?.cleared_at || p?.timestamp || value; } catch { return value; }
  }
  if (typeof value === 'object') return value?.created_at || value?.cleared_at || value?.timestamp || null;
  return null;
};

export const RefreshButton = ({ onClick, loading, label = 'Actualiser' }: { onClick: () => void; loading: boolean; label?: string }) => (
  <button onClick={onClick} disabled={loading}
    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors">
    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
    {label}
  </button>
);

export const ResetButton = ({ onClick, label = 'Reinitialiser' }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick}
    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
    {label}
  </button>
);

// Table components
export const TableContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div className="overflow-x-auto">{children}</div>
  </div>
);

export const TableHead = ({ columns }: { columns: string[] }) => (
  <thead className="bg-gray-50 dark:bg-gray-700/50">
    <tr>
      {columns.map(col => (
        <th key={col} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{col}</th>
      ))}
    </tr>
  </thead>
);

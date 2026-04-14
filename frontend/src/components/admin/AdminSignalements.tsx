import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  ShieldAlert, AlertTriangle, Clock, CheckCircle, XCircle,
  Eye, ChevronLeft, ChevronRight, Loader2, Filter,
  User, Package, Camera, Store, Ban, Trash2, MessageSquare
} from 'lucide-react';

const statutColors: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  en_cours: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolu: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejete: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const statutLabels: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  resolu: 'Résolu',
  rejete: 'Rejeté',
};

const motifLabels: Record<string, string> = {
  arnaque: 'Arnaque',
  comportement_inapproprie: 'Comportement inapproprié',
  contenu_offensant: 'Contenu offensant',
  service_non_conforme: 'Service non conforme',
  'harcèlement': 'Harcèlement',
  faux_profil: 'Faux profil',
  spam: 'Spam',
  autre: 'Autre',
};

const typeIcons: Record<string, any> = {
  prestataire: Store,
  service: Package,
  publication: Camera,
  utilisateur: User,
};

const actionLabels: Record<string, string> = {
  avertissement: 'Avertissement envoyé',
  suspension_temporaire: 'Suspension temporaire',
  suspension_definitive: 'Suspension définitive',
  suppression_contenu: 'Contenu supprimé',
  aucune_action: 'Aucune action requise',
};

export default function AdminSignalements() {
  const [signalements, setSignalements] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedSignalement, setSelectedSignalement] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [traiterForm, setTraiterForm] = useState({ statut: '', resolution_note: '', action_prise: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadSignalements = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.admin.signalements.getAll({ statut: filterStatut !== 'all' ? filterStatut : undefined, type_cible: filterType !== 'all' ? filterType : undefined, page, limit: 15 }),
        api.admin.signalements.getStats()
      ]);
      setSignalements(data.signalements);
      setTotalPages(data.pagination.totalPages);
      setStats(statsData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSignalements(); }, [page, filterStatut, filterType]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const detail = await api.admin.signalements.getById(id);
      setSelectedSignalement(detail);
      setTraiterForm({ statut: '', resolution_note: '', action_prise: '' });
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTraiter = async () => {
    if (!selectedSignalement || !traiterForm.statut) return;
    setSubmitting(true);
    try {
      await api.admin.signalements.traiter(selectedSignalement._id, {
        statut: traiterForm.statut,
        resolution_note: traiterForm.resolution_note || undefined,
        action_prise: traiterForm.action_prise || undefined,
      });
      setSelectedSignalement(null);
      loadSignalements();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedSignalement && !detailLoading) {
    const s = selectedSignalement;
    const TypeIcon = typeIcons[s.type_cible] || ShieldAlert;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSignalement(null)}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Signalement #{s._id}
          </h2>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutColors[s.statut]}`}>
            {statutLabels[s.statut]}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Info signalement */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Détails du signalement
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Motif</span>
                <span className="font-medium text-gray-900 dark:text-white">{motifLabels[s.motif] || s.motif}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <TypeIcon className="w-4 h-4" />
                  {s.type_cible}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-900 dark:text-white">{new Date(s.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Signalements sur cette cible</span>
                <span className={`font-bold ${s.nombre_signalements_cible > 2 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {s.nombre_signalements_cible}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-gray-500 mb-1">Description</p>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                  {s.description}
                </p>
              </div>
            </div>
          </div>

          {/* Info signaleur */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Signalé par
              </h3>
              {s.signaleur && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {s.signaleur.photo_profil ? (
                      <img src={s.signaleur.photo_profil} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-bold">
                        {s.signaleur.prenom?.[0]}{s.signaleur.nom?.[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{s.signaleur.prenom} {s.signaleur.nom}</p>
                    <p className="text-xs text-gray-500">{s.signaleur.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info cible */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TypeIcon className="w-5 h-5 text-orange-500" />
                Cible signalée ({s.type_cible})
              </h3>
              {s.cible_info && (
                <div className="text-sm space-y-1">
                  {s.type_cible === 'prestataire' && (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">{s.cible_info.nom_commercial}</p>
                      <p className="text-gray-500">{s.cible_info.ville}</p>
                      {s.cible_info.user && <p className="text-gray-500">Propriétaire: {s.cible_info.user.prenom} {s.cible_info.user.nom} ({s.cible_info.user.email})</p>}
                    </>
                  )}
                  {s.type_cible === 'service' && (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">{s.cible_info.nom}</p>
                      <p className="text-gray-500">{s.cible_info.prix} FCFA</p>
                    </>
                  )}
                  {s.type_cible === 'publication' && (
                    <p className="text-gray-900 dark:text-white">{s.cible_info.description}</p>
                  )}
                  {s.type_cible === 'utilisateur' && (
                    <>
                      <p className="font-medium text-gray-900 dark:text-white">{s.cible_info.prenom} {s.cible_info.nom}</p>
                      <p className="text-gray-500">{s.cible_info.email}</p>
                      <p className={`text-xs ${s.cible_info.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {s.cible_info.is_active ? 'Compte actif' : 'Compte suspendu'}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action de traitement */}
        {(s.statut === 'en_attente' || s.statut === 'en_cours') && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Traiter ce signalement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Décision</label>
                <select
                  value={traiterForm.statut}
                  onChange={(e) => setTraiterForm({ ...traiterForm, statut: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choisir...</option>
                  <option value="en_cours">Prendre en charge</option>
                  <option value="resolu">Marquer comme résolu</option>
                  <option value="rejete">Rejeter le signalement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action à prendre</label>
                <select
                  value={traiterForm.action_prise}
                  onChange={(e) => setTraiterForm({ ...traiterForm, action_prise: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Aucune action</option>
                  <option value="avertissement">Avertissement</option>
                  <option value="suspension_temporaire">Suspension temporaire</option>
                  <option value="suspension_definitive">Suspension définitive</option>
                  <option value="suppression_contenu">Suppression du contenu</option>
                  <option value="aucune_action">Signalement non justifié</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">&nbsp;</label>
                <button
                  onClick={handleTraiter}
                  disabled={!traiterForm.statut || submitting}
                  className="w-full p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Valider
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note de résolution</label>
              <textarea
                value={traiterForm.resolution_note}
                onChange={(e) => setTraiterForm({ ...traiterForm, resolution_note: e.target.value })}
                placeholder="Expliquez votre décision (visible par le signaleur)..."
                className="w-full p-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Résolution existante */}
        {(s.statut === 'resolu' || s.statut === 'rejete') && s.resolution_note && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">Résolution</h3>
            {s.action_prise && (
              <p className="text-sm"><span className="text-gray-500">Action:</span> <span className="font-medium text-gray-900 dark:text-white">{actionLabels[s.action_prise] || s.action_prise}</span></p>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">{s.resolution_note}</p>
            {s.admin_info && (
              <p className="text-xs text-gray-500">Traité par {s.admin_info.prenom} {s.admin_info.nom} le {new Date(s.resolved_at).toLocaleString('fr-FR')}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: ShieldAlert, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
            { label: 'En attente', value: stats.en_attente, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'En cours', value: stats.en_cours, icon: AlertTriangle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Résolus', value: stats.resolu, icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Rejetés', value: stats.rejete, icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-800' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-200/50 dark:border-gray-700/50`}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterStatut}
          onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
          <option value="rejete">Rejeté</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">Tous les types</option>
          <option value="prestataire">Prestataire</option>
          <option value="service">Service</option>
          <option value="publication">Publication</option>
          <option value="utilisateur">Utilisateur</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : signalements.length === 0 ? (
        <div className="text-center py-16">
          <ShieldAlert className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Aucun signalement trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signalements.map((s) => {
            const TypeIcon = typeIcons[s.type_cible] || ShieldAlert;
            return (
              <div
                key={s._id}
                onClick={() => openDetail(s._id)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          #{s._id} — {motifLabels[s.motif] || s.motif}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statutColors[s.statut]}`}>
                          {statutLabels[s.statut]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {s.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>Par {s.signaleur?.prenom} {s.signaleur?.nom}</span>
                        <span>{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

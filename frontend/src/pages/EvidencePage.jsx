import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Database, Search, Filter, Download, ArrowLeft, 
  ArrowRight, Clock, Shield, ExternalLink, RefreshCw 
} from 'lucide-react';
import { getEvidence, getEntities } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function EvidencePage({ batchId }) {
  const [evidenceData, setEvidenceData] = useState({ items: [], total: 0, limit: 50, offset: 0 });
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const navigate = useNavigate();

  // Load entities for filter dropdown
  useEffect(() => {
    async function loadEntityList() {
      if (!batchId) return;
      try {
        const res = await getEntities(batchId);
        const list = Array.isArray(res.data) ? res.data : (res.data.entities || []);
        setEntities(list);
      } catch (e) {}
    }
    loadEntityList();
  }, [batchId]);

  // Load evidence with debounce/filters
  const fetchEvidence = async (newOffset = offset) => {
    if (!batchId) return;
    try {
      setLoading(true);
      const res = await getEvidence(batchId, {
        cse_id: selectedEntity || undefined,
        severity: selectedSeverity || undefined,
        search: searchTerm || undefined,
        limit,
        offset: newOffset
      });
      setEvidenceData(res.data);
      setOffset(newOffset);
    } catch (err) {
      setError(err.message || 'Failed to query operational evidence records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence(0);
  }, [batchId, selectedEntity, selectedSeverity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvidence(0);
  };

  const handleExportCSV = () => {
    if (!evidenceData.items || evidenceData.items.length === 0) return;
    const headers = ['Alert ID', 'CSE ID', 'Asset ID', 'Severity', 'Created At', 'Closed At', 'Dwell (min)', 'Case ID', 'Escalated'];
    const rows = evidenceData.items.map(i => [
      i.alert_id,
      i.cse_id,
      i.asset_id || '',
      i.severity,
      i.created_at || '',
      i.closed_at || '',
      i.closure_minutes ?? '',
      i.case_id || '',
      i.escalated ? 'TRUE' : 'FALSE'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sat_sa_evidence_${batchId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil((evidenceData.total || 0) / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            Operational Evidence Explorer
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Raw Security Alert & Case Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Grounded data records ingested for supervisory evaluation. Filter by entity, search identifiers, and verify dwell times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Alert ID, Case ID, or Asset..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Entity Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Entity:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono"
            >
              <option value="">All Entities ({entities.length})</option>
              {entities.map((e) => (
                <option key={e.cse_id} value={e.cse_id}>
                  {e.cse_id} ({e.sector})
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Severity:</span>
            {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                type="button"
                key={sev || 'ALL'}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  selectedSeverity === sev
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {sev || 'ALL'}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Apply Query
          </button>
        </form>
      </div>

      {/* Evidence Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Querying grounded evidence records..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider select-none">
                <tr>
                  <th className="p-3.5">Alert Identifier</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Asset ID</th>
                  <th className="p-3.5">Severity</th>
                  <th className="p-3.5">Timestamp (Created)</th>
                  <th className="p-3.5">Investigation Dwell</th>
                  <th className="p-3.5">Linked Incident Case</th>
                  <th className="p-3.5">Escalated</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evidenceData.items.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                      No operational evidence records match the selected query.
                    </td>
                  </tr>
                ) : (
                  evidenceData.items.map((item) => {
                    const dwell = item.closure_minutes;
                    const isRapid = dwell !== null && dwell < 8.0;
                    const isSuspicious1m = dwell !== null && dwell < 1.0;

                    return (
                      <tr key={item.alert_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {item.alert_id}
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => navigate(`/entity/${item.cse_id}`)}
                            className="font-mono font-semibold text-blue-700 hover:underline flex items-center gap-1"
                          >
                            {item.cse_id}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>

                        <td className="p-3.5 font-mono text-slate-600 text-[11px]">
                          {item.asset_id || <span className="text-slate-400 italic">Unassigned</span>}
                        </td>

                        <td className="p-3.5">
                          <RiskBadge level={item.severity} />
                        </td>

                        <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                          {item.created_at ? item.created_at.slice(0, 19).replace('T', ' ') : '—'}
                        </td>

                        {/* Dwell Time */}
                        <td className="p-3.5">
                          {dwell !== null ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-[11px] font-bold ${
                                isSuspicious1m 
                                  ? 'text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200' 
                                  : isRapid 
                                  ? 'text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200' 
                                  : 'text-slate-700'
                              }`}>
                                {dwell.toFixed(1)}m
                              </span>
                              {isRapid && (
                                <span className="text-[9px] font-bold text-rose-600 uppercase">
                                  Rapid
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* Linked Case */}
                        <td className="p-3.5">
                          {item.case_id ? (
                            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {item.case_id}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Unlinked
                            </span>
                          )}
                        </td>

                        {/* Escalated */}
                        <td className="p-3.5">
                          {item.escalated ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                              Escalated
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">No</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3.5 text-right font-mono text-[11px] text-slate-600">
                          {item.status || 'CLOSED'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong>{evidenceData.items.length > 0 ? offset + 1 : 0}</strong> to{' '}
            <strong>{Math.min(offset + limit, evidenceData.total || 0)}</strong> of{' '}
            <strong>{evidenceData.total || 0}</strong> evidence records
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => fetchEvidence(Math.max(offset - limit, 0))}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 font-semibold text-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="px-3 py-1 font-mono text-slate-700 font-semibold">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>

            <button
              disabled={offset + limit >= (evidenceData.total || 0) || loading}
              onClick={() => fetchEvidence(offset + limit)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 font-semibold text-slate-700"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

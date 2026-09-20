import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Search, Filter, ArrowUpDown, ChevronRight, 
  AlertTriangle, ShieldCheck, HelpCircle, Activity 
} from 'lucide-react';
import { getEntities } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function EntitiesPage({ batchId }) {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterSector, setFilterSector] = useState('All');
  const [sortField, setSortField] = useState('risk_score');
  const [sortAsc, setSortAsc] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const res = await getEntities(batchId);
        const list = Array.isArray(res.data) ? res.data : (res.data.entities || []);
        setEntities(list);
      } catch (err) {
        setError(err.message || 'Failed to fetch entity supervisory registry');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  const sectors = useMemo(() => {
    const set = new Set(entities.map(e => e.sector).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [entities]);

  const filteredEntities = useMemo(() => {
    let result = [...entities];

    if (filterLevel !== 'All') {
      result = result.filter(e => e.risk_level === filterLevel);
    }

    if (filterSector !== 'All') {
      result = result.filter(e => e.sector === filterSector);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.cse_id.toLowerCase().includes(term) ||
        (e.primary_reason && e.primary_reason.toLowerCase().includes(term)) ||
        (e.sector && e.sector.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      // Grey / unassessed entities always go to bottom unless explicitly sorting by cse_id
      if (sortField !== 'cse_id') {
        if (a.is_grey && !b.is_grey) return 1;
        if (!a.is_grey && b.is_grey) return -1;
      }

      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [entities, filterLevel, filterSector, searchTerm, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading entity supervisory registry..." />;

  const levels = ['All', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNASSESSED'];

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            Supervisory Entity Register
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Critical Sector Entities (CSE)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational risk ranking, supervisory coverage scores, and workflow evidence audit across monitored entities.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono font-medium">
            Total Entities: <strong>{entities.length}</strong>
          </span>
          <span className="px-3 py-1.5 rounded bg-red-50 border border-red-200 text-red-700 font-mono font-medium">
            Attention Required: <strong>{entities.filter(e => e.risk_level === 'CRITICAL' || e.risk_level === 'HIGH').length}</strong>
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by CSE ID, primary finding, or sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level:</span>
            <div className="flex flex-wrap gap-1">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition-colors ${
                    filterLevel === lvl
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Filter */}
          {sectors.length > 2 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sector:</span>
              <div className="flex flex-wrap gap-1">
                {sectors.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setFilterSector(sec)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      filterSector === sec
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Entity Registry Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider select-none">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('cse_id')}>
                  <div className="flex items-center gap-1.5">
                    CSE Identifier
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Sector</th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('risk_score')}>
                  <div className="flex items-center gap-1.5">
                    Supervisory Risk Score
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Risk Tier</th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('supervisory_coverage')}>
                  <div className="flex items-center gap-1.5">
                    Coverage Score
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 text-center cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('evidence_count')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Findings
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100" onClick={() => toggleSort('alert_count')}>
                  <div className="flex items-center gap-1.5">
                    Evidence Volume
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="p-3.5">Primary Grounded Rationale</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                    No entities found matching selected criteria.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((entity) => {
                  const isUnassessed = entity.risk_level === 'UNASSESSED' || entity.is_grey;
                  const score = entity.risk_score || 0;
                  const cov = entity.supervisory_coverage;

                  let scoreBarColor = 'bg-emerald-500';
                  if (entity.risk_level === 'CRITICAL') scoreBarColor = 'bg-rose-500';
                  else if (entity.risk_level === 'HIGH') scoreBarColor = 'bg-amber-500';
                  else if (entity.risk_level === 'MEDIUM') scoreBarColor = 'bg-yellow-500';
                  else if (isUnassessed) scoreBarColor = 'bg-slate-400';

                  return (
                    <tr
                      key={entity.cse_id}
                      onClick={() => navigate(`/entity/${entity.cse_id}`)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isUnassessed ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      {/* CSE ID */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-900 text-xs">
                            {entity.cse_id}
                          </span>
                          {isUnassessed && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold">
                              Low Vol
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sector */}
                      <td className="p-3.5 font-medium text-slate-700">
                        {entity.sector || 'Unknown'}
                      </td>

                      {/* Risk Score */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 font-mono font-bold text-slate-900 text-xs">
                            {score.toFixed(1)}
                          </span>
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full ${scoreBarColor}`}
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="p-3.5">
                        <RiskBadge level={entity.risk_level} />
                      </td>

                      {/* Supervisory Coverage */}
                      <td className="p-3.5">
                        {cov !== null && cov !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-700 text-[11px] w-8">
                              {Math.round(cov)}%
                            </span>
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                              <div
                                className={`h-full ${cov < 50 ? 'bg-rose-500' : cov < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(cov, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Findings Count */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          (entity.evidence_count || 0) > 0 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {entity.evidence_count ?? (entity.flag_count ?? 0)}
                        </span>
                      </td>

                      {/* Alert / Case Volume */}
                      <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                        {entity.alert_count} alerts · {entity.case_count} cases
                      </td>

                      {/* Primary Rationale */}
                      <td className="p-3.5 text-slate-600 text-xs max-w-sm truncate" title={entity.primary_reason}>
                        {entity.primary_reason || 'Standard operational baselines observed.'}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/entity/${entity.cse_id}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border border-slate-200 hover:border-blue-300 font-medium text-xs transition-colors"
                        >
                          Dossier
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

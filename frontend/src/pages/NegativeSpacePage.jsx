import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  EyeOff, Search, Filter, ShieldAlert, ArrowRight, 
  ExternalLink, Layers, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { getNegativeSpace } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function NegativeSpacePage({ batchId }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const res = await getNegativeSpace(batchId);
        const list = Array.isArray(res.data) ? res.data : (res.data.findings || []);
        setFindings(list);
      } catch (err) {
        setError(err.message || 'Failed to fetch negative space analysis');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  const stats = useMemo(() => {
    const total = findings.length;
    const missingTelemetry = findings.filter(f => (f.finding_type || f.type) === 'MISSING_TELEMETRY').length;
    const missingCat = findings.filter(f => (f.finding_type || f.type) === 'MISSING_ALERT_CATEGORY').length;
    const missingEsc = findings.filter(f => (f.finding_type || f.type) === 'MISSING_ESCALATION').length;
    const critical = findings.filter(f => f.severity === 'CRITICAL').length;
    return { total, missingTelemetry, missingCat, missingEsc, critical };
  }, [findings]);

  const filteredFindings = useMemo(() => {
    let list = [...findings];

    if (typeFilter !== 'ALL') {
      list = list.filter(f => (f.finding_type || f.type) === typeFilter);
    }

    if (severityFilter !== 'ALL') {
      list = list.filter(f => f.severity === severityFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(f => 
        f.cse_id.toLowerCase().includes(term) ||
        (f.asset_id && f.asset_id.toLowerCase().includes(term)) ||
        f.description.toLowerCase().includes(term) ||
        (f.peer_context && String(f.peer_context).toLowerCase().includes(term))
      );
    }

    return list;
  }, [findings, typeFilter, severityFilter, searchTerm]);

  if (loading) return <LoadingSpinner message="Detecting operational blind spots and negative space..." />;

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <EyeOff className="w-4 h-4" />
            Negative-Space Analytical Layer
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Detected Telemetry & Operational Absences
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analysing evidence that <em>should</em> be present in a functioning SOC based on asset inventory and peer baselines, but is missing.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1.5 rounded bg-purple-50 border border-purple-200 text-purple-800 font-mono font-medium">
            Total Absences: <strong>{stats.total}</strong>
          </span>
          <span className="px-3 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-mono font-medium">
            Critical Severity: <strong>{stats.critical}</strong>
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Blind Spots</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Absence indicators recorded</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-purple-600 tracking-wider">Silent Assets</div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-1">{stats.missingTelemetry}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Critical servers with 0 telemetry</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-rose-600 tracking-wider">Omitted Categories</div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{stats.missingCat}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Entire alert classes missing</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-600 tracking-wider">Suppressed Escalation</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{stats.missingEsc}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">High/critical without escalation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by CSE ID, asset identifier, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-purple-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Type:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'MISSING_TELEMETRY', label: 'Silent Assets' },
              { id: 'MISSING_ALERT_CATEGORY', label: 'Missing Categories' },
              { id: 'MISSING_ESCALATION', label: 'Missing Escalation' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  typeFilter === t.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Severity:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  severityFilter === sev
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Negative Space Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredFindings.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-lg text-slate-400 italic">
            No negative space findings matching selected filter criteria.
          </div>
        ) : (
          filteredFindings.map((f, idx) => {
            const fType = f.finding_type || f.type;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 hover:border-purple-300 rounded-lg p-5 shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/entity/${f.cse_id}`)}
                        className="font-mono font-bold text-sm text-blue-700 hover:underline flex items-center gap-1"
                      >
                        {f.cse_id}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>
                      {f.asset_id && (
                        <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {f.asset_id}
                        </span>
                      )}
                    </div>
                    <RiskBadge level={f.severity} />
                  </div>

                  {/* Finding Type Tag */}
                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
                      {fType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Grounded Description */}
                  <p className="text-xs text-slate-800 font-medium mb-4 leading-relaxed">
                    {f.description}
                  </p>

                  {/* Expected vs Observed Structured Comparison */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-2 mb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block mb-0.5">
                        Supervisory Baseline (Expected)
                      </span>
                      <p className="font-mono text-[11px] text-slate-800">
                        {f.expected || f.expected_value}
                      </p>
                    </div>

                    <div className="border-t border-slate-200 pt-1.5">
                      <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider block mb-0.5">
                        Recorded Evidence (Observed)
                      </span>
                      <p className="font-mono text-[11px] text-rose-900 font-semibold">
                        {f.observed || f.observed_value}
                      </p>
                    </div>

                    {f.gap && (
                      <div className="border-t border-slate-200 pt-1.5 text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Gap Impact: </span>
                        {f.gap}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Context */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono text-[10px] truncate max-w-[200px]" title={f.peer_context}>
                    {f.peer_context || 'Evidence Strength: HIGH'}
                  </span>
                  <button
                    onClick={() => navigate(`/entity/${f.cse_id}`)}
                    className="text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                  >
                    View in Dossier
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

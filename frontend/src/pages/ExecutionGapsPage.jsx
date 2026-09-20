import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitBranch, Search, Filter, AlertTriangle, Clock, 
  FileText, Link2, ExternalLink, ChevronDown, ChevronUp, ArrowRight 
} from 'lucide-react';
import { getExecutionGaps } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ExecutionGapsPage({ batchId }) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stageFilter, setStageFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const res = await getExecutionGaps(batchId);
        const list = Array.isArray(res.data) ? res.data : [];
        setGaps(list);
      } catch (err) {
        setError(err.message || 'Failed to fetch execution gaps');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  const stats = useMemo(() => {
    const total = gaps.length;
    const rapidClosures = gaps.filter(g => g.workflow_stage === 'INVESTIGATION_DWELL').length;
    const unlinkedAlerts = gaps.filter(g => g.workflow_stage === 'ALERT_CASE_LINKAGE').length;
    const suppressedEscalation = gaps.filter(g => g.workflow_stage === 'TIER_ESCALATION').length;
    const templatedNotes = gaps.filter(g => g.workflow_stage === 'INVESTIGATION_QUALITY').length;
    return { total, rapidClosures, unlinkedAlerts, suppressedEscalation, templatedNotes };
  }, [gaps]);

  const filteredGaps = useMemo(() => {
    let list = [...gaps];

    if (stageFilter !== 'ALL') {
      list = list.filter(g => g.workflow_stage === stageFilter);
    }

    if (severityFilter !== 'ALL') {
      list = list.filter(g => g.severity === severityFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(g => 
        g.cse_id.toLowerCase().includes(term) ||
        g.rule_id.toLowerCase().includes(term) ||
        g.rule_name.toLowerCase().includes(term) ||
        g.description.toLowerCase().includes(term) ||
        g.gap.toLowerCase().includes(term)
      );
    }

    return list;
  }, [gaps, stageFilter, severityFilter, searchTerm]);

  if (loading) return <LoadingSpinner message="Auditing operational workflow execution gaps..." />;

  const stages = [
    { id: 'ALL', label: 'All Stages' },
    { id: 'INVESTIGATION_DWELL', label: 'Investigation Dwell (<8m)' },
    { id: 'ALERT_CASE_LINKAGE', label: 'Alert-Case Linkage' },
    { id: 'TIER_ESCALATION', label: 'Tier Escalation' },
    { id: 'INVESTIGATION_QUALITY', label: 'Templated Notes' },
    { id: 'CLOSURE_VARIATION', label: 'Closure Variation' }
  ];

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">
            <GitBranch className="w-4 h-4" />
            Workflow Execution Gap Register
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SOC Process Deviations & Operational Bypasses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Grounded comparative audit: Expected SOC process baseline vs. observed human/system workflow actions.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-medium">
            Total Execution Gaps: <strong>{stats.total}</strong>
          </span>
          <span className="px-3 py-1.5 rounded bg-rose-50 border border-rose-200 text-rose-900 font-medium">
            Rapid Closures: <strong>{stats.rapidClosures}</strong>
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Gaps</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Rule-grounded execution flags</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-rose-600 tracking-wider">Rapid Closures (&lt;8m)</div>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1">{stats.rapidClosures}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Critical dwell time violations</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-600 tracking-wider">Unlinked Critical Alerts</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{stats.unlinkedAlerts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Closed without case ticket</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-blue-600 tracking-wider">Templated Notes</div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">{stats.templatedNotes}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Similarity &ge; 60% across cases</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by CSE ID, rule ID, gap description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-amber-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Stage:</span>
            {stages.map((st) => (
              <button
                key={st.id}
                onClick={() => setStageFilter(st.id)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  stageFilter === st.id
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {st.label}
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
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Execution Gaps List / Cards */}
      <div className="space-y-4">
        {filteredGaps.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-lg text-slate-400 italic">
            No execution gaps match the selected criteria.
          </div>
        ) : (
          filteredGaps.map((g) => {
            const isExpanded = expandedId === g.id;
            const evList = g.evidence_ids || [];

            return (
              <div
                key={g.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs transition-all hover:border-amber-300"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/entity/${g.cse_id}`)}
                      className="font-mono font-bold text-sm text-blue-700 hover:underline flex items-center gap-1"
                    >
                      {g.cse_id}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {g.rule_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      {g.workflow_stage.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      Strength: <strong className="text-slate-800">{g.evidence_strength}</strong>
                    </span>
                    <RiskBadge level={g.severity} />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {g.rule_name}
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {g.description}
                </p>

                {/* Structured Process Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider block mb-1">
                      Expected Process Baseline
                    </span>
                    <p className="font-mono text-[11px] text-slate-800">
                      {g.expected_process}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider block mb-1">
                      Observed Operational Action
                    </span>
                    <p className="font-mono text-[11px] text-rose-900 font-semibold">
                      {g.observed_process}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-700 tracking-wider block mb-1">
                      Identified Process Gap
                    </span>
                    <p className="font-mono text-[11px] text-slate-700 font-medium">
                      {g.gap}
                    </p>
                  </div>
                </div>

                {/* Footer and Cited Evidence Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : g.id)}
                    className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-[11px]"
                  >
                    <span>Cited Evidence Records ({evList.length})</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => navigate(`/entity/${g.cse_id}`)}
                    className="text-blue-700 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-[11px]"
                  >
                    Investigate in Entity Dossier
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Expanded Cited Evidence Box */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200 animate-in fade-in-50">
                    <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2">
                      Cited Alert and Case Record Identifiers:
                    </div>
                    {evList.length === 0 ? (
                      <div className="text-slate-400 text-xs italic">
                        Aggregate entity-level metric threshold violation.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded">
                        {evList.map((id, i) => (
                          <span
                            key={i}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 font-medium"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertOctagon, Filter, Search, CheckCircle, Clock, 
  MessageSquare, User, ExternalLink, ChevronDown, ChevronUp, FileText, Check 
} from 'lucide-react';
import { getFindings, reviewFinding, getSystemicPatterns } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function FindingsPage({ batchId }) {
  const [findings, setFindings] = useState([]);
  const [systemicPatterns, setSystemicPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Expand evidence drawer
  const [expandedId, setExpandedId] = useState(null);

  // Review modal / action state
  const [activeReviewFinding, setActiveReviewFinding] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('UNDER_REVIEW');
  const [reviewerName, setReviewerName] = useState('Security Supervisor');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const navigate = useNavigate();

  const loadFindings = async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      const [fRes, sRes] = await Promise.all([
        getFindings(batchId),
        getSystemicPatterns(batchId).catch(() => ({ data: [] }))
      ]);
      const list = Array.isArray(fRes.data) ? fRes.data : (fRes.data.findings || []);
      setFindings(list);
      setSystemicPatterns(sRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch supervisory findings registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [batchId]);

  const filteredFindings = useMemo(() => {
    let list = [...findings];

    if (categoryFilter !== 'ALL') {
      list = list.filter(f => f.category === categoryFilter);
    }

    if (priorityFilter !== 'ALL') {
      list = list.filter(f => f.priority === priorityFilter);
    }

    if (statusFilter !== 'ALL') {
      list = list.filter(f => f.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(f => 
        f.finding_id.toLowerCase().includes(term) ||
        f.cse_id.toLowerCase().includes(term) ||
        f.title.toLowerCase().includes(term) ||
        f.description.toLowerCase().includes(term) ||
        (f.rule_id && f.rule_id.toLowerCase().includes(term))
      );
    }

    return list;
  }, [findings, categoryFilter, priorityFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = findings.length;
    const execGaps = findings.filter(f => f.category === 'EXECUTION GAP').length;
    const negSpace = findings.filter(f => f.category === 'NEGATIVE SPACE').length;
    const pending = findings.filter(f => f.status === 'NEW' || f.status === 'UNDER_REVIEW').length;
    const resolved = findings.filter(f => f.status === 'RESOLVED').length;
    return { total, execGaps, negSpace, pending, resolved };
  }, [findings]);

  const handleOpenReview = (f) => {
    setActiveReviewFinding(f);
    setReviewStatus(f.status === 'NEW' ? 'UNDER_REVIEW' : f.status);
    setReviewerName(f.reviewer || 'Security Supervisor');
    setReviewNotes(f.notes || '');
  };

  const handleSaveReview = async () => {
    if (!activeReviewFinding) return;
    try {
      setSubmittingReview(true);
      await reviewFinding(
        batchId,
        activeReviewFinding.finding_id,
        reviewStatus,
        reviewerName,
        reviewNotes
      );
      
      // Optimistically update finding in local state
      setFindings(prev => prev.map(f => {
        if (f.finding_id === activeReviewFinding.finding_id) {
          return {
            ...f,
            status: reviewStatus,
            reviewer: reviewerName,
            notes: reviewNotes,
            updated_at: new Date().toISOString()
          };
        }
        return f;
      }));

      setSuccessToast(`Finding ${activeReviewFinding.finding_id} status updated to ${reviewStatus}`);
      setTimeout(() => setSuccessToast(''), 3500);
      setActiveReviewFinding(null);
    } catch (err) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">NEW</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">UNDER REVIEW</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">ACKNOWLEDGED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{st}</span>;
    }
  };

  if (loading) return <LoadingSpinner message="Loading findings registry..." />;

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4" />
          {successToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            Supervisory Findings Registry
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assessed Operational Findings & Triage
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Unified record of execution gaps, negative space absences, and workflow anomalies requiring supervisory review.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
            Total: <strong>{stats.total}</strong>
          </span>
          <span className="px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800">
            Pending: <strong>{stats.pending}</strong>
          </span>
          <span className="px-3 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
            Resolved: <strong>{stats.resolved}</strong>
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Findings</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across all monitored CSEs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-600 tracking-wider">Execution Gaps</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{stats.execGaps}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Workflow bypasses & anomalies</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-purple-600 tracking-wider">Negative Space</div>
          <div className="text-2xl font-bold font-mono text-purple-700 mt-1">{stats.negSpace}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Missing telemetry & categories</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-blue-600 tracking-wider">Triage Status</div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {Math.round((stats.resolved / (stats.total || 1)) * 100)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{stats.resolved} / {stats.total} resolved</div>
        </div>
      </div>

      {/* Sector-Wide Systemic Findings Overview */}
      {systemicPatterns.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-lg p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Sector-Wide Systemic Vulnerabilities Detected ({systemicPatterns.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-purple-200">
              Threshold: max(3, 30% of CSEs) · Escalated Modal Severity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {systemicPatterns.map(sp => (
              <div 
                key={sp.rule_id} 
                className="bg-white/10 backdrop-blur-xs border border-white/15 rounded p-3 space-y-1.5 cursor-pointer hover:bg-white/15 transition-all"
                onClick={() => setSearchTerm(sp.rule_id)}
                title={`Click to filter findings by ${sp.rule_id}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-bold text-amber-300">{sp.rule_id}</span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-500/80 text-white">
                    {sp.escalated_severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-white">{sp.rule_name}</div>
                <div className="text-[11px] text-purple-200">
                  {sp.affected_count} CSEs affected: <span className="font-mono text-white">{(sp.affected_entities || []).join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Search */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, CSE, rule title, or evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Category:</span>
            {['ALL', 'EXECUTION GAP', 'NEGATIVE SPACE', 'PROCESS WEAKNESS'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  categoryFilter === cat
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Status:</span>
            {['ALL', 'NEW', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                  statusFilter === st
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider select-none">
              <tr>
                <th className="p-3.5">Finding ID</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">Category & Type</th>
                <th className="p-3.5">Finding Title & Rationale</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5 text-center">Cited Evidence</th>
                <th className="p-3.5">Review Status</th>
                <th className="p-3.5 text-right">Triage Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 italic">
                    No findings found matching current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredFindings.map((f) => {
                  const isExpanded = expandedId === f.finding_id;
                  const evList = f.evidence_ids || [];

                  return (
                    <React.Fragment key={f.finding_id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        {/* ID */}
                        <td className="p-3.5 font-mono font-semibold text-slate-600">
                          {f.finding_id}
                        </td>

                        {/* Entity */}
                        <td className="p-3.5">
                          <button
                            onClick={() => navigate(`/entity/${f.cse_id}`)}
                            className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1"
                          >
                            {f.cse_id}
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>

                        {/* Category */}
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              f.category === 'EXECUTION GAP' 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : f.category === 'NEGATIVE SPACE'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {f.category}
                            </span>
                            <div className="text-[10px] font-mono text-slate-500">
                              {f.rule_id}
                            </div>
                          </div>
                        </td>

                        {/* Title & Description */}
                        <td className="p-3.5 max-w-md">
                          <div className="font-semibold text-slate-900 text-xs mb-1">
                            {f.title}
                          </div>

                          {/* Supervisory Automation Badges */}
                          <div className="flex flex-wrap items-center gap-1 mb-1.5">
                            {f.auto_triaged_by && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono">
                                ⚡ Auto-triaged by: {f.auto_triaged_by}
                              </span>
                            )}
                            {(f.consecutive_cycles > 1 || f.is_chronic) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                🔁 {f.consecutive_cycles ? `${f.consecutive_cycles}${f.consecutive_cycles === 2 ? 'nd' : f.consecutive_cycles === 3 ? 'rd' : 'th'} cycle` : 'Chronic'}
                              </span>
                            )}
                            {f.is_systemic && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                🌐 Systemic ({f.systemic_entity_count || 3} CSEs)
                              </span>
                            )}
                          </div>

                          <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                            {f.description}
                          </p>
                          {f.notes && (
                            <div className="mt-1.5 text-[11px] text-blue-900 bg-blue-50/80 border border-blue-100 p-1.5 rounded flex items-start gap-1.5">
                              <MessageSquare className="w-3 h-3 text-blue-600 mt-0.5 shrink-0" />
                              <span><strong>{f.reviewer || 'Supervisor'}:</strong> {f.notes}</span>
                            </div>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="p-3.5">
                          <RiskBadge level={f.priority} />
                        </td>

                        {/* Evidence */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : f.finding_id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-colors ${
                              evList.length > 0 
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' 
                                : 'text-slate-400 bg-slate-50'
                            }`}
                          >
                            <span>{evList.length} records</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>

                        {/* Review Status */}
                        <td className="p-3.5">
                          {getStatusBadge(f.status)}
                        </td>

                        {/* Action */}
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenReview(f)}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs transition-colors"
                          >
                            Review / Triage
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Cited Evidence Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-y border-slate-200">
                          <td colSpan="8" className="p-4">
                            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              Cited Grounded Evidence Records ({evList.length}):
                            </div>
                            {evList.length === 0 ? (
                              <div className="text-slate-400 text-xs italic">
                                Statistical composite finding without isolated single alert identifier.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-white border border-slate-200 rounded">
                                {evList.map((id, idx) => (
                                  <span
                                    key={idx}
                                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200"
                                  >
                                    {id}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {activeReviewFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Supervisory Triage Action
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeReviewFinding.finding_id} — {activeReviewFinding.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveReviewFinding(null)}
                className="text-slate-400 hover:text-slate-600 font-mono text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Assigned Triage Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['UNDER_REVIEW', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatus(st)}
                      className={`p-2 rounded text-center font-semibold text-xs border transition-colors ${
                        reviewStatus === st
                          ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Reviewer Attribution
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Lead Supervisor, Audit Officer"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Supervisor Justification / Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide audit notes, disposition rationale, or escalation orders..."
                  rows="3"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveReviewFinding(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={handleSaveReview}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingReview ? 'Recording...' : 'Commit Review Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

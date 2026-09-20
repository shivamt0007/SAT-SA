import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, Filter, Download, UserCheck, AlertOctagon, 
  Search, Check, RefreshCw, ChevronDown, ChevronRight, Layers, Building2, CheckCircle2 
} from 'lucide-react';
import { getSamplingPlan, updateSampleReview } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ReviewQueuePage({ batchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample size input
  const [sampleSize, setSampleSize] = useState(50);
  const [activeSampleSize, setActiveSampleSize] = useState(50);

  // Filters
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [stratumFilter, setStratumFilter] = useState('ALL');
  const [reviewFilter, setReviewFilter] = useState('ALL'); // 'ALL', 'REVIEWED', 'PENDING'
  const [searchTerm, setSearchTerm] = useState('');

  // Review modal / edit
  const [reviewingItem, setReviewingItem] = useState(null);
  const [reviewerName, setReviewerName] = useState('Supervisor');
  const [reviewNotes, setReviewNotes] = useState('');
  const [updatingReview, setUpdatingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchPlan = async (size = activeSampleSize) => {
    if (!batchId) return;
    try {
      setLoading(true);
      const res = await getSamplingPlan(batchId, size);
      setData(res.data);
      setActiveSampleSize(size);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to generate sampling plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan(activeSampleSize);
  }, [batchId]);

  const samples = data?.samples || [];
  const entityBudgets = data?.entity_budgets || [];
  const stats = data?.summary || { total_sampled: 0, total_reviewed: 0, pending_review: 0 };

  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(samples.map(s => s.cse_id))).sort();
  }, [samples]);

  const uniqueStrata = useMemo(() => {
    return Array.from(new Set(samples.map(s => s.stratum))).filter(Boolean).sort();
  }, [samples]);

  const filteredSamples = useMemo(() => {
    let list = [...samples];

    if (entityFilter !== 'ALL') {
      list = list.filter(s => s.cse_id === entityFilter);
    }

    if (stratumFilter !== 'ALL') {
      list = list.filter(s => s.stratum === stratumFilter);
    }

    if (reviewFilter === 'REVIEWED') {
      list = list.filter(s => s.reviewed);
    } else if (reviewFilter === 'PENDING') {
      list = list.filter(s => !s.reviewed);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => 
        s.evidence_id.toLowerCase().includes(q) ||
        s.cse_id.toLowerCase().includes(q) ||
        (s.rule_or_event && s.rule_or_event.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [samples, entityFilter, stratumFilter, reviewFilter, searchTerm]);

  // Handle quick checkbox toggle
  const handleToggleReviewed = async (item) => {
    const newStatus = !item.reviewed;
    try {
      await updateSampleReview(batchId, item.evidence_id, newStatus, item.reviewer || 'Supervisor', item.notes || '');
      
      // Update local state
      setData(prev => ({
        ...prev,
        summary: {
          ...prev.summary,
          total_reviewed: prev.summary.total_reviewed + (newStatus ? 1 : -1),
          pending_review: prev.summary.pending_review - (newStatus ? 1 : -1),
        },
        samples: prev.samples.map(s => 
          s.evidence_id === item.evidence_id 
            ? { ...s, reviewed: newStatus, reviewer: item.reviewer || 'Supervisor', reviewed_at: newStatus ? new Date().toISOString() : null }
            : s
        )
      }));

      setToastMessage(`Evidence ${item.evidence_id} marked as ${newStatus ? 'Reviewed' : 'Pending'}`);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update review status');
    }
  };

  // Handle saving detailed review notes
  const handleSaveDetailedReview = async () => {
    if (!reviewingItem) return;
    try {
      setUpdatingReview(true);
      await updateSampleReview(batchId, reviewingItem.evidence_id, true, reviewerName, reviewNotes);

      setData(prev => ({
        ...prev,
        summary: {
          ...prev.summary,
          total_reviewed: reviewingItem.reviewed ? prev.summary.total_reviewed : prev.summary.total_reviewed + 1,
          pending_review: reviewingItem.reviewed ? prev.summary.pending_review : prev.summary.pending_review - 1,
        },
        samples: prev.samples.map(s => 
          s.evidence_id === reviewingItem.evidence_id 
            ? { ...s, reviewed: true, reviewer: reviewerName, notes: reviewNotes, reviewed_at: new Date().toISOString() }
            : s
        )
      }));

      setToastMessage(`Review committed for ${reviewingItem.evidence_id}`);
      setTimeout(() => setToastMessage(''), 2500);
      setReviewingItem(null);
    } catch (err) {
      setError(err.message || 'Failed to save review details');
    } finally {
      setUpdatingReview(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!samples.length) return;
    const headers = ['Evidence ID', 'CSE ID', 'Record Type', 'Severity', 'Stratum', 'Weight', 'Reviewed', 'Reviewer', 'Notes', 'Event/Rule'];
    const rows = samples.map(s => [
      `"${s.evidence_id}"`,
      `"${s.cse_id}"`,
      `"${s.record_type}"`,
      `"${s.severity || ''}"`,
      `"${s.stratum || ''}"`,
      s.weight ?? 1,
      s.reviewed ? 'YES' : 'NO',
      `"${s.reviewer || ''}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
      `"${(s.rule_or_event || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAT_SA_Sampling_Plan_Batch_${batchId.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) return <LoadingSpinner message="Calculating stratified sampling budget..." />;

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6 pb-20">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <CheckSquare className="w-4 h-4" />
            Supervisory Evidence Sampling Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Risk-Weighted Sample Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Statistically stratified evidence sample budgeted across Critical Sector Entities based on composite risk scores, 
            alert closure velocity anomalies, and severity strata. Ensures defensible supervisor oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            disabled={!samples.length}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Sample List (CSV)
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Sample Budgeting Controls & KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Sample Budget Adjuster Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
              Sample Budgeting Control
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                min="10"
                max="200"
                step="5"
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="w-24 px-2.5 py-1.5 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={() => fetchPlan(sampleSize)}
                disabled={loading}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Re-sample
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Statistically allocates total evidence sample quota proportional to entity risk weight.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Total Sampled</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{stats.total_sampled}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Records across {entityBudgets.length} entities</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-emerald-600 tracking-wider">Reviewed Records</div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">{stats.total_reviewed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {stats.total_sampled > 0 ? Math.round((stats.total_reviewed / stats.total_sampled) * 100) : 0}% review progress
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-amber-600 tracking-wider">Pending Supervisory Action</div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">{stats.pending_review}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting human validation</div>
        </div>

      </div>

      {/* Entity Budget Stratification Chips */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            Entity Allocation Proportional to Supervisory Risk:
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Click entity to filter sample table
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setEntityFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              entityFilter === 'ALL'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            All Entities ({samples.length})
          </button>
          {entityBudgets.map(eb => {
            const isSelected = entityFilter === eb.cse_id;
            return (
              <button
                key={eb.cse_id}
                onClick={() => setEntityFilter(isSelected ? 'ALL' : eb.cse_id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-800 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <span>{eb.cse_id}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isSelected ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {eb.allocated_count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Evidence ID, CSE, rule or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Stratum filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Stratum:</span>
              <select
                value={stratumFilter}
                onChange={(e) => setStratumFilter(e.target.value)}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-medium text-slate-700 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Strata</option>
                {uniqueStrata.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Review status filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Status:</span>
              <div className="flex items-center gap-1">
                {['ALL', 'PENDING', 'REVIEWED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setReviewFilter(st)}
                    className={`px-2.5 py-1 rounded font-semibold text-xs transition-colors ${
                      reviewFilter === st
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Samples Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider select-none">
              <tr>
                <th className="p-3 w-10 text-center">Status</th>
                <th className="p-3">Evidence ID</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Type</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Stratum / Rationale</th>
                <th className="p-3">Event / Rule</th>
                <th className="p-3">Supervisor Notes</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400 italic">
                    No sample records match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSamples.map(item => {
                  return (
                    <tr 
                      key={item.evidence_id} 
                      className={`hover:bg-slate-50/80 transition-colors ${item.reviewed ? 'bg-emerald-50/20' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={item.reviewed}
                          onChange={() => handleToggleReviewed(item)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Evidence ID */}
                      <td className="p-3 font-mono font-semibold text-slate-700">
                        {item.evidence_id}
                      </td>

                      {/* Entity */}
                      <td className="p-3 font-mono font-bold text-blue-900">
                        {item.cse_id}
                      </td>

                      {/* Type */}
                      <td className="p-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.record_type === 'ALERT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {item.record_type}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="p-3">
                        <RiskBadge level={item.severity} />
                      </td>

                      {/* Stratum */}
                      <td className="p-3">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {item.stratum}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Weight: {Number(item.weight || 1).toFixed(2)}
                        </div>
                      </td>

                      {/* Event / Rule */}
                      <td className="p-3 text-slate-700 text-[11px] max-w-xs truncate">
                        {item.rule_or_event || '—'}
                      </td>

                      {/* Notes / Reviewer */}
                      <td className="p-3 max-w-xs">
                        {item.reviewed ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {item.reviewer || 'Supervisor'}
                            </span>
                            {item.notes && <p className="text-slate-500 text-[10px] mt-0.5 truncate">{item.notes}</p>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Awaiting Review
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setReviewingItem(item);
                            setReviewerName(item.reviewer || 'Supervisor');
                            setReviewNotes(item.notes || '');
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          Details / Notes
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

      {/* Review Details Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Sample Evidence Audit
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {reviewingItem.evidence_id} ({reviewingItem.cse_id})
                </h3>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="text-slate-400 hover:text-slate-600 font-mono text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-[11px] space-y-1">
                <div><strong>Record Type:</strong> {reviewingItem.record_type}</div>
                <div><strong>Stratum:</strong> {reviewingItem.stratum}</div>
                <div><strong>Rule / Event:</strong> {reviewingItem.rule_or_event || '—'}</div>
                <div><strong>Sample Weight:</strong> {Number(reviewingItem.weight || 1).toFixed(2)}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Reviewer Name / Designation
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Supervisor Audit Notes & Verification Assessment
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record verification comments, confirmation of alert legitimacy, dwell anomalies, etc."
                  rows="3"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingReview}
                onClick={handleSaveDetailedReview}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {updatingReview ? 'Recording...' : 'Mark as Reviewed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

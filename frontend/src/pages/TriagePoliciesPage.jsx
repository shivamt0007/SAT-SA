import React, { useState, useEffect } from 'react';
import { 
  Sliders, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, 
  ShieldCheck, ArrowRight, Zap, Info, Check 
} from 'lucide-react';
import { getTriagePolicies, createTriagePolicy, updateTriagePolicy, deleteTriagePolicy } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function TriagePoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // New policy form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [ruleTarget, setRuleTarget] = useState('ALL');
  const [conditionType, setConditionType] = useState('RULE_MATCH');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState('AUTO_ACKNOWLEDGE');
  const [creating, setCreating] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await getTriagePolicies();
      setPolicies(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load triage policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleToggleActive = async (pol) => {
    const updated = !pol.is_active;
    try {
      await updateTriagePolicy(pol.id, { is_active: updated });
      setPolicies(prev => prev.map(p => p.id === pol.id ? { ...p, is_active: updated } : p));
      setToastMessage(`Policy "${pol.name}" ${updated ? 'activated' : 'deactivated'}`);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update policy');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete triage policy "${name}"?`)) return;
    try {
      await deleteTriagePolicy(id);
      setPolicies(prev => prev.filter(p => p.id !== id));
      setToastMessage(`Policy "${name}" deleted`);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to delete policy');
    }
  };

  const handleCreatePolicy = async (e) => {
    e.preventDefault();
    if (!policyName.trim()) return;

    try {
      setCreating(true);
      const payload = {
        name: policyName.trim(),
        target_rule: ruleTarget === 'ALL' ? null : ruleTarget,
        condition_type: conditionType,
        condition_value: conditionValue.trim() || null,
        action: actionType,
        is_active: true
      };
      const res = await createTriagePolicy(payload);
      setPolicies(prev => [...prev, res.data]);
      setShowAddModal(false);
      setPolicyName('');
      setConditionValue('');
      setToastMessage(`Triage policy "${payload.name}" created successfully`);
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to create policy');
    } finally {
      setCreating(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'AUTO_FALSE_POSITIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">AUTO FALSE POSITIVE</span>;
      case 'AUTO_ACKNOWLEDGE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">AUTO ACKNOWLEDGE</span>;
      case 'AUTO_ESCALATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">AUTO ESCALATE (+1 SEV)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{action}</span>;
    }
  };

  if (loading) return <LoadingSpinner message="Loading automated triage policies..." />;

  return (
    <div className="max-w-[1500px] mx-auto p-6 space-y-6 pb-20">
      
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
            <Sliders className="w-4 h-4" />
            Automated Supervisory Workflow
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Auto-Triage Policy Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Configure declarative IF-THEN triage rules executed during batch analysis. Policies automatically tag 
            findings (<code>Auto-triaged by: [Policy]</code>) and adjust initial status or severity while preserving complete human supervisor review authority.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Triage Policy
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Human-in-the-loop Assurance Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-[11px] block">
            Guaranteed Human-In-The-Loop Audit Integrity
          </span>
          <p className="text-blue-800 leading-relaxed">
            Auto-triage never suppresses or deletes findings. When a policy triggers, the finding is explicitly stamped with the policy name and its recommendation. A human supervisor can inspect, override, or revert any auto-triaged disposition at any time in the Findings Registry or Review Queue.
          </p>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Configured Supervisory Triage Policies ({policies.length})
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Evaluated synchronously during ingestion analysis
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px] tracking-wider select-none">
              <tr>
                <th className="p-3 w-14 text-center">Active</th>
                <th className="p-3">Policy Name</th>
                <th className="p-3">Target Rule</th>
                <th className="p-3">Trigger Condition</th>
                <th className="p-3">Automated Action</th>
                <th className="p-3 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {policies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                    No triage policies configured. Default policies will be created automatically on next assessment.
                  </td>
                </tr>
              ) : (
                policies.map(pol => (
                  <tr key={pol.id} className={`hover:bg-slate-50/80 transition-colors ${!pol.is_active ? 'opacity-60 bg-slate-50/40' : ''}`}>
                    {/* Toggle */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleActive(pol)}
                        title={pol.is_active ? 'Click to deactivate' : 'Click to activate'}
                        className={`w-8 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                          pol.is_active ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                      >
                        <div className="bg-white w-3 h-3 rounded-full shadow-md" />
                      </button>
                    </td>

                    {/* Name */}
                    <td className="p-3 font-semibold text-slate-900 text-xs">
                      {pol.name}
                    </td>

                    {/* Rule */}
                    <td className="p-3">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {pol.target_rule || 'ALL RULES'}
                      </span>
                    </td>

                    {/* Condition */}
                    <td className="p-3 font-mono text-[11px] text-slate-600">
                      {pol.condition_type} {pol.condition_value ? `(${pol.condition_value})` : ''}
                    </td>

                    {/* Action */}
                    <td className="p-3">
                      {getActionBadge(pol.action)}
                    </td>

                    {/* Delete */}
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDelete(pol.id, pol.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreatePolicy} className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  New Automated Rule
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Create Triage Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-mono text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  required
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Escalate Chronic Suppressions"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Target Rule
                  </label>
                  <select
                    value={ruleTarget}
                    onChange={(e) => setRuleTarget(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none font-mono"
                  >
                    <option value="ALL">ALL RULES</option>
                    <option value="R-01">R-01 (Rapid Closure)</option>
                    <option value="R-02">R-02 (Off-Hours Velocity)</option>
                    <option value="R-03">R-03 (Template Text)</option>
                    <option value="R-04">R-04 (Low Severity Closure)</option>
                    <option value="R-05">R-05 (Suppressed Escalation)</option>
                    <option value="R-06">R-06 (Alert Volume Spike)</option>
                    <option value="R-07">R-07 (Missing Case Linkage)</option>
                    <option value="R-08">R-08 (Critical Inaction)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Condition Type
                  </label>
                  <select
                    value={conditionType}
                    onChange={(e) => setConditionType(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none font-mono"
                  >
                    <option value="RULE_MATCH">RULE_MATCH</option>
                    <option value="CHRONIC">CHRONIC (Recurring)</option>
                    <option value="SEVERITY_MATCH">SEVERITY_MATCH</option>
                    <option value="CATEGORY_MATCH">CATEGORY_MATCH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Condition Value (Optional parameter)
                </label>
                <input
                  type="text"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="e.g. CRITICAL or threshold parameter"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Triage Action *
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:outline-none font-semibold text-blue-900"
                >
                  <option value="AUTO_ACKNOWLEDGE">AUTO_ACKNOWLEDGE (Tag for supervisory awareness)</option>
                  <option value="AUTO_FALSE_POSITIVE">AUTO_FALSE_POSITIVE (Preset status to False Positive)</option>
                  <option value="AUTO_ESCALATE">AUTO_ESCALATE (Escalate severity tier +1)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {creating ? 'Creating...' : 'Save Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

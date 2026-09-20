import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, ArrowLeft, ShieldAlert, CheckCircle2, Clock, 
  FileText, GitBranch, EyeOff, BarChart3, ListOrdered, 
  Save, AlertTriangle, HelpCircle, ExternalLink, ArrowRight,
  Compass, History, Send, FileDown, Check, Sparkles, AlertOctagon
} from 'lucide-react';
import { 
  getEntity, addNote, getCapabilityProfile, getTrend, 
  generateAdvisory, getAdvisories, updateAdvisory, getAdvisoryPdfUrl 
} from '../api';
import RiskBadge from '../components/RiskBadge';
import ScoreBar from '../components/ScoreBar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';

export default function DrilldownPage({ batchId }) {
  const { cseId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState('flags'); // 'flags', 'capability', 'trend', 'negative_space', 'peer', 'attribution', 'timeline'

  // Automation data states
  const [capabilityData, setCapabilityData] = useState(null);
  const [trendData, setTrendData] = useState(null);

  // Advisory modal & actions
  const [advisoryModalOpen, setAdvisoryModalOpen] = useState(false);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [currentAdvisory, setCurrentAdvisory] = useState(null);
  const [advisoryDirective, setAdvisoryDirective] = useState('');
  const [savingAdvisory, setSavingAdvisory] = useState(false);
  const [advisoryToast, setAdvisoryToast] = useState('');

  // Supervisor note
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!batchId || !cseId) return;
      try {
        setLoading(true);
        const [entityRes, capRes, trendRes] = await Promise.all([
          getEntity(cseId, batchId),
          getCapabilityProfile(cseId, batchId).catch(() => ({ data: null })),
          getTrend(cseId, batchId).catch(() => ({ data: null }))
        ]);
        setData(entityRes.data);
        setNoteInput(entityRes.data.supervisor_note || '');
        setCapabilityData(capRes.data);
        setTrendData(trendRes.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch entity supervisory dossier');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [cseId, batchId]);

  const handleOpenAdvisoryModal = async () => {
    setAdvisoryModalOpen(true);
    try {
      setAdvisoryLoading(true);
      // Fetch or auto-generate advisory draft
      const res = await generateAdvisory(cseId, batchId, advisoryDirective);
      setCurrentAdvisory(res.data);
      setAdvisoryDirective(res.data.supervisory_directive || '');
    } catch (err) {
      setError(err.message || 'Failed to draft supervisory advisory letter');
    } finally {
      setAdvisoryLoading(false);
    }
  };

  const handleApproveAdvisory = async () => {
    if (!currentAdvisory) return;
    try {
      setSavingAdvisory(true);
      const res = await updateAdvisory(currentAdvisory.id, {
        status: 'APPROVED',
        supervisory_directive: advisoryDirective
      });
      setCurrentAdvisory(res.data);
      setAdvisoryToast(`Advisory Letter ${res.data.reference_number} officially APPROVED`);
      setTimeout(() => setAdvisoryToast(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to approve advisory');
    } finally {
      setSavingAdvisory(false);
    }
  };

  const handleSaveAdvisoryDraft = async () => {
    if (!currentAdvisory) return;
    try {
      setSavingAdvisory(true);
      const res = await updateAdvisory(currentAdvisory.id, {
        supervisory_directive: advisoryDirective
      });
      setCurrentAdvisory(res.data);
      setAdvisoryToast('Directive instructions saved to draft');
      setTimeout(() => setAdvisoryToast(''), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save advisory draft');
    } finally {
      setSavingAdvisory(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      await addNote(batchId, cseId, noteInput);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) return <LoadingSpinner message={`Compiling supervisory dossier for ${cseId}...`} />;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;
  if (!data || data.error) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">Entity {cseId} not found in this assessment batch.</p>
        <button onClick={() => navigate('/entities')} className="mt-4 px-4 py-2 bg-blue-700 text-white text-xs rounded font-semibold">
          Return to Entity Registry
        </button>
      </div>
    );
  }

  const score = Number(data.risk_score || 0);
  const flags = data.flags || [];
  const negSpace = data.negative_space_findings || data.negative_space || [];
  const peerContext = data.peer_context || [];
  const execSummary = data.executive_summary || {};
  const timeline = data.timeline || [];
  const coverageScore = data.supervisory_coverage;
  const processComp = data.process_completeness || {};

  // SHAP Feature Attribution Chart Data
  const shapList = data.shap_values || [];
  const shapData = shapList.map(item => ({
    feature: item.feature.replace(/_/g, ' '),
    value: Number(item.contribution || 0),
    rawValue: item.value
  })).slice(0, 8);

  const tabs = [
    { id: 'flags', label: `Operational Flags (${flags.length})`, icon: GitBranch },
    { id: 'capability', label: 'NCIIPC 8-Capability Profile', icon: Compass },
    { id: 'trend', label: 'Supervisory Memory & Trend', icon: History },
    { id: 'negative_space', label: `Negative Space (${negSpace.length})`, icon: EyeOff },
    { id: 'peer', label: 'Peer Benchmarks', icon: BarChart3 },
    { id: 'attribution', label: 'Feature Attribution', icon: ShieldAlert },
    { id: 'timeline', label: `Evidence Timeline (${timeline.length})`, icon: Clock },
  ];

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6 pb-16">
      
      {/* Back link & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          onClick={() => navigate('/entities')}
          className="hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Entity Registry
        </button>
        <span>/</span>
        <span className="text-slate-900 font-mono">{cseId}</span>
      </div>

      {/* Dossier Header Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Entity Details */}
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                {cseId}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                {data.sector || 'Sector Unknown'}
              </span>
              {data.is_grey && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300 uppercase">
                  Low Volume Unassessed
                </span>
              )}
            </div>
            
            <p className="text-xs text-slate-500 font-mono">
              Batch: {batchId} · Framework: NCIIPC/NTRO Supervisory Baseline
            </p>
          </div>

          {/* Risk Metrics */}
          <div className="flex flex-wrap items-center gap-6 lg:gap-8">
            
            {/* Supervisory Coverage */}
            {coverageScore !== null && coverageScore !== undefined && (
              <div className="text-left lg:text-right border-l lg:border-l-0 lg:border-r border-slate-200 pl-4 lg:pl-0 lg:pr-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Supervisory Coverage
                </div>
                <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
                  {Math.round(coverageScore)}%
                </div>
                <div className="text-[10px] text-slate-400">
                  {coverageScore < 50 ? 'Telemetry gaps' : 'Adequate coverage'}
                </div>
              </div>
            )}

            {/* Risk Tier Badge */}
            <div className="text-left lg:text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Assigned Risk Tier
              </div>
              <RiskBadge level={data.risk_level} />
            </div>

            {/* Large Score */}
            <div className="text-left lg:text-right border-l border-slate-200 pl-6">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                Composite Score
              </div>
              <div className="text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                {score.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">/100</span>
              </div>
            </div>

            {/* Draft Advisory Letter Action */}
            <div className="text-left lg:text-right border-l border-slate-200 pl-6 flex flex-col justify-center">
              <button
                onClick={handleOpenAdvisoryModal}
                className="px-3 py-2 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Draft Advisory Letter</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Advisory Toast */}
      {advisoryToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <Check className="w-4 h-4" />
          {advisoryToast}
        </div>
      )}

      {/* Executive Supervisory Callout */}
      <div className="bg-slate-900 text-slate-200 rounded-lg p-5 shadow-xs border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
          <ShieldAlert className="w-4 h-4 text-blue-400" />
          Supervisory Executive Assessment
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="md:col-span-2">
            <span className="text-slate-400 text-[11px] block font-semibold mb-1">Primary Rationale:</span>
            <p className="text-white font-medium leading-relaxed">
              {execSummary.why_flagged || data.primary_reason || 'Standard operational baselines observed.'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block font-semibold mb-1">Evidence Sufficiency:</span>
            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
              execSummary.evidence_sufficiency === 'SUFFICIENT' 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}>
              {execSummary.evidence_sufficiency || 'SUFFICIENT'}
            </span>
            <div className="text-slate-400 text-[10px] mt-1 font-mono">
              {data.features?.total_alerts || 0} alerts · {data.features?.total_cases || 0} cases
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block font-semibold mb-1">Supervisory Directive:</span>
            <p className="text-slate-300 text-[11px] leading-snug">
              {execSummary.recommendation || 'Standard continuous supervisory monitoring.'}
            </p>
          </div>
        </div>
      </div>

      {/* Score Decomposition */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
          Risk Score Breakdown & Point Contributions
        </div>
        <ScoreBar breakdown={data.score_breakdown} />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-lg shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-700 text-blue-800 bg-blue-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents Area */}
      <div className="bg-white border border-slate-200 rounded-b-lg p-6 shadow-xs">
        
        {/* TAB 1: OPERATIONAL FLAGS & EXECUTION GAPS */}
        {activeTab === 'flags' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 mb-2">
              Specific rule violations and workflow execution gaps identified for {cseId}:
            </div>

            {flags.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                No operational rule flags or execution gaps triggered for this entity.
              </div>
            ) : (
              flags.map((flag, idx) => {
                const evList = flag.evidence_ids || flag.evidence || [];
                return (
                  <div
                    key={idx}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-white transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          {flag.rule_id}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {flag.rule_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-slate-500">
                          Strength: {flag.evidence_strength || 'HIGH'}
                        </span>
                        <RiskBadge level={flag.severity} />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {flag.description}
                    </p>

                    {/* Structured Comparison if available */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-slate-200 rounded p-2.5 text-xs mb-3 font-mono text-[11px]">
                      <div>
                        <span className="text-emerald-700 font-bold block text-[10px] uppercase font-sans">Expected</span>
                        {flag.expected || 'Adherence to standard SOC operational baseline'}
                      </div>
                      <div>
                        <span className="text-rose-700 font-bold block text-[10px] uppercase font-sans">Observed</span>
                        {flag.observed || flag.description}
                      </div>
                      <div>
                        <span className="text-amber-700 font-bold block text-[10px] uppercase font-sans">Gap Rationale</span>
                        {flag.gap || 'Workflow deviation detected'}
                      </div>
                    </div>

                    {evList.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-1">
                          Cited Grounded Records ({evList.length}):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {evList.map((id, i) => (
                            <span key={i} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: NCIIPC 8-CAPABILITY PROFILE & RADAR */}
        {activeTab === 'capability' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  NCIIPC Official 8-Capability Operational Maturity Radar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assessing {cseId} operational evidence mapped directly to the 8 official capability areas defined in NCIIPC guidelines.
                </p>
              </div>

              {capabilityData && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Overall Maturity Score:</span>
                  <span className="font-mono text-base font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    {Number(capabilityData.overall_capability_score || 0).toFixed(1)} / 100
                  </span>
                </div>
              )}
            </div>

            {!capabilityData ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                Capability profile not available for this entity.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* 8-Axis Radar Chart */}
                <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center mb-1">
                    Entity vs. Sector Peer Average Overlay
                  </div>
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={capabilityData.capabilities || []} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="capability" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 9 }} />
                        <Radar name={cseId} dataKey="score" stroke="#1d4ed8" fill="#2563eb" fillOpacity={0.45} />
                        <Radar name="Sector Peer Average" dataKey="peer_average" stroke="#94a3b8" fill="#64748b" fillOpacity={0.15} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Tooltip formatter={(val) => [`${Number(val).toFixed(1)}%`, '']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Capability Matrix Breakdown */}
                <div className="lg:col-span-6 overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">NCIIPC Capability</th>
                        <th className="p-2.5 text-center">Score</th>
                        <th className="p-2.5 text-center">Peer Avg</th>
                        <th className="p-2.5 text-center">Deficit</th>
                        <th className="p-2.5">Supervisory Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(capabilityData.capabilities || []).map((cap) => {
                        const deficit = cap.score - cap.peer_average;
                        const isAttention = cap.status === 'NEEDS_ATTENTION' || cap.score < 60;

                        return (
                          <tr key={cap.capability} className={isAttention ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                            <td className="p-2.5 font-medium text-slate-900">
                              <div>{cap.capability}</div>
                              <div className="text-[10px] text-slate-400">{cap.findings_count} related findings</div>
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                              {Number(cap.score).toFixed(0)}%
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-500">
                              {Number(cap.peer_average).toFixed(0)}%
                            </td>
                            <td className={`p-2.5 text-center font-mono font-semibold ${deficit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {deficit > 0 ? `+${deficit.toFixed(0)}%` : `${deficit.toFixed(0)}%`}
                            </td>
                            <td className="p-2.5">
                              {isAttention ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  DIRECTIVE REQUIRED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  ADEQUATE
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUPERVISORY MEMORY & TREND */}
        {activeTab === 'trend' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  Assessment-Cycle Trend & Recurrence Tracking ("Supervisory Memory")
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tracking multi-cycle progression for {cseId} to detect persistent vulnerabilities and chronic operational failures across audit batches.
                </p>
              </div>

              {trendData?.comparison?.risk_score_delta !== undefined && (
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-slate-500">Cycle Delta:</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    trendData.comparison.risk_score_delta > 0 
                      ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {trendData.comparison.risk_score_delta > 0 ? `+${trendData.comparison.risk_score_delta.toFixed(1)} pts (Deterioration)` : `${trendData.comparison.risk_score_delta.toFixed(1)} pts (Improvement)`}
                  </span>
                </div>
              )}
            </div>

            {/* Sparkline / History Line Chart */}
            {trendData?.history && trendData.history.length > 1 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Historical Risk Score Progression ({trendData.history.length} Assessment Batches)
                </div>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData.history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="batch_name" stroke="#64748b" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                      <Tooltip formatter={(val) => [`${val} pts`, 'Risk Score']} />
                      <Line type="monotone" dataKey="risk_score" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 3-Column Diff: New vs Resolved vs Recurring */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: New Findings */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    New Findings ({trendData?.comparison?.new_findings?.length || 0})
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                    First Seen This Cycle
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {!trendData?.comparison?.new_findings?.length ? (
                    <div className="text-[11px] text-slate-400 italic py-4 text-center">No new findings introduced.</div>
                  ) : (
                    trendData.comparison.new_findings.map((f, i) => (
                      <div key={i} className="bg-white border border-blue-200 rounded p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-800 text-[11px]">{f.rule_id}</span>
                          <RiskBadge level={f.priority || f.severity} />
                        </div>
                        <div className="font-semibold text-slate-800 text-[11px]">{f.title}</div>
                        <p className="text-slate-500 text-[10px] leading-tight line-clamp-2">{f.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Resolved Findings */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Resolved Findings ({trendData?.comparison?.resolved_findings?.length || 0})
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    Cleared From Prior Cycle
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {!trendData?.comparison?.resolved_findings?.length ? (
                    <div className="text-[11px] text-slate-400 italic py-4 text-center">No prior findings resolved.</div>
                  ) : (
                    trendData.comparison.resolved_findings.map((f, i) => (
                      <div key={i} className="bg-white border border-emerald-200 rounded p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-800 text-[11px]">{f.rule_id}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">CLEARED</span>
                        </div>
                        <div className="font-semibold text-slate-800 text-[11px]">{f.title}</div>
                        <p className="text-slate-500 text-[10px] leading-tight line-clamp-2">{f.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Recurring Findings */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3.5 space-y-2.5">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Recurring Findings ({trendData?.comparison?.recurring_findings?.length || 0})
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    Persisting Weaknesses
                  </span>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {!trendData?.comparison?.recurring_findings?.length ? (
                    <div className="text-[11px] text-slate-400 italic py-4 text-center">No recurring findings detected.</div>
                  ) : (
                    trendData.comparison.recurring_findings.map((f, i) => (
                      <div key={i} className={`bg-white border rounded p-2.5 text-xs space-y-1.5 ${
                        f.is_chronic ? 'border-rose-300 ring-1 ring-rose-200' : 'border-amber-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-900 text-[11px]">{f.rule_id}</span>
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              🔁 {f.consecutive_cycles ? `${f.consecutive_cycles}${f.consecutive_cycles === 2 ? 'nd' : f.consecutive_cycles === 3 ? 'rd' : 'th'} cycle` : 'Recurring'}
                            </span>
                          </div>
                        </div>

                        {f.is_chronic && (
                          <div className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 flex items-center gap-1">
                            <AlertOctagon className="w-3 h-3 text-rose-600 shrink-0" />
                            CHRONIC WEAKNESS (&ge;3 CONSECUTIVE CYCLES)
                          </div>
                        )}

                        <div className="font-semibold text-slate-800 text-[11px]">{f.title}</div>
                        <p className="text-slate-500 text-[10px] leading-tight line-clamp-2">{f.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: NEGATIVE SPACE */}
        {activeTab === 'negative_space' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 mb-2">
              Absences of expected security evidence detected for {cseId}:
            </div>

            {negSpace.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                No negative space absences or silent critical assets identified.
              </div>
            ) : (
              negSpace.map((ns, idx) => (
                <div
                  key={idx}
                  className="border border-purple-200 bg-purple-50/20 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                        {ns.finding_type || ns.type}
                      </span>
                      {ns.asset_id && (
                        <span className="font-mono text-xs font-bold text-slate-800">
                          Asset: {ns.asset_id}
                        </span>
                      )}
                    </div>
                    <RiskBadge level={ns.severity} />
                  </div>

                  <p className="text-xs text-slate-800 font-medium mb-3">
                    {ns.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 bg-white border border-slate-200 rounded p-2.5 text-xs font-mono text-[11px] mb-2">
                    <div>
                      <span className="text-emerald-700 font-bold block text-[10px] uppercase font-sans">Expected Evidence</span>
                      {ns.expected || ns.expected_value}
                    </div>
                    <div>
                      <span className="text-rose-700 font-bold block text-[10px] uppercase font-sans">Observed Telemetry</span>
                      {ns.observed || ns.observed_value}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: SECTOR PEER BENCHMARKS */}
        {activeTab === 'peer' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 mb-2">
              Comparison against peer entities in the {data.sector || 'same'} sector:
            </div>

            {peerContext.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                No peer benchmark distribution data available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {peerContext.map((item) => {
                  const labelMap = {
                    escalation_rate: 'Tier Escalation Rate (%)',
                    mean_closure_time_critical: 'Mean Critical Closure Time (min)',
                    critical_asset_telemetry_ratio: 'Critical Asset Telemetry Ratio',
                    case_linkage_rate: 'Alert-Case Linkage Rate',
                    critical_fast_closure_rate: 'Rapid Closure Rate (<8m)',
                    alert_burst_max_hour: 'Max Burst Rate (Alerts/Hour)'
                  };
                  const label = labelMap[item.metric] || item.metric.replace(/_/g, ' ');

                  return (
                    <div key={item.metric} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
                        <span>{label}</span>
                        <span className={`font-mono text-[11px] ${
                          Math.abs(item.deviation) > 10 ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                          Dev: {item.deviation > 0 ? `+${item.deviation}` : item.deviation}
                        </span>
                      </div>

                      <div className="flex justify-between text-xs font-mono text-slate-600 mb-2">
                        <span>Entity: <strong className="text-blue-700">{Number(item.cse_value).toFixed(2)}</strong></span>
                        <span>Peer Mean: <strong>{Number(item.peer_mean).toFixed(2)}</strong></span>
                      </div>

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${Math.min(Math.max((Number(item.cse_value) / Math.max(Number(item.peer_mean) * 2, 0.01)) * 100, 5), 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SHAP FEATURE ATTRIBUTION */}
        {activeTab === 'attribution' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-1">
                Feature Attribution & Key Risk Drivers (SHAP)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Positive values increase the supervisory risk score; negative values decrease risk.
              </p>
            </div>

            <div className="h-72 w-full">
              {shapData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                  No attribution model data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shapData} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="feature" type="category" width={160} stroke="#64748b" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '11px' }}
                      formatter={(val) => [`${Number(val).toFixed(2)} pts`, 'Contribution']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {shapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#e11d48' : '#2563eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: EVIDENCE TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 mb-2">
              Chronological operational events reconstructed from alert & case logs:
            </div>

            {timeline.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                No recent chronological alert/case records available for timeline reconstruction.
              </div>
            ) : (
              <div className="border-l-2 border-slate-200 ml-4 pl-4 space-y-4">
                {timeline.map((item, i) => (
                  <div key={i} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px]">{item.time_display || item.timestamp}</span>
                      <span className="font-bold text-slate-900">{item.event}</span>
                      <RiskBadge level={item.severity} />
                    </div>
                    <p className="text-slate-600 mt-0.5 font-mono text-[11px]">
                      {item.identifier} · Asset: {item.asset} · {item.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Supervisor Annotations Form */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Supervisor Audit Annotations & Review Notes
            </h3>
            <p className="text-xs text-slate-400">
              Internal comments attached to this entity's permanent supervisory dossier.
            </p>
          </div>
          {savedSuccess && (
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Note saved successfully!
            </span>
          )}
        </div>

        <textarea
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
          placeholder="Add official supervisor audit findings, remediation requirements, or verification notes..."
          rows="3"
          className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-blue-500 focus:outline-none mb-3 font-sans"
        />

        <div className="flex justify-end">
          <button
            onClick={handleSaveNote}
            disabled={savingNote}
            className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {savingNote ? 'Saving...' : 'Save Supervisor Note'}
          </button>
        </div>
      </div>

      {/* Supervisory Advisory Letter Modal */}
      {advisoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">
                    Supervisory Corrective Action Advisory Letter · {cseId}
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Ref: {currentAdvisory?.reference_number || 'GENERATING...'} · Status: <strong className={currentAdvisory?.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}>{currentAdvisory?.status || 'DRAFT'}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAdvisoryModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {advisoryLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="inline-block w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 font-medium">Assembling grounded advisory template with rule evidence...</p>
                </div>
              ) : currentAdvisory ? (
                <>
                  {/* Letter Metadata Preview Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">Reference</span>
                      <strong className="text-slate-800">{currentAdvisory.reference_number}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">Addressee</span>
                      <strong className="text-slate-800">{currentAdvisory.recipient_entity} SOC Leadership</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">Assessment Date</span>
                      <strong className="text-slate-800">{currentAdvisory.assessment_date}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[10px] block">Identified Gaps</span>
                      <strong className="text-rose-700">{(currentAdvisory.findings_included || []).length} Priority Deficiencies</strong>
                    </div>
                  </div>

                  {/* Letter Full Text Preview */}
                  <div className="border border-slate-200 rounded-lg p-6 bg-white font-serif text-[12px] leading-relaxed text-slate-800 space-y-4 shadow-2xs whitespace-pre-wrap max-h-96 overflow-y-auto select-text">
                    {currentAdvisory.rendered_content}
                  </div>

                  {/* Editable Supervisory Directive Area */}
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
                      Supervisory Custom Directive & Statutory Order
                    </label>
                    <p className="text-[11px] text-blue-700">
                      Supervisors can append explicit statutory orders, mandatory remediation deadlines (e.g. 14 days), or on-site inspection requirements before final sign-off.
                    </p>
                    <textarea
                      value={advisoryDirective}
                      onChange={(e) => setAdvisoryDirective(e.target.value)}
                      placeholder="e.g. The entity is hereby directed to complete immediate audit trail verification on assets and provide a signed compliance report within 14 working days..."
                      rows="3"
                      className="w-full p-2.5 text-xs bg-white border border-blue-300 rounded font-sans focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400">Failed to render advisory letter.</div>
              )}
            </div>

            {/* Modal Actions Footer */}
            {currentAdvisory && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingAdvisory}
                    onClick={handleSaveAdvisoryDraft}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors disabled:opacity-50"
                  >
                    {savingAdvisory ? 'Saving...' : 'Save Directive'}
                  </button>

                  {currentAdvisory.status !== 'APPROVED' && (
                    <button
                      type="button"
                      disabled={savingAdvisory}
                      onClick={handleApproveAdvisory}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve & Issue Letter
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getAdvisoryPdfUrl(currentAdvisory.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-1.5 rounded text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FileDown className="w-4 h-4" />
                    Download Official PDF
                  </a>

                  <button
                    type="button"
                    onClick={() => setAdvisoryModalOpen(false)}
                    className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

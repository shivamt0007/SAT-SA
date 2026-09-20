import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart2, Layers, Cpu, Activity, Clock, 
  TrendingUp, Shield, ExternalLink, CheckCircle2, AlertTriangle, Eye 
} from 'lucide-react';
import { getAnalyticsSummary, getSystemicPatterns } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import AssessmentTopology3D from '../components/AssessmentTopology3D';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';

export default function AnalyticsPage({ batchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemicPatterns, setSystemicPatterns] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState('CSE-07');

  // Active view mode: 'analytics' or 'topology'
  const [activeView, setActiveView] = useState('analytics');

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const [analyticsRes, systemicRes] = await Promise.all([
          getAnalyticsSummary(batchId),
          getSystemicPatterns(batchId).catch(() => ({ data: [] }))
        ]);
        setData(analyticsRes.data);
        setSystemicPatterns(systemicRes.data || []);
        if (analyticsRes.data?.entities?.length > 0) {
          setSelectedEntityId(analyticsRes.data.entities[0].cse_id);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch analytical matrices');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  if (loading) return <LoadingSpinner message="Calculating supervisory analytical matrices..." />;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;

  const entities = data?.entities || [];

  // Hourly composite distribution
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hourLabel = `${String(i).padStart(2, '0')}:00`;
    let totalAlertsInHour = 0;
    entities.forEach(e => {
      const hDist = e.hourly_distribution || [];
      totalAlertsInHour += (hDist[i] || 0);
    });
    return { hour: hourLabel, alerts: totalAlertsInHour };
  });

  // Coverage leaderboard data
  const coverageData = entities.map(e => ({
    cse_id: e.cse_id,
    coverage: Math.round(e.supervisory_coverage_score || 0),
    risk_level: e.risk_level,
    fast_closure: Math.round((e.critical_fast_closure_rate || 0) * 100),
    escalation: Math.round((e.escalation_rate || 0) * 100)
  }));

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4" />
            Supervisory Analytics & Feature Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Cross-Entity Operational & Feature Matrices
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Deep-dive feature engineering: supervisory coverage scores, 5-stage process completeness, and structural topology.
          </p>
        </div>

        {/* View Switcher: Analytical Metrics vs 3D Topology */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeView === 'analytics'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Analytics Matrices
          </button>
          <button
            onClick={() => setActiveView('topology')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              activeView === 'topology'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Assessment Topology (3D)
          </button>
        </div>
      </div>

      {/* TOPOLOGY VIEW */}
      {activeView === 'topology' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md p-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Critical Sector Entity for 3D Topology:
              </span>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded text-blue-900 focus:bg-white focus:outline-none"
              >
                {entities.map(e => (
                  <option key={e.cse_id} value={e.cse_id}>
                    {e.cse_id} ({e.sector}) — Risk: {Number(e.risk_score || 0).toFixed(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Visualizing evidence graph & cross-entity systemic connections
            </div>
          </div>

          <AssessmentTopology3D 
            entityId={selectedEntityId} 
            systemicPatterns={systemicPatterns}
          />
        </div>
      )}

      {/* ANALYTICS MATRICES VIEW */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          
          {/* Top Grid: Coverage Scores & Hourly Temporal Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Supervisory Coverage Leaderboard */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  Supervisory Coverage Scores by Entity
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Target &ge; 80%</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Measures telemetry instrumentation, alert category diversity, and case linkage completeness.
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coverageData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="cse_id" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '11px' }}
                      formatter={(val) => [`${val}%`, 'Coverage Score']}
                    />
                    <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                      {coverageData.map((entry, idx) => (
                        <Cell 
                          key={`cov-${idx}`} 
                          fill={entry.coverage < 50 ? '#ef4444' : entry.coverage < 80 ? '#f59e0b' : '#10b981'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Aggregate 24-Hour SOC Activity Heatmap / Profile */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  24-Hour Ingestion & Alert Temporal Profile
                </h3>
                <span className="text-[11px] font-mono text-slate-400">Aggregate Batch Volume</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Identifies off-hours activity anomalies, automated batch bursts, and shift handoff patterns.
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 20, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={2} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '6px', fontSize: '11px' }}
                      formatter={(val) => [val, 'Total Alerts']}
                    />
                    <Bar dataKey="alerts" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Process Completeness Matrix Across All Monitored CSEs */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                5-Stage SOC Process Completeness Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluates compliance across sequential lifecycle stages: Ingestion &rarr; Correlation &rarr; Investigation &rarr; Escalation &rarr; Closure.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">CSE ID</th>
                    <th className="p-3.5">Sector</th>
                    <th className="p-3.5">Assigned Risk</th>
                    <th className="p-3.5">Stage 1: Ingestion</th>
                    <th className="p-3.5">Stage 2: Correlation</th>
                    <th className="p-3.5">Stage 3: Investigation</th>
                    <th className="p-3.5">Stage 4: Escalation</th>
                    <th className="p-3.5">Stage 5: Closure</th>
                    <th className="p-3.5 text-right">Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entities.map((e) => {
                    const pc = e.process_completeness || {};
                    const s1 = pc.ingestion || (e.alert_count > 0 ? 'ACTIVE' : 'SILENT');
                    const s2 = pc.correlation || (e.case_linkage_rate >= 0.8 ? 'LINKED' : 'UNLINKED');
                    const s3 = pc.investigation || (e.critical_fast_closure_rate > 0.3 ? 'RAPID (<8m)' : 'NORMAL DWELL');
                    const s4 = pc.escalation || (e.escalation_rate < 0.1 ? 'SUPPRESSED (<10%)' : 'HEALTHY');
                    const s5 = pc.closure || (e.closure_time_cv < 0.05 ? 'UNIFORM / SCRIPTED' : 'NATURAL VARIATION');

                    return (
                      <tr key={e.cse_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-blue-900 text-xs">
                          {e.cse_id}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {e.sector}
                        </td>
                        <td className="p-3.5">
                          <RiskBadge level={e.risk_level} />
                        </td>
                        
                        {/* Stage 1 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s1 === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {s1}
                          </span>
                        </td>

                        {/* Stage 2 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s2 === 'LINKED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {s2}
                          </span>
                        </td>

                        {/* Stage 3 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s3.includes('RAPID') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s3}
                          </span>
                        </td>

                        {/* Stage 4 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s4.includes('SUPPRESSED') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s4}
                          </span>
                        </td>

                        {/* Stage 5 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            s5.includes('UNIFORM') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s5}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => navigate(`/entity/${e.cse_id}`)}
                            className="px-2 py-1 rounded text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-50 font-semibold transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

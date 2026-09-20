import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverview, getSystemicPatterns } from '../api';
import MetricCard from '../components/MetricCard';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import {
  Building2, ShieldAlert, FileSearch, EyeOff, AlertOctagon,
  ArrowUpRight, ChevronRight, Layers, BarChart2, CheckCircle, Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function OverviewPage({ batchId }) {
  const [data, setData] = useState(null);
  const [systemicPatterns, setSystemicPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const [overviewRes, systemicRes] = await Promise.all([
          getOverview(batchId),
          getSystemicPatterns(batchId).catch(() => ({ data: [] }))
        ]);
        setData(overviewRes.data);
        setSystemicPatterns(systemicRes.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load overview data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  if (loading) return <LoadingSpinner message="Aggregating supervisory assessment queue..." />;
  if (error) return <div className="p-6 max-w-7xl mx-auto"><ErrorBanner message={error} /></div>;
  if (!data) return null;

  const queue = data.priority_queue || data.top_risks || [];
  const sectorList = data.sector_breakdown || [];

  return (
    <div className="max-w-[1700px] mx-auto px-6 py-6 space-y-6">
      
      {/* Page Header Strip */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Supervisory Dashboard
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-mono text-slate-500">BATCH: {batchId?.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assessment Overview & Priority Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Surfacing Critical Sector Entities and operational evidence requiring human supervisory inspection.
            Priority scores reflect <strong>Supervisory Attention Urgency</strong> based on execution gaps, negative space, and peer deviation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assessment Status</div>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Analysis Complete
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5 text-slate-500" />
            Generate Audit Report
          </button>
        </div>
      </div>

      {/* Assessment Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="CSEs Assessed"
          value={data.cse_count ?? 0}
          subtitle="Enrolled critical sector entities"
          icon={Building2}
          color="blue"
        />
        <MetricCard
          title="Alerts Ingested"
          value={(data.alert_count ?? 0).toLocaleString()}
          subtitle="Structured security signals"
          icon={ShieldAlert}
          color="slate"
        />
        <MetricCard
          title="Cases Analysed"
          value={(data.case_count ?? 0).toLocaleString()}
          subtitle="Investigation workflows mapped"
          icon={FileSearch}
          color="slate"
        />
        <MetricCard
          title="Findings Generated"
          value={data.findings_generated ?? (data.negative_space_count + (data.execution_gap_count || 0))}
          subtitle={`${data.execution_gap_count || 0} gaps · ${data.negative_space_count} negative space`}
          icon={EyeOff}
          color="purple"
        />
        <MetricCard
          title="Entities Requiring Attention"
          value={data.entities_requiring_attention ?? 0}
          subtitle="High or critical attention priority"
          icon={AlertOctagon}
          color="red"
        />
      </div>

      {/* Cross-Entity Systemic Risk Pattern Radar */}
      <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-50 via-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse inline-block"></span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Sector-Wide Systemic Risk Pattern Radar
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                  {systemicPatterns.length} Active Systemic Patterns
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Surfacing shared operational weaknesses across CSEs meeting threshold (max(3, 30% of N)). Finding severity automatically escalated +1 level.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Escalation Rule: <strong>MODAL_SEVERITY + 1</strong>
          </div>
        </div>

        <div className="p-4">
          {systemicPatterns.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 italic bg-slate-50 rounded border border-slate-200">
              No sector-wide systemic risk patterns detected exceeding the 30% cross-entity threshold.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemicPatterns.map((pat) => (
                <div 
                  key={pat.id || pat.rule_id} 
                  className="border border-purple-200 bg-purple-50/20 rounded-md p-3.5 space-y-2.5 transition-all hover:bg-purple-50/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          {pat.rule_id}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {pat.rule_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Sector: <strong>{pat.sector || 'Cross-Sector'}</strong> · Threshold: {pat.threshold_applied}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                        {pat.escalated_severity} (Escalated)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-snug">
                    {pat.description}
                  </p>

                  <div className="pt-2 border-t border-purple-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase text-slate-500 mr-1">
                      Affected CSEs ({pat.affected_count}):
                    </span>
                    {(pat.affected_entities || []).map((cseId) => (
                      <button
                        key={cseId}
                        onClick={() => navigate(`/entity/${cseId}`)}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                        title={`Open supervisory dossier for ${cseId}`}
                      >
                        {cseId}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Supervisory Priority Queue: "WHERE SHOULD THE SUPERVISOR LOOK FIRST?" */}
      <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              Supervisory Priority Queue
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ranked queue of entities where operational evidence diverges from expected baseline. Click row to open Entity Dossier.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Queue Size: {queue.length} Entities</span>
            <button
              onClick={() => navigate('/entities')}
              className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 ml-2"
            >
              View Full Registry <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">Priority</th>
                <th className="w-24">Entity</th>
                <th className="w-28">Sector</th>
                <th className="w-28">Attention Level</th>
                <th className="w-20 text-right">Attention Score</th>
                <th>Primary Concern / Detected Rationale</th>
                <th className="w-28 text-center">Evidence Density</th>
                <th className="w-28">Status</th>
                <th className="w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500 italic">
                    No entities requiring supervisory review in this assessment batch.
                  </td>
                </tr>
              ) : (
                queue.map((item, index) => {
                  const priorityRank = String(index + 1).padStart(2, '0');
                  const isTopPriority = index === 0 && item.risk_level === 'HIGH';

                  return (
                    <tr
                      key={item.cse_id}
                      onClick={() => navigate(`/entity/${item.cse_id}`)}
                      className={`cursor-pointer transition-colors ${
                        isTopPriority ? 'bg-amber-50/40 hover:bg-amber-50/70 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="text-center font-mono font-bold text-slate-500 text-xs">
                        {priorityRank}
                      </td>
                      <td className="font-mono font-bold text-blue-900 text-xs">
                        {item.cse_id}
                      </td>
                      <td className="text-slate-700 text-xs">
                        {item.sector || 'Unknown'}
                      </td>
                      <td>
                        <RiskBadge level={item.risk_level} />
                      </td>
                      <td className="text-right font-mono font-bold text-slate-900 text-xs">
                        {Number(item.risk_score || 0).toFixed(1)}
                      </td>
                      <td className="text-slate-800 text-xs font-normal">
                        <span className="font-semibold text-slate-900 mr-1.5">
                          {item.primary_reason || 'Supervisory deviation detected'}
                        </span>
                      </td>
                      <td className="text-center font-mono text-slate-600 text-xs">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {item.evidence_count ?? 0} indicators
                        </span>
                      </td>
                      <td>
                        <span className="text-[11px] font-medium text-slate-600 uppercase">
                          {item.is_grey ? 'UNASSESSED' : (item.risk_level === 'HIGH' || item.risk_level === 'CRITICAL' ? 'REVIEW REQUIRED' : 'MONITORED')}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 group-hover:text-blue-900">
                          Review <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Breakdown: Sector Benchmarks & Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sector Distribution Breakdown */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Critical Sector Distribution
              </h3>
              <p className="text-[11px] text-slate-500">
                Supervisory attention level counts across critical infrastructure domains
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {sectorList.length} Sectors Profiled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th className="text-center">Total Entities</th>
                  <th className="text-center">Critical</th>
                  <th className="text-center">High</th>
                  <th className="text-center">Medium</th>
                  <th className="text-center">Low</th>
                  <th className="text-center">Unassessed</th>
                </tr>
              </thead>
              <tbody>
                {sectorList.map(sec => (
                  <tr key={sec.sector}>
                    <td className="font-semibold text-slate-800">{sec.sector}</td>
                    <td className="text-center font-mono font-bold text-slate-900">{sec.total || (sec.critical + sec.high + sec.medium + sec.low + sec.unassessed)}</td>
                    <td className="text-center font-mono text-red-700">{sec.critical || 0}</td>
                    <td className="text-center font-mono text-orange-700 font-semibold">{sec.high || 0}</td>
                    <td className="text-center font-mono text-amber-700">{sec.medium || 0}</td>
                    <td className="text-center font-mono text-emerald-700">{sec.low || 0}</td>
                    <td className="text-center font-mono text-slate-500">{sec.unassessed || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Triage / Topology Teaser */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Assessment Topology Explorer
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore the hierarchical evidence chain linking Critical Sector Entities, monitored assets, alert clusters, case management dwell times, and supervisory findings in an interactive 3D matrix.
            </p>

            <div className="mt-4 p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Top Flagged Entity:</span>
                <strong className="font-mono text-slate-900">{queue[0]?.cse_id || 'N/A'}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Identified Breakdown:</span>
                <strong className="text-red-700 truncate max-w-[170px]">{queue[0]?.primary_reason || 'None'}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Available Evidence:</span>
                <strong className="font-mono text-slate-900">{queue[0]?.evidence_count || 0} Records</strong>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => navigate('/analytics')}
              className="w-full py-2 px-3 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              Open 3D Assessment Topology <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

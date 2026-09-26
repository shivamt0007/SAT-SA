import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getOverview, getAnalyticsSummary, getFindings, getSupervisoryReport,
  getSamplingPlan, getBatches
} from '../api';
import MetricCard from '../components/MetricCard';
import RiskBadge from '../components/RiskBadge';
import ScoreRing from '../components/ScoreRing';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';
import {
  Clock, Radio, Cpu, Link2, Gauge, ListChecks, ArrowRight,
  TrendingUp, TrendingDown, ExternalLink, AlertOctagon, AlertTriangle,
  Lightbulb, Activity, Building2, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';

const SEV_COLORS = {
  CRITICAL: '#B65D5D',
  HIGH: '#C08A43',
  MEDIUM: '#CFA854',
  LOW: '#4D8A68',
};

const round = (n) => Math.round(n * 10) / 10;
const listOr = (res) => (Array.isArray(res.data) ? res.data : (res.data.findings || []));

function mean(vals) {
  const arr = vals.filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + Number(v), 0) / arr.length;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #C9DDD5',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 14px rgba(32,55,50,0.08)',
};

const DIM_COLORS = ['#3E7D6B', '#6A9F8D', '#8FA8A0', '#C08A43', '#557C91'];

export default function OverviewPage({ batchId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [entities, setEntities] = useState([]);
  const [findings, setFindings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [samplingStats, setSamplingStats] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const [overviewRes, analyticsRes, findingsRes, reportRes, samplingRes, batchesRes] = await Promise.all([
          getOverview(batchId),
          getAnalyticsSummary(batchId),
          getFindings(batchId),
          getSupervisoryReport(batchId).catch(() => ({ data: {} })),
          getSamplingPlan(batchId, 50).catch(() => ({ data: {} })),
          getBatches().catch(() => ({ data: [] })),
        ]);

        setData(overviewRes.data);
        setEntities(analyticsRes.data?.entities || []);
        setFindings(listOr(findingsRes));
        setRecommendations(reportRes.data?.recommended_review_areas || []);
        setSamplingStats(samplingRes.data?.summary || {});

        // Cross-cycle effectiveness trend (real batches = real cycles)
        const batches = batchesRes.data || [];
        if (batches.length >= 2) {
          const slices = batches.slice(0, 6);
          const results = await Promise.all(
            slices.map((b) =>
              getAnalyticsSummary(b.batch_id)
                .then((r) => ({ batch: b, ents: r.data?.entities || [] }))
                .catch(() => null)
            )
          );
          const trend = results
            .filter(Boolean)
            .map(({ batch, ents }) => {
              const eff = mean(ents.map((e) => e.supervisory_coverage_score));
              return {
                cycle: String(batch.batch_id).slice(0, 8).toUpperCase(),
                label: new Date(batch.created_at).toLocaleDateString('en-IN', { month: 'short' }),
                score: eff !== null ? round(eff) : 0,
              };
            })
            .filter((t) => t.score > 0);
          setTrendData(trend);
        } else {
          setTrendData([]);
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load overview data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  const b = data || {};
  // ---- Real-data aggregates -------------------------------------------------
  const effectiveness = useMemo(() => {
    const eff = mean(entities.map((e) => e.supervisory_coverage_score));
    return eff !== null ? round(eff) : null;
  }, [entities]);

  const delta = useMemo(() => {
    if (trendData.length >= 2) {
      const last = trendData[trendData.length - 1].score;
      const prev = trendData[trendData.length - 2].score;
      return prev ? round(last - prev) : null;
    }
    return null;
  }, [trendData]);

  const kpis = useMemo(() => {
    const mttr = mean(entities.map((e) => e.mean_closure_time_critical));
    const detection = mean(entities.map((e) => (e.critical_asset_telemetry_ratio || 0) * 100));
    const linkage = mean(entities.map((e) => (e.case_linkage_rate || 0) * 100));
    const escalation = mean(entities.map((e) => (e.escalation_rate || 0) * 100));
    const autoCount = findings.filter((f) => f.auto_triaged_by && !['NONE', 'MANUAL'].includes(String(f.auto_triaged_by).toUpperCase())).length;
    const autoPct = findings.length ? (autoCount / findings.length) * 100 : null;
    const queueLoad = samplingStats.pending_review ?? (
      samplingStats.total_sampled ? samplingStats.total_sampled - (samplingStats.total_reviewed || 0) : null
    );
    return {
      mttr: mttr !== null ? { value: `${round(mttr).toFixed(1)} min`, sub: 'Mean time to close critical alerts' } : { value: '—', sub: 'No closure-time data in current cycle' },
      detection: detection !== null ? { value: `${Math.round(detection)}%`, sub: 'Critical-asset telemetry coverage' } : { value: '—', sub: 'No telemetry-ratio data in current cycle' },
      automation: autoPct !== null ? { value: `${Math.round(autoPct)}%`, sub: `${autoCount} of ${findings.length} findings auto-triaged` } : { value: '—', sub: 'No auto-triage evidence in current cycle' },
      linkage: linkage !== null ? { value: `${Math.round(linkage)}%`, sub: 'Alert-to-case linkage discipline' } : { value: '—', sub: 'No linkage data in current cycle' },
      escalation: escalation !== null ? { value: `${Math.round(escalation)}%`, sub: 'Tier escalation responsiveness' } : { value: '—', sub: 'No escalation data in current cycle' },
      queueLoad: queueLoad !== null ? { value: queueLoad, sub: `${samplingStats.total_sampled || 0} sample items planned` } : { value: '—', sub: 'No review queue generated' },
    };
  }, [entities, findings, samplingStats]);

  // ---- Chart data -----------------------------------------------------------
  const hourlyData = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, alerts: 0 }));
    entities.forEach((e) => {
      const h = e.hourly_distribution || [];
      h.forEach((cnt, idx) => { if (idx < 24 && cnt) buckets[idx].alerts += cnt; });
    });
    return buckets;
  }, [entities]);

  const severityData = useMemo(() => {
    const counts = {};
    findings.forEach((f) => {
      const sev = String(f.priority || f.severity || 'UNASSESSED').toUpperCase();
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
  }, [findings]);

  const dimensions = useMemo(() => {
    if (entities.length === 0) return [];
    const det = mean(entities.map((e) => (e.critical_asset_telemetry_ratio || 0) * 100));
    const cov = mean(entities.map((e) => e.supervisory_coverage_score));
    const lin = mean(entities.map((e) => (e.case_linkage_rate || 0) * 100));
    const resp = mean(entities.map((e) => (1 - (e.critical_fast_closure_rate || 0)) * 100));
    const esc = mean(entities.map((e) => (e.escalation_rate || 0) * 100));
    const items = [
      { name: 'Detection', value: det, note: 'critical-asset telemetry' },
      { name: 'Coverage', value: cov, note: 'supervisory coverage engine' },
      { name: 'Case Linkage', value: lin, note: 'alert→case integrity' },
      { name: 'Response', value: resp, note: 'closure discipline' },
      { name: 'Escalation', value: esc, note: 'tier escalation rate' },
    ];
    return items
      .map((d) => ({ ...d, value: d.value !== null ? Math.max(0, Math.min(100, round(d.value))) : null }))
      .filter((d) => d.value !== null);
  }, [entities]);

  const weaknesses = useMemo(() => {
    const byKey = {};
    findings.forEach((f) => {
      const key = f.rule_id || f.finding_id || f.title || 'UNKNOWN';
      const sev = String(f.priority || f.severity || 'UNASSESSED').toUpperCase();
      const sevRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }[sev] || 0;
      if (!byKey[key]) {
        byKey[key] = { key, title: f.title || f.description || key, sevList: [sev], rank: sevRank, entities: new Set([f.cse_id]) };
      } else {
        byKey[key].sevList.push(sev);
        byKey[key].rank = Math.max(byKey[key].rank, sevRank);
        byKey[key].entities.add(f.cse_id);
      }
    });
    const sevOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return Object.values(byKey)
      .map((w) => ({
        ...w,
        count: w.sevList.length,
        entityCount: w.entities.size,
        topSeverity: Object.keys(sevOrder).sort((a, b) => sevOrder[b] - sevOrder[a]).find((s) => w.sevList.includes(s)) || 'MEDIUM',
      }))
      .sort((a, bd) => bd.count - a.count || bd.rank - a.rank)
      .slice(0, 5);
  }, [findings]);

  if (loading) return <LoadingSpinner message="Aggregating supervisory assessment queue..." />;
  if (error) return <div className="p-6 max-w-[1600px] mx-auto"><ErrorBanner message={error} /></div>;
  if (!data) return null;

  const queue = data.priority_queue || data.top_risks || [];
  const sectorList = data.sector_breakdown || [];
  const scoreTone = effectiveness === null ? 'brand' : effectiveness >= 70 ? 'green' : effectiveness >= 50 ? 'brand' : effectiveness >= 35 ? 'amber' : 'red';
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">

      {/* ============ SOC OVERVIEW ============ */}
      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              SOC Overview
            </div>
            <h2 className="text-[18px] font-semibold tracking-tight text-ink mt-0.5">
              What is the SOC's current state?
            </h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold text-faint uppercase tracking-wider">Assessment Cycle</div>
            <div className="text-xs font-mono text-ink font-semibold">{String(batchId).slice(0, 12)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Score ring */}
          <div className="flex flex-col items-center justify-center rounded-[12px] bg-mint-50/70 border border-line p-5">
            <ScoreRing
              value={effectiveness ?? 0}
              size={128}
              strokeWidth={9}
              label="SOC Effectiveness"
              sub="mean supervisory coverage"
              tone={scoreTone}
              suffix="/100"
            />
            <div className="mt-3 flex items-center gap-2">
              {delta !== null ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                    delta >= 0 ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-red-600 bg-red-50 border border-red-200'
                  }`}
                >
                  {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)} pts vs prior cycle
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200">
                  Current cycle only
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-faint text-center mt-2 leading-snug max-w-[220px]">
              Online effectiveness = coverage of detection, telemetry and closure disciplines across assessed entities.
            </p>
          </div>

          {/* Snapshot stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
            {[
              { label: 'CSEs Assessed', value: b.cse_count ?? 0, icon: Building2, tone: 'text-brand-700 bg-brand-50 border-brand-200', to: null },
              { label: 'Alerts Ingested', value: (b.alert_count ?? 0).toLocaleString(), icon: Activity, tone: 'text-blue-700 bg-blue-50 border-blue-200', to: null },
              { label: 'Cases Analysed', value: (b.case_count ?? 0).toLocaleString(), icon: Gauge, tone: 'text-slate-600 bg-slate-100 border-slate-200', to: null },
              { label: 'Findings Generated', value: b.findings_generated ?? ((b.negative_space_count || 0) + (b.execution_gap_count || 0)), icon: AlertOctagon, tone: 'text-amber-700 bg-amber-50 border-amber-200', to: '/findings' },
              { label: 'Attention Entities', value: b.entities_requiring_attention ?? 0, icon: AlertTriangle, tone: 'text-red-600 bg-red-50 border-red-200', to: '/entities' },
              { label: 'Systemic Patterns', value: b.systemic_pattern_count ?? 0, icon: Lightbulb, tone: 'text-purple-700 bg-purple-50 border-purple-200', to: null },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => s.to && navigate(s.to)}
                className={`text-left p-3 rounded-[10px] border border-line bg-paper transition-all duration-150 ease-out hover:border-brand-300 hover:shadow-card-hover ${s.to ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`inline-flex p-1.5 rounded-lg border mb-2 ${s.tone}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-[20px] font-semibold tabular-nums text-ink leading-none">{s.value}</div>
                <div className="text-[10.5px] text-faint mt-1 font-medium uppercase tracking-wide">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ KPI CARDS ============ */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-ink">Operational Health</h2>
          <span className="text-[10.5px] text-faint font-medium">Aggregated across assessed entities · current cycle</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard title="MTTR · Critical Closure" value={kpis.mttr.value} subtitle={kpis.mttr.sub} icon={Clock} color="brand" />
          <MetricCard title="Detection Coverage" value={kpis.detection.value} subtitle={kpis.detection.sub} icon={Radio} color="blue" />
          <MetricCard title="Automation Coverage" value={kpis.automation.value} subtitle={kpis.automation.sub} icon={Cpu} color="green" />
          <MetricCard title="Case Linkage Rate" value={kpis.linkage.value} subtitle={kpis.linkage.sub} icon={Link2} color="purple" />
          <MetricCard title="Tier Escalation" value={kpis.escalation.value} subtitle={kpis.escalation.sub} icon={ListChecks} color="amber" />
          <MetricCard title="Review Queue Load" value={kpis.queueLoad.value} subtitle={kpis.queueLoad.sub} icon={Gauge} color="slate" />
        </div>
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Performance Trend */}
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Performance Trend</h3>
            <span className="text-[10px] text-faint font-medium uppercase tracking-wide">Per assessment cycle</span>
          </div>
          <p className="text-[11.5px] text-faint mb-3">SOC effectiveness score across ingested assessment cycles.</p>
          {trendData.length >= 2 ? (
            <div className="h-[220px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDEBE5" vertical={false} />
                  <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: '#63766F' }} axisLine={{ stroke: '#C9DDD5' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#63766F' }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(l, p) => `${l}${p && p[0]?.payload?.label ? ` · ${p[0].payload.label}` : ''}`}
                    formatter={(val) => [`${val} / 100`, 'SOC Effectiveness']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3E7D6B" strokeWidth={2.5} dot={{ r: 3.5, fill: '#3E7D6B', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state h-[220px]">
              <div className="text-[12px] font-semibold text-slate-500">Single assessment cycle available</div>
              <p className="text-[11px] text-faint max-w-sm">
                The performance trend builds automatically once a new assessment cycle is ingested (batch level).
              </p>
            </div>
          )}
        </div>

        {/* Assessment Dimensions */}
        <div className="panel p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink mb-1">Assessment Dimensions</h3>
          <p className="text-[11.5px] text-faint mb-3">Mean discipline scores across assessed entities.</p>
          {dimensions.length > 0 ? (
            <div className="space-y-3.5 mt-1">
              {dimensions.map((d, i) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11.5px] font-medium text-slate-600">{d.name}</span>
                    <span className="font-mono text-[11px] font-bold text-ink tabular-nums">{d.value}%</span>
                  </div>
                  <div className="h-[9px] w-full bg-mint-50 border border-line rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${d.value}%`, backgroundColor: DIM_COLORS[i % DIM_COLORS.length] }}
                      title={d.note}
                    />
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-0.5">{d.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state h-[220px]">
              <div className="text-[12px] font-semibold text-slate-500">No dimension data</div>
              <p className="text-[11px] text-faint max-w-xs">Run the assessment pipeline to populate dimension scores.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Operational Activity */}
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Operational Activity</h3>
            <span className="text-[10px] text-faint font-medium uppercase tracking-wide">Alert volume · 24h window</span>
          </div>
          <p className="text-[11.5px] text-faint mb-3">Aggregated alert stream across assessed entities.</p>
          {entities.length > 0 ? (
            <div className="h-[220px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="mintArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3E7D6B" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#3E7D6B" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDEBE5" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9.5, fill: '#63766F' }} axisLine={{ stroke: '#C9DDD5' }} tickLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: '#63766F' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(val) => [`${val}`, 'Alerts']} />
                  <Area type="monotone" dataKey="alerts" stroke="#3E7D6B" strokeWidth={2} fill="url(#mintArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state h-[220px]">
              <div className="text-[12px] font-semibold text-slate-500">No telemetry streams</div>
              <p className="text-[11px] text-faint max-w-xs">Alert volume history appears after the assessment pipeline finishes.</p>
            </div>
          )}
        </div>

        {/* Findings by Severity */}
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Findings by Severity</h3>
            <button
              onClick={() => navigate('/findings')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11.5px] text-faint mb-3">Supervisory findings in the current cycle.</p>
          {severityData.length > 0 ? (
            <div className="h-[220px] -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDEBE5" vertical={false} />
                  <XAxis dataKey="severity" tick={{ fontSize: 10, fill: '#63766F' }} axisLine={{ stroke: '#C9DDD5' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#63766F' }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(62,125,107,0.06)' }} formatter={(val) => [`${val}`, 'Findings']} />
                  <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={42}>
                    {severityData.map((entry) => (
                      <Cell key={entry.severity} fill={SEV_COLORS[entry.severity] || '#8FA8A0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state h-[220px]">
              <div className="text-[12px] font-semibold text-slate-500">No findings detected</div>
              <p className="text-[11px] text-faint max-w-xs">No supervisory findings were generated for this cycle.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Top Weaknesses */}
        <div className="panel p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Top Weaknesses</h3>
            <button
              onClick={() => navigate('/findings')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Findings registry <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[11.5px] text-faint mb-3">Most frequent supervisory findings clustered by rule.</p>
          {weaknesses.length > 0 ? (
            <div className="space-y-2">
              {weaknesses.map((w) => (
                <button
                  key={w.key}
                  onClick={() => navigate('/findings')}
                  className="w-full flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-[10px] border border-line bg-paper hover:border-brand-300 hover:shadow-card-hover transition-all duration-150 ease-out text-left"
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 border border-red-200 shrink-0">
                    <AlertOctagon className="w-4 h-4 text-red-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-ink truncate">{w.title}</div>
                    <div className="text-[10.5px] text-faint font-mono">{w.key}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RiskBadge level={w.topSeverity} />
                    <span className="text-[11px] text-slate-500 font-medium">
                      {w.count} finding{w.count === 1 ? '' : 's'} · {w.entityCount} entit{w.entityCount === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state h-[190px]">
              <div className="text-[12px] font-semibold text-slate-500">No weaknesses surfaced</div>
              <p className="text-[11px] text-faint max-w-xs">Weakness clustering appears once findings are generated.</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="panel p-5 lg:col-span-2">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-brand-600" />
            Recommendations
          </h3>
          <p className="text-[11.5px] text-faint mb-3">Supervisory corrective directives generated from evidence.</p>
          {recommendations.length > 0 ? (
            <ol className="space-y-2.5">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] leading-snug">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold text-[10px] font-mono shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-600">{rec}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state h-[190px]">
              <div className="text-[12px] font-semibold text-slate-500">No directives yet</div>
              <p className="text-[11px] text-faint max-w-xs">Recommendations are generated by the supervisory report engine.</p>
            </div>
          )}
          {recommendations.length > 0 && (
            <button
              onClick={() => navigate('/reports')}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 rounded-[9px] py-2 transition-colors"
            >
              Open audit report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="panel lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <h3 className="text-[14px] font-semibold tracking-tight text-ink">Priority Queue</h3>
            <button
              onClick={() => navigate('/entities')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Assessment registry <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {queue.length > 0 ? (
            <table className="data-table pb-2">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>Primary Reason</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 6).map((q) => (
                  <tr key={q.cse_id}>
                    <td className="font-mono font-bold text-brand-800">{q.cse_id}</td>
                    <td className="font-mono font-semibold text-ink">{Number(q.risk_score ?? q.priority_score ?? 0).toFixed(1)}</td>
                    <td><RiskBadge level={q.risk_level} /></td>
                    <td className="text-slate-600 max-w-[260px] truncate" title={q.primary_reason}>{q.primary_reason || '—'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => navigate(`/entity/${q.cse_id}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                      >
                        Dossier <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="text-[12px] font-semibold text-slate-500">Queue is empty</div>
              <p className="text-[11px] text-faint">No priority entries for this assessment cycle.</p>
            </div>
          )}
        </div>

        {/* Sector risk distribution */}
        <div className="panel p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink mb-1">Sector Distribution</h3>
          <p className="text-[11.5px] text-faint mb-3">Risk tiers by sector for the current cycle.</p>
          {sectorList.length > 0 ? (
            <div className="space-y-3">
              {sectorList.map((sec) => {
                const tiers = [
                  { label: 'Critical', val: sec.critical || 0, cls: 'bg-red-500' },
                  { label: 'High', val: sec.high || 0, cls: 'bg-orange-500' },
                  { label: 'Medium', val: sec.medium || 0, cls: 'bg-amber-500' },
                  { label: 'Low', val: sec.low || 0, cls: 'bg-emerald-500' },
                  { label: 'Unassessed', val: sec.unassessed || 0, cls: 'bg-slate-300' },
                ];
                const total = sec.total || tiers.reduce((s, t) => s + t.val, 0) || 1;
                return (
                  <div key={sec.sector} className="rounded-[10px] border border-line bg-paper p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold text-ink">{sec.sector}</span>
                      <span className="font-mono text-[11px] font-bold text-slate-500">{total}</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-mint-50 border border-line">
                      {tiers.map((t) => t.val > 0 && (
                        <div key={t.label} className={t.cls} style={{ width: `${(t.val / total) * 100}%` }} title={`${t.label}: ${t.val}`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      {tiers.filter((t) => t.val > 0).map((t) => (
                        <span key={t.label} className="inline-flex items-center gap-1 text-[9.5px] text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${t.cls}`} />
                          {t.label} <strong className="font-mono">{t.val}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="text-[12px] font-semibold text-slate-500">No sector breakdown</div>
              <p className="text-[11px] text-faint">Sector data appears after assessment runs.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
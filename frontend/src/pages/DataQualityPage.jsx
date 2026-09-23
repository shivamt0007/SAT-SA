import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  Database, FileCheck, Layers, HelpCircle 
} from 'lucide-react';
import { getDataQuality } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function DataQualityPage({ batchId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const res = await getDataQuality(batchId);
        setData(res.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch data quality audit');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  if (loading) return <LoadingSpinner message="Auditing ingested evidence integrity..." />;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;
  if (!data) return null;

  const score = Number(data.data_integrity_score || 100);

  const checks = [
    {
      title: 'Timestamp Sequence & Completeness',
      description: 'Verifies that created_at and closed_at timestamps exist and conform to valid chronologies.',
      count: data.missing_timestamps_count,
      status: data.missing_timestamps_count === 0 ? 'PASS' : 'WARN',
      detail: data.missing_timestamps_count === 0 ? 'All records possess valid chronological timestamps.' : `${data.missing_timestamps_count} records contain missing or invalid temporal stamps.`
    },
    {
      title: 'Alert-to-Case Relationship Integrity',
      description: 'Checks whether alert records reference existent and valid case identifier tickets.',
      count: data.unlinked_alerts_count,
      status: data.unlinked_alerts_count === 0 ? 'PASS' : 'WARN',
      detail: data.unlinked_alerts_count === 0 ? 'All mapped case references exist in the case repository.' : `${data.unlinked_alerts_count} alerts reference unlinked or orphaned case identifiers.`
    },
    {
      title: 'Closure Time Sanity (< 1 min)',
      description: 'Identifies non-physical or machine-generated closures completing in less than 60 seconds.',
      count: data.rapid_closures_under_1min,
      status: data.rapid_closures_under_1min === 0 ? 'PASS' : 'WARN',
      detail: data.rapid_closures_under_1min === 0 ? 'No sub-minute closures detected.' : `${data.rapid_closures_under_1min} alerts closed in under 60 seconds (indicative of automated bulk closure).`
    },
    {
      title: 'Asset Inventory Telemetry Coverage',
      description: 'Cross-references submitted asset inventory against alert logs to discover silent assets.',
      count: data.unmonitored_assets_count,
      status: data.unmonitored_assets_count === 0 ? 'PASS' : 'WARN',
      detail: data.unmonitored_assets_count === 0 ? 'Full telemetry received for all catalogued assets.' : `${data.unmonitored_assets_count} inventoried assets generated zero alerts during the assessment window.`
    }
  ];

  return (
    <div className="max-w-[1700px] mx-auto p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            Ingestion Integrity Audit
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Quality & Evidence Verification
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit validation verifying that evidence submitted by CSEs is schema-compliant, consistent, and sufficient for supervisory scoring.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="px-3 py-1.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
            Batch: {batchId.slice(0, 12)}
          </span>
        </div>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Top Banner: Integrity Score & Verdict */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold font-mono text-lg ${
            score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {score}%
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Data Ingestion Integrity Rating
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {data.audit_verdict}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Derived from field validation, temporal sequencing, and entity relation completeness.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs text-right border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Records Received</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">{data.records_received}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Valid Records</div>
            <div className="text-base font-bold text-emerald-700 mt-0.5">{data.valid_records}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] uppercase">Rejected</div>
            <div className="text-base font-bold text-slate-500 mt-0.5">{data.rejected_records}</div>
          </div>
        </div>
      </div>

      {/* Breakdown Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Alerts Ingested</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{data.alert_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Operational telemetry events</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Incident Cases</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{data.case_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Formal case investigations</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">Assets Catalogued</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{data.asset_count}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Critical sector infrastructure nodes</div>
        </div>
      </div>

      {/* Integrity Checks List */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
            Automated Audit Verification Results
          </h3>
        </div>

        <div className="divide-y divide-slate-100">
          {checks.map((c, i) => (
            <div key={i} className="p-4.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {c.status === 'PASS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  <p className="text-xs text-slate-700 font-mono mt-1.5">{c.detail}</p>
                </div>
              </div>

              <div>
                <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                  c.status === 'PASS' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}


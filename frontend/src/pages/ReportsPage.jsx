import React, { useState, useEffect } from 'react';
import { 
  FileText, Printer, Download, Shield, CheckCircle2, 
  AlertTriangle, Building2, GitBranch, EyeOff, Lock 
} from 'lucide-react';
import { getSupervisoryReport } from '../api';
import RiskBadge from '../components/RiskBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function ReportsPage({ batchId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (!batchId) return;
      try {
        setLoading(true);
        const res = await getSupervisoryReport(batchId);
        setReport(res.data);
      } catch (err) {
        setError(err.message || 'Failed to generate supervisory audit report');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [batchId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <LoadingSpinner message="Compiling official supervisory audit report..." />;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;
  if (!report) return null;

  const meta = report.assessment_meta || {};
  const overview = report.overview || {};
  const entities = report.entities || [];
  const findings = report.top_findings || [];
  const dq = report.data_quality || {};

  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6 pb-20 print:p-0 print:max-w-none">
      
      {/* Non-printed Toolbar */}
      <div className="flex items-center justify-between print:hidden border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            Supervisory Audit Document
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SOC Operational Assessment Audit Report
          </h1>
          <p className="text-xs text-slate-500">
            Official supervisory summary ready for digital export or physical print submission.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
        >
          <Printer className="w-4 h-4" />
          Print / Save as PDF
        </button>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-white border border-slate-300 rounded-lg p-8 sm:p-12 shadow-sm space-y-8 print:border-0 print:p-4 print:shadow-none">
        
        {/* Document Header & Classification Banner */}
        <div className="border-b-2 border-slate-900 pb-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1">
                <Lock className="w-3 h-3 text-slate-700" />
                RESTRICTED · SUPERVISORY AUDIT EVALUATION
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                NATIONAL CRITICAL INFORMATION INFRASTRUCTURE PROTECTION
              </h2>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                Supervisory Analytics Tool for SOC Assessment (SAT-SA)
              </div>
            </div>

            <div className="text-right font-mono text-[11px] text-slate-600 space-y-0.5">
              <div><strong>DOC ID:</strong> SAT-SA-AUDIT-{batchId.slice(0, 8).toUpperCase()}</div>
              <div><strong>EVAL CYCLE:</strong> Sep 2026</div>
              <div><strong>DATE:</strong> {new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs text-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Batch ID</span>
              <strong className="text-slate-900">{batchId.slice(0, 12)}...</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Environment</span>
              <strong className="text-slate-900">Air-Gapped Local DB</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Audited CSEs</span>
              <strong className="text-slate-900">{overview.cse_count || entities.length} Entities</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Integrity Verdict</span>
              <strong className="text-emerald-700">{dq.audit_verdict || 'VERIFIED'}</strong>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            1.0 Executive Assessment Summary
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed text-justify">
            During this assessment cycle, supervisory operational analytics evaluated evidence submitted by{' '}
            <strong>{overview.cse_count || entities.length} Critical Sector Entities</strong> encompassing{' '}
            <strong>{overview.alert_count} alert records</strong> and <strong>{overview.case_count} incident cases</strong>.
            The evaluation identified <strong>{overview.entities_requiring_attention} entities</strong> requiring high-priority
            supervisory intervention due to anomalous closure velocities (&lt;8 minutes), negative-space telemetry blind spots,
            or suppressed tier escalations.
          </p>

          <div className="grid grid-cols-4 gap-3 text-center pt-2">
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Critical Tier</div>
              <div className="text-xl font-bold font-mono text-rose-600 mt-0.5">{overview.risk_distribution?.critical || 0}</div>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase">High Tier</div>
              <div className="text-xl font-bold font-mono text-amber-600 mt-0.5">{overview.risk_distribution?.high || 0}</div>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Execution Gaps</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">{overview.execution_gap_count || 0}</div>
            </div>
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Blind Spots</div>
              <div className="text-xl font-bold font-mono text-purple-700 mt-0.5">{overview.negative_space_count || 0}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Entity Risk Scorecard */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1">
            2.0 Entity Operational Risk Scorecard
          </h3>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">CSE ID</th>
                  <th className="p-2.5">Sector</th>
                  <th className="p-2.5">Risk Score</th>
                  <th className="p-2.5">Tier</th>
                  <th className="p-2.5">Coverage</th>
                  <th className="p-2.5">Flags</th>
                  <th className="p-2.5">Primary Grounded Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entities.map((e) => (
                  <tr key={e.cse_id} className={e.is_grey ? 'bg-slate-50 text-slate-500' : ''}>
                    <td className="p-2.5 font-mono font-bold">{e.cse_id}</td>
                    <td className="p-2.5">{e.sector}</td>
                    <td className="p-2.5 font-mono font-bold">{Number(e.risk_score || 0).toFixed(1)}</td>
                    <td className="p-2.5"><RiskBadge level={e.risk_level} /></td>
                    <td className="p-2.5 font-mono">
                      {e.supervisory_coverage !== null && e.supervisory_coverage !== undefined 
                        ? `${Math.round(e.supervisory_coverage)}%` 
                        : '—'}
                    </td>
                    <td className="p-2.5 font-mono text-center">{e.flag_count ?? 0}</td>
                    <td className="p-2.5 text-[10px] max-w-xs truncate">{e.primary_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: High Priority Findings Register */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1">
            3.0 Priority Supervisory Findings Register
          </h3>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Entity</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Finding Description</th>
                  <th className="p-2.5">Severity</th>
                  <th className="p-2.5">Evidence Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {findings.slice(0, 8).map((f, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-mono text-slate-500">{f.finding_id || f.rule_id}</td>
                    <td className="p-2.5 font-mono font-bold text-blue-900">{f.cse_id}</td>
                    <td className="p-2.5 font-bold uppercase text-[10px] text-slate-600">{f.category}</td>
                    <td className="p-2.5 text-[10px] max-w-sm">{f.description}</td>
                    <td className="p-2.5"><RiskBadge level={f.priority || f.severity} /></td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-600">
                      {(f.evidence_ids || []).slice(0, 3).join(', ')}
                      {(f.evidence_ids || []).length > 3 ? ` (+${f.evidence_ids.length - 3})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Recommended Corrective Directives */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-1">
            4.0 Supervisory Recommendations & Corrective Directives
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
            {(report.recommended_review_areas || []).map((rec, i) => (
              <li key={i} className="leading-relaxed">
                {rec}
              </li>
            ))}
          </ol>
        </div>

        {/* Section 5: Official Sign-off & Stamp */}
        <div className="pt-8 border-t-2 border-slate-900 mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs font-mono">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Evaluating Officer</div>
            <div className="border-b border-slate-400 h-8 mt-2" />
            <div className="text-[10px] text-slate-600 mt-1">Lead Cyber Security Supervisor</div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Audit Verification</div>
            <div className="border-b border-slate-400 h-8 mt-2" />
            <div className="text-[10px] text-slate-600 mt-1">NCIIPC / NTRO Inspection Team</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Verification Stamp</div>
            <div className="inline-block border-2 border-slate-800 text-slate-800 p-2 text-[10px] font-bold tracking-widest uppercase mt-2">
              AUDIT COMPLETED<br />GROUNDED VERIFICATION
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

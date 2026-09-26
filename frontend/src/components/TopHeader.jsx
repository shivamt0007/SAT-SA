import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, Calendar, Menu } from 'lucide-react';

const ROUTE_META = [
  { group: null, page: 'Overview', match: '/overview' },
  { group: 'Assessment', page: 'Findings', match: '/findings' },
  { group: 'Assessment', page: 'Review Queue', match: '/review-queue' },
  { group: 'Assessment', page: 'Execution Gaps', match: '/execution-gaps' },
  { group: 'Assessment', page: 'Negative Space', match: '/negative-space' },
  { group: 'Analytics', page: 'Analytics', match: '/analytics' },
  { group: 'Governance', page: 'Reports & Recommendations', match: '/reports' },
  { group: 'Governance', page: 'Evidence', match: '/evidence' },
  { group: 'Governance', page: 'Triage Policies', match: '/triage-policies' },
  { group: 'Data', page: 'Assessment Registry', match: '/entities' },
  { group: 'Data', page: 'Entity Dossier', match: '/entity/' },
  { group: 'Data', page: 'Data Quality', match: '/data-quality' },
  { group: 'Data', page: 'Ingest Data', match: '/' },
];

function getOperator() {
  try {
    const raw = localStorage.getItem('sat_sa_operator');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export default function TopHeader({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [operator, setOperator] = useState(getOperator);

  const path = location?.pathname || '/';
  const meta =
    ROUTE_META.find((r) =>
      r.match === '/' ? (path === '/' || path === '/upload') : path.startsWith(r.match)
    ) || { group: null, page: 'Overview' };

  useEffect(() => {
    const onStorage = () => setOperator(getOperator());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  useEffect(() => {
    setOperator(getOperator());
  }, [path]);

  const initials = operator?.name
    ? operator.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'OP';

  return (
    <header className="sticky top-0 z-30 bg-paper border-b border-line shadow-sm px-5 lg:px-7 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {/* Left: page title + breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden inline-flex items-center p-1.5 rounded-md text-slate-500 hover:bg-mint-100 border border-line"
          aria-label="Open navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0 leading-tight">
          <div className="text-[10.5px] font-medium text-slate-500 leading-none truncate">
            {meta.group ? (
              <span className="inline-flex items-center gap-1">
                <span className="text-slate-400">{meta.group}</span>
                <span aria-hidden="true">/</span>
                <span className="text-slate-600">{meta.page}</span>
              </span>
            ) : (
              <span className="text-slate-500">{meta.page}</span>
            )}
          </div>
          <h1 className="text-[19px] font-semibold tracking-tight text-ink mt-0.5 truncate">
            {meta.page}
          </h1>
        </div>
      </div>

      {/* Right: cycle, status, operator, ingest */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">

        {/* Evaluation cycle */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 leading-none">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          SEP 2026
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-mono text-slate-500">CYCLE 03</span>
        </div>

        <span className="hidden lg:block h-6 w-px bg-line" aria-hidden="true" />

        {/* System status */}
        <div className="leading-none">
          <div className="text-[9px] uppercase text-slate-400 tracking-wider leading-none">Status</div>
          <div className="text-[11.5px] font-semibold text-emerald-700 flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Analysis Complete
          </div>
        </div>

        <span className="hidden sm:block h-6 w-px bg-line" aria-hidden="true" />

        {/* Operator identity chip */}
        <div className="flex items-center gap-2 max-w-[160px]">
          <div
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white text-[11px] font-bold select-none shadow-card"
            title={operator ? `${operator.name} · ${operator.role || 'Operator'}` : 'Local workspace operator'}
          >
            {initials}
          </div>
          <div className="hidden md:block leading-tight min-w-0">
            <div className="text-[11px] font-semibold text-ink truncate">{operator?.name || 'Local Operator'}</div>
            <div className="text-[10px] text-slate-500 truncate">{operator?.role || 'SOC Assessment'}</div>
          </div>
        </div>

        <span className="hidden sm:block h-6 w-px bg-line" aria-hidden="true" />

        {/* Ingest Data — primary action in the top-right */}
        <button
          onClick={() => navigate('/')}
          className="btn-primary"
          title="Ingest SOC evidence data"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Ingest Data</span><span className="xl:hidden">Ingest</span>
        </button>
      </div>
    </header>
  );
}
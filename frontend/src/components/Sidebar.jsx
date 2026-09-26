import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShieldCheck, BarChart3, AlertOctagon, CheckSquare,
  Database, FileCheck, ClipboardList, EyeOff, GitBranch, Lightbulb,
  Settings, LogOut, ChevronDown, X
} from 'lucide-react';
import { getBatches } from '../api';

const NAV_OVERVIEW = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
];

const NAV_ASSESSMENT = [
  { name: 'Findings', path: '/findings', icon: AlertOctagon },
  { name: 'Review Queue', path: '/review-queue', icon: CheckSquare },
  { name: 'Execution Gaps', path: '/execution-gaps', icon: GitBranch },
  { name: 'Negative Space', path: '/negative-space', icon: EyeOff },
];

const NAV_ANALYTICS = [
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

const NAV_GOVERNANCE = [
  { name: 'Reports & Recommendations', path: '/reports', icon: Lightbulb },
  { name: 'Evidence', path: '/evidence', icon: Database },
  { name: 'Triage Policies', path: '/triage-policies', icon: ClipboardList },
];

const NAV_DATA = [
  { name: 'Assessment Registry', path: '/entities', icon: ShieldCheck },
  { name: 'Data Quality', path: '/data-quality', icon: FileCheck },
];

const baseLink =
  'flex items-center gap-2.5 pl-4 pr-3 py-[7px] rounded-[9px] text-[13px] font-medium transition-colors duration-150 ease-out group';
const idleLink = 'text-slate-600 hover:bg-mint-100 hover:text-ink';
const activeLink = 'bg-brand-600 text-white font-semibold shadow-card';

function isPathActive(pathname, hash, path) {
  if (path === '/reports#recommendations') {
    return pathname === '/reports' && (hash || '').includes('recommendations');
  }
  if (path === '/reports') {
    return pathname === '/reports' && !((hash || '').includes('recommendations'));
  }
  if (path === '/entity') return pathname.startsWith('/entity/');
  return pathname === path;
}

export default function Sidebar({ batchId, onBatchChange, open = false, onClose = null, onSignOut = null }) {
  const location = useLocation();
  const [batches, setBatches] = useState([]);
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await getBatches();
        setBatches(res.data || []);
      } catch (e) {
        // Fallback gracefully
      }
    }
    loadBatches();
  }, [batchId]);

  const pathname = location?.pathname || '';
  const hash = location?.hash || '';
  const closeDrawer = () => { if (onClose) onClose(); };

  const onAssessmentChild = NAV_ASSESSMENT.some((item) => isPathActive(pathname, hash, item.path));
  const [assessmentOpen, setAssessmentOpen] = useState(onAssessmentChild);

  useEffect(() => {
    if (onAssessmentChild) setAssessmentOpen(true);
  }, [onAssessmentChild]);

  const renderItem = (item) => {
    const Icon = item.icon;
    const active = isPathActive(pathname, hash, item.path);
    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={closeDrawer}
        className={`${baseLink} ${active ? activeLink : idleLink}`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-brand-600'}`} />
        <span className="truncate">{item.name}</span>
      </NavLink>
    );
  };

  const renderGroup = (title, items) => (
    <nav className="px-2 pb-1 space-y-0.5">
      <div className="pl-4 pr-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-faint leading-none">
        {title}
      </div>
      {items.map(renderItem)}
    </nav>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
<aside
        className={[
          'fixed inset-y-0 left-0 w-[248px] bg-slate-50 border-r border-line z-50',
          'flex flex-col overflow-y-auto overflow-x-hidden transition-[transform] duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="px-4 pt-4 pb-2">
          <NavLink to="/overview" onClick={closeDrawer} className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600 text-white text-[13px] font-bold shrink-0 group-hover:bg-brand-700 transition-colors shadow-card">
                SA
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-slate-50" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold tracking-tight text-ink leading-none">SAT-SA</div>
              <div className="text-[9.5px] font-medium uppercase tracking-wide leading-tight mt-1 text-faint">
                Supervisory Analytics Tool
              </div>
            </div>
          </NavLink>
          <div className="mt-1.5 ml-[46px] text-[9.5px] text-slate-400 leading-tight truncate">
            SOC Assessment Workspace
          </div>

          {open && (
            <button
              onClick={closeDrawer}
              className="absolute right-2.5 top-3 p-1 rounded text-slate-500 hover:text-ink hover:bg-slate-200 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Evaluation cycle / batch selector */}
        <div className="px-3 pt-1 pb-1.5">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Evaluation Cycle</span>
          </div>
          <button
            onClick={() => setBatchOpen(!batchOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[9px] text-[11.5px] font-mono font-semibold text-slate-600 bg-paper hover:bg-mint-100 border border-line transition-colors"
            aria-expanded={batchOpen}
            title="Switch assessment cycle"
          >
            <span className="truncate">{batchId ? batchId.slice(0, 14) : 'No batch selected'}</span>
            <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${batchOpen ? 'rotate-180' : ''}`} />
          </button>
          {batchOpen && (
            <div className="mt-1 max-h-44 overflow-y-auto rounded-[9px] bg-paper border border-line shadow-card">
              {batches.length === 0 && (
                <div className="px-2.5 py-2 text-[10.5px] text-slate-500">No batches found.</div>
              )}
              {batches.map((b) => (
                <button
                  key={b.batch_id}
                  onClick={() => {
                    setBatchOpen(false);
                    if (onBatchChange) onBatchChange(b.batch_id);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] font-mono transition-colors ${
                    b.batch_id === batchId ? 'bg-brand-50 text-brand-800 font-semibold' : 'text-slate-600 hover:bg-mint-50'
                  }`}
                >
                  {b.batch_id.slice(0, 18)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-4 my-1.5 h-px bg-line" aria-hidden="true" />

        {/* OVERVIEW */}
        {renderGroup('Overview', NAV_OVERVIEW)}

        {/* ASSESSMENT — collapsible parent */}
        <nav className="px-2 pb-1 space-y-0.5">
          <div className="pl-4 pr-2 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-faint leading-none">
            Assessment
          </div>
          <button
            onClick={() => setAssessmentOpen(!assessmentOpen)}
            className="w-full flex items-center gap-2.5 pl-4 pr-3 py-[7px] rounded-[9px] text-[13px] font-semibold text-ink hover:bg-mint-100 transition-colors duration-150 ease-out"
            aria-expanded={assessmentOpen}
          >
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span className="flex-1 text-left truncate">Assessment</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ease-out ${assessmentOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: assessmentOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              {NAV_ASSESSMENT.map((item) => {
                const Icon = item.icon;
                const active = isPathActive(pathname, hash, item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeDrawer}
                    className={`${baseLink} pl-10 ${active ? activeLink : idleLink}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 group-hover:text-brand-600'}`} />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </nav>

        {/* ANALYTICS */}
        {renderGroup('Analytics', NAV_ANALYTICS)}

        {/* GOVERNANCE */}
        {renderGroup('Governance', NAV_GOVERNANCE)}

        {/* DATA */}
        {renderGroup('Data', NAV_DATA)}

        <div className="mt-auto px-3.5 pb-3">
          <div className="mx-3.5 my-1.5 h-px bg-line" aria-hidden="true" />
          <NavLink
            to="/triage-policies"
            onClick={closeDrawer}
            className={`${baseLink} ${isPathActive(pathname, hash, '/triage-policies') ? activeLink : idleLink}`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${isPathActive(pathname, hash, '/triage-policies') ? 'text-white' : 'text-slate-500 group-hover:text-brand-600'}`} />
            <span>Settings</span>
          </NavLink>
          {typeof onSignOut === 'function' && (
            <button
              onClick={onSignOut}
              className={`${baseLink} ${idleLink}`}
              title="Sign out of the workspace"
            >
              <LogOut className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-brand-600" />
              <span>Sign out</span>
            </button>
          )}
          <div className="font-mono text-[9.5px] text-slate-400 pt-2 px-1 select-none">SAT-SA v1.2 · SOC Assessment</div>
        </div>
      </aside>
    </>
  );
}

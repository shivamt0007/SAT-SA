import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2, Settings, X } from 'lucide-react';
import { NAV_STRUCTURE } from '../navConfig';

function computeInitialOpenGroups(pathname) {
  const initial = {};
  NAV_STRUCTURE.forEach((item) => {
    if (item.type === 'group') {
      initial[item.name] = item.children.some((c) => c.path === pathname);
    }
  });
  return initial;
}

export default function Sidebar({ batchId, batches, onSelectBatch, mobileOpen, onCloseMobile }) {
  const location = useLocation();
    const activeBatch = batches.find((b) => b.batch_id === batchId);
  const [openGroups, setOpenGroups] = useState(() => computeInitialOpenGroups(location.pathname));
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

 
  useEffect(() => {
    NAV_STRUCTURE.forEach((item) => {
      if (item.type === 'group' && item.children.some((c) => c.path === location.pathname)) {
        setOpenGroups((prev) => (prev[item.name] ? prev : { ...prev, [item.name]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (name) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

   const linkBase =
  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-[3px]';

const linkActive =
  'bg-blue-500/20 text-white font-semibold border-blue-400 shadow-sm';

const linkInactive =
  'text-slate-200 border-transparent hover:bg-blue-400/10 hover:text-white';

const childLinkBase =
  'flex items-center gap-2 pl-9 pr-3 py-2 rounded-lg text-[12px] transition-all duration-150 border-l-[3px]';

const childActive =
  'bg-blue-400/15 text-blue-200 font-semibold border-blue-400';

const childInactive =
  'text-slate-300 border-transparent hover:bg-blue-400/10 hover:text-white';

 

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
         'fixed inset-y-0 left-0 z-40 w-[256px] bg-[#082B4C] border-r border-[#16476E]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <NavLink to="/overview" className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-mint-accent to-mint-accentDeep text-sm font-bold text-white shadow-sm">
              SA
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-mint-primaryText leading-none">
                SAT-SA
              </div>
              <div className="text-[10px] font-medium text-mint-secondary uppercase tracking-wider mt-0.5">
                Supervisory Analytics
              </div>
            </div>
          </NavLink>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-mint-secondary hover:text-mint-primaryText p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Current Assessment */}
<div className="mx-3 mb-3 rounded-lg border border-slate-200 bg-white/70 p-3">
  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
    Current Assessment
  </div>

  <div className="truncate text-sm font-semibold text-slate-800">
    {activeBatch?.batch_id || 'No active batch'}
  </div>

  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
    {activeBatch ? 'Analysis workspace' : 'Upload data to begin'}
  </div>

  {batches.length > 1 && (
    <button
      type="button"
      onClick={() => setShowBatchDropdown((prev) => !prev)}
      className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
    >
      Change assessment
    </button>
  )}

  {showBatchDropdown && batches.length > 1 && (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {batches.map((batch) => (
        <button
          key={batch.batch_id}
          type="button"
          onClick={() => {
            onSelectBatch(batch.batch_id);
            setShowBatchDropdown(false);
          }}
          className={[
            'w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
            batch.batch_id === batchId
              ? 'bg-blue-50 font-semibold text-blue-700'
              : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {batch.batch_id}
        </button>
      ))}
    </div>
  )}
</div>
        

        {/* Active batch switcher */}
        <div className="px-4 pb-3 relative">
          <button
            onClick={() => setShowBatchDropdown(!showBatchDropdown)}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-white border border-mint-border hover:border-mint-accent/50 transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase text-mint-secondary tracking-wider">
                Active Batch
              </div>
              <div className="font-mono text-[11px] font-bold text-mint-primaryText truncate">
                {batchId ? `BATCH-${batchId.slice(0, 8)}` : 'No Batch Loaded'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-mint-secondary shrink-0" />
          </button>

          {showBatchDropdown && (
            <div className="absolute left-4 right-4 mt-1 rounded-md bg-white border border-mint-border shadow-lg py-1 z-50 text-xs max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-mint-secondary border-b border-mint-border">
                Switch Assessment Batch
              </div>
              {(!batches || batches.length === 0) ? (
                <div className="px-3 py-2 text-mint-secondary italic">No batches available</div>
              ) : (
                batches.map((b) => (
                  <button
                    key={b.batch_id}
                    onClick={() => {
                      setShowBatchDropdown(false);
                      onSelectBatch(b.batch_id);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-mint-active/40 flex items-center justify-between transition-colors ${
                      b.batch_id === batchId ? 'bg-mint-active/50 font-semibold text-mint-activeText' : 'text-mint-text'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] truncate">BATCH-{b.batch_id.slice(0, 8)}</div>
                      <div className="text-[10px] text-mint-secondary">{b.cse_count} CSEs · {b.alert_count} alerts</div>
                    </div>
                    {b.batch_id === batchId && <CheckCircle2 className="w-4 h-4 text-mint-accent shrink-0 ml-1" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="mx-4 border-t border-mint-border" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_STRUCTURE.map((item) => {
            if (item.type === 'link') {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </NavLink>
              );
            }

            const Icon = item.icon;
            const isOpen = !!openGroups[item.name];
            const isChildActive = item.children.some((c) => c.path === location.pathname);

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleGroup(item.name)}
                  className={[
                    linkBase,
                    'w-full justify-between',
                    isChildActive ? 'text-mint-activeText font-semibold border-mint-accent' : linkInactive,
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-mint-secondary" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-mint-secondary" />
                  )}
                </button>

                <div className={`nav-group-panel ${isOpen ? 'is-open' : ''}`}>
                  <div className="space-y-0.5 pt-0.5 pb-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onCloseMobile}
                        className={({ isActive }) => `${childLinkBase} ${isActive ? childActive : childInactive}`}
                      >
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Settings (no route wired up yet in this build) */}
        <div className="px-3 pb-4 pt-2 border-t border-mint-border">
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-mint-secondary opacity-70 cursor-not-allowed w-full"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, PlayCircle, Upload, ChevronDown, Clock, Bell, ChevronRight as Sep } from 'lucide-react';
import { getPageMeta } from '../navConfig';

    export default function Header({
  scenarios,
  onSelectScenario,
  onOpenMobileSidebar,
  onLogout,
}) {
    const navigate = useNavigate();

const userEmail =
  localStorage.getItem('sat_sa_user_email') || 'User';

  const handleLogout = () => {
  localStorage.removeItem('sat_sa_logged_in');
  localStorage.removeItem('sat_sa_user_email');

  onLogout();
  navigate('/login', { replace: true });
};
  const location = useLocation();
  const { title, breadcrumb } = getPageMeta(location.pathname);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  return (
    <header className="sticky top-0 z-20 w-full bg-white/95 backdrop-blur border-b border-border-slate-200">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        {/* Left: mobile toggle + title/breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden text-mint-secondary hover:text-mint-primaryText p-1 -ml-1"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            {breadcrumb.length > 1 && (
              <div className="flex items-center gap-1 text-[11px] text-mint-secondary mb-0.5">
                {breadcrumb.slice(0, -1).map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {crumb}
                    <Sep className="w-3 h-3" />
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-[17px] font-semibold text-mint-primaryText truncate leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right: context + actions */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-mint-secondaryText mr-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-mint-secondary" />
              Evaluation Cycle: Sep 2026
            </span>
            <span className="w-px h-3.5 bg-mint-border" />
          <div className="flex items-center gap-2">
         <span>Status:</span>
         <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
         <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
         <span>Analysis Complete</span>
         </span>
        </div>
        </div>

          {/* Demo scenarios */}
          <div className="relative">
            <button
              onClick={() => setShowDemoDropdown(!showDemoDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-white text-mint-accent border border-mint-border hover:bg-mint-active/40 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Demo Scenarios</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDemoDropdown && (
              <div className="absolute right-0 mt-1 w-80 rounded-md bg-white border border-mint-border shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-mint-secondary border-b border-mint-border">
                  Select Grounded Demo Scenario
                </div>
                {(!scenarios || scenarios.length === 0) ? (
                  <div className="px-3 py-2 text-mint-secondary italic">No scenarios available</div>
                ) : (
                  scenarios.map((sc) => (
                    <button
                      key={sc.id}
                      onClick={() => {
                        setShowDemoDropdown(false);
                        onSelectScenario(sc);
                      }}
                      className="w-full text-left px-3 py-2.5 hover:bg-mint-active/30 border-b border-mint-border last:border-0 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-mint-primaryText">{sc.title}</span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-mint-active text-mint-activeText">
                          {sc.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-mint-secondaryText leading-snug">{sc.description}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
             <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-blue-50 hover:text-blue-600"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />

          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

          {/* Ingest Data */}
          <NavLink
            to="/"
         className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingest Data</span>
          </NavLink>
         {/* User Profile */}
<div className="relative">
  <button
    type="button"
    onClick={() => setShowUserDropdown((prev) => !prev)}
    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors"
  >
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
      {userEmail.charAt(0).toUpperCase()}
    </div>

    <div className="hidden lg:block text-left max-w-[150px]">
      <div className="truncate text-xs font-semibold text-slate-700">
        {userEmail}
      </div>

      <div className="text-[10px] text-slate-400">
        Assessment Analyst
      </div>
    </div>

    <ChevronDown
      className={[
        'h-3.5 w-3.5 text-slate-400 transition-transform',
        showUserDropdown ? 'rotate-180' : '',
      ].join(' ')}
    />
  </button>

  {showUserDropdown && (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-xs font-semibold text-slate-800">
          Signed in as
        </div>

        <div className="mt-1 truncate text-xs text-slate-500">
          {userEmail}
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Workspace active
        </div>
      </div>

      <div className="p-1.5">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )}
</div>
        </div>
      </div>
    </header>
  );
}
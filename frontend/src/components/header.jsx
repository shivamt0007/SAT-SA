import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, PlayCircle, Upload, ChevronDown, Clock, ChevronRight as Sep } from 'lucide-react';
import { getPageMeta } from '../navConfig';

export default function Header({ scenarios, onSelectScenario, onOpenMobileSidebar }) {
  const location = useLocation();
  const { title, breadcrumb } = getPageMeta(location.pathname);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);

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

          {/* Ingest Data */}
          <NavLink
            to="/"
         className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingest Data</span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
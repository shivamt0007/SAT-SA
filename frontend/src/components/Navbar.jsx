import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Shield, PlayCircle, Upload, ChevronDown, CheckCircle2, Clock, Database, Layers } from 'lucide-react';
import { getBatches, getDemoScenarios } from '../api';

export default function Navbar({ batchId, onBatchChange }) {
  const [batches, setBatches] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showDemoDropdown, setShowDemoDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [bRes, sRes] = await Promise.all([getBatches(), getDemoScenarios()]);
        setBatches(bRes.data || []);
        setScenarios(sRes.data || []);
      } catch (e) {
        // Fallback gracefully
      }
    }
    loadMetadata();
  }, [batchId]);

  const navItems = [
    { name: 'Overview', path: '/overview' },
    { name: 'Entities', path: '/entities' },
    { name: 'Findings', path: '/findings' },
    { name: 'Review Queue', path: '/review-queue' },
    { name: 'Negative Space', path: '/negative-space' },
    { name: 'Execution Gaps', path: '/execution-gaps' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Policies', path: '/triage-policies' },
    { name: 'Evidence', path: '/evidence' },
    { name: 'Reports', path: '/reports' },
    { name: 'Data Quality', path: '/data-quality' },
  ];

  const handleSelectScenario = (sc) => {
    setShowDemoDropdown(false);
    navigate(sc.target_route);
  };

  const handleSelectBatch = (b) => {
    setShowBatchDropdown(false);
    if (onBatchChange) {
      onBatchChange(b.batch_id);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Top Supervisory Metadata Bar */}
      <div className="bg-slate-900 text-slate-200 px-6 py-1 text-[11px] flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-4">
          <span className="font-semibold tracking-wide text-white uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            SAT-SA · Supervisory Analytics Tool for SOC Assessment
          </span>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-300 font-mono hidden sm:inline">NCIIPC/NTRO Framework · Air-Gapped Verification</span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Evaluation Cycle: Sep 2026
          </span>
          <span>Status: <strong className="text-emerald-400 uppercase font-semibold">Analysis Complete</strong></span>
        </div>
      </div>

      {/* Main Operational Navigation Bar */}
      <div className="mx-auto flex h-14 max-w-[1700px] items-center justify-between px-6">
        
        {/* Brand & Badge */}
        <div className="flex items-center gap-4">
          <NavLink to="/overview" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-700 text-sm font-bold text-white shadow-xs group-hover:bg-blue-800 transition-colors">
              SA
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                SAT-SA
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  v1.2
                </span>
              </div>
              <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-none">
                Supervisory Layer
              </div>
            </div>
          </NavLink>

          <div className="hidden h-6 w-px bg-slate-200 md:block" />

          {/* Assessment Batch Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowBatchDropdown(!showBatchDropdown); setShowDemoDropdown(false); }}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
            >
              <div>
                <div className="text-[9px] font-semibold uppercase text-slate-400 tracking-wider">Active Batch</div>
                <div className="font-mono text-xs font-bold text-slate-800 truncate max-w-[130px]">
                  {batchId ? `BATCH-${batchId.slice(0, 8)}` : 'No Batch Loaded'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
            </button>

            {showBatchDropdown && (
              <div className="absolute left-0 mt-1 w-72 rounded-md bg-white border border-slate-200 shadow-lg py-1 z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-100">
                  Switch Assessment Batch
                </div>
                {batches.length === 0 ? (
                  <div className="px-3 py-2 text-slate-500 italic">No batches available in DB</div>
                ) : (
                  batches.map(b => (
                    <button
                      key={b.batch_id}
                      onClick={() => handleSelectBatch(b)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors ${
                        b.batch_id === batchId ? 'bg-blue-50/50 font-semibold text-blue-800' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-[11px]">BATCH-{b.batch_id.slice(0, 8)}</div>
                        <div className="text-[10px] text-slate-400">{b.cse_count} CSEs · {b.alert_count} alerts</div>
                      </div>
                      {b.batch_id === batchId && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Primary Operational Navigation Links */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'px-3 py-1.5 text-xs font-semibold transition-colors rounded-sm',
                  isActive
                    ? 'bg-slate-100 text-blue-800 border-b-2 border-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                ].join(' ')
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Actions: Demo Mode & Ingest */}
        <div className="flex items-center gap-2">
          {/* Demo Scenario Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowDemoDropdown(!showDemoDropdown); setShowBatchDropdown(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Demo Scenarios</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDemoDropdown && (
              <div className="absolute right-0 mt-1 w-80 rounded-md bg-white border border-slate-200 shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  Select Grounded Demo Scenario
                </div>
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-slate-900">{sc.title}</span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {sc.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{sc.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ingest Button */}
          <NavLink
            to="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingest Data</span>
          </NavLink>
        </div>

      </div>
    </header>
  );
}
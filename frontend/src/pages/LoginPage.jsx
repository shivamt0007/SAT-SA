import { useState } from 'react';
import {
  ShieldCheck, BarChart3, AlertOctagon, FileText, Lock, Eye, EyeOff,
  ArrowRight, Loader2, Fingerprint
} from 'lucide-react';

const ROLES = [
  { value: 'Lead Cyber Security Supervisor', label: 'Lead Cyber Security Supervisor' },
  { value: 'SOC Analyst', label: 'SOC Analyst' },
  { value: 'Audit Officer', label: 'Audit Officer' },
  { value: 'Compliance Reviewer', label: 'Compliance Reviewer' },
];

const CAPABILITIES = [
  { icon: ShieldCheck, title: 'Supervisory Assessment', body: 'Quantitative SOC effectiveness scoring across entities from operational telemetry.' },
  { icon: AlertOctagon, title: 'Weakness Detection', body: 'Execution gaps, negative-space anomalies and peer deviations surfaced with evidence.' },
  { icon: BarChart3, title: 'Sector Benchmarks', body: 'Entity and sector-level analytics to direct supervisory attention where it matters.' },
  { icon: FileText, title: 'Audit Reporting', body: 'Formal supervisory reports with corrective directives and review queues.' },
];

/**
 * Workspace access gate.
 *
 * The SAT-SA backend does not yet expose an authentication endpoint, so this
 * login is intentionally a frontend-only session gate: it records the operator
 * identity locally and does NOT transmit credentials anywhere.
 *
 * When a backend auth endpoint becomes available, plug it in here — e.g.:
 *   const res = await api.post('/auth/login', { username, password });
 *   sessionStorage.setItem('sat_sa_token', res.data.access_token);
 * and surface res/HTTP errors through `setError()`.
 */
export default function LoginPage({ onSignIn }) {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem('sat_sa_remember_user') || ''; } catch (e) { return ''; }
  });
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES[0].value);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Enter your email or username to continue.');
      return;
    }
    setError('');
    setSubmitting(true);

    // Local session gate — swap for real backend authentication when available.
    window.setTimeout(() => {
      try {
        if (remember) localStorage.setItem('sat_sa_remember_user', trimmed);
        else localStorage.removeItem('sat_sa_remember_user');
      } catch (err) { /* storage unavailable */ }
      setSubmitting(false);
      if (onSignIn) onSignIn({ name: trimmed, role });
    }, 700);
  };

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Left: brand + capability narrative */}
      <div className="hidden lg:flex w-[46%] max-w-[560px] flex-col justify-between px-10 py-10 border-r border-line bg-mint-50">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-brand-600 text-white text-sm font-bold shadow-card border border-brand-700">
                SA
              </div>
              <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-50" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-ink leading-none">SAT-SA</div>
              <div className="text-[10.5px] font-medium uppercase tracking-widest text-faint mt-1">Supervisory Analytics Tool</div>
            </div>
          </div>

          <div className="mt-12">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 mb-2">SOC Assessment Workspace</div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-ink">
              Evidence-driven oversight for
              <span className="text-brand-700"> Critical Sector Entities.</span>
            </h1>
            <p className="text-[13px] text-slate-500 leading-relaxed mt-3 max-w-md">
              SAT-SA evaluates SOC performance from operational security data — detection coverage,
              response discipline, automation and supervisory compliance — and surfaces the evidence
              behind every score and recommendation.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-[12px] border border-line bg-paper p-3.5 shadow-card">
                <c.icon className="w-4 h-4 text-brand-600 mb-1.5" />
                <div className="text-[11.5px] font-semibold text-ink">{c.title}</div>
                <div className="text-[10.5px] text-faint leading-relaxed mt-0.5">{c.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 leading-relaxed max-w-md">
          <span className="font-mono text-brand-700 font-semibold">FIRST RESPONSE · SIH 2026</span>
          <br />
          Offline / air-gapped verification environment. All assessment records are grounded in the local evidence database.
        </div>
      </div>

      {/* Right: sign-in panel */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          {/* Compact brand (small screens) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-600 text-white text-[13px] font-bold shadow-card">
              SA
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight text-ink leading-none">SAT-SA</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-faint mt-0.5">Supervisory Analytics</div>
            </div>
          </div>

          <div className="rounded-[16px] border border-line bg-paper p-7 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <Fingerprint className="w-4 h-4 text-brand-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Workspace Access</span>
            </div>
            <h2 className="text-[22px] font-semibold tracking-tight text-ink mt-1">
              Open the assessment workspace
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Identify yourself to continue. Your session is stored locally on this device.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-username" className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email / Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alex.carter@nciipc.gov.in"
                  autoComplete="username"
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-line rounded-[9px] text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">local gate</span>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-slate-50 border border-line rounded-[9px] text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-ink transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="login-role" className="block text-[10.5px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Role
                </label>
                <select
                  id="login-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-line rounded-[9px] text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-line accent-brand-600"
                />
                Remember me on this device
              </label>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[9px] px-3 py-2 text-[11px] font-medium text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-card transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Login
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 leading-relaxed text-center flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                No credentials are transmitted — local session gate until backend auth is connected.
              </p>
            </form>
          </div>

          <div className="text-center mt-4 text-[9.5px] uppercase tracking-widest text-slate-400 font-mono">
            Supervisory Analytics Tool for SOC Assessment
          </div>
        </div>
      </div>
    </div>
  );
}
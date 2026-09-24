import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 4) {
      setError('Password must contain at least 4 characters.');
      return;
    }

    // Frontend-only login
    localStorage.setItem('sat_sa_logged_in', 'true');
    localStorage.setItem('sat_sa_user_email', email.trim());

    onLogin();
    navigate('/upload');
  };

  return (
    <div className="min-h-screen bg-[#EDF7F9] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SAT-SA
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Supervisory Analytics Tool for SOC Assessment
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">

          <div className="mb-7">
            <h2 className="text-xl font-semibold text-slate-900">
              Welcome back
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to access your assessment workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.99]"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Demo note */}
          <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            <span className="font-semibold text-slate-700">
              Workspace access
            </span>
            <br />
            This login is currently a frontend-only access screen. Any valid
            email and password meeting the basic requirements can continue.
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          SAT-SA · Supervisory Analytics Workspace
        </p>
      </div>
    </div>
  );
}
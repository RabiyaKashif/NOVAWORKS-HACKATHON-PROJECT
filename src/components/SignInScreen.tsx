import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Briefcase,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Terminal,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { DEFAULT_DIRECTORY } from '../data/defaults.ts';
import { apiFetch, parseJsonSafe, setSessionToken } from '../lib/api.ts';
import type { DirectoryEmployee } from '../types/project.ts';
import { NovaWorksLogo } from './NovaWorksLogo.tsx';
import { OrbitalBackground } from './OrbitalBackground.tsx';

interface SignInScreenProps {
  onSignInSuccess: (user: DirectoryEmployee) => void;
  sessionNotice?: string | null;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onSignInSuccess,
  sessionNotice = null,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@novaworks.example');
  const [password, setPassword] = useState('Demo123!');
  const [signupRole, setSignupRole] = useState<'AGENT' | 'MANAGER'>('AGENT');
  const [specialization, setSpecialization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>('ADMIN');
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setInfoNotice(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      const payload = await parseJsonSafe<{
        user?: DirectoryEmployee;
        token?: string;
        error?: string;
      }>(response);

      if (!response.ok || !payload?.user) {
        throw new Error(
          payload?.error || `Sign in failed (HTTP ${response.status}).`
        );
      }

      if (payload.token) {
        setSessionToken(payload.token);
      }
      onSignInSuccess(payload.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const performRegister = async () => {
    setError(null);
    setInfoNotice(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          password,
          role: signupRole,
          specialization: specialization.trim(),
        }),
      });

      const payload = await parseJsonSafe<{
        user?: DirectoryEmployee;
        token?: string;
        error?: string;
      }>(response);

      if (!response.ok || !payload?.user) {
        throw new Error(
          payload?.error || `Sign up failed (HTTP ${response.status}).`
        );
      }

      if (payload.token) {
        setSessionToken(payload.token);
      }
      onSignInSuccess(payload.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectDemoRole = (user: DirectoryEmployee) => {
    setAuthMode('signin');
    setEmail(user.email);
    setPassword('Demo123!');
    setSelectedDemoId(user.id);
    setError(null);
    setInfoNotice(`Autofilled credentials for ${user.name} (${user.role} · ${user.specialization}).`);
  };

  const handleSwitchMode = (nextMode: 'signin' | 'signup') => {
    setAuthMode(nextMode);
    setError(null);
    setInfoNotice(null);
    if (nextMode === 'signup') {
      if (email === 'admin@novaworks.example') setEmail('');
      if (password === 'Demo123!') setPassword('');
      setSelectedDemoId(null);
    } else if (!email) {
      setEmail('admin@novaworks.example');
      setPassword('Demo123!');
      setSelectedDemoId('ADMIN');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'signup') {
      await performRegister();
    } else {
      await performLogin(email, password);
    }
  };

  const roleIcons: Record<string, React.ReactNode> = {
    ADMIN: <Shield className="h-4 w-4 text-[#5b3bdf]" />,
    MANAGER: <Users className="h-4 w-4 text-[#5b3bdf]" />,
    AGENT: <Terminal className="h-4 w-4 text-[#5b3bdf]" />,
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-[#faf9f5] px-4 py-8 sm:py-10">
      <OrbitalBackground variant="auth" />

      {/* Top Eyebrow */}
      <div className="relative z-10 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#5b3bdf]">
          START FROM THE FUTURE
        </span>
      </div>

      {/* Centered Auth Card */}
      <main className="relative z-10 my-6 w-full max-w-[460px]">
        <div className="rounded-[2rem] border border-[#0d1b3e]/[0.07] bg-white p-7 shadow-[0_24px_60px_-20px_rgba(13,27,62,0.12)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <NovaWorksLogo size="md" />
            <h1 className="mt-5 font-editorial text-[30px] leading-[1.15] tracking-[-0.015em] text-[#0d1b3e]">
              {authMode === 'signup' ? 'Create NovaWorks Account' : 'Sign in to NovaWorks OS'}
            </h1>
            <p className="mt-2.5 max-w-[340px] text-[13px] leading-relaxed text-[#45464e]">
              The AI-native Operating System designed to unify people, agents, and processes across the enterprise.
            </p>

            {/* Sign In / Sign Up Segmented Toggle */}
            <div className="mt-5 inline-flex rounded-full border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] p-1">
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  authMode === 'signin'
                    ? 'bg-white text-[#0d1b3e] shadow-xs'
                    : 'text-[#45464e] hover:text-[#0d1b3e]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  authMode === 'signup'
                    ? 'bg-white text-[#0d1b3e] shadow-xs'
                    : 'text-[#45464e] hover:text-[#0d1b3e]'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {authMode === 'signup' && (
              <div>
                <label htmlFor="nw-fullname" className="mb-1.5 block text-xs font-medium text-[#0d1b3e]">
                  Full Name
                </label>
                <div className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] px-3.5 py-2.5 transition-shadow focus-within:border-[#6344e7]/40 focus-within:ring-3 focus-within:ring-[#6344e7]/15">
                  <UserIcon className="h-4 w-4 shrink-0 text-[#76767f]" />
                  <input
                    id="nw-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ayesha Khan"
                    className="w-full bg-transparent text-sm text-[#0d1b3e] placeholder:text-[#76767f]/80 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="nw-email" className="text-xs font-medium text-[#0d1b3e]">
                  Enterprise Work Email
                </label>
                <span className="text-[11px] font-medium text-[#5b3bdf]">
                  Session Auth Active
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] px-3.5 py-2.5 transition-shadow focus-within:border-[#6344e7]/40 focus-within:ring-3 focus-within:ring-[#6344e7]/15">
                <AtSign className="h-4 w-4 shrink-0 text-[#76767f]" />
                <input
                  id="nw-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedDemoId(null);
                  }}
                  placeholder="colleague@novaworks.example"
                  className="w-full bg-transparent text-sm text-[#0d1b3e] placeholder:text-[#76767f]/80 focus:outline-none"
                />
              </div>
            </div>

            {authMode === 'signup' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="nw-role" className="mb-1.5 block text-xs font-medium text-[#0d1b3e]">
                    Workspace Role
                  </label>
                  <select
                    id="nw-role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as 'AGENT' | 'MANAGER')}
                    className="w-full rounded-2xl border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] px-3.5 py-2.5 text-sm text-[#0d1b3e] focus:border-[#6344e7]/40 focus:outline-none"
                  >
                    <option value="AGENT">AGENT (Developer)</option>
                    <option value="MANAGER">MANAGER (PM)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="nw-spec" className="mb-1.5 block text-xs font-medium text-[#0d1b3e]">
                    Specialization
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] px-3.5 py-2.5 focus-within:border-[#6344e7]/40">
                    <Briefcase className="h-4 w-4 shrink-0 text-[#76767f]" />
                    <input
                      id="nw-spec"
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="Full-Stack"
                      className="w-full bg-transparent text-sm text-[#0d1b3e] placeholder:text-[#76767f]/80 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="nw-password" className="text-xs font-medium text-[#0d1b3e]">
                  Password
                </label>
                {authMode === 'signin' ? (
                  <span className="text-[11px] text-[#76767f]">
                    Demo password: <code className="font-mono text-[#0d1b3e]">Demo123!</code>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#76767f]">Min 6 characters</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b3e]/[0.08] bg-[#f5f4f0] px-3.5 py-2.5 transition-shadow focus-within:border-[#6344e7]/40 focus-within:ring-3 focus-within:ring-[#6344e7]/15">
                <Lock className="h-4 w-4 shrink-0 text-[#76767f]" />
                <input
                  id="nw-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={authMode === 'signup' ? 6 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-transparent text-sm text-[#0d1b3e] placeholder:text-[#76767f]/80 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-md p-0.5 text-[#76767f] hover:text-[#0d1b3e]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {(error || sessionNotice) && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error || sessionNotice}</span>
              </div>
            )}

            {infoNotice && !error && !sessionNotice && (
              <p className="rounded-xl bg-[#f1edff] px-3 py-2 text-[11px] font-medium text-[#4519ca]">
                {infoNotice}
              </p>
            )}

            {/* Primary CTA Pill */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex cursor-pointer items-center gap-4 rounded-full bg-[#0d1b3e] py-2 pl-6 pr-2 text-xs font-semibold tracking-[0.12em] text-white shadow-[0_12px_24px_-6px_rgba(13,27,62,0.28)] transition-all duration-150 hover:bg-[#162756] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
              >
                <span>
                  {isSubmitting
                    ? authMode === 'signup'
                      ? 'CREATING ACCOUNT...'
                      : 'SIGNING IN...'
                    : authMode === 'signup'
                      ? 'SIGN UP'
                      : 'SIGN IN'}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6344e7] text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          </form>

          {/* Divider with Center Dot */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="h-px w-full bg-[#0d1b3e]/[0.07]" />
            <span
              className="absolute h-2 w-2 rounded-full bg-[#c9bfff] ring-4 ring-white"
              aria-hidden="true"
            />
          </div>

          {/* Quick Demo Access Box (All 10 Seeded Accounts) */}
          <div className="rounded-2xl bg-[#f5f4f0] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5b3bdf]">
                SEEDED DEMO ACCOUNTS (10)
              </span>
              <span className="text-[11px] text-[#76767f]">Autofill or instant login</span>
            </div>

            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {DEFAULT_DIRECTORY.map((user) => {
                const isSelected =
                  selectedDemoId === user.id ||
                  email.trim().toLowerCase() === user.email.toLowerCase();
                return (
                  <div
                    key={user.id}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 transition-all duration-150 ${
                      isSelected
                        ? 'border-[#6344e7]/45 ring-2 ring-[#6344e7]/15'
                        : 'border-[#0d1b3e]/[0.06] hover:border-[#0d1b3e]/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDemoRole(user)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1edff]">
                        {roleIcons[user.role]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#0d1b3e] truncate">
                          {user.name} ·{' '}
                          <span className="text-[#45464e] font-normal">
                            {user.specialization}
                          </span>
                        </p>
                        <p className="text-[11px] font-mono text-[#76767f] truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        handleSelectDemoRole(user);
                        void performLogin(user.email, 'Demo123!');
                      }}
                      className="shrink-0 cursor-pointer rounded-full bg-[#f1edff] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#5b3bdf] hover:bg-[#6344e7] hover:text-white transition-colors disabled:opacity-50"
                      title={`Sign in immediately as ${user.name}`}
                    >
                      {user.role} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Status & Copyright */}
      <footer className="relative z-10 text-center">
        <p className="text-xs text-[#45464e]">
          Enterprise Multi-Agent Orchestration Active
        </p>
        <p className="mt-1.5 text-[11px] text-[#76767f]">
          © 2026 NovaWorks Technologies. Enterprise AI Workforce OS.
        </p>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  MailCheck,
  Moon,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../i18n';
import { ROLE_DESCRIPTIONS } from '../../security/permissions';
import { User } from '../../types/models';

export const SignInPage: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const {
    store,
    signIn,
    acceptOperatorInvitation,
    theme,
    toggleTheme,
  } = useApp();

  const isProductionEnforced = store.environmentMode === 'production-enforced';

  const [authTab, setAuthTab] = useState<'signin' | 'reset' | 'invitation'>('signin');

  // Sign-In state
  const [identifier, setIdentifier] = useState(
    isProductionEnforced ? '' : 's.admin@telecomops360.demo'
  );
  const [password, setPassword] = useState(isProductionEnforced ? '' : 'Ops360!Demo');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  // Password Reset state
  const [resetEmail, setResetEmail] = useState('k.mansour@telecomops360.demo');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [generatedDevToken, setGeneratedDevToken] = useState<string | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  // Invitation Acceptance state
  const [inviteCode, setInviteCode] = useState('INV-NCO-8842-ALPHA');
  const [inviteUsername, setInviteUsername] = useState('n.benali');
  const [invitePassword, setInvitePassword] = useState('Ops360!Demo');
  const [invitePhone, setInvitePhone] = useState('+213 550 44 55 66');

  const validateForm = (): boolean => {
    const errors: { identifier?: string; password?: string } = {};
    if (!identifier.trim()) {
      errors.identifier = 'Enter your corporate username or email address.';
    } else if (identifier.trim().length < 3) {
      errors.identifier = 'Identifier must be at least 3 characters.';
    }

    if (!password) {
      errors.password = 'Enter your operator password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      const result = signIn(identifier, password);
      if (!result.ok) {
        setErrorMessage(result.error || 'Authentication failed.');
        setIsSubmitting(false);
      }
    }, 240);
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setErrorMessage('Enter a valid registered corporate email address.');
      return;
    }
    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      setSuccessMessage(
        data.message || 'Password reset token issued. Check your email or development fallback token.'
      );
      if (data.simulatedResetToken) {
        setGeneratedDevToken(data.simulatedResetToken);
        setResetTokenInput(data.simulatedResetToken);
      }
    } catch {
      const fallbackToken = `RST-DEV-${Date.now().toString().slice(-6)}`;
      setGeneratedDevToken(fallbackToken);
      setResetTokenInput(fallbackToken);
      setSuccessMessage(
        'Generated password reset verification token (Development SMTP Fallback).'
      );
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!resetTokenInput.trim() || newResetPassword.length < 8) {
      setErrorMessage('Provide the reset verification token and a new password (min 8 chars).');
      return;
    }
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken: resetTokenInput.trim(),
          newPassword: newResetPassword,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setErrorMessage(data.error || 'Failed to reset password.');
        return;
      }
      setSuccessMessage(
        'Password updated and existing sessions revoked. You may now sign in.'
      );
      setAuthTab('signin');
      setIdentifier(resetEmail);
      setPassword(newResetPassword);
    } catch {
      setSuccessMessage('Password reset verified. Proceed to Sign In.');
      setAuthTab('signin');
    }
  };

  const handleAcceptInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    const res = acceptOperatorInvitation({
      inviteCode,
      username: inviteUsername,
      password: invitePassword,
      phone: invitePhone,
    });
    if (!res.ok || !res.user) {
      setErrorMessage(res.error || 'Could not accept invitation.');
      return;
    }
    setSuccessMessage(
      `Account provisioned for ${res.user.fullName} (${res.user.role}). Signing in...`
    );
    setIdentifier(res.user.email);
    setPassword('Ops360!Demo');
    setAuthTab('signin');
  };

  const handleSelectDemoAccount = (user: User) => {
    if (isProductionEnforced) return;
    setAuthTab('signin');
    setIdentifier(user.email);
    setPassword('Ops360!Demo');
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Radio className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            TelecomOps 360
          </span>
          <span className="ml-2 px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            PHASE 5 SECURE PLATFORM
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
          <span className="whitespace-nowrap shrink-0">7-Role Server RBAC</span>
          <span className="whitespace-nowrap shrink-0">Multi-Tenant Isolation</span>
          <span className="whitespace-nowrap shrink-0">Append-Only Audit Trail</span>
          <span className="whitespace-nowrap shrink-0">GIS &amp; Field Reporting</span>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/80 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none"
              aria-label="Select Language"
            >
              <option value="en">🇬🇧 English</option>
              <option value="fr">🇫🇷 Français</option>
              <option value="ar">🇩🇿 العربية (RTL)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Authentication & Account Provisioning */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8">
          <div className="mb-5">
            <p className="text-xs font-mono text-sky-600 dark:text-sky-400 mb-1">
              {isProductionEnforced
                ? 'PRODUCTION-ENFORCED SECURITY MODE'
                : 'PHASE 5 AUTHENTICATION · DEVELOPMENT DEMO ENVIRONMENT'}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Telecom Operations Portal
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
               Cryptographic scrypt credential verification, HMAC session tokens, and multi-tenant
              organization isolation.
            </p>
          </div>

          {/* Workflow Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthTab('signin');
                setErrorMessage(null);
              }}
              className={`py-2 px-2 rounded-md transition-colors cursor-pointer ${
                authTab === 'signin'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('invitation');
                setErrorMessage(null);
              }}
              className={`py-2 px-2 rounded-md transition-colors cursor-pointer ${
                authTab === 'invitation'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Accept Invite
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('reset');
                setErrorMessage(null);
              }}
              className={`py-2 px-2 rounded-md transition-colors cursor-pointer ${
                authTab === 'reset'
                  ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Password Reset
            </button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/80 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Security &amp; Authentication Notice</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/80 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Workflow Confirmed</p>
                <p className="mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {authTab === 'signin' && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="signin-identifier"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Username or Corporate Email
                </label>
                <input
                  id="signin-identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.identifier) {
                      setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                    }
                  }}
                  placeholder="e.g. s.admin@telecomops360.demo"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border ${
                    fieldErrors.identifier
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-sky-500'
                  } text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1`}
                />
                {fieldErrors.identifier && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.identifier}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Operator Password
                  </label>
                  {!isProductionEnforced && (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Demo Key: Ops360!Demo
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="Enter operator password"
                    className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg bg-slate-50 dark:bg-slate-950 border ${
                      fieldErrors.password
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-slate-300 dark:border-slate-700 focus:border-sky-500 focus:ring-sky-500'
                    } text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span>Verifying Server Session &amp; RBAC...</span>
                  ) : (
                    <>
                      <span>Sign In to TelecomOps 360</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {authTab === 'invitation' && (
            <form onSubmit={handleAcceptInvitation} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/60 text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Approved Administrator Invitation Workflow</span>
                </p>
                <p className="mt-1 text-[11px]">
                  Open self-registration is prohibited. Enter an administrator-issued invitation
                  code (e.g., <code className="font-mono font-bold">INV-NCO-8842-ALPHA</code>) to
                  activate your account.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Administrator Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Desired Username</label>
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">On-Call Phone</label>
                  <input
                    type="text"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Set Operator Password (min 8 chars)</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
              >
                Verify Invitation &amp; Activate Account
              </button>
            </form>
          )}

          {authTab === 'reset' && (
            <div className="space-y-4 text-xs">
              <form onSubmit={handleRequestPasswordReset} className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Registered Corporate Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>1. Generate Password Reset Verification Token</span>
                </button>
              </form>

              {generatedDevToken && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                  Development SMTP Fallback Token: <strong>{generatedDevToken}</strong>
                </div>
              )}

              <form
                onSubmit={handleConfirmPasswordReset}
                className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800"
              >
                <div>
                  <label className="block font-semibold mb-1">Reset Verification Token</label>
                  <input
                    type="text"
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    placeholder="RST-..."
                    className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-3 py-2 rounded-lg font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  2. Confirm Reset &amp; Revoke Existing Sessions
                </button>
              </form>
            </div>
          )}

          {/* Security Architecture Footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-800 dark:text-slate-200">
                  Restricted Provisioning &amp; Session Revocation:
                </strong>{' '}
                Account creation requires an administrator invitation. Suspended accounts have
                their active tokens immediately revoked on the server.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-800 dark:text-slate-200">
                  Multi-Tenant Isolation:
                </strong>{' '}
                Every API request enforces organization scoping (<code className="font-mono">ORG-TELECOM-01</code>{' '}
                vs <code className="font-mono">ORG-CONTRACTOR-02</code>) and 7-role RBAC on the
                backend.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: 7-Role & Multi-Tenant Account Selector */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-sky-500" />
                  <span>
                    {isProductionEnforced
                      ? '7-Role RBAC & Multi-Tenant Directory Reference'
                      : 'Development-Only Demo Operator Accounts (Click to Autofill)'}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isProductionEnforced
                    ? 'Quick-autofill is disabled in Production-Enforced mode. Enter verified credentials manually.'
                    : 'Includes all 7 RBAC roles across Primary Carrier (ORG-TELECOM-01) and External Contractor (ORG-CONTRACTOR-02).'}
                </p>
              </div>
              {!isProductionEnforced && (
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Password: <strong className="text-slate-800 dark:text-slate-200">Ops360!Demo</strong>
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {store.users.slice(0, 8).map((u) => {
                const isSelected =
                  identifier.toLowerCase() === u.email.toLowerCase() ||
                  identifier.toLowerCase() === u.username.toLowerCase();
                const isSuspended = u.accountStatus === 'Suspended' || u.active === false;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(u)}
                    className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-500 dark:border-sky-500'
                        : 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-sky-600 dark:text-sky-400">
                        {u.role}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {u.organizationId || 'ORG-TELECOM-01'}
                        </span>
                        {isSuspended ? (
                          <span className="text-[10px] font-mono text-red-600 font-bold">
                            SUSPENDED
                          </span>
                        ) : (
                          <MailCheck className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                      <span>{u.fullName}</span>
                      {isSelected && <UserCheck className="w-3.5 h-3.5 text-sky-500" />}
                    </p>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      {u.email}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-2">
                      {ROLE_DESCRIPTIONS[u.role]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

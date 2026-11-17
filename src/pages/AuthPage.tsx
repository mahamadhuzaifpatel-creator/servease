import React, { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { SERVICE_CATEGORIES, ServiceCategory } from '../types';
import { AUTH_WORKSHOP_IMAGE } from '../data/demoSeed';
import { useServEase } from '../hooks/useServEaseStore';
import { isValidEmail, isValidPhone } from '../utils/formatters';
import { Modal } from '../components/common/Modal';

export function AuthPage() {
  const { isAuthenticated, dataset, login, loginWithDemo, register, completeSetup, pushToast } =
    useServEase();

  // If authenticated and setup not completed yet, show Business Setup Step
  const isBusinessSetupMode = isAuthenticated && !dataset.provider.setupCompleted;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>('Electrician');
  const [serviceArea, setServiceArea] = useState('');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Business setup state
  const [setupBizName, setSetupBizName] = useState(dataset.provider.businessName || '');
  const [setupCategory, setSetupCategory] = useState<ServiceCategory>(
    dataset.provider.serviceCategory || 'Electrician'
  );
  const [setupArea, setSetupArea] = useState(dataset.provider.serviceArea || '');
  const [setupPhone, setSetupPhone] = useState(dataset.provider.businessPhone || '');
  const [setupEmail, setSetupEmail] = useState(dataset.provider.businessEmail || '');
  const [setupDesc, setSetupDesc] = useState(dataset.provider.businessDescription || '');
  const [setupTerms, setSetupTerms] = useState(dataset.provider.defaultQuotationTerms || '');
  const [loadSampleData, setLoadSampleData] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Keep setup fields synced right after registration
  React.useEffect(() => {
    if (isBusinessSetupMode) {
      setSetupBizName(dataset.provider.businessName);
      setSetupCategory(dataset.provider.serviceCategory);
      setSetupArea(dataset.provider.serviceArea);
      setSetupPhone(dataset.provider.businessPhone);
      setSetupEmail(dataset.provider.businessEmail);
      setSetupDesc(dataset.provider.businessDescription);
      setSetupTerms(dataset.provider.defaultQuotationTerms);
    }
  }, [isBusinessSetupMode, dataset.provider]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!identifier.trim()) {
      setLoginError('Enter your registered email or phone number.');
      return;
    }
    if (!password) {
      setLoginError('Enter your password.');
      return;
    }
    const res = login({ identifier, password, rememberMe });
    if (!res.ok && res.error) {
      setLoginError(res.error);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!businessName.trim()) nextErrors.businessName = 'Business name is required.';
    if (!email.trim() || !isValidEmail(email))
      nextErrors.email = 'Enter a valid email address.';
    if (!phone.trim() || !isValidPhone(phone))
      nextErrors.phone = 'Enter a valid 10-digit phone number.';
    if (regPassword.length < 6)
      nextErrors.regPassword = 'Password must be at least 6 characters.';
    if (regPassword !== confirmPassword)
      nextErrors.confirmPassword = 'Passwords do not match.';
    if (!serviceArea.trim()) nextErrors.serviceArea = 'Enter your primary service area.';

    if (Object.keys(nextErrors).length > 0) {
      setRegErrors(nextErrors);
      return;
    }

    setRegErrors({});
    register({
      fullName,
      businessName,
      email,
      phone,
      password: regPassword,
      serviceCategory,
      serviceArea,
    });
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupBizName.trim() || !setupArea.trim() || !setupPhone.trim()) {
      setSetupError('Business name, service area, and contact phone are required.');
      return;
    }
    setSetupError('');
    completeSetup({
      businessName: setupBizName,
      serviceCategory: setupCategory,
      serviceArea: setupArea,
      businessPhone: setupPhone,
      businessEmail: setupEmail,
      businessDescription: setupDesc,
      defaultQuotationTerms: setupTerms,
      loadSampleData,
    });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) return;
    setForgotSent(true);
    pushToast({
      variant: 'info',
      title: 'Reset instructions dispatched',
      description: `If an account exists for ${forgotIdentifier}, recovery instructions have been sent.`,
    });
  };

  if (isBusinessSetupMode) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl bg-white border border-[#E5E9F0] rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#EEF1F6]">
            <div className="w-10 h-10 rounded-lg bg-[#173B67] text-white flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#3478D4]">Step 2 of 2 · Onboarding</p>
              <h1 className="text-xl font-bold text-[#202938] font-display">
                Set Up Your Business Profile
              </h1>
            </div>
          </div>

          <form onSubmit={handleSetupSubmit} className="space-y-4">
            {setupError && (
              <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                {setupError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#202938] mb-1">
                  Business Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={setupBizName}
                  onChange={(e) => setSetupBizName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#202938] mb-1">
                  Primary Service Category
                </label>
                <select
                  value={setupCategory}
                  onChange={(e) => setSetupCategory(e.target.value as ServiceCategory)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                >
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#202938] mb-1">
                  Business Phone <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="tel"
                  value={setupPhone}
                  onChange={(e) => setSetupPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202938] mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Service Area / Localities Covered <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={setupArea}
                onChange={(e) => setSetupArea(e.target.value)}
                placeholder="e.g. Kothrud, Karve Nagar & Baner, Pune"
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Business Description
              </label>
              <textarea
                rows={2}
                value={setupDesc}
                onChange={(e) => setSetupDesc(e.target.value)}
                placeholder="Briefly describe your services and experience..."
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Default Quotation Terms
              </label>
              <textarea
                rows={2}
                value={setupTerms}
                onChange={(e) => setSetupTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 resize-none"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#F5F7FA] border border-[#E5E9F0] cursor-pointer">
              <input
                type="checkbox"
                checked={loadSampleData}
                onChange={(e) => setLoadSampleData(e.target.checked)}
                className="mt-0.5 rounded border-[#D1D5DB] text-[#173B67]"
              />
              <div>
                <p className="text-sm font-medium text-[#202938]">
                  Start with sample demo customers & bookings
                </p>
                <p className="text-xs text-[#6B7280]">
                  Leave unchecked to start with a clean empty workspace and add your own records.
                </p>
              </div>
            </label>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors"
              >
                Save & Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Brand & Editorial Showcase */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#173B67] text-white p-10 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight font-display">ServEase</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mt-10 font-display text-balance">
            Simplifying service business management.
          </h1>
          <p className="text-sm text-white/80 mt-4 leading-relaxed max-w-md">
            Replace scattered WhatsApp chats and paper notebooks with one clear workspace for
            customers, bookings, itemised quotations, and payment balances.
          </p>

          <div className="mt-8 rounded-xl overflow-hidden border border-white/15 bg-[#112C4E]">
            <img
              src={AUTH_WORKSHOP_IMAGE}
              alt="Organized technician toolkit and service layout notebook"
              referrerPolicy="no-referrer"
              className="w-full h-56 object-cover"
            />
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-white/80">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
            <span>Built for electricians, plumbers, AC technicians, and home service pros</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#14B8A6] shrink-0" />
            <span>Generate professional PDF quotations & track partial UPI/cash payments</span>
          </div>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-[#173B67] text-white flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold text-[#173B67] font-display block leading-none">
                ServEase
              </span>
              <span className="text-xs text-[#6B7280]">
                Simplifying Service Business Management
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#E5E9F0] rounded-xl p-6 sm:p-8 shadow-sm">
            {/* Segmented Login / Register Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5F7FA] rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError('');
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-[#173B67] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#202938]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegErrors({});
                }}
                className={`py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-[#173B67] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#202938]'
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-[#202938] font-display">Welcome back</h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Sign in to manage today&apos;s bookings and customer balances.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                    {loginError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#202938] mb-1">
                    Email or Phone Number
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="rajesh@sharmacare.in or +91 98230 45120"
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-[#202938]">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotSent(false);
                        setForgotIdentifier(identifier);
                        setForgotOpen(true);
                      }}
                      className="text-xs font-medium text-[#3478D4] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-3 pr-10 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#202938] p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#D1D5DB] text-[#173B67]"
                  />
                  Remember me on this device
                </label>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors"
                >
                  Login to ServEase
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#EEF1F6]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-[#6B7280]">Quick Preview</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loginWithDemo}
                  className="w-full py-2.5 px-4 text-sm font-medium text-[#173B67] bg-[#F5F7FA] hover:bg-[#EBF0F7] border border-[#D1D5DB] rounded-lg transition-colors"
                >
                  Sign in with Demo Provider Account
                </button>

                <p className="text-xs text-center text-[#6B7280] pt-1">
                  New to ServEase?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="font-medium text-[#3478D4] hover:underline"
                  >
                    Register your business
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <h2 className="text-xl font-bold text-[#202938] font-display">
                    Create your ServEase account
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Set up your independent service business in under 2 minutes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Full Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rajesh Sharma"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.fullName && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.fullName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Business Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Sharma Electrical Care"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.businessName && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.businessName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.in"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.email && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Phone Number <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98230 45120"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.phone && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Service Category <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    >
                      {SERVICE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Service Area <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                      placeholder="Kothrud, Pune"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.serviceArea && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.serviceArea}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.regPassword && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">{regErrors.regPassword}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#202938] mb-1">
                      Confirm Password <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
                    />
                    {regErrors.confirmPassword && (
                      <p className="text-[11px] text-[#DC2626] mt-0.5">
                        {regErrors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors"
                >
                  Create Account & Continue
                </button>

                <p className="text-xs text-center text-[#6B7280]">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="font-medium text-[#3478D4] hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Your Password"
        subtitle="Enter the email or phone linked to your ServEase account."
        maxWidthClass="max-w-md"
        footer={
          <button
            type="button"
            onClick={() => setForgotOpen(false)}
            className="px-4 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA]"
          >
            Close
          </button>
        }
      >
        {forgotSent ? (
          <div className="py-3 space-y-2">
            <p className="text-sm font-medium text-[#16A34A]">
              Recovery link dispatched
            </p>
            <p className="text-xs text-[#6B7280]">
              Check {forgotIdentifier} for password reset instructions. In this local preview, you
              can also sign in using the Demo Provider button.
            </p>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <input
              type="text"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              placeholder="Email or phone number"
              required
              className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
            />
            <button
              type="submit"
              className="w-full py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg"
            >
              Send Reset Instructions
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

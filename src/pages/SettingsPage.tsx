import React, { useEffect, useState } from 'react';
import { Briefcase, Lock, LogOut, RotateCcw, Trash2, Upload, User } from 'lucide-react';
import { SERVICE_CATEGORIES, ServiceCategory } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { isValidEmail, isValidPhone } from '../utils/formatters';
import { Avatar } from '../components/common/Avatar';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export function SettingsPage() {
  const {
    dataset,
    updateProviderProfile,
    resetDemoData,
    clearWorkspaceData,
    logout,
    pushToast,
  } = useServEase();

  const { provider } = dataset;
  const [tab, setTab] = useState<'personal' | 'business' | 'account'>('personal');

  // Personal Profile form
  const [fullName, setFullName] = useState(provider.fullName);
  const [email, setEmail] = useState(provider.email);
  const [phone, setPhone] = useState(provider.phone);
  const [avatarUrl, setAvatarUrl] = useState(provider.avatarUrl);

  // Business Info form
  const [businessName, setBusinessName] = useState(provider.businessName);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    provider.serviceCategory
  );
  const [businessPhone, setBusinessPhone] = useState(provider.businessPhone);
  const [businessEmail, setBusinessEmail] = useState(provider.businessEmail);
  const [serviceArea, setServiceArea] = useState(provider.serviceArea);
  const [businessDescription, setBusinessDescription] = useState(
    provider.businessDescription
  );
  const [defaultQuotationTerms, setDefaultQuotationTerms] = useState(
    provider.defaultQuotationTerms
  );

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Confirmations
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    setFullName(provider.fullName);
    setEmail(provider.email);
    setPhone(provider.phone);
    setAvatarUrl(provider.avatarUrl);
    setBusinessName(provider.businessName);
    setServiceCategory(provider.serviceCategory);
    setBusinessPhone(provider.businessPhone);
    setBusinessEmail(provider.businessEmail);
    setServiceArea(provider.serviceArea);
    setBusinessDescription(provider.businessDescription);
    setDefaultQuotationTerms(provider.defaultQuotationTerms);
  }, [provider]);

  const handlePersonalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      pushToast({ variant: 'error', title: 'Full name cannot be empty' });
      return;
    }
    if (!isValidEmail(email)) {
      pushToast({ variant: 'error', title: 'Enter a valid email address' });
      return;
    }
    if (!isValidPhone(phone)) {
      pushToast({ variant: 'error', title: 'Enter a valid phone number' });
      return;
    }
    updateProviderProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatarUrl,
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        updateProviderProfile({ avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBusinessSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !serviceArea.trim()) {
      pushToast({
        variant: 'error',
        title: 'Business name and service area are required',
      });
      return;
    }
    updateProviderProfile({
      businessName: businessName.trim(),
      serviceCategory,
      businessPhone: businessPhone.trim(),
      businessEmail: businessEmail.trim(),
      serviceArea: serviceArea.trim(),
      businessDescription: businessDescription.trim(),
      defaultQuotationTerms: defaultQuotationTerms.trim(),
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    pushToast({
      variant: 'success',
      title: 'Password updated',
      description: 'Your security preference has been applied for this session.',
    });
  };

  const toggleNotification = (key: keyof typeof provider.notifications) => {
    updateProviderProfile({
      notifications: {
        ...provider.notifications,
        [key]: !provider.notifications[key],
      },
    });
  };

  return (
    <div className="max-w-4xl space-y-5">
      {/* Segmented Settings Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9F0] rounded-lg w-fit overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setTab('personal')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'personal'
              ? 'bg-[#173B67] text-white'
              : 'text-[#6B7280] hover:text-[#202938]'
          }`}
        >
          <User className="w-4 h-4" />
          Personal Profile
        </button>
        <button
          type="button"
          onClick={() => setTab('business')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'business'
              ? 'bg-[#173B67] text-white'
              : 'text-[#6B7280] hover:text-[#202938]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Business Information
        </button>
        <button
          type="button"
          onClick={() => setTab('account')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            tab === 'account'
              ? 'bg-[#173B67] text-white'
              : 'text-[#6B7280] hover:text-[#202938]'
          }`}
        >
          <Lock className="w-4 h-4" />
          Account Settings
        </button>
      </div>

      {/* Personal Profile */}
      {tab === 'personal' && (
        <form
          onSubmit={handlePersonalSave}
          className="bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-base font-semibold text-[#202938]">Personal Profile</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Update your name, contact details, and profile photo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pb-5 border-b border-[#EEF1F6]">
            <Avatar src={avatarUrl} name={fullName} sizeClass="w-16 h-16" />
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-[#6B7280]">
                Recommended square portrait (JPG or PNG).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors"
            >
              Save Personal Profile
            </button>
          </div>
        </form>
      )}

      {/* Business Information */}
      {tab === 'business' && (
        <form
          onSubmit={handleBusinessSave}
          className="bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-5"
        >
          <div>
            <h2 className="text-base font-semibold text-[#202938]">Business Information</h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              These details appear on customer quotations and PDF documents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Service Category
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Business Phone
              </label>
              <input
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Business Email
              </label>
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Service Area
              </label>
              <input
                type="text"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Business Description
              </label>
              <textarea
                rows={3}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Default Quotation Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={defaultQuotationTerms}
                onChange={(e) => setDefaultQuotationTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors"
            >
              Save Business Information
            </button>
          </div>
        </form>
      )}

      {/* Account Settings */}
      {tab === 'account' && (
        <div className="space-y-5">
          {/* Change Password */}
          <form
            onSubmit={handlePasswordChange}
            className="bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="text-base font-semibold text-[#202938]">Change Password</h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Use a strong password of at least 6 characters.
              </p>
            </div>

            {passwordError && (
              <p className="text-xs text-[#DC2626] bg-[#FEF2F2] px-3 py-2 rounded-lg">
                {passwordError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#202938] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202938] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202938] mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#D1D5DB] rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg"
              >
                Update Password
              </button>
            </div>
          </form>

          {/* Notification Preferences */}
          <div className="bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#202938]">
                Notification Preferences
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Choose which reminders ServEase surfaces for your daily workflow.
              </p>
            </div>

            <div className="divide-y divide-[#EEF1F6]">
              {[
                {
                  key: 'bookingReminders' as const,
                  title: 'Appointment Reminders',
                  desc: "Highlight today's scheduled visits in the notification center.",
                },
                {
                  key: 'paymentAlerts' as const,
                  title: 'Outstanding Payment Alerts',
                  desc: 'Flag completed jobs that still have an unpaid balance.',
                },
                {
                  key: 'dailyScheduleSummary' as const,
                  title: 'Daily Schedule Summary',
                  desc: 'Show daily workload summary on the dashboard.',
                },
              ].map((pref) => (
                <label
                  key={pref.key}
                  className="py-3 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium text-[#202938]">{pref.title}</p>
                    <p className="text-xs text-[#6B7280]">{pref.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={provider.notifications[pref.key]}
                    onChange={() => toggleNotification(pref.key)}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#173B67]"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Account & Demo Data Management */}
          <div className="bg-white border border-[#E5E9F0] rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#202938]">
                Account & Data Management
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Manage local demonstration data or sign out of your account.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restore Demo Data
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#DC2626] bg-[#FEF2F2] hover:bg-[#FEE2E2] rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Records
              </button>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] hover:bg-[#F5F7FA] rounded-lg transition-colors ml-auto"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={resetDemoData}
        title="Restore Demo Sample Data"
        message="This will replace current local records with the default Pune service business sample dataset."
        confirmLabel="Restore Demo Data"
        variant="primary"
      />

      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={clearWorkspaceData}
        title="Clear All Business Records"
        message="This removes all customers, bookings, quotations, and payments from local demo storage while keeping your profile."
        confirmLabel="Clear Records"
      />
    </div>
  );
}

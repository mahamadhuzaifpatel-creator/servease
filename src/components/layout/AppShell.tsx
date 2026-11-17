import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Briefcase,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { AppRoute } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { servEaseApi } from '../../services/api';
import { formatCurrency, formatTimeDisplay, getTodayISO } from '../../utils/formatters';
import { Avatar } from '../common/Avatar';

interface NavItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'bookings', label: 'Jobs & Bookings', icon: CalendarCheck },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'history', label: 'Service History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  bookings: 'Jobs & Bookings',
  quotations: 'Quotations',
  payments: 'Payments',
  history: 'Service History',
  settings: 'Settings',
};

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { dataset, activeRoute, setActiveRoute, logout } = useServEase();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live actionable notifications from real state
  const notifications = useMemo(() => {
    const today = getTodayISO();
    const list: {
      id: string;
      title: string;
      detail: string;
      route: AppRoute;
    }[] = [];

    const todayJobs = dataset.jobs.filter(
      (j) =>
        j.appointmentDate === today &&
        j.status !== 'Completed' &&
        j.status !== 'Cancelled'
    );
    todayJobs.forEach((job) => {
      const cust = dataset.customers.find((c) => c.id === job.customerId);
      list.push({
        id: `today_${job.id}`,
        title: `Today at ${formatTimeDisplay(job.appointmentTime)}`,
        detail: `${cust?.name || 'Customer'} · ${job.serviceDescription}`,
        route: 'bookings',
      });
    });

    const unpaidCompleted = dataset.jobs.filter((j) => {
      if (j.status !== 'Completed') return false;
      const fin = servEaseApi.computeJobFinancials(j, dataset.quotations, dataset.payments);
      return fin.remainingBalance > 0;
    });
    unpaidCompleted.forEach((job) => {
      const cust = dataset.customers.find((c) => c.id === job.customerId);
      const fin = servEaseApi.computeJobFinancials(job, dataset.quotations, dataset.payments);
      list.push({
        id: `unpaid_${job.id}`,
        title: `Pending payment (${formatCurrency(fin.remainingBalance)})`,
        detail: `${cust?.name || 'Customer'} · ${job.serviceDescription}`,
        route: 'payments',
      });
    });

    const draftQuotes = dataset.quotations.filter((q) => q.status === 'Draft');
    draftQuotes.forEach((qt) => {
      const cust = dataset.customers.find((c) => c.id === qt.customerId);
      list.push({
        id: `draft_${qt.id}`,
        title: `Draft quotation ${qt.quotationNumber}`,
        detail: `${cust?.name || 'Customer'} · Ready to review & send`,
        route: 'quotations',
      });
    });

    return list;
  }, [dataset.customers, dataset.jobs, dataset.payments, dataset.quotations]);

  const unreadCount = notifications.filter((n) => !readAlertIds.includes(n.id)).length;

  // Global quick search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: {
      id: string;
      label: string;
      sublabel: string;
      category: string;
      route: AppRoute;
    }[] = [];

    dataset.customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((c) =>
        results.push({
          id: `c_${c.id}`,
          label: c.name,
          sublabel: `${c.phone} · ${c.area}`,
          category: 'Customer',
          route: 'customers',
        })
      );

    dataset.jobs
      .filter(
        (j) =>
          j.serviceDescription.toLowerCase().includes(q) ||
          j.serviceLocation.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((j) => {
        const cust = dataset.customers.find((c) => c.id === j.customerId);
        results.push({
          id: `j_${j.id}`,
          label: j.serviceDescription,
          sublabel: `${cust?.name || 'Customer'} · ${j.appointmentDate}`,
          category: 'Booking',
          route: 'bookings',
        });
      });

    dataset.quotations
      .filter(
        (qt) =>
          qt.quotationNumber.toLowerCase().includes(q) ||
          qt.serviceDescription.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((qt) =>
        results.push({
          id: `q_${qt.id}`,
          label: `${qt.quotationNumber} · ${qt.serviceDescription}`,
          sublabel: formatCurrency(qt.totalAmount),
          category: 'Quotation',
          route: 'quotations',
        })
      );

    return results;
  }, [dataset.customers, dataset.jobs, dataset.quotations, searchQuery]);

  const navigateTo = (route: AppRoute) => {
    setActiveRoute(route);
    setMobileOpen(false);
    setSearchFocused(false);
    setNotifOpen(false);
    setProfileOpen(false);
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const isCompact = !isMobile && collapsed;

    return (
      <div className="flex flex-col h-full bg-white border-r border-[#E5E9F0]">
        {/* Brand Header */}
        <div
          className={`h-16 px-4 border-b border-[#EEF1F6] flex items-center ${
            isCompact ? 'justify-center' : 'justify-between'
          } shrink-0`}
        >
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#173B67] text-white flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            {!isCompact && (
              <span className="text-lg font-bold tracking-tight text-[#173B67] font-display whitespace-nowrap">
                ServEase
              </span>
            )}
          </button>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#202938] hover:bg-[#F5F7FA]"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:inline-flex p-1.5 rounded-lg text-[#6B7280] hover:text-[#202938] hover:bg-[#F5F7FA] transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                title={isCompact ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCompact ? 'justify-center px-2' : 'gap-3 px-3'
                } py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#173B67] text-white'
                    : 'text-[#4B5563] hover:text-[#173B67] hover:bg-[#F5F7FA]'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!isCompact && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom Provider Profile Card */}
        <div className="p-3 border-t border-[#EEF1F6] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('settings')}
            className={`w-full flex items-center ${
              isCompact ? 'justify-center' : 'gap-2.5'
            } p-2 rounded-lg hover:bg-[#F5F7FA] text-left transition-colors`}
            title="Profile Settings"
          >
            <Avatar
              src={dataset.provider.avatarUrl}
              name={dataset.provider.fullName}
              sizeClass="w-9 h-9"
            />
            {!isCompact && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#202938] truncate">
                  {dataset.provider.fullName}
                </p>
                <p className="text-xs text-[#6B7280] truncate">
                  {dataset.provider.businessName}
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            title={isCompact ? 'Logout' : undefined}
            className={`w-full flex items-center ${
              isCompact ? 'justify-center px-2' : 'gap-2.5 px-3'
            } py-2 rounded-lg text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] transition-colors whitespace-nowrap`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCompact && <span>Logout</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#173B67]/35"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] h-full z-10">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E9F0] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#4B5563] hover:bg-[#F5F7FA]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-[#202938] truncate font-display">
              {ROUTE_TITLES[activeRoute]}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Global Quick Search */}
            <div ref={searchRef} className="relative hidden md:block w-64 lg:w-80">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search customers, jobs, quotations..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4] transition-colors"
              />
              {searchFocused && searchQuery.trim() && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-[#E5E9F0] rounded-xl shadow-lg overflow-hidden z-40">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-[#6B7280]">
                      No matches for &ldquo;{searchQuery}&rdquo;
                    </p>
                  ) : (
                    <div className="divide-y divide-[#EEF1F6]">
                      {searchResults.map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            navigateTo(res.route);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#F5F7FA] flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#202938] truncate">
                              {res.label}
                            </p>
                            <p className="text-xs text-[#6B7280] truncate">{res.sublabel}</p>
                          </div>
                          <span className="text-[11px] font-medium text-[#3478D4] shrink-0">
                            {res.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
                className="relative p-2 rounded-lg text-[#4B5563] hover:text-[#173B67] hover:bg-[#F5F7FA] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-[#E5E9F0] rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#EEF1F6] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#202938]">
                      Reminders & Alerts
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setReadAlertIds(notifications.map((n) => n.id))}
                        className="text-xs font-medium text-[#3478D4] hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#EEF1F6]">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-center text-[#6B7280]">
                        You are all caught up.
                      </p>
                    ) : (
                      notifications.map((n) => {
                        const isRead = readAlertIds.includes(n.id);
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setReadAlertIds((prev) => [...prev, n.id]);
                              navigateTo(n.route);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-[#F5F7FA] transition-colors ${
                              isRead ? 'opacity-65' : ''
                            }`}
                          >
                            <p className="text-xs font-semibold text-[#202938]">{n.title}</p>
                            <p className="text-xs text-[#6B7280] mt-0.5 truncate">{n.detail}</p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                aria-label="Account menu"
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#F5F7FA] transition-colors"
              >
                <Avatar
                  src={dataset.provider.avatarUrl}
                  name={dataset.provider.fullName}
                  sizeClass="w-8 h-8"
                />
                <span className="hidden sm:inline text-sm font-medium text-[#202938] max-w-[140px] truncate">
                  {dataset.provider.fullName}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-[#E5E9F0] rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#EEF1F6]">
                    <p className="text-sm font-semibold text-[#202938] truncate">
                      {dataset.provider.fullName}
                    </p>
                    <p className="text-xs text-[#6B7280] truncate">
                      {dataset.provider.businessName}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => navigateTo('settings')}
                      className="w-full px-3 py-2 text-left text-sm text-[#202938] hover:bg-[#F5F7FA] rounded-lg flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4 text-[#6B7280]" />
                      Profile & Business Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  IndianRupee,
  Plus,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { JOB_STATUSES, JobStatus } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { servEaseApi } from '../services/api';
import {
  formatCurrency,
  formatRelativeTime,
  formatTimeDisplay,
  getTodayISO,
} from '../utils/formatters';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { BookingFormModal } from '../components/bookings/BookingFormModal';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { JobStatusIndicator } from '../components/common/StatusText';

export function DashboardPage() {
  const { dataset, setActiveRoute, updateJobStatus } = useServEase();

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const today = getTodayISO();

  const stats = useMemo(() => {
    const totalCustomers = dataset.customers.length;
    const todayBookings = dataset.jobs.filter(
      (j) => j.appointmentDate === today && j.status !== 'Cancelled'
    );
    const pendingJobs = dataset.jobs.filter(
      (j) => j.status === 'New' || j.status === 'Confirmed' || j.status === 'In Progress'
    );
    const completedJobs = dataset.jobs.filter((j) => j.status === 'Completed');

    let totalOutstanding = 0;
    let totalCollected = 0;

    dataset.jobs
      .filter((j) => j.status !== 'Cancelled')
      .forEach((job) => {
        const fin = servEaseApi.computeJobFinancials(
          job,
          dataset.quotations,
          dataset.payments
        );
        totalOutstanding += fin.remainingBalance;
        totalCollected += fin.amountPaid;
      });

    // Period comparison: compare current month vs previous month only when previous month has actual records
    const [curY, curM] = today.split('-').map(Number);
    const currentMonthKey = `${curY}-${String(curM).padStart(2, '0')}`;
    const prevDate = new Date(curY, curM - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(
      2,
      '0'
    )}`;

    const curMonthCompleted = completedJobs.filter((j) =>
      j.appointmentDate.startsWith(currentMonthKey)
    ).length;
    const prevMonthCompleted = completedJobs.filter((j) =>
      j.appointmentDate.startsWith(prevMonthKey)
    ).length;

    const completedDeltaText =
      prevMonthCompleted > 0
        ? `${curMonthCompleted >= prevMonthCompleted ? '+' : ''}${
            curMonthCompleted - prevMonthCompleted
          } vs last month`
        : undefined;

    const totalNonCancelled = dataset.jobs.filter((j) => j.status !== 'Cancelled').length;
    const completionRate =
      totalNonCancelled > 0
        ? Math.round((completedJobs.length / totalNonCancelled) * 100)
        : 0;

    return {
      totalCustomers,
      todayBookingsCount: todayBookings.length,
      todaySchedule: [...todayBookings].sort((a, b) =>
        a.appointmentTime.localeCompare(b.appointmentTime)
      ),
      pendingJobsCount: pendingJobs.length,
      completedJobsCount: completedJobs.length,
      totalOutstanding,
      totalCollected,
      completedDeltaText,
      completionRate,
    };
  }, [dataset.customers.length, dataset.jobs, dataset.payments, dataset.quotations, today]);

  // Monthly Revenue & Jobs chart over last 5 months + current month (calculated strictly from application data)
  const monthlyChartData = useMemo(() => {
    const [yr, mo] = today.split('-').map(Number);
    const months: { key: string; label: string; collected: number; pending: number; completed: number }[] = [];

    for (let i = 4; i >= 0; i--) {
      const dt = new Date(yr, mo - 1 - i, 1);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const key = `${y}-${m}`;
      const label = dt.toLocaleDateString('en-IN', { month: 'short' });

      const monthPayments = dataset.payments
        .filter((p) => p.paymentDate.startsWith(key))
        .reduce((sum, p) => sum + p.amount, 0);

      const monthJobs = dataset.jobs.filter(
        (j) => j.appointmentDate.startsWith(key) && j.status !== 'Cancelled'
      );

      const monthPending = monthJobs.reduce((sum, j) => {
        const fin = servEaseApi.computeJobFinancials(j, dataset.quotations, dataset.payments);
        return sum + fin.remainingBalance;
      }, 0);

      const monthCompleted = monthJobs.filter((j) => j.status === 'Completed').length;

      months.push({
        key,
        label,
        collected: monthPayments,
        pending: monthPending,
        completed: monthCompleted,
      });
    }

    return months;
  }, [dataset.jobs, dataset.payments, dataset.quotations, today]);

  const summaryCards = [
    {
      label: 'Total Customers',
      value: String(stats.totalCustomers),
      icon: Users,
      accent: 'text-[#173B67] bg-[#EFF6FF]',
      onClick: () => setActiveRoute('customers'),
    },
    {
      label: "Today's Bookings",
      value: String(stats.todayBookingsCount),
      icon: CalendarCheck,
      accent: 'text-[#3478D4] bg-[#EFF6FF]',
      onClick: () => setActiveRoute('bookings'),
    },
    {
      label: 'Pending Jobs',
      value: String(stats.pendingJobsCount),
      icon: Clock,
      accent: 'text-[#D97706] bg-[#FEF3C7]',
      onClick: () => setActiveRoute('bookings'),
    },
    {
      label: 'Completed Jobs',
      value: String(stats.completedJobsCount),
      subtext: stats.completedDeltaText,
      icon: CheckCircle2,
      accent: 'text-[#16A34A] bg-[#DCFCE7]',
      onClick: () => setActiveRoute('history'),
    },
    {
      label: 'Outstanding Payments',
      value: formatCurrency(stats.totalOutstanding),
      icon: IndianRupee,
      accent: 'text-[#DC2626] bg-[#FEE2E2]',
      onClick: () => setActiveRoute('payments'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#202938] font-display">
            Good day, {dataset.provider.fullName.split(' ')[0]}
          </h2>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {dataset.provider.businessName} · {dataset.provider.serviceArea}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] hover:bg-[#F5F7FA] rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-[#173B67]" />
            Add Customer
          </button>
          <button
            type="button"
            onClick={() => setBookingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Booking
          </button>
          <button
            type="button"
            onClick={() => setQuotationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            Generate Quotation
          </button>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#0F766E] bg-[#F0FDFA] border border-[#99F6E4] hover:bg-[#CCFBF1] rounded-lg transition-colors whitespace-nowrap"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="bg-white border border-[#E5E9F0] rounded-xl p-4 text-left hover:border-[#3478D4]/50 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#6B7280]">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.accent}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-[#202938] tabular-nums font-display">
                  {card.value}
                </p>
                {card.subtext && (
                  <p className="text-[11px] text-[#6B7280] mt-0.5 tabular-nums">{card.subtext}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Split: Today's Schedule + Business Overview Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Schedule */}
        <section className="lg:col-span-5 bg-white border border-[#E5E9F0] rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-[#EEF1F6] flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#202938]">Today&apos;s Schedule</h3>
              <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                {stats.todaySchedule.length} appointment(s) scheduled today
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRoute('bookings')}
              className="text-xs font-medium text-[#3478D4] hover:underline whitespace-nowrap"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-[#EEF1F6] flex-1">
            {stats.todaySchedule.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-[#202938]">No appointments today</p>
                <p className="text-xs text-[#6B7280] mt-1">
                  Create a booking to schedule a visit for today.
                </p>
                <button
                  type="button"
                  onClick={() => setBookingModalOpen(true)}
                  className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-[#173B67] rounded-lg hover:bg-[#112C4E]"
                >
                  Create Booking
                </button>
              </div>
            ) : (
              stats.todaySchedule.map((job) => {
                const customer = dataset.customers.find((c) => c.id === job.customerId);
                return (
                  <div key={job.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#202938] truncate">
                          {customer?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-[#4B5563] mt-0.5 line-clamp-1">
                          {job.serviceDescription}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-medium text-[#173B67] tabular-nums shrink-0">
                        {formatTimeDisplay(job.appointmentTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-[#6B7280] truncate">
                        {customer?.area || job.serviceLocation}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <JobStatusIndicator status={job.status} />
                        <select
                          aria-label={`Change status for ${job.serviceDescription}`}
                          value={job.status}
                          onChange={(e) =>
                            updateJobStatus(job.id, e.target.value as JobStatus)
                          }
                          className="text-xs bg-[#F5F7FA] border border-[#E5E9F0] rounded-md px-2 py-1 text-[#202938] focus:outline-none focus:border-[#3478D4]"
                        >
                          {JOB_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Business Overview Recharts */}
        <section className="lg:col-span-7 bg-white border border-[#E5E9F0] rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-[#EEF1F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#202938]">Business Overview</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Monthly payments collected vs pending balances
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-[#202938]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#173B67]" />
                Collected
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#202938]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#14B8A6]" />
                Pending
              </span>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #E5E9F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="collected"
                    name="Collected"
                    fill="#173B67"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    dataKey="pending"
                    name="Pending"
                    fill="#14B8A6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Calculated Overview Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#EEF1F6]">
              <div>
                <p className="text-xs text-[#6B7280]">Total Collected</p>
                <p className="text-base font-bold text-[#16A34A] tabular-nums mt-0.5">
                  {formatCurrency(stats.totalCollected)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Pending Payments</p>
                <p className="text-base font-bold text-[#DC2626] tabular-nums mt-0.5">
                  {formatCurrency(stats.totalOutstanding)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Job Completion</p>
                <p className="text-base font-bold text-[#202938] tabular-nums mt-0.5">
                  {stats.completionRate}%
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Activities */}
      <section className="bg-white border border-[#E5E9F0] rounded-xl">
        <div className="px-5 py-4 border-b border-[#EEF1F6] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#202938]">Recent Activities</h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Latest updates across customers, bookings, quotations, and payments
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#EEF1F6]">
          {dataset.activities.length === 0 ? (
            <p className="px-5 py-8 text-sm text-center text-[#6B7280]">
              Activities will appear here as you add customers, create bookings, and record
              payments.
            </p>
          ) : (
            dataset.activities.slice(0, 6).map((act) => (
              <div
                key={act.id}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-[#FAFBFD] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#202938]">{act.title}</p>
                  <p className="text-xs text-[#6B7280] truncate">{act.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#6B7280] tabular-nums">
                    {formatRelativeTime(act.timestamp)}
                  </span>
                  {act.relatedRoute && (
                    <button
                      type="button"
                      onClick={() => setActiveRoute(act.relatedRoute!)}
                      className="text-xs font-medium text-[#3478D4] hover:underline whitespace-nowrap"
                    >
                      Open
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Action Modals */}
      <CustomerFormModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
      />
      <BookingFormModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
      />
      <QuotationFormModal
        open={quotationModalOpen}
        onClose={() => setQuotationModalOpen(false)}
      />
      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
      />
    </div>
  );
}

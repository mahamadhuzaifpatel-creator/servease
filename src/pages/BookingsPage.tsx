import { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  List,
  Pencil,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import { JOB_STATUSES, JobBooking, JobStatus } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import {
  formatCurrency,
  formatDateDisplay,
  formatTimeDisplay,
  getTodayISO,
} from '../utils/formatters';
import { BookingFormModal } from '../components/bookings/BookingFormModal';
import { JobDetailModal } from '../components/bookings/JobDetailModal';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { JobStatusIndicator } from '../components/common/StatusText';

export function BookingsPage() {
  const { dataset, updateJobStatus } = useServEase();

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'All'>('All');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'upcoming' | 'past' | 'custom'>('all');
  const [customDate, setCustomDate] = useState(getTodayISO());

  // Calendar month state
  const today = getTodayISO();
  const [calYear, setCalYear] = useState(() => Number(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => Number(today.slice(5, 7)) - 1);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobBooking | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string | undefined>();
  const [viewingJob, setViewingJob] = useState<JobBooking | null>(null);
  const [cancellingJob, setCancellingJob] = useState<JobBooking | null>(null);

  const [quoteContext, setQuoteContext] = useState<{ customerId: string; jobId: string } | null>(null);
  const [paymentContext, setPaymentContext] = useState<{ customerId: string; jobId: string } | null>(null);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...dataset.jobs]
      .filter((job) => {
        const customer = dataset.customers.find((c) => c.id === job.customerId);
        const matchesSearch =
          !q ||
          job.serviceDescription.toLowerCase().includes(q) ||
          job.serviceLocation.toLowerCase().includes(q) ||
          (customer?.name.toLowerCase().includes(q) ?? false);

        const matchesStatus = statusFilter === 'All' || job.status === statusFilter;

        let matchesDate = true;
        if (datePreset === 'today') matchesDate = job.appointmentDate === today;
        else if (datePreset === 'upcoming') matchesDate = job.appointmentDate >= today;
        else if (datePreset === 'past') matchesDate = job.appointmentDate < today;
        else if (datePreset === 'custom') matchesDate = job.appointmentDate === customDate;

        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => {
        const dateCmp = b.appointmentDate.localeCompare(a.appointmentDate);
        if (dateCmp !== 0) return dateCmp;
        return a.appointmentTime.localeCompare(b.appointmentTime);
      });
  }, [dataset.customers, dataset.jobs, search, statusFilter, datePreset, customDate, today]);

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

    const cells: { iso: string | null; dayNum: number | null; jobs: JobBooking[] }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ iso: null, dayNum: null, jobs: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(
        2,
        '0'
      )}`;
      const dayJobs = dataset.jobs
        .filter((j) => j.appointmentDate === iso)
        .filter((j) => statusFilter === 'All' || j.status === statusFilter)
        .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
      cells.push({ iso, dayNum: d, jobs: dayJobs });
    }
    return cells;
  }, [calYear, calMonth, dataset.jobs, statusFilter]);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9F0] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'calendar'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendar View
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingJob(null);
            setPreselectedDate(undefined);
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Create Booking
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E9F0] rounded-xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, service description, or location..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4]"
            />
          </div>

          {viewMode === 'table' && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <select
                aria-label="Filter by date"
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as typeof datePreset)}
                className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="custom">Specific Date</option>
              </select>

              {datePreset === 'custom' && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
                />
              )}
            </div>
          )}
        </div>

        {/* Status Segmented Filter */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F7FA] rounded-lg overflow-x-auto">
          {(['All', ...JOB_STATUSES] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-white text-[#173B67] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#202938]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Content View */}
      {viewMode === 'calendar' ? (
        <div className="bg-white border border-[#E5E9F0] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEF1F6] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#202938]">{monthLabel}</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCalYear(Number(today.slice(0, 4)));
                  setCalMonth(Number(today.slice(5, 7)) - 1);
                }}
                className="px-2.5 py-1 text-xs font-medium text-[#173B67] bg-[#EFF6FF] rounded-md"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="p-1.5 rounded-lg border border-[#E5E9F0] hover:bg-[#F5F7FA]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="p-1.5 rounded-lg border border-[#E5E9F0] hover:bg-[#F5F7FA]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-[#EEF1F6] bg-[#FAFBFD] text-center text-xs font-semibold text-[#6B7280]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-2.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-[#EEF1F6]">
            {calendarDays.map((cell, idx) => {
              const isToday = cell.iso === today;
              return (
                <div
                  key={idx}
                  className={`min-h-[96px] p-1.5 sm:p-2 ${
                    cell.iso ? 'bg-white' : 'bg-[#FAFBFD]'
                  }`}
                >
                  {cell.dayNum && cell.iso && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium tabular-nums px-1.5 py-0.5 rounded ${
                            isToday
                              ? 'bg-[#173B67] text-white'
                              : 'text-[#4B5563]'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJob(null);
                            setPreselectedDate(cell.iso!);
                            setFormOpen(true);
                          }}
                          title={`Add booking on ${cell.iso}`}
                          className="text-[#9CA3AF] hover:text-[#173B67] p-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {cell.jobs.slice(0, 3).map((job) => {
                          const cust = dataset.customers.find((c) => c.id === job.customerId);
                          return (
                            <button
                              key={job.id}
                              type="button"
                              onClick={() => setViewingJob(job)}
                              className={`w-full text-left px-1.5 py-1 rounded text-[11px] truncate block transition-colors ${
                                job.status === 'Completed'
                                  ? 'bg-[#DCFCE7] text-[#166534]'
                                  : job.status === 'Cancelled'
                                  ? 'bg-[#FEE2E2] text-[#991B1B] line-through'
                                  : 'bg-[#EFF6FF] text-[#173B67] hover:bg-[#DBEAFE]'
                              }`}
                            >
                              {formatTimeDisplay(job.appointmentTime)} · {cust?.name || job.serviceDescription}
                            </button>
                          );
                        })}
                        {cell.jobs.length > 3 && (
                          <p className="text-[10px] text-[#6B7280] px-1">
                            +{cell.jobs.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : dataset.jobs.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-5 h-5" />}
          title="No bookings scheduled"
          description="Create your first service booking to organize your daily schedule and track job status."
          actionLabel="Create First Booking"
          onAction={() => {
            setEditingJob(null);
            setFormOpen(true);
          }}
        />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title="No jobs match your filters"
          description="Try selecting All statuses or resetting the date filter."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('All');
            setDatePreset('all');
          }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-[#E5E9F0] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E9F0] bg-[#FAFBFD] text-xs font-semibold text-[#6B7280]">
                    <th className="py-3 px-4">Service & Location</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4 text-right">Est. Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6]">
                  {filteredJobs.map((job) => {
                    const customer = dataset.customers.find((c) => c.id === job.customerId);
                    return (
                      <tr key={job.id} className="hover:bg-[#FAFBFD] transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <button
                            type="button"
                            onClick={() => setViewingJob(job)}
                            className="font-semibold text-[#202938] hover:text-[#173B67] text-left block truncate max-w-full"
                          >
                            {job.serviceDescription}
                          </button>
                          <p className="text-xs text-[#6B7280] truncate">{job.serviceLocation}</p>
                        </td>
                        <td className="py-3 px-4 text-[#202938] whitespace-nowrap">
                          {customer?.name || 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-[#4B5563] tabular-nums whitespace-nowrap">
                          {formatDateDisplay(job.appointmentDate)} ·{' '}
                          {formatTimeDisplay(job.appointmentTime)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#202938] tabular-nums whitespace-nowrap">
                          {formatCurrency(job.estimatedCost)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <JobStatusIndicator status={job.status} />
                            <select
                              aria-label={`Status for ${job.serviceDescription}`}
                              value={job.status}
                              onChange={(e) =>
                                updateJobStatus(job.id, e.target.value as JobStatus)
                              }
                              className="text-xs bg-[#F5F7FA] border border-[#E5E9F0] rounded-md px-2 py-1 text-[#202938]"
                            >
                              {JOB_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingJob(job)}
                              title="View job details"
                              className="p-1.5 text-[#4B5563] hover:text-[#173B67] hover:bg-[#F5F7FA] rounded-md"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingJob(job);
                                setFormOpen(true);
                              }}
                              title="Edit booking"
                              className="p-1.5 text-[#4B5563] hover:text-[#3478D4] hover:bg-[#F5F7FA] rounded-md"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {job.status !== 'Cancelled' && job.status !== 'Completed' && (
                              <button
                                type="button"
                                onClick={() => setCancellingJob(job)}
                                title="Cancel booking"
                                className="p-1.5 text-[#4B5563] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredJobs.map((job) => {
              const customer = dataset.customers.find((c) => c.id === job.customerId);
              return (
                <div
                  key={job.id}
                  className="bg-white border border-[#E5E9F0] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setViewingJob(job)}
                        className="text-sm font-semibold text-[#173B67] text-left"
                      >
                        {job.serviceDescription}
                      </button>
                      <p className="text-xs text-[#4B5563] mt-0.5">
                        {customer?.name || 'Customer'} · {job.serviceLocation}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[#202938] tabular-nums shrink-0">
                      {formatCurrency(job.estimatedCost)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EEF1F6]">
                    <span className="text-xs text-[#6B7280] tabular-nums">
                      {formatDateDisplay(job.appointmentDate)} ·{' '}
                      {formatTimeDisplay(job.appointmentTime)}
                    </span>
                    <div className="flex items-center gap-2">
                      <JobStatusIndicator status={job.status} />
                      <select
                        aria-label={`Status for ${job.serviceDescription}`}
                        value={job.status}
                        onChange={(e) =>
                          updateJobStatus(job.id, e.target.value as JobStatus)
                        }
                        className="text-xs bg-[#F5F7FA] border border-[#E5E9F0] rounded-md px-2 py-1"
                      >
                        {JOB_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setViewingJob(job)}
                        className="px-2.5 py-1 text-xs font-medium text-[#173B67] bg-[#EFF6FF] rounded-md"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modals */}
      <BookingFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingJob={editingJob}
        preselectedDate={preselectedDate}
      />

      <JobDetailModal
        job={viewingJob}
        onClose={() => setViewingJob(null)}
        onEdit={(job) => {
          setEditingJob(job);
          setFormOpen(true);
        }}
        onCreateQuotation={(customerId, jobId) => setQuoteContext({ customerId, jobId })}
        onRecordPayment={(customerId, jobId) => setPaymentContext({ customerId, jobId })}
      />

      <QuotationFormModal
        open={!!quoteContext}
        onClose={() => setQuoteContext(null)}
        preselectedCustomerId={quoteContext?.customerId}
        preselectedJobId={quoteContext?.jobId}
      />

      <RecordPaymentModal
        open={!!paymentContext}
        onClose={() => setPaymentContext(null)}
        preselectedCustomerId={paymentContext?.customerId}
        preselectedJobId={paymentContext?.jobId}
      />

      <ConfirmDialog
        open={!!cancellingJob}
        onClose={() => setCancellingJob(null)}
        onConfirm={() => {
          if (cancellingJob) updateJobStatus(cancellingJob.id, 'Cancelled');
        }}
        title="Cancel Service Booking"
        message={`Cancel the booking "${cancellingJob?.serviceDescription}"? You can still view it in records or change status later.`}
        confirmLabel="Cancel Booking"
      />
    </div>
  );
}

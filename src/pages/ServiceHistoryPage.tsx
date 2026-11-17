import { useMemo, useState } from 'react';
import { Calendar, Eye, FileText, History, Search } from 'lucide-react';
import { JobBooking, SERVICE_CATEGORIES } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { servEaseApi } from '../services/api';
import {
  addDaysISO,
  formatCurrency,
  formatDateDisplay,
  formatTimeDisplay,
  getTodayISO,
} from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { PaymentStatusIndicator, QuotationStatusIndicator } from '../components/common/StatusText';

export function ServiceHistoryPage() {
  const { dataset } = useServEase();

  const [viewMode, setViewMode] = useState<'list' | 'customer'>('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'custom'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [selectedJob, setSelectedJob] = useState<JobBooking | null>(null);

  const today = getTodayISO();

  const completedServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dataset.jobs
      .filter((job) => job.status === 'Completed')
      .filter((job) => {
        const customer = dataset.customers.find((c) => c.id === job.customerId);
        const matchesSearch =
          !q ||
          (customer?.name.toLowerCase().includes(q) ?? false) ||
          (customer?.phone.toLowerCase().includes(q) ?? false) ||
          job.serviceDescription.toLowerCase().includes(q);

        const matchesCategory =
          categoryFilter === 'All' || job.serviceCategory === categoryFilter;

        let matchesDate = true;
        if (dateRange === '30d') {
          matchesDate = job.appointmentDate >= addDaysISO(today, -30);
        } else if (dateRange === '90d') {
          matchesDate = job.appointmentDate >= addDaysISO(today, -90);
        } else if (dateRange === 'custom') {
          if (fromDate && job.appointmentDate < fromDate) matchesDate = false;
          if (toDate && job.appointmentDate > toDate) matchesDate = false;
        }

        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));
  }, [
    dataset.customers,
    dataset.jobs,
    search,
    categoryFilter,
    dateRange,
    fromDate,
    toDate,
    today,
  ]);

  // Group completed services chronologically per customer
  const groupedByCustomer = useMemo(() => {
    const map = new Map<string, JobBooking[]>();
    completedServices.forEach((job) => {
      const existing = map.get(job.customerId) || [];
      existing.push(job);
      map.set(job.customerId, existing);
    });
    return Array.from(map.entries()).map(([customerId, jobs]) => ({
      customer: dataset.customers.find((c) => c.id === customerId),
      jobs: jobs.sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate)),
    }));
  }, [completedServices, dataset.customers]);

  const selectedContext = useMemo(() => {
    if (!selectedJob) return null;
    const customer = dataset.customers.find((c) => c.id === selectedJob.customerId);
    const linkedQuotations = dataset.quotations.filter(
      (q) => q.jobId === selectedJob.id || q.customerId === selectedJob.customerId
    );
    const fin = servEaseApi.computeJobFinancials(
      selectedJob,
      dataset.quotations,
      dataset.payments
    );
    return { job: selectedJob, customer, linkedQuotations, fin };
  }, [selectedJob, dataset.customers, dataset.quotations, dataset.payments]);

  return (
    <div className="space-y-5">
      {/* Top Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9F0] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            All Completed Services ({completedServices.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('customer')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              viewMode === 'customer'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            Customer Timelines ({groupedByCustomer.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E9F0] rounded-xl p-3.5 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or completed work..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by service category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
          >
            <option value="All">All Categories</option>
            {SERVICE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
          >
            <option value="all">All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
                className="px-2.5 py-2 text-xs bg-white border border-[#D1D5DB] rounded-lg"
              />
              <span className="text-xs text-[#6B7280]">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
                className="px-2.5 py-2 text-xs bg-white border border-[#D1D5DB] rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {completedServices.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No completed service history found"
          description="Completed jobs automatically move into chronological service history along with their linked quotations and payment records."
        />
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-[#E5E9F0] rounded-xl divide-y divide-[#EEF1F6]">
          {completedServices.map((job) => {
            const customer = dataset.customers.find((c) => c.id === job.customerId);
            const fin = servEaseApi.computeJobFinancials(
              job,
              dataset.quotations,
              dataset.payments
            );
            return (
              <div
                key={job.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFBFD] transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] tabular-nums">
                    <span className="inline-flex items-center gap-1 font-medium text-[#173B67]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateDisplay(job.appointmentDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{job.serviceCategory}</span>
                    {fin.linkedQuotation && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{fin.linkedQuotation.quotationNumber}</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#202938]">
                    {job.serviceDescription}
                  </p>
                  <p className="text-xs text-[#4B5563]">
                    {customer?.name || 'Customer'} · {job.serviceLocation}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="sm:text-right">
                    <p className="text-sm font-bold text-[#202938] tabular-nums">
                      {formatCurrency(fin.totalAmount)}
                    </p>
                    <PaymentStatusIndicator status={fin.paymentStatus} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Full Record
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByCustomer.map(({ customer, jobs }) => (
            <div
              key={customer?.id || jobs[0].customerId}
              className="bg-white border border-[#E5E9F0] rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3.5 bg-[#FAFBFD] border-b border-[#EEF1F6] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#173B67]">
                    {customer?.name || 'Customer'}
                  </h3>
                  <p className="text-xs text-[#6B7280] tabular-nums">
                    {customer?.phone} · {customer?.area}
                  </p>
                </div>
                <span className="text-xs font-medium text-[#4B5563] tabular-nums">
                  {jobs.length} completed visit(s)
                </span>
              </div>

              <div className="divide-y divide-[#EEF1F6]">
                {jobs.map((job) => {
                  const fin = servEaseApi.computeJobFinancials(
                    job,
                    dataset.quotations,
                    dataset.payments
                  );
                  return (
                    <div
                      key={job.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-[#6B7280] tabular-nums">
                          {formatDateDisplay(job.appointmentDate)} · {job.serviceCategory}
                        </p>
                        <p className="text-sm font-medium text-[#202938] mt-0.5">
                          {job.serviceDescription}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-semibold text-[#202938] tabular-nums">
                          {formatCurrency(fin.totalAmount)}
                        </span>
                        <PaymentStatusIndicator status={fin.paymentStatus} />
                        <button
                          type="button"
                          onClick={() => setSelectedJob(job)}
                          className="text-xs font-medium text-[#3478D4] hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Service Record Modal */}
      <Modal
        open={!!selectedContext}
        onClose={() => setSelectedJob(null)}
        title={selectedContext?.job.serviceDescription || 'Service Record'}
        subtitle={
          selectedContext
            ? `${selectedContext.customer?.name || 'Customer'} · ${formatDateDisplay(
                selectedContext.job.appointmentDate
              )} at ${formatTimeDisplay(selectedContext.job.appointmentTime)}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
        footer={
          <button
            type="button"
            onClick={() => setSelectedJob(null)}
            className="px-4 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA]"
          >
            Close
          </button>
        }
      >
        {selectedContext && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pb-4 border-b border-[#EEF1F6]">
              <div>
                <p className="text-xs text-[#6B7280]">Customer</p>
                <p className="font-semibold text-[#202938] mt-0.5">
                  {selectedContext.customer?.name}
                </p>
                <p className="text-xs text-[#4B5563] tabular-nums">
                  {selectedContext.customer?.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Service Site</p>
                <p className="text-[#202938] mt-0.5">{selectedContext.job.serviceLocation}</p>
              </div>
            </div>

            {selectedContext.job.notes && (
              <div className="bg-[#F5F7FA] rounded-lg px-3.5 py-2.5 text-xs text-[#4B5563]">
                <span className="font-semibold text-[#202938]">Work Notes: </span>
                {selectedContext.job.notes}
              </div>
            )}

            {/* Linked Quotations */}
            <div>
              <h4 className="text-xs font-semibold text-[#6B7280] mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Quotations
              </h4>
              {selectedContext.linkedQuotations.length === 0 ? (
                <p className="text-xs text-[#6B7280]">No quotations linked to this job.</p>
              ) : (
                <div className="border border-[#E5E9F0] rounded-lg divide-y divide-[#EEF1F6]">
                  {selectedContext.linkedQuotations.map((qt) => (
                    <div key={qt.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-mono font-semibold text-[#173B67] mr-2">
                          {qt.quotationNumber}
                        </span>
                        <span className="text-[#202938]">{qt.serviceDescription}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(qt.totalAmount)}
                        </span>
                        <QuotationStatusIndicator status={qt.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Payments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-[#6B7280]">Payment Records</h4>
                <PaymentStatusIndicator status={selectedContext.fin.paymentStatus} />
              </div>
              {selectedContext.fin.jobPayments.length === 0 ? (
                <p className="text-xs text-[#6B7280]">No payments recorded against this service yet.</p>
              ) : (
                <div className="border border-[#E5E9F0] rounded-lg divide-y divide-[#EEF1F6]">
                  {selectedContext.fin.jobPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-medium text-[#202938]">{pay.method}</span>
                        <span className="text-[#6B7280] ml-2 tabular-nums">
                          {formatDateDisplay(pay.paymentDate)}
                        </span>
                        {pay.notes && <span className="text-[#6B7280] ml-2">· {pay.notes}</span>}
                      </div>
                      <span className="font-semibold text-[#16A34A] tabular-nums">
                        {formatCurrency(pay.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { Calendar, FileText, IndianRupee, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { Customer } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { servEaseApi } from '../../services/api';
import { formatCurrency, formatDateDisplay, formatTimeDisplay } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { JobStatusIndicator, QuotationStatusIndicator } from '../common/StatusText';

interface CustomerProfileModalProps {
  customer: Customer | null;
  onClose: () => void;
  onEditCustomer: (customer: Customer) => void;
  onCreateBooking: (customerId: string) => void;
  onCreateQuotation: (customerId: string) => void;
}

export function CustomerProfileModal({
  customer,
  onClose,
  onEditCustomer,
  onCreateBooking,
  onCreateQuotation,
}: CustomerProfileModalProps) {
  const { dataset } = useServEase();
  const [tab, setTab] = useState<'bookings' | 'history' | 'quotations' | 'payments'>('bookings');

  if (!customer) return null;

  const metrics = servEaseApi.computeCustomerMetrics(
    customer,
    dataset.jobs,
    dataset.quotations,
    dataset.payments
  );

  const activeBookings = metrics.customerJobs.filter(
    (j) => j.status !== 'Completed' && j.status !== 'Cancelled'
  );
  const pastServices = metrics.customerJobs.filter(
    (j) => j.status === 'Completed' || j.status === 'Cancelled'
  );

  return (
    <Modal
      open={!!customer}
      onClose={onClose}
      title={customer.name}
      subtitle={`${customer.phone} · ${customer.area || 'Local area'}`}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditCustomer(customer);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Details
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateQuotation(customer.id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              New Quotation
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateBooking(customer.id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Booking
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Contact & Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-[#EEF1F6]">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-sm text-[#202938]">
              <Phone className="w-4 h-4 text-[#6B7280] shrink-0" />
              <a href={`tel:${customer.phone}`} className="font-medium hover:text-[#3478D4] tabular-nums">
                {customer.phone}
              </a>
            </div>
            <div className="flex items-start gap-2 text-sm text-[#4B5563]">
              <MapPin className="w-4 h-4 text-[#6B7280] shrink-0 mt-0.5" />
              <span>
                {[customer.address, customer.area].filter(Boolean).join(', ') || 'No address added'}
              </span>
            </div>
            {customer.notes && (
              <p className="text-xs text-[#6B7280] bg-[#F5F7FA] px-3 py-2 rounded-lg">
                Note: {customer.notes}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 text-sm bg-[#FAFBFD] p-3 rounded-lg border border-[#EEF1F6]">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] text-xs">Total Jobs</span>
              <span className="font-semibold text-[#202938] tabular-nums">{metrics.totalJobs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] text-xs">Total Paid</span>
              <span className="font-semibold text-[#16A34A] tabular-nums">
                {formatCurrency(metrics.totalPaid)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280] text-xs">Outstanding</span>
              <span
                className={`font-semibold tabular-nums ${
                  metrics.outstandingBalance > 0 ? 'text-[#DC2626]' : 'text-[#202938]'
                }`}
              >
                {formatCurrency(metrics.outstandingBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F7FA] rounded-lg overflow-x-auto">
          {[
            { id: 'bookings', label: `Current Bookings (${activeBookings.length})` },
            { id: 'history', label: `Previous Services (${pastServices.length})` },
            { id: 'quotations', label: `Quotations (${metrics.customerQuotations.length})` },
            { id: 'payments', label: `Payments (${metrics.customerPayments.length})` },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'bg-white text-[#173B67] shadow-sm'
                  : 'text-[#6B7280] hover:text-[#202938]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        {tab === 'bookings' && (
          <div className="divide-y divide-[#EEF1F6]">
            {activeBookings.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-6 text-center">
                No active bookings for this customer.
              </p>
            ) : (
              activeBookings.map((job) => (
                <div key={job.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#202938]">{job.serviceDescription}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateDisplay(job.appointmentDate)} · {formatTimeDisplay(job.appointmentTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-[#202938] tabular-nums">
                      {formatCurrency(job.estimatedCost)}
                    </span>
                    <JobStatusIndicator status={job.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="divide-y divide-[#EEF1F6]">
            {pastServices.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-6 text-center">
                No completed or past services yet.
              </p>
            ) : (
              pastServices.map((job) => (
                <div key={job.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#202938]">{job.serviceDescription}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                      {formatDateDisplay(job.appointmentDate)} · {job.serviceCategory}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-[#202938] tabular-nums">
                      {formatCurrency(job.estimatedCost)}
                    </span>
                    <JobStatusIndicator status={job.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'quotations' && (
          <div className="divide-y divide-[#EEF1F6]">
            {metrics.customerQuotations.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-6 text-center">
                No quotations issued to this customer yet.
              </p>
            ) : (
              metrics.customerQuotations.map((qt) => (
                <div key={qt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#202938]">
                      <span className="font-mono text-xs text-[#6B7280] mr-2">
                        {qt.quotationNumber}
                      </span>
                      {qt.serviceDescription}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                      {formatDateDisplay(qt.date)} · {qt.items.length} line item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-semibold text-[#202938] tabular-nums">
                      {formatCurrency(qt.totalAmount)}
                    </span>
                    <QuotationStatusIndicator status={qt.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="divide-y divide-[#EEF1F6]">
            {metrics.customerPayments.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-6 text-center">
                No payment records for this customer yet.
              </p>
            ) : (
              metrics.customerPayments.map((pay) => {
                const job = dataset.jobs.find((j) => j.id === pay.jobId);
                return (
                  <div key={pay.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#202938] truncate">
                        {job?.serviceDescription || 'Service Payment'}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                        {formatDateDisplay(pay.paymentDate)} · {pay.method}
                        {pay.notes ? ` · ${pay.notes}` : ''}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#16A34A] tabular-nums shrink-0">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {pay.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

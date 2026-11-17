import { Calendar, CreditCard, FileText, MapPin, Pencil, Phone, User } from 'lucide-react';
import { JOB_STATUSES, JobBooking, JobStatus } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { servEaseApi } from '../../services/api';
import { formatCurrency, formatDateDisplay, formatTimeDisplay } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { JobStatusIndicator, PaymentStatusIndicator } from '../common/StatusText';

interface JobDetailModalProps {
  job: JobBooking | null;
  onClose: () => void;
  onEdit: (job: JobBooking) => void;
  onCreateQuotation: (customerId: string, jobId: string) => void;
  onRecordPayment: (customerId: string, jobId: string) => void;
}

export function JobDetailModal({
  job,
  onClose,
  onEdit,
  onCreateQuotation,
  onRecordPayment,
}: JobDetailModalProps) {
  const { dataset, updateJobStatus } = useServEase();

  if (!job) return null;

  // Always read latest job from store in case status updated while open
  const liveJob = dataset.jobs.find((j) => j.id === job.id) || job;
  const customer = dataset.customers.find((c) => c.id === liveJob.customerId);
  const fin = servEaseApi.computeJobFinancials(
    liveJob,
    dataset.quotations,
    dataset.payments
  );

  return (
    <Modal
      open={!!job}
      onClose={onClose}
      title={liveJob.serviceDescription}
      subtitle={`${liveJob.serviceCategory} · ${formatDateDisplay(liveJob.appointmentDate)} at ${formatTimeDisplay(liveJob.appointmentTime)}`}
      maxWidthClass="max-w-2xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(liveJob);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Booking
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onCreateQuotation(liveJob.customerId, liveJob.id);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Create Quotation
            </button>
            {liveJob.status !== 'Cancelled' && fin.remainingBalance > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRecordPayment(liveJob.customerId, liveJob.id);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF1F6]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#6B7280]">Current Status:</span>
            <JobStatusIndicator status={liveJob.status} />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="job-status-select" className="text-xs text-[#6B7280]">
              Update status:
            </label>
            <select
              id="job-status-select"
              value={liveJob.status}
              onChange={(e) => updateJobStatus(liveJob.id, e.target.value as JobStatus)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
            >
              {JOB_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer & Appointment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6B7280]">Customer</p>
            <div className="flex items-center gap-2 text-[#202938] font-medium">
              <User className="w-4 h-4 text-[#6B7280]" />
              <span>{customer?.name || 'Unknown Customer'}</span>
            </div>
            {customer?.phone && (
              <div className="flex items-center gap-2 text-[#4B5563]">
                <Phone className="w-4 h-4 text-[#6B7280]" />
                <a href={`tel:${customer.phone}`} className="hover:text-[#3478D4] tabular-nums">
                  {customer.phone}
                </a>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6B7280]">Appointment & Site</p>
            <div className="flex items-center gap-2 text-[#202938] tabular-nums">
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <span>
                {formatDateDisplay(liveJob.appointmentDate)} · {formatTimeDisplay(liveJob.appointmentTime)}
              </span>
            </div>
            <div className="flex items-start gap-2 text-[#4B5563]">
              <MapPin className="w-4 h-4 text-[#6B7280] shrink-0 mt-0.5" />
              <span>{liveJob.serviceLocation}</span>
            </div>
          </div>
        </div>

        {liveJob.notes && (
          <div className="bg-[#F5F7FA] rounded-lg px-3.5 py-2.5 text-sm text-[#4B5563]">
            <span className="font-medium text-[#202938]">Job Notes: </span>
            {liveJob.notes}
          </div>
        )}

        {/* Billing Summary */}
        <div className="border-t border-[#EEF1F6] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#202938]">Billing & Payments</h3>
            <PaymentStatusIndicator status={fin.paymentStatus} />
          </div>
          <div className="grid grid-cols-3 gap-3 bg-[#FAFBFD] border border-[#EEF1F6] rounded-lg p-3.5 text-center sm:text-left">
            <div>
              <p className="text-xs text-[#6B7280]">Total Amount</p>
              <p className="text-base font-semibold text-[#202938] tabular-nums mt-0.5">
                {formatCurrency(fin.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Amount Paid</p>
              <p className="text-base font-semibold text-[#16A34A] tabular-nums mt-0.5">
                {formatCurrency(fin.amountPaid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Remaining</p>
              <p
                className={`text-base font-semibold tabular-nums mt-0.5 ${
                  fin.remainingBalance > 0 ? 'text-[#DC2626]' : 'text-[#202938]'
                }`}
              >
                {formatCurrency(fin.remainingBalance)}
              </p>
            </div>
          </div>

          {fin.linkedQuotation && (
            <p className="text-xs text-[#6B7280] mt-2.5">
              Linked Quotation:{' '}
              <span className="font-mono text-[#202938]">{fin.linkedQuotation.quotationNumber}</span>{' '}
              ({fin.linkedQuotation.status})
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

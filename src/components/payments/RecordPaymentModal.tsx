import React, { useEffect, useMemo, useState } from 'react';
import { PAYMENT_METHODS, PaymentMethod } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { servEaseApi } from '../../services/api';
import { formatCurrency, getTodayISO } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
  preselectedJobId?: string;
}

export function RecordPaymentModal({
  open,
  onClose,
  preselectedCustomerId,
  preselectedJobId,
}: RecordPaymentModalProps) {
  const { dataset, recordPayment } = useServEase();

  const [customerId, setCustomerId] = useState('');
  const [jobId, setJobId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const billableJobs = useMemo(
    () => dataset.jobs.filter((j) => j.status !== 'Cancelled'),
    [dataset.jobs]
  );

  const customerJobs = useMemo(() => {
    if (!customerId) return billableJobs;
    return billableJobs.filter((j) => j.customerId === customerId);
  }, [billableJobs, customerId]);

  const selectedJob = useMemo(
    () => dataset.jobs.find((j) => j.id === jobId),
    [dataset.jobs, jobId]
  );

  const jobFinancials = useMemo(() => {
    if (!selectedJob) return null;
    return servEaseApi.computeJobFinancials(
      selectedJob,
      dataset.quotations,
      dataset.payments
    );
  }, [selectedJob, dataset.quotations, dataset.payments]);

  useEffect(() => {
    if (!open) return;
    let initJob = preselectedJobId
      ? billableJobs.find((j) => j.id === preselectedJobId)
      : undefined;
    let initCustomerId = preselectedCustomerId || initJob?.customerId || '';

    if (!initCustomerId && billableJobs.length > 0) {
      // Pick first job with an outstanding balance if available
      const firstUnpaid = billableJobs.find((j) => {
        const fin = servEaseApi.computeJobFinancials(j, dataset.quotations, dataset.payments);
        return fin.remainingBalance > 0;
      });
      initJob = firstUnpaid || billableJobs[0];
      initCustomerId = initJob.customerId;
    } else if (initCustomerId && !initJob) {
      const jobsForCust = billableJobs.filter((j) => j.customerId === initCustomerId);
      initJob =
        jobsForCust.find((j) => {
          const fin = servEaseApi.computeJobFinancials(j, dataset.quotations, dataset.payments);
          return fin.remainingBalance > 0;
        }) || jobsForCust[0];
    }

    setCustomerId(initCustomerId);
    setJobId(initJob?.id || '');
    if (initJob) {
      const fin = servEaseApi.computeJobFinancials(initJob, dataset.quotations, dataset.payments);
      setAmount(fin.remainingBalance > 0 ? String(fin.remainingBalance) : '');
    } else {
      setAmount('');
    }
    setMethod('UPI');
    setPaymentDate(getTodayISO());
    setNotes('');
    setErrors({});
  }, [
    open,
    preselectedCustomerId,
    preselectedJobId,
    billableJobs,
    dataset.quotations,
    dataset.payments,
  ]);

  const handleCustomerChange = (nextCustomerId: string) => {
    setCustomerId(nextCustomerId);
    const jobsForCust = billableJobs.filter((j) => j.customerId === nextCustomerId);
    const nextJob = jobsForCust[0];
    setJobId(nextJob?.id || '');
    if (nextJob) {
      const fin = servEaseApi.computeJobFinancials(nextJob, dataset.quotations, dataset.payments);
      setAmount(fin.remainingBalance > 0 ? String(fin.remainingBalance) : '');
    } else {
      setAmount('');
    }
  };

  const handleJobChange = (nextJobId: string) => {
    setJobId(nextJobId);
    const job = dataset.jobs.find((j) => j.id === nextJobId);
    if (job) {
      setCustomerId(job.customerId);
      const fin = servEaseApi.computeJobFinancials(job, dataset.quotations, dataset.payments);
      setAmount(fin.remainingBalance > 0 ? String(fin.remainingBalance) : '');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!customerId) nextErrors.customerId = 'Select a customer.';
    if (!jobId) nextErrors.jobId = 'Select a related job.';
    const amtNum = Number(amount);
    if (!amount || Number.isNaN(amtNum) || amtNum <= 0) {
      nextErrors.amount = 'Enter a payment amount greater than 0.';
    }
    if (!paymentDate) nextErrors.paymentDate = 'Payment date is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    recordPayment({
      customerId,
      jobId,
      amount: amtNum,
      method,
      paymentDate,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle="Supports full settlement or multiple partial installments against a job."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="payment-form"
            disabled={billableJobs.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            Save Payment
          </button>
        </>
      }
    >
      {billableJobs.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm font-medium text-[#202938]">No active or completed jobs</p>
          <p className="text-xs text-[#6B7280]">
            Create a job booking first to record customer payments against it.
          </p>
        </div>
      ) : (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Customer <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
            >
              <option value="">Select customer...</option>
              {dataset.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.area || c.phone})
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.customerId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Related Job <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={jobId}
              onChange={(e) => handleJobChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
            >
              <option value="">Select job...</option>
              {customerJobs.map((j) => {
                const fin = servEaseApi.computeJobFinancials(
                  j,
                  dataset.quotations,
                  dataset.payments
                );
                return (
                  <option key={j.id} value={j.id}>
                    {j.serviceDescription} · Balance {formatCurrency(fin.remainingBalance)}
                  </option>
                );
              })}
            </select>
            {errors.jobId && <p className="text-xs text-[#DC2626] mt-1">{errors.jobId}</p>}
          </div>

          {jobFinancials && (
            <div className="bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-[#6B7280]">Total Job</p>
                <p className="text-sm font-semibold text-[#202938] tabular-nums">
                  {formatCurrency(jobFinancials.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6B7280]">Already Paid</p>
                <p className="text-sm font-semibold text-[#16A34A] tabular-nums">
                  {formatCurrency(jobFinancials.amountPaid)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#6B7280]">Remaining</p>
                <p className="text-sm font-semibold text-[#DC2626] tabular-nums">
                  {formatCurrency(jobFinancials.remainingBalance)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Amount (₹) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
              {errors.amount && <p className="text-xs text-[#DC2626] mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Payment Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
              {errors.paymentDate && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.paymentDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Payment Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Advance via GPay, final settlement in cash..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}

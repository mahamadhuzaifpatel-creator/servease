import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  IndianRupee,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { PaymentRecord, PaymentStatus } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { servEaseApi } from '../services/api';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { PaymentStatusIndicator } from '../components/common/StatusText';

export function PaymentsPage() {
  const { dataset, deletePayment } = useServEase();

  const [tab, setTab] = useState<'ledger' | 'transactions'>('ledger');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [preselectedContext, setPreselectedContext] = useState<{
    customerId?: string;
    jobId?: string;
  }>({});
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);

  const ledgerRows = useMemo(() => {
    return dataset.jobs
      .filter((j) => j.status !== 'Cancelled')
      .map((job) => {
        const customer = dataset.customers.find((c) => c.id === job.customerId);
        const fin = servEaseApi.computeJobFinancials(
          job,
          dataset.quotations,
          dataset.payments
        );
        return { job, customer, fin };
      })
      .sort((a, b) => b.job.appointmentDate.localeCompare(a.job.appointmentDate));
  }, [dataset.customers, dataset.jobs, dataset.payments, dataset.quotations]);

  const summary = useMemo(() => {
    let totalReceived = 0;
    let totalOutstanding = 0;
    let partiallyPaidCount = 0;
    let fullyPaidCount = 0;

    ledgerRows.forEach(({ fin }) => {
      totalReceived += fin.amountPaid;
      totalOutstanding += fin.remainingBalance;
      if (fin.paymentStatus === 'Partially Paid') partiallyPaidCount += 1;
      if (fin.paymentStatus === 'Paid') fullyPaidCount += 1;
    });

    return {
      totalReceived,
      totalOutstanding,
      partiallyPaidCount,
      fullyPaidCount,
    };
  }, [ledgerRows]);

  const filteredLedger = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledgerRows.filter(({ job, customer, fin }) => {
      const matchesSearch =
        !q ||
        job.serviceDescription.toLowerCase().includes(q) ||
        (customer?.name.toLowerCase().includes(q) ?? false);
      const matchesStatus =
        statusFilter === 'All' || fin.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [ledgerRows, search, statusFilter]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...dataset.payments]
      .filter((pay) => {
        const customer = dataset.customers.find((c) => c.id === pay.customerId);
        const job = dataset.jobs.find((j) => j.id === pay.jobId);
        return (
          !q ||
          (customer?.name.toLowerCase().includes(q) ?? false) ||
          (job?.serviceDescription.toLowerCase().includes(q) ?? false) ||
          pay.method.toLowerCase().includes(q) ||
          pay.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }, [dataset.customers, dataset.jobs, dataset.payments, search]);

  const summaryCards = [
    {
      label: 'Total Received',
      value: formatCurrency(summary.totalReceived),
      icon: IndianRupee,
      accent: 'text-[#16A34A] bg-[#DCFCE7]',
    },
    {
      label: 'Total Outstanding',
      value: formatCurrency(summary.totalOutstanding),
      icon: AlertCircle,
      accent: 'text-[#DC2626] bg-[#FEE2E2]',
    },
    {
      label: 'Partially Paid',
      value: `${summary.partiallyPaidCount} job(s)`,
      icon: Clock,
      accent: 'text-[#D97706] bg-[#FEF3C7]',
    },
    {
      label: 'Fully Paid',
      value: `${summary.fullyPaidCount} job(s)`,
      icon: CheckCircle2,
      accent: 'text-[#173B67] bg-[#EFF6FF]',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[#E5E9F0] rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-xs font-medium text-[#6B7280]">{card.label}</p>
                <p className="text-xl font-bold text-[#202938] tabular-nums mt-1 font-display">
                  {card.value}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.accent}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9F0] rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab('ledger')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'ledger'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            Job Balances ({ledgerRows.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('transactions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === 'transactions'
                ? 'bg-[#173B67] text-white'
                : 'text-[#6B7280] hover:text-[#202938]'
            }`}
          >
            Transactions ({dataset.payments.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setPreselectedContext({});
            setPaymentModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#E5E9F0] rounded-xl p-3.5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, job, or payment method..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4]"
          />
        </div>

        {tab === 'ledger' && (
          <div className="flex items-center gap-1 p-1 bg-[#F5F7FA] rounded-lg overflow-x-auto">
            {(['All', 'Unpaid', 'Partially Paid', 'Paid'] as const).map((st) => (
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
        )}
      </div>

      {/* Ledger Tab */}
      {tab === 'ledger' ? (
        ledgerRows.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-5 h-5" />}
            title="No billable jobs yet"
            description="Once you create service bookings, their total amount, received payments, and remaining balance appear here automatically."
          />
        ) : filteredLedger.length === 0 ? (
          <EmptyState
            icon={<Search className="w-5 h-5" />}
            title="No matching job balances"
            description="Try clearing the search input or selecting All payment statuses."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setStatusFilter('All');
            }}
          />
        ) : (
          <>
            <div className="hidden lg:block bg-white border border-[#E5E9F0] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E9F0] bg-[#FAFBFD] text-xs font-semibold text-[#6B7280]">
                      <th className="py-3 px-4">Customer & Job</th>
                      <th className="py-3 px-4">Service Date</th>
                      <th className="py-3 px-4 text-right">Total Job Amount</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-right">Remaining Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1F6]">
                    {filteredLedger.map(({ job, customer, fin }) => (
                      <tr key={job.id} className="hover:bg-[#FAFBFD] transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-[#202938] truncate">
                            {customer?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-[#6B7280] truncate">
                            {job.serviceDescription}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563] tabular-nums whitespace-nowrap">
                          {formatDateDisplay(job.appointmentDate)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#202938] tabular-nums">
                          {formatCurrency(fin.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#16A34A] tabular-nums">
                          {formatCurrency(fin.amountPaid)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold tabular-nums ${
                            fin.remainingBalance > 0 ? 'text-[#DC2626]' : 'text-[#202938]'
                          }`}
                        >
                          {formatCurrency(fin.remainingBalance)}
                        </td>
                        <td className="py-3 px-4">
                          <PaymentStatusIndicator status={fin.paymentStatus} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {fin.remainingBalance > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPreselectedContext({
                                  customerId: job.customerId,
                                  jobId: job.id,
                                });
                                setPaymentModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-md transition-colors"
                            >
                              Record Payment
                            </button>
                          ) : (
                            <span className="text-xs text-[#6B7280]">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredLedger.map(({ job, customer, fin }) => (
                <div
                  key={job.id}
                  className="bg-white border border-[#E5E9F0] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#202938] truncate">
                        {customer?.name || 'Customer'}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">{job.serviceDescription}</p>
                    </div>
                    <PaymentStatusIndicator status={fin.paymentStatus} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#FAFBFD] p-2.5 rounded-lg border border-[#EEF1F6]">
                    <div>
                      <span className="text-[#6B7280] block">Total</span>
                      <span className="font-semibold text-[#202938] tabular-nums">
                        {formatCurrency(fin.totalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Paid</span>
                      <span className="font-semibold text-[#16A34A] tabular-nums">
                        {formatCurrency(fin.amountPaid)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280] block">Balance</span>
                      <span className="font-semibold text-[#DC2626] tabular-nums">
                        {formatCurrency(fin.remainingBalance)}
                      </span>
                    </div>
                  </div>

                  {fin.remainingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectedContext({
                          customerId: job.customerId,
                          jobId: job.id,
                        });
                        setPaymentModalOpen(true);
                      }}
                      className="w-full py-2 text-xs font-medium text-white bg-[#173B67] rounded-lg"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )
      ) : /* Transactions Tab */
      dataset.payments.length === 0 ? (
        <EmptyState
          icon={<IndianRupee className="w-5 h-5" />}
          title="No payments recorded yet"
          description="Record full or partial UPI, cash, or bank transfer payments against customer jobs."
          actionLabel="Record First Payment"
          onAction={() => {
            setPreselectedContext({});
            setPaymentModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white border border-[#E5E9F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E9F0] bg-[#FAFBFD] text-xs font-semibold text-[#6B7280]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer & Job</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F6]">
                {filteredTransactions.map((pay) => {
                  const customer = dataset.customers.find((c) => c.id === pay.customerId);
                  const job = dataset.jobs.find((j) => j.id === pay.jobId);
                  return (
                    <tr key={pay.id} className="hover:bg-[#FAFBFD] transition-colors">
                      <td className="py-3 px-4 text-[#4B5563] tabular-nums whitespace-nowrap">
                        {formatDateDisplay(pay.paymentDate)}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-medium text-[#202938] truncate">
                          {customer?.name || 'Customer'}
                        </p>
                        <p className="text-xs text-[#6B7280] truncate">
                          {job?.serviceDescription || 'Service'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#202938] whitespace-nowrap">
                        {pay.method}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#6B7280] max-w-xs truncate">
                        {pay.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#16A34A] tabular-nums whitespace-nowrap">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDeletingPayment(pay)}
                          title="Delete payment entry"
                          aria-label="Delete payment entry"
                          className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        preselectedCustomerId={preselectedContext.customerId}
        preselectedJobId={preselectedContext.jobId}
      />

      <ConfirmDialog
        open={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        onConfirm={() => {
          if (deletingPayment) deletePayment(deletingPayment.id);
        }}
        title="Remove Payment Entry"
        message={`Remove the ${formatCurrency(
          deletingPayment?.amount || 0
        )} payment recorded on ${formatDateDisplay(
          deletingPayment?.paymentDate || ''
        )}? Remaining balance on the job will be recalculated automatically.`}
        confirmLabel="Remove Payment"
      />
    </div>
  );
}

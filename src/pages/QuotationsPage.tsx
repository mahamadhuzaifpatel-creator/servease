import { useMemo, useState } from 'react';
import { Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { QUOTATION_STATUSES, Quotation, QuotationStatus } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';
import { downloadQuotationPdf } from '../utils/pdfGenerator';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal';
import { QuotationPreviewModal } from '../components/quotations/QuotationPreviewModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { QuotationStatusIndicator } from '../components/common/StatusText';

export function QuotationsPage() {
  const { dataset, updateQuotation, deleteQuotation, pushToast } = useServEase();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'All'>('All');

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);

  const filteredQuotations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...dataset.quotations]
      .filter((qt) => {
        const customer = dataset.customers.find((c) => c.id === qt.customerId);
        const matchesSearch =
          !q ||
          qt.quotationNumber.toLowerCase().includes(q) ||
          qt.serviceDescription.toLowerCase().includes(q) ||
          (customer?.name.toLowerCase().includes(q) ?? false);
        const matchesStatus = statusFilter === 'All' || qt.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dataset.customers, dataset.quotations, search, statusFilter]);

  const handleDownloadPdf = (qt: Quotation) => {
    const customer = dataset.customers.find((c) => c.id === qt.customerId);
    downloadQuotationPdf(qt, customer, dataset.provider);
    pushToast({
      variant: 'success',
      title: `Downloaded ${qt.quotationNumber}.pdf`,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-[#6B7280] tabular-nums">
          {dataset.quotations.length} quotation(s) created
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingQuotation(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white border border-[#E5E9F0] rounded-xl p-3.5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by quotation number, customer, or service..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4]"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F5F7FA] rounded-lg overflow-x-auto">
          {(['All', ...QUOTATION_STATUSES] as const).map((st) => (
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

      {dataset.quotations.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-5 h-5" />}
          title="No quotations created yet"
          description="Generate professional itemised estimates, preview them as a business document, and export PDFs for customers."
          actionLabel="Create First Quotation"
          onAction={() => {
            setEditingQuotation(null);
            setFormOpen(true);
          }}
        />
      ) : filteredQuotations.length === 0 ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title="No matching quotations"
          description="Adjust your search query or select All statuses."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('All');
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
                    <th className="py-3 px-4">Quotation #</th>
                    <th className="py-3 px-4">Customer & Service</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6]">
                  {filteredQuotations.map((qt) => {
                    const customer = dataset.customers.find((c) => c.id === qt.customerId);
                    return (
                      <tr key={qt.id} className="hover:bg-[#FAFBFD] transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#173B67] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setPreviewQuotation(qt)}
                            className="hover:underline"
                          >
                            {qt.quotationNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-medium text-[#202938] truncate">
                            {customer?.name || 'Customer'}
                          </p>
                          <p className="text-xs text-[#6B7280] truncate">{qt.serviceDescription}</p>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563] tabular-nums whitespace-nowrap">
                          {formatDateDisplay(qt.date)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#202938] tabular-nums whitespace-nowrap">
                          {formatCurrency(qt.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <QuotationStatusIndicator status={qt.status} />
                            <select
                              aria-label={`Status for ${qt.quotationNumber}`}
                              value={qt.status}
                              onChange={(e) =>
                                updateQuotation(qt.id, {
                                  status: e.target.value as QuotationStatus,
                                })
                              }
                              className="text-xs bg-[#F5F7FA] border border-[#E5E9F0] rounded-md px-2 py-1"
                            >
                              {QUOTATION_STATUSES.map((st) => (
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
                              onClick={() => setPreviewQuotation(qt)}
                              title="Preview document"
                              className="p-1.5 text-[#4B5563] hover:text-[#173B67] hover:bg-[#F5F7FA] rounded-md"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(qt)}
                              title="Download PDF"
                              className="p-1.5 text-[#4B5563] hover:text-[#0F766E] hover:bg-[#F0FDFA] rounded-md"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuotation(qt);
                                setFormOpen(true);
                              }}
                              title="Edit quotation"
                              className="p-1.5 text-[#4B5563] hover:text-[#3478D4] hover:bg-[#F5F7FA] rounded-md"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingQuotation(qt)}
                              title="Delete quotation"
                              className="p-1.5 text-[#4B5563] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredQuotations.map((qt) => {
              const customer = dataset.customers.find((c) => c.id === qt.customerId);
              return (
                <div
                  key={qt.id}
                  className="bg-white border border-[#E5E9F0] rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[#173B67]">
                        {qt.quotationNumber} · {formatDateDisplay(qt.date)}
                      </p>
                      <p className="text-sm font-semibold text-[#202938] mt-0.5 truncate">
                        {customer?.name || 'Customer'}
                      </p>
                      <p className="text-xs text-[#6B7280] truncate">{qt.serviceDescription}</p>
                    </div>
                    <span className="text-sm font-bold text-[#202938] tabular-nums shrink-0">
                      {formatCurrency(qt.totalAmount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EEF1F6]">
                    <QuotationStatusIndicator status={qt.status} />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewQuotation(qt)}
                        className="px-2.5 py-1 text-xs font-medium text-[#173B67] bg-[#EFF6FF] rounded-md"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(qt)}
                        className="px-2.5 py-1 text-xs font-medium text-[#0F766E] bg-[#F0FDFA] rounded-md"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuotation(qt);
                          setFormOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-[#4B5563] bg-[#F5F7FA] rounded-md"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <QuotationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingQuotation={editingQuotation}
        onSaved={(saved) => setPreviewQuotation(saved)}
      />

      <QuotationPreviewModal
        quotation={previewQuotation}
        onClose={() => setPreviewQuotation(null)}
      />

      <ConfirmDialog
        open={!!deletingQuotation}
        onClose={() => setDeletingQuotation(null)}
        onConfirm={() => {
          if (deletingQuotation) deleteQuotation(deletingQuotation.id);
        }}
        title="Delete Quotation"
        message={`Delete quotation ${deletingQuotation?.quotationNumber}? This cannot be undone.`}
        confirmLabel="Delete Quotation"
      />
    </div>
  );
}

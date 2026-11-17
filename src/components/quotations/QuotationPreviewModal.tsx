import { Check, Copy, Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Quotation } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { formatCurrencyExact, formatDateDisplay } from '../../utils/formatters';
import { downloadQuotationPdf } from '../../utils/pdfGenerator';
import { Modal } from '../common/Modal';
import { QuotationStatusIndicator } from '../common/StatusText';

interface QuotationPreviewModalProps {
  quotation: Quotation | null;
  onClose: () => void;
}

export function QuotationPreviewModal({ quotation, onClose }: QuotationPreviewModalProps) {
  const { dataset, updateQuotation, pushToast } = useServEase();
  const [copied, setCopied] = useState(false);

  if (!quotation) return null;

  const liveQuotation =
    dataset.quotations.find((q) => q.id === quotation.id) || quotation;
  const customer = dataset.customers.find((c) => c.id === liveQuotation.customerId);
  const { provider } = dataset;

  const buildShareText = () => {
    const itemLines = liveQuotation.items
      .map(
        (item, idx) =>
          `${idx + 1}. ${item.description} (${item.quantity} x ₹${item.unitPrice.toLocaleString(
            'en-IN'
          )}) = ₹${(item.quantity * item.unitPrice).toLocaleString('en-IN')}`
      )
      .join('\n');

    return [
      `*Quotation ${liveQuotation.quotationNumber}* — ${provider.businessName}`,
      `Date: ${formatDateDisplay(liveQuotation.date)}`,
      `Customer: ${customer?.name || 'Customer'}`,
      `Service: ${liveQuotation.serviceDescription}`,
      '',
      itemLines,
      '',
      `*Total Estimate: ₹${liveQuotation.totalAmount.toLocaleString('en-IN')}*`,
      liveQuotation.notes ? `Note: ${liveQuotation.notes}` : '',
      `Contact: ${provider.businessPhone || provider.phone}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopyShare = async () => {
    const text = buildShareText();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Quotation ${liveQuotation.quotationNumber}`,
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        pushToast({
          variant: 'success',
          title: 'Quotation summary copied',
          description: 'Paste directly into WhatsApp or SMS to share with your customer.',
        });
      }
      if (liveQuotation.status === 'Draft') {
        updateQuotation(liveQuotation.id, { status: 'Sent' });
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
        pushToast({
          variant: 'success',
          title: 'Quotation summary copied to clipboard',
        });
      } catch {
        pushToast({
          variant: 'error',
          title: 'Unable to copy automatically',
        });
      }
    }
  };

  const handleDownloadPdf = () => {
    downloadQuotationPdf(liveQuotation, customer, provider);
    pushToast({
      variant: 'success',
      title: `Downloaded ${liveQuotation.quotationNumber}.pdf`,
    });
  };

  return (
    <Modal
      open={!!quotation}
      onClose={onClose}
      title={`Quotation ${liveQuotation.quotationNumber}`}
      subtitle="Commercial estimate preview"
      maxWidthClass="max-w-3xl"
      footer={
        <div className="w-full flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
          >
            Close
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#173B67] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied' : 'Share Summary'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      }
    >
      {/* Business Document Container */}
      <div className="border border-[#E5E9F0] rounded-xl overflow-hidden bg-white">
        {/* Document Header */}
        <div className="bg-[#173B67] text-white px-6 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight">{provider.businessName}</h3>
            <p className="text-xs text-white/80 mt-1">
              {provider.serviceCategory} · {provider.serviceArea}
            </p>
            <p className="text-xs text-white/80 mt-0.5 tabular-nums">
              {provider.businessPhone || provider.phone}
              {(provider.businessEmail || provider.email) &&
                ` · ${provider.businessEmail || provider.email}`}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-white/75 font-semibold">
              Quotation
            </p>
            <p className="text-base font-mono font-semibold mt-0.5">
              {liveQuotation.quotationNumber}
            </p>
            <p className="text-xs text-white/80 mt-0.5 tabular-nums">
              Date: {formatDateDisplay(liveQuotation.date)}
            </p>
          </div>
        </div>

        {/* Customer & Status */}
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#EEF1F6]">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] mb-1">Prepared For</p>
              <p className="text-sm font-semibold text-[#202938]">
                {customer?.name || 'Customer'}
              </p>
              {customer?.phone && (
                <p className="text-xs text-[#4B5563] mt-0.5 tabular-nums">{customer.phone}</p>
              )}
              {(customer?.address || customer?.area) && (
                <p className="text-xs text-[#4B5563] mt-0.5">
                  {[customer.address, customer.area].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold text-[#6B7280] mb-1">Quotation Status</p>
              <QuotationStatusIndicator status={liveQuotation.status} />
            </div>
          </div>

          <div className="bg-[#F5F7FA] rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-[#6B7280]">Service Description</p>
            <p className="text-sm font-medium text-[#202938] mt-0.5">
              {liveQuotation.serviceDescription}
            </p>
          </div>

          {/* Itemised Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E5E9F0] text-left text-xs font-semibold text-[#6B7280]">
                  <th className="py-2.5 pr-3 w-8">#</th>
                  <th className="py-2.5 pr-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 pl-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F6]">
                {liveQuotation.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 text-xs text-[#6B7280] tabular-nums">{idx + 1}</td>
                    <td className="py-3 pr-3 text-[#202938]">{item.description}</td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#4B5563]">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-[#4B5563]">
                      {formatCurrencyExact(item.unitPrice)}
                    </td>
                    <td className="py-3 pl-3 text-right font-medium tabular-nums text-[#202938]">
                      {formatCurrencyExact(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Bar */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#202938]">Total Amount</span>
              <span className="text-lg font-bold text-[#173B67] tabular-nums">
                {formatCurrencyExact(liveQuotation.totalAmount)}
              </span>
            </div>
          </div>

          {liveQuotation.notes && (
            <div className="text-xs text-[#4B5563] border-t border-[#EEF1F6] pt-4">
              <span className="font-semibold text-[#202938]">Notes: </span>
              {liveQuotation.notes}
            </div>
          )}

          {liveQuotation.termsAndConditions && (
            <div className="text-xs text-[#6B7280] border-t border-[#EEF1F6] pt-4 whitespace-pre-line leading-relaxed">
              <p className="font-semibold text-[#202938] mb-1">Terms & Conditions</p>
              {liveQuotation.termsAndConditions}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between text-[11px] text-[#9CA3AF]">
            <span>Issued via ServEase</span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(buildShareText());
                pushToast({ variant: 'success', title: 'Copied text to clipboard' });
              }}
              className="inline-flex items-center gap-1 text-[#3478D4] hover:underline"
            >
              <Copy className="w-3 h-3" />
              Copy text
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

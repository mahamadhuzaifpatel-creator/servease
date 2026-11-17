import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { QUOTATION_STATUSES, Quotation, QuotationItem, QuotationStatus } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { formatCurrency, generateId, getTodayISO } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface QuotationFormModalProps {
  open: boolean;
  onClose: () => void;
  editingQuotation?: Quotation | null;
  preselectedCustomerId?: string;
  preselectedJobId?: string;
  onSaved?: (quotation: Quotation) => void;
}

export function QuotationFormModal({
  open,
  onClose,
  editingQuotation,
  preselectedCustomerId,
  preselectedJobId,
  onSaved,
}: QuotationFormModalProps) {
  const { dataset, addQuotation, updateQuotation } = useServEase();

  const [customerId, setCustomerId] = useState('');
  const [jobId, setJobId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [serviceDescription, setServiceDescription] = useState('');
  const [status, setStatus] = useState<QuotationStatus>('Draft');
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editingQuotation) {
      setCustomerId(editingQuotation.customerId);
      setJobId(editingQuotation.jobId || '');
      setDate(editingQuotation.date);
      setServiceDescription(editingQuotation.serviceDescription);
      setStatus(editingQuotation.status);
      setItems(editingQuotation.items.map((item) => ({ ...item })));
      setTermsAndConditions(editingQuotation.termsAndConditions);
      setNotes(editingQuotation.notes);
    } else {
      const initialJob = preselectedJobId
        ? dataset.jobs.find((j) => j.id === preselectedJobId)
        : undefined;
      const initialCustomerId =
        preselectedCustomerId || initialJob?.customerId || dataset.customers[0]?.id || '';

      setCustomerId(initialCustomerId);
      setJobId(initialJob?.id || '');
      setDate(getTodayISO());
      setServiceDescription(initialJob?.serviceDescription || '');
      setStatus('Draft');
      setItems([
        {
          id: generateId('qi'),
          description: initialJob?.serviceDescription || 'Inspection & Service Labour',
          quantity: 1,
          unitPrice: initialJob?.estimatedCost || 0,
        },
      ]);
      setTermsAndConditions(dataset.provider.defaultQuotationTerms);
      setNotes('');
    }
    setErrors({});
  }, [
    open,
    editingQuotation,
    preselectedCustomerId,
    preselectedJobId,
    dataset.customers,
    dataset.jobs,
    dataset.provider.defaultQuotationTerms,
  ]);

  const customerJobs = useMemo(
    () => dataset.jobs.filter((j) => j.customerId === customerId && j.status !== 'Cancelled'),
    [dataset.jobs, customerId]
  );

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0),
        0
      ),
    [items]
  );

  const handleCustomerChange = (nextCustomerId: string) => {
    setCustomerId(nextCustomerId);
    setJobId('');
  };

  const handleJobLinkChange = (nextJobId: string) => {
    setJobId(nextJobId);
    const matched = dataset.jobs.find((j) => j.id === nextJobId);
    if (matched) {
      if (!serviceDescription.trim()) {
        setServiceDescription(matched.serviceDescription);
      }
      if (
        items.length === 1 &&
        items[0].unitPrice === 0 &&
        matched.estimatedCost > 0
      ) {
        setItems([
          {
            ...items[0],
            description: matched.serviceDescription,
            unitPrice: matched.estimatedCost,
          },
        ]);
      }
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: generateId('qi'), description: '', quantity: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const handleUpdateItem = (
    id: string,
    field: keyof QuotationItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!customerId) nextErrors.customerId = 'Select a customer.';
    if (!serviceDescription.trim())
      nextErrors.serviceDescription = 'Service description is required.';
    if (!date) nextErrors.date = 'Quotation date is required.';
    const validItems = items.filter((i) => i.description.trim() !== '');
    if (validItems.length === 0) {
      nextErrors.items = 'Add at least one line item with a description.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const sanitizedItems = validItems.map((i) => ({
      ...i,
      description: i.description.trim(),
      quantity: Math.max(1, Number(i.quantity) || 1),
      unitPrice: Math.max(0, Number(i.unitPrice) || 0),
    }));

    if (editingQuotation) {
      updateQuotation(editingQuotation.id, {
        customerId,
        jobId: jobId || undefined,
        date,
        serviceDescription,
        items: sanitizedItems,
        status,
        termsAndConditions,
        notes,
      });
      onSaved?.({
        ...editingQuotation,
        customerId,
        jobId: jobId || undefined,
        date,
        serviceDescription,
        items: sanitizedItems,
        totalAmount,
        status,
        termsAndConditions,
        notes,
      });
    } else {
      const created = addQuotation({
        customerId,
        jobId: jobId || undefined,
        date,
        serviceDescription,
        items: sanitizedItems,
        status,
        termsAndConditions,
        notes,
      });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editingQuotation
          ? `Edit Quotation ${editingQuotation.quotationNumber}`
          : 'Create Quotation'
      }
      subtitle="Build an itemised estimate with automatic totals."
      maxWidthClass="max-w-2xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-xs text-[#6B7280] block">Total Estimate</span>
            <span className="text-lg font-bold text-[#173B67] tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#202938] bg-white border border-[#D1D5DB] rounded-lg hover:bg-[#F5F7FA] transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="quotation-form"
              disabled={dataset.customers.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {editingQuotation ? 'Update Quotation' : 'Save Quotation'}
            </button>
          </div>
        </div>
      }
    >
      {dataset.customers.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm font-medium text-[#202938]">No customers available</p>
          <p className="text-xs text-[#6B7280]">
            Add a customer first so the quotation can be linked to their profile.
          </p>
        </div>
      ) : (
        <form id="quotation-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Customer <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
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
                Link to Job (Optional)
              </label>
              <select
                value={jobId}
                onChange={(e) => handleJobLinkChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              >
                <option value="">Not linked to a specific booking</option>
                {customerJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.serviceDescription} ({j.appointmentDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Service Description <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                placeholder="e.g. Split AC Servicing & Copper Pipe Replacement"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
              {errors.serviceDescription && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.serviceDescription}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#202938]">
                Itemised Services & Materials <span className="text-[#DC2626]">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#3478D4] hover:text-[#173B67]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="border border-[#E5E9F0] rounded-lg divide-y divide-[#EEF1F6]">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 grid grid-cols-12 gap-2 items-center bg-white"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'description', e.target.value)
                      }
                      placeholder={`Item ${idx + 1} description`}
                      className="w-full px-2.5 py-1.5 text-sm border border-[#D1D5DB] rounded-md focus:outline-none focus:border-[#3478D4]"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'quantity', Number(e.target.value))
                      }
                      aria-label="Quantity"
                      placeholder="Qty"
                      className="w-full px-2.5 py-1.5 text-sm border border-[#D1D5DB] rounded-md tabular-nums focus:outline-none focus:border-[#3478D4]"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))
                      }
                      aria-label="Unit Price"
                      placeholder="₹ Price"
                      className="w-full px-2.5 py-1.5 text-sm border border-[#D1D5DB] rounded-md tabular-nums focus:outline-none focus:border-[#3478D4]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length === 1}
                      aria-label="Remove item"
                      className="p-1.5 text-[#6B7280] hover:text-[#DC2626] disabled:opacity-30 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {errors.items && <p className="text-xs text-[#DC2626] mt-1">{errors.items}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              >
                {QUOTATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for the customer"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows={3}
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 resize-none"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}

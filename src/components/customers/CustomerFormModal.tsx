import React, { useEffect, useState } from 'react';
import { Customer } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { isValidPhone } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  editingCustomer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormModal({
  open,
  onClose,
  editingCustomer,
  onSaved,
}: CustomerFormModalProps) {
  const { addCustomer, updateCustomer } = useServEase();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editingCustomer) {
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone);
      setAddress(editingCustomer.address);
      setArea(editingCustomer.area);
      setNotes(editingCustomer.notes);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setArea('');
      setNotes('');
    }
    setErrors({});
  }, [open, editingCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Customer name is required.';
    if (!phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!isValidPhone(phone)) {
      nextErrors.phone = 'Enter a valid 10-digit phone number.';
    }
    if (!area.trim() && !address.trim()) {
      nextErrors.area = 'Provide at least an area or street address.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        area: area.trim(),
        notes: notes.trim(),
      });
      onSaved?.({
        ...editingCustomer,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        area: area.trim(),
        notes: notes.trim(),
      });
    } else {
      const created = addCustomer({ name, phone, address, area, notes });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
      subtitle="Keep contact and locality details accurate for quick dispatch."
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
            form="customer-form"
            className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
          >
            {editingCustomer ? 'Save Changes' : 'Add Customer'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#202938] mb-1">
            Customer Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ananya Deshmukh"
            className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
          />
          {errors.name && <p className="text-xs text-[#DC2626] mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Phone Number <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98901 23411"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
            />
            {errors.phone && <p className="text-xs text-[#DC2626] mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Area / Locality <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Kothrud, Pune"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
            />
            {errors.area && <p className="text-xs text-[#DC2626] mt-1">{errors.area}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#202938] mb-1">
            Street / Flat Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Flat 402, Gulmohar Residency, Paud Road"
            className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#202938] mb-1">
            Additional Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferred visit time, appliance model, gate instructions..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4] resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}

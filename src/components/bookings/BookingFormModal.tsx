import React, { useEffect, useState } from 'react';
import { JOB_STATUSES, JobBooking, JobStatus, SERVICE_CATEGORIES, ServiceCategory } from '../../types';
import { useServEase } from '../../hooks/useServEaseStore';
import { getTodayISO } from '../../utils/formatters';
import { Modal } from '../common/Modal';

interface BookingFormModalProps {
  open: boolean;
  onClose: () => void;
  editingJob?: JobBooking | null;
  preselectedCustomerId?: string;
  preselectedDate?: string;
}

export function BookingFormModal({
  open,
  onClose,
  editingJob,
  preselectedCustomerId,
  preselectedDate,
}: BookingFormModalProps) {
  const { dataset, addBooking, updateBooking } = useServEase();

  const [customerId, setCustomerId] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    dataset.provider.serviceCategory
  );
  const [appointmentDate, setAppointmentDate] = useState(getTodayISO());
  const [appointmentTime, setAppointmentTime] = useState('10:30');
  const [serviceLocation, setServiceLocation] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [status, setStatus] = useState<JobStatus>('Confirmed');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editingJob) {
      setCustomerId(editingJob.customerId);
      setServiceDescription(editingJob.serviceDescription);
      setServiceCategory(editingJob.serviceCategory);
      setAppointmentDate(editingJob.appointmentDate);
      setAppointmentTime(editingJob.appointmentTime);
      setServiceLocation(editingJob.serviceLocation);
      setEstimatedCost(String(editingJob.estimatedCost));
      setStatus(editingJob.status);
      setNotes(editingJob.notes);
    } else {
      const initialCustomerId = preselectedCustomerId || dataset.customers[0]?.id || '';
      const matchedCustomer = dataset.customers.find((c) => c.id === initialCustomerId);
      setCustomerId(initialCustomerId);
      setServiceDescription('');
      setServiceCategory(dataset.provider.serviceCategory);
      setAppointmentDate(preselectedDate || getTodayISO());
      setAppointmentTime('10:30');
      setServiceLocation(
        matchedCustomer
          ? [matchedCustomer.address, matchedCustomer.area].filter(Boolean).join(', ')
          : ''
      );
      setEstimatedCost('');
      setStatus('Confirmed');
      setNotes('');
    }
    setErrors({});
  }, [open, editingJob, preselectedCustomerId, preselectedDate, dataset.customers, dataset.provider.serviceCategory]);

  const handleCustomerChange = (nextId: string) => {
    setCustomerId(nextId);
    const found = dataset.customers.find((c) => c.id === nextId);
    if (found && !editingJob) {
      setServiceLocation([found.address, found.area].filter(Boolean).join(', '));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!customerId) nextErrors.customerId = 'Please select a customer.';
    if (!serviceDescription.trim())
      nextErrors.serviceDescription = 'Service description is required.';
    if (!appointmentDate) nextErrors.appointmentDate = 'Appointment date is required.';
    if (!appointmentTime) nextErrors.appointmentTime = 'Appointment time is required.';
    if (!serviceLocation.trim())
      nextErrors.serviceLocation = 'Service location is required.';
    const costNum = Number(estimatedCost);
    if (estimatedCost === '' || Number.isNaN(costNum) || costNum < 0) {
      nextErrors.estimatedCost = 'Enter a valid estimated cost (0 or greater).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (editingJob) {
      updateBooking(editingJob.id, {
        customerId,
        serviceDescription,
        serviceCategory,
        appointmentDate,
        appointmentTime,
        serviceLocation,
        estimatedCost: costNum,
        status,
        notes,
      });
    } else {
      addBooking({
        customerId,
        serviceDescription,
        serviceCategory,
        appointmentDate,
        appointmentTime,
        serviceLocation,
        estimatedCost: costNum,
        status,
        notes,
      });
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingJob ? 'Edit Booking' : 'Create Service Booking'}
      subtitle="Schedule a customer visit and track estimated job value."
      maxWidthClass="max-w-xl"
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
            form="booking-form"
            disabled={dataset.customers.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
          >
            {editingJob ? 'Save Booking' : 'Create Booking'}
          </button>
        </>
      }
    >
      {dataset.customers.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <p className="text-sm font-medium text-[#202938]">No customers added yet</p>
          <p className="text-xs text-[#6B7280]">
            Add your first customer in the Customers section before creating a booking.
          </p>
        </div>
      ) : (
        <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
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
                Service Category
              </label>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Service Description <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="e.g. Split AC Jet Servicing & Gas Check"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
            />
            {errors.serviceDescription && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.serviceDescription}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Date <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
              {errors.appointmentDate && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.appointmentDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Time <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
              {errors.appointmentTime && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.appointmentTime}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Estimated Cost (₹) <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="1500"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
              {errors.estimatedCost && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.estimatedCost}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#202938] mb-1">
                Service Location <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={serviceLocation}
                onChange={(e) => setServiceLocation(e.target.value)}
                placeholder="Flat / Street / Area"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              />
              {errors.serviceLocation && (
                <p className="text-xs text-[#DC2626] mt-1">{errors.serviceLocation}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#202938] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4]"
              >
                {JOB_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#202938] mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tools/spares to bring, customer instructions..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3478D4]/30 focus:border-[#3478D4] resize-none"
            />
          </div>
        </form>
      )}
    </Modal>
  );
}

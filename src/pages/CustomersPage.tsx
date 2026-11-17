import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Customer } from '../types';
import { useServEase } from '../hooks/useServEaseStore';
import { servEaseApi } from '../services/api';
import { formatCurrency, formatDateDisplay } from '../utils/formatters';
import { CustomerFormModal } from '../components/customers/CustomerFormModal';
import { CustomerProfileModal } from '../components/customers/CustomerProfileModal';
import { BookingFormModal } from '../components/bookings/BookingFormModal';
import { QuotationFormModal } from '../components/quotations/QuotationFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

export function CustomersPage() {
  const { dataset, deleteCustomer } = useServEase();

  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'jobs' | 'recent'>('recent');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [bookingCustomerId, setBookingCustomerId] = useState<string | undefined>();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [quoteCustomerId, setQuoteCustomerId] = useState<string | undefined>();
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    dataset.customers.forEach((c) => {
      if (c.area.trim()) set.add(c.area.trim());
    });
    return Array.from(set).sort();
  }, [dataset.customers]);

  const enrichedCustomers = useMemo(() => {
    return dataset.customers.map((customer) => {
      const metrics = servEaseApi.computeCustomerMetrics(
        customer,
        dataset.jobs,
        dataset.quotations,
        dataset.payments
      );
      return { customer, metrics };
    });
  }, [dataset.customers, dataset.jobs, dataset.quotations, dataset.payments]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = enrichedCustomers.filter(({ customer }) => {
      const matchesSearch =
        !q ||
        customer.name.toLowerCase().includes(q) ||
        customer.phone.toLowerCase().includes(q) ||
        customer.area.toLowerCase().includes(q) ||
        customer.address.toLowerCase().includes(q);

      const matchesArea = areaFilter === 'all' || customer.area.trim() === areaFilter;
      return matchesSearch && matchesArea;
    });

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.customer.name.localeCompare(b.customer.name);
      }
      if (sortBy === 'jobs') {
        return b.metrics.totalJobs - a.metrics.totalJobs;
      }
      const dateA = a.metrics.lastServiceDate || a.customer.createdAt.slice(0, 10);
      const dateB = b.metrics.lastServiceDate || b.customer.createdAt.slice(0, 10);
      return dateB.localeCompare(dateA);
    });

    return list;
  }, [enrichedCustomers, search, areaFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#6B7280] tabular-nums">
            {dataset.customers.length} total customer(s) in your directory
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCustomer(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E9F0] rounded-xl p-3.5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or area..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F7FA] border border-[#E5E9F0] rounded-lg focus:outline-none focus:bg-white focus:border-[#3478D4]"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <select
            aria-label="Filter by area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
          >
            <option value="all">All Areas</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort customers"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm bg-white border border-[#D1D5DB] rounded-lg focus:outline-none focus:border-[#3478D4]"
          >
            <option value="recent">Sort: Most Recent</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="jobs">Sort: Most Jobs</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      {dataset.customers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No customers yet"
          description="Add your first customer to track their service requests, bookings, quotations, and payment history."
          actionLabel="Add First Customer"
          onAction={() => {
            setEditingCustomer(null);
            setFormOpen(true);
          }}
        />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Search className="w-5 h-5" />}
          title="No matching customers"
          description="Try clearing your search text or choosing All Areas."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setAreaFilter('all');
          }}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-[#E5E9F0] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E9F0] bg-[#FAFBFD] text-xs font-semibold text-[#6B7280]">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Address / Area</th>
                    <th className="py-3 px-4 text-right">Total Jobs</th>
                    <th className="py-3 px-4">Last Service</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6]">
                  {filteredCustomers.map(({ customer, metrics }) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-[#FAFBFD] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(customer)}
                          className="font-semibold text-[#173B67] hover:underline text-left"
                        >
                          {customer.name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[#4B5563] tabular-nums whitespace-nowrap">
                        {customer.phone}
                      </td>
                      <td className="py-3 px-4 text-[#4B5563] max-w-xs truncate">
                        {customer.area || customer.address}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#202938] tabular-nums">
                        {metrics.totalJobs}
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] tabular-nums whitespace-nowrap">
                        {metrics.lastServiceDate
                          ? formatDateDisplay(metrics.lastServiceDate)
                          : 'No visits yet'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium tabular-nums whitespace-nowrap ${
                          metrics.outstandingBalance > 0
                            ? 'text-[#DC2626]'
                            : 'text-[#16A34A]'
                        }`}
                      >
                        {metrics.outstandingBalance > 0
                          ? formatCurrency(metrics.outstandingBalance)
                          : 'Settled'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingCustomer(customer)}
                            title="View profile"
                            aria-label={`View ${customer.name}`}
                            className="p-1.5 text-[#4B5563] hover:text-[#173B67] hover:bg-[#F5F7FA] rounded-md"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(customer);
                              setFormOpen(true);
                            }}
                            title="Edit customer"
                            aria-label={`Edit ${customer.name}`}
                            className="p-1.5 text-[#4B5563] hover:text-[#3478D4] hover:bg-[#F5F7FA] rounded-md"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCustomer(customer)}
                            title="Delete customer"
                            aria-label={`Delete ${customer.name}`}
                            className="p-1.5 text-[#4B5563] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredCustomers.map(({ customer, metrics }) => (
              <div
                key={customer.id}
                className="bg-white border border-[#E5E9F0] rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setViewingCustomer(customer)}
                      className="text-base font-semibold text-[#173B67] text-left"
                    >
                      {customer.name}
                    </button>
                    <p className="text-xs text-[#6B7280] mt-0.5 tabular-nums">
                      {customer.phone} · {customer.area || customer.address}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[#202938] tabular-nums shrink-0">
                    {metrics.totalJobs} job(s)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#EEF1F6] text-xs">
                  <span className="text-[#6B7280] tabular-nums">
                    Last:{' '}
                    {metrics.lastServiceDate
                      ? formatDateDisplay(metrics.lastServiceDate)
                      : 'None'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingCustomer(customer)}
                      className="px-2.5 py-1 font-medium text-[#173B67] bg-[#EFF6FF] rounded-md"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(customer);
                        setFormOpen(true);
                      }}
                      className="px-2.5 py-1 font-medium text-[#4B5563] bg-[#F5F7FA] rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCustomer(customer)}
                      className="px-2 py-1 font-medium text-[#DC2626]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingCustomer={editingCustomer}
      />

      <CustomerProfileModal
        customer={viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        onEditCustomer={(cust) => {
          setEditingCustomer(cust);
          setFormOpen(true);
        }}
        onCreateBooking={(custId) => {
          setBookingCustomerId(custId);
          setBookingModalOpen(true);
        }}
        onCreateQuotation={(custId) => {
          setQuoteCustomerId(custId);
          setQuoteModalOpen(true);
        }}
      />

      <BookingFormModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedCustomerId={bookingCustomerId}
      />

      <QuotationFormModal
        open={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        preselectedCustomerId={quoteCustomerId}
      />

      <ConfirmDialog
        open={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => {
          if (deletingCustomer) deleteCustomer(deletingCustomer.id);
        }}
        title="Delete Customer Record"
        message={`Are you sure you want to delete ${deletingCustomer?.name}? Related bookings, quotations, and payment records for this customer will also be removed.`}
        confirmLabel="Delete Customer"
      />
    </div>
  );
}

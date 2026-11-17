import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityLog,
  AppRoute,
  Customer,
  JobBooking,
  JobStatus,
  PaymentMethod,
  PaymentRecord,
  ProviderProfile,
  Quotation,
  QuotationItem,
  QuotationStatus,
  ServEaseDataset,
  ServiceCategory,
  ToastMessage,
} from '../types';
import {
  BusinessSetupPayload,
  LoginPayload,
  RegisterPayload,
  servEaseApi,
} from '../services/api';
import { demoStorage } from '../services/demoStorage';
import { generateId } from '../utils/formatters';

interface ServEaseContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  dataset: ServEaseDataset;
  activeRoute: AppRoute;
  setActiveRoute: (route: AppRoute) => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Auth actions
  login: (payload: LoginPayload) => { ok: boolean; error?: string };
  loginWithDemo: () => void;
  register: (payload: RegisterPayload) => void;
  completeSetup: (payload: BusinessSetupPayload) => void;
  logout: () => void;

  // Customer actions
  addCustomer: (input: {
    name: string;
    phone: string;
    address: string;
    area: string;
    notes: string;
  }) => Customer;
  updateCustomer: (
    id: string,
    updates: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'area' | 'notes'>>
  ) => void;
  deleteCustomer: (id: string) => void;

  // Booking / Job actions
  addBooking: (input: {
    customerId: string;
    serviceDescription: string;
    serviceCategory: ServiceCategory;
    appointmentDate: string;
    appointmentTime: string;
    serviceLocation: string;
    estimatedCost: number;
    notes: string;
    status?: JobStatus;
  }) => JobBooking;
  updateBooking: (
    id: string,
    updates: Partial<
      Pick<
        JobBooking,
        | 'customerId'
        | 'serviceDescription'
        | 'serviceCategory'
        | 'appointmentDate'
        | 'appointmentTime'
        | 'serviceLocation'
        | 'estimatedCost'
        | 'notes'
        | 'status'
      >
    >
  ) => void;
  updateJobStatus: (id: string, status: JobStatus) => void;

  // Quotation actions
  addQuotation: (input: {
    customerId: string;
    jobId?: string;
    date: string;
    serviceDescription: string;
    items: QuotationItem[];
    status: QuotationStatus;
    termsAndConditions: string;
    notes: string;
  }) => Quotation;
  updateQuotation: (
    id: string,
    updates: Partial<
      Pick<
        Quotation,
        | 'customerId'
        | 'jobId'
        | 'date'
        | 'serviceDescription'
        | 'items'
        | 'status'
        | 'termsAndConditions'
        | 'notes'
      >
    >
  ) => void;
  deleteQuotation: (id: string) => void;

  // Payment actions
  recordPayment: (input: {
    customerId: string;
    jobId: string;
    amount: number;
    method: PaymentMethod;
    paymentDate: string;
    notes: string;
  }) => PaymentRecord;
  deletePayment: (id: string) => void;

  // Settings actions
  updateProviderProfile: (updates: Partial<ProviderProfile>) => void;
  resetDemoData: () => void;
  clearWorkspaceData: () => void;
}

const ServEaseContext = createContext<ServEaseContextValue | null>(null);

export function ServEaseProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dataset, setDataset] = useState<ServEaseDataset>(() =>
    servEaseApi.getOrCreateDemoDataset()
  );
  const [activeRoute, setActiveRoute] = useState<AppRoute>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const session = servEaseApi.getSession();
    const loaded = servEaseApi.getOrCreateDemoDataset();
    setDataset(loaded);
    if (session?.authenticated) {
      setIsAuthenticated(true);
    }
    const timer = window.setTimeout(() => setIsLoading(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const commitDataset = useCallback((updater: (prev: ServEaseDataset) => ServEaseDataset) => {
    setDataset((prev) => {
      const next = updater(prev);
      servEaseApi.persistDataset(next);
      return next;
    });
  }, []);

  const createActivity = (
    providerId: string,
    type: ActivityLog['type'],
    title: string,
    description: string,
    relatedRoute?: AppRoute,
    relatedId?: string
  ): ActivityLog => ({
    id: generateId('act'),
    providerId,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
    relatedRoute,
    relatedId,
  });

  // Auth
  const login = useCallback(
    (payload: LoginPayload) => {
      const res = servEaseApi.login(payload);
      if (res.error) {
        return { ok: false, error: res.error };
      }
      setDataset(res.dataset);
      setIsAuthenticated(true);
      setActiveRoute('dashboard');
      pushToast({
        variant: 'success',
        title: `Welcome back, ${res.dataset.provider.fullName}`,
        description: res.dataset.provider.businessName,
      });
      return { ok: true };
    },
    [pushToast]
  );

  const loginWithDemo = useCallback(() => {
    const seeded = servEaseApi.signInWithDemoAccount(true);
    setDataset(seeded);
    setIsAuthenticated(true);
    setActiveRoute('dashboard');
    pushToast({
      variant: 'success',
      title: 'Signed in to Demo Workspace',
      description: `${seeded.provider.businessName} · Sample Pune records loaded`,
    });
  }, [pushToast]);

  const register = useCallback(
    (payload: RegisterPayload) => {
      const created = servEaseApi.register(payload);
      setDataset(created);
      setIsAuthenticated(true);
      pushToast({
        variant: 'success',
        title: 'Account created',
        description: 'Complete your business profile to get started.',
      });
    },
    [pushToast]
  );

  const completeSetup = useCallback(
    (payload: BusinessSetupPayload) => {
      const updated = servEaseApi.completeBusinessSetup(dataset, payload);
      setDataset(updated);
      setActiveRoute('dashboard');
      pushToast({
        variant: 'success',
        title: 'Business profile ready',
        description: updated.provider.businessName,
      });
    },
    [dataset, pushToast]
  );

  const logout = useCallback(() => {
    servEaseApi.logout();
    setIsAuthenticated(false);
    setActiveRoute('dashboard');
    pushToast({
      variant: 'info',
      title: 'Signed out safely',
    });
  }, [pushToast]);

  // Customers
  const addCustomer = useCallback(
    (input: { name: string; phone: string; address: string; area: string; notes: string }) => {
      const now = new Date().toISOString();
      const customer: Customer = {
        id: generateId('cust'),
        providerId: dataset.provider.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        area: input.area.trim(),
        notes: input.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      commitDataset((prev) => ({
        ...prev,
        customers: [customer, ...prev.customers],
        activities: [
          createActivity(
            prev.provider.id,
            'customer_added',
            'New customer added',
            `${customer.name} · ${customer.area || customer.phone}`,
            'customers',
            customer.id
          ),
          ...prev.activities,
        ],
      }));
      pushToast({
        variant: 'success',
        title: 'Customer added',
        description: customer.name,
      });
      return customer;
    },
    [commitDataset, dataset.provider.id, pushToast]
  );

  const updateCustomer = useCallback(
    (
      id: string,
      updates: Partial<Pick<Customer, 'name' | 'phone' | 'address' | 'area' | 'notes'>>
    ) => {
      commitDataset((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
        ),
      }));
      pushToast({ variant: 'success', title: 'Customer updated' });
    },
    [commitDataset, pushToast]
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      const target = dataset.customers.find((c) => c.id === id);
      commitDataset((prev) => ({
        ...prev,
        customers: prev.customers.filter((c) => c.id !== id),
        jobs: prev.jobs.filter((j) => j.customerId !== id),
        quotations: prev.quotations.filter((q) => q.customerId !== id),
        payments: prev.payments.filter((p) => p.customerId !== id),
      }));
      pushToast({
        variant: 'info',
        title: 'Customer removed',
        description: target?.name,
      });
    },
    [commitDataset, dataset.customers, pushToast]
  );

  // Jobs & Bookings
  const addBooking = useCallback(
    (input: {
      customerId: string;
      serviceDescription: string;
      serviceCategory: ServiceCategory;
      appointmentDate: string;
      appointmentTime: string;
      serviceLocation: string;
      estimatedCost: number;
      notes: string;
      status?: JobStatus;
    }) => {
      const now = new Date().toISOString();
      const booking: JobBooking = {
        id: generateId('job'),
        providerId: dataset.provider.id,
        customerId: input.customerId,
        serviceDescription: input.serviceDescription.trim(),
        serviceCategory: input.serviceCategory,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        serviceLocation: input.serviceLocation.trim(),
        estimatedCost: Math.max(0, Number(input.estimatedCost) || 0),
        status: input.status || 'Confirmed',
        notes: input.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      const customer = dataset.customers.find((c) => c.id === input.customerId);
      commitDataset((prev) => ({
        ...prev,
        jobs: [booking, ...prev.jobs],
        activities: [
          createActivity(
            prev.provider.id,
            'booking_created',
            'New booking scheduled',
            `${customer?.name || 'Customer'} · ${booking.serviceDescription}`,
            'bookings',
            booking.id
          ),
          ...prev.activities,
        ],
      }));
      pushToast({
        variant: 'success',
        title: 'Booking created',
        description: `${customer?.name || 'Customer'} · ${booking.appointmentDate}`,
      });
      return booking;
    },
    [commitDataset, dataset.customers, dataset.provider.id, pushToast]
  );

  const updateBooking = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          JobBooking,
          | 'customerId'
          | 'serviceDescription'
          | 'serviceCategory'
          | 'appointmentDate'
          | 'appointmentTime'
          | 'serviceLocation'
          | 'estimatedCost'
          | 'notes'
          | 'status'
        >
      >
    ) => {
      commitDataset((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === id
            ? {
                ...j,
                ...updates,
                completedAt:
                  updates.status === 'Completed'
                    ? j.completedAt || new Date().toISOString()
                    : j.completedAt,
                updatedAt: new Date().toISOString(),
              }
            : j
        ),
      }));
      pushToast({ variant: 'success', title: 'Booking updated' });
    },
    [commitDataset, pushToast]
  );

  const updateJobStatus = useCallback(
    (id: string, status: JobStatus) => {
      const target = dataset.jobs.find((j) => j.id === id);
      const customer = dataset.customers.find((c) => c.id === target?.customerId);
      commitDataset((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === id
            ? {
                ...j,
                status,
                completedAt:
                  status === 'Completed' ? new Date().toISOString() : j.completedAt,
                updatedAt: new Date().toISOString(),
              }
            : j
        ),
        activities:
          target && target.status !== status
            ? [
                createActivity(
                  prev.provider.id,
                  status === 'Completed' ? 'job_completed' : 'job_updated',
                  status === 'Completed'
                    ? 'Job marked completed'
                    : `Job status changed to ${status}`,
                  `${customer?.name || 'Customer'} · ${target.serviceDescription}`,
                  status === 'Completed' ? 'history' : 'bookings',
                  id
                ),
                ...prev.activities,
              ]
            : prev.activities,
      }));
      pushToast({
        variant: status === 'Cancelled' ? 'warning' : 'success',
        title: `Job marked as ${status}`,
        description: target?.serviceDescription,
      });
    },
    [commitDataset, dataset.customers, dataset.jobs, pushToast]
  );

  // Quotations
  const addQuotation = useCallback(
    (input: {
      customerId: string;
      jobId?: string;
      date: string;
      serviceDescription: string;
      items: QuotationItem[];
      status: QuotationStatus;
      termsAndConditions: string;
      notes: string;
    }) => {
      const now = new Date().toISOString();
      const totalAmount = input.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
        0
      );
      const quotationNumber = servEaseApi.getNextQuotationNumber(dataset.quotations);
      const quotation: Quotation = {
        id: generateId('qt'),
        providerId: dataset.provider.id,
        quotationNumber,
        customerId: input.customerId,
        jobId: input.jobId || undefined,
        date: input.date,
        serviceDescription: input.serviceDescription.trim(),
        items: input.items,
        totalAmount,
        status: input.status,
        termsAndConditions: input.termsAndConditions.trim(),
        notes: input.notes.trim(),
        createdAt: now,
        updatedAt: now,
      };
      const customer = dataset.customers.find((c) => c.id === input.customerId);
      commitDataset((prev) => ({
        ...prev,
        quotations: [quotation, ...prev.quotations],
        activities: [
          createActivity(
            prev.provider.id,
            'quotation_created',
            `Quotation ${quotationNumber} created`,
            `${customer?.name || 'Customer'} · ${quotation.serviceDescription}`,
            'quotations',
            quotation.id
          ),
          ...prev.activities,
        ],
      }));
      pushToast({
        variant: 'success',
        title: `Quotation ${quotationNumber} saved`,
        description: customer?.name,
      });
      return quotation;
    },
    [commitDataset, dataset.customers, dataset.provider.id, dataset.quotations, pushToast]
  );

  const updateQuotation = useCallback(
    (
      id: string,
      updates: Partial<
        Pick<
          Quotation,
          | 'customerId'
          | 'jobId'
          | 'date'
          | 'serviceDescription'
          | 'items'
          | 'status'
          | 'termsAndConditions'
          | 'notes'
        >
      >
    ) => {
      commitDataset((prev) => ({
        ...prev,
        quotations: prev.quotations.map((q) => {
          if (q.id !== id) return q;
          const items = updates.items ?? q.items;
          const totalAmount = items.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
            0
          );
          return {
            ...q,
            ...updates,
            items,
            totalAmount,
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      pushToast({ variant: 'success', title: 'Quotation updated' });
    },
    [commitDataset, pushToast]
  );

  const deleteQuotation = useCallback(
    (id: string) => {
      commitDataset((prev) => ({
        ...prev,
        quotations: prev.quotations.filter((q) => q.id !== id),
      }));
      pushToast({ variant: 'info', title: 'Quotation deleted' });
    },
    [commitDataset, pushToast]
  );

  // Payments
  const recordPayment = useCallback(
    (input: {
      customerId: string;
      jobId: string;
      amount: number;
      method: PaymentMethod;
      paymentDate: string;
      notes: string;
    }) => {
      const payment: PaymentRecord = {
        id: generateId('pay'),
        providerId: dataset.provider.id,
        customerId: input.customerId,
        jobId: input.jobId,
        amount: Math.max(0, Number(input.amount) || 0),
        method: input.method,
        paymentDate: input.paymentDate,
        notes: input.notes.trim(),
        createdAt: new Date().toISOString(),
      };
      const customer = dataset.customers.find((c) => c.id === input.customerId);
      const job = dataset.jobs.find((j) => j.id === input.jobId);
      commitDataset((prev) => ({
        ...prev,
        payments: [payment, ...prev.payments],
        activities: [
          createActivity(
            prev.provider.id,
            'payment_recorded',
            `Payment received (₹${payment.amount.toLocaleString('en-IN')})`,
            `${customer?.name || 'Customer'} · ${job?.serviceDescription || 'Service'} via ${payment.method}`,
            'payments',
            payment.id
          ),
          ...prev.activities,
        ],
      }));
      pushToast({
        variant: 'success',
        title: `Payment of ₹${payment.amount.toLocaleString('en-IN')} recorded`,
        description: `${customer?.name || 'Customer'} · ${payment.method}`,
      });
      return payment;
    },
    [commitDataset, dataset.customers, dataset.jobs, dataset.provider.id, pushToast]
  );

  const deletePayment = useCallback(
    (id: string) => {
      commitDataset((prev) => ({
        ...prev,
        payments: prev.payments.filter((p) => p.id !== id),
      }));
      pushToast({ variant: 'info', title: 'Payment entry removed' });
    },
    [commitDataset, pushToast]
  );

  // Settings
  const updateProviderProfile = useCallback(
    (updates: Partial<ProviderProfile>) => {
      commitDataset((prev) => ({
        ...prev,
        provider: {
          ...prev.provider,
          ...updates,
        },
      }));
      pushToast({ variant: 'success', title: 'Settings saved' });
    },
    [commitDataset, pushToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = demoStorage.resetToDemoSeed();
    setDataset(fresh);
    pushToast({
      variant: 'info',
      title: 'Demo dataset restored',
      description: 'Sample customers, bookings, quotations, and payments reloaded.',
    });
  }, [pushToast]);

  const clearWorkspaceData = useCallback(() => {
    const clean = demoStorage.clearAllDemoData(dataset.provider);
    setDataset(clean);
    pushToast({
      variant: 'info',
      title: 'Workspace cleared',
      description: 'All customer, job, quotation, and payment records removed.',
    });
  }, [dataset.provider, pushToast]);

  const value = useMemo<ServEaseContextValue>(
    () => ({
      isAuthenticated,
      isLoading,
      dataset,
      activeRoute,
      setActiveRoute,
      toasts,
      pushToast,
      dismissToast,
      login,
      loginWithDemo,
      register,
      completeSetup,
      logout,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addBooking,
      updateBooking,
      updateJobStatus,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      recordPayment,
      deletePayment,
      updateProviderProfile,
      resetDemoData,
      clearWorkspaceData,
    }),
    [
      isAuthenticated,
      isLoading,
      dataset,
      activeRoute,
      toasts,
      pushToast,
      dismissToast,
      login,
      loginWithDemo,
      register,
      completeSetup,
      logout,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addBooking,
      updateBooking,
      updateJobStatus,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      recordPayment,
      deletePayment,
      updateProviderProfile,
      resetDemoData,
      clearWorkspaceData,
    ]
  );

  return <ServEaseContext.Provider value={value}>{children}</ServEaseContext.Provider>;
}

export function useServEase(): ServEaseContextValue {
  const ctx = useContext(ServEaseContext);
  if (!ctx) {
    throw new Error('useServEase must be used within ServEaseProvider');
  }
  return ctx;
}

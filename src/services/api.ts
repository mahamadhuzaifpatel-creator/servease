import {
  Customer,
  JobBooking,
  PaymentRecord,
  ProviderProfile,
  Quotation,
  ServEaseDataset,
  ServiceCategory,
} from '../types';
import { buildDemoSeed, DEFAULT_AVATAR_URL } from '../data/demoSeed';
import { demoStorage } from './demoStorage';
import { generateId } from '../utils/formatters';

export interface LoginPayload {
  identifier: string; // email or phone
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  serviceCategory: ServiceCategory;
  serviceArea: string;
}

export interface BusinessSetupPayload {
  businessName: string;
  serviceCategory: ServiceCategory;
  serviceArea: string;
  businessPhone: string;
  businessEmail: string;
  businessDescription: string;
  defaultQuotationTerms: string;
  loadSampleData: boolean;
}

/**
 * Typed service adapter structured for seamless replacement with
 * FastAPI + Supabase Auth + PostgreSQL endpoints in production.
 */
export const servEaseApi = {
  getSession() {
    return demoStorage.loadSession();
  },

  getOrCreateDemoDataset(): ServEaseDataset {
    const existing = demoStorage.loadDataset();
    if (existing) return existing;
    return demoStorage.resetToDemoSeed();
  },

  signInWithDemoAccount(rememberMe = true): ServEaseDataset {
    const dataset = demoStorage.resetToDemoSeed();
    demoStorage.saveSession({
      authenticated: true,
      providerId: dataset.provider.id,
      rememberMe,
      lastSignedInAt: new Date().toISOString(),
    });
    return dataset;
  },

  login(payload: LoginPayload): { dataset: ServEaseDataset; error?: string } {
    const existing = demoStorage.loadDataset() ?? demoStorage.resetToDemoSeed();
    const idNorm = payload.identifier.trim().toLowerCase();
    const phoneNorm = payload.identifier.replace(/\s+/g, '');

    const matchesExisting =
      existing.provider.email.toLowerCase() === idNorm ||
      existing.provider.phone.replace(/\s+/g, '') === phoneNorm ||
      existing.provider.businessEmail.toLowerCase() === idNorm ||
      idNorm === 'rajesh@sharmacare.in';

    if (!matchesExisting) {
      return {
        dataset: existing,
        error:
          'No provider account found for that email or phone. Register a new account or use the Demo Provider sign-in below.',
      };
    }

    demoStorage.saveSession({
      authenticated: true,
      providerId: existing.provider.id,
      rememberMe: payload.rememberMe,
      lastSignedInAt: new Date().toISOString(),
    });
    return { dataset: existing };
  },

  register(payload: RegisterPayload): ServEaseDataset {
    const providerId = generateId('prov');
    const provider: ProviderProfile = {
      id: providerId,
      fullName: payload.fullName.trim(),
      businessName: payload.businessName.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      businessPhone: payload.phone.trim(),
      businessEmail: payload.email.trim(),
      serviceCategory: payload.serviceCategory,
      serviceArea: payload.serviceArea.trim(),
      businessDescription: `Independent ${payload.serviceCategory.toLowerCase()} serving ${payload.serviceArea.trim()}.`,
      defaultQuotationTerms:
        '1. Standard inspection charges apply if repair is declined.\n2. Workmanship guaranteed for 30 days.\n3. Payment due upon completion via UPI, Cash, or Bank Transfer.',
      avatarUrl: DEFAULT_AVATAR_URL,
      notifications: {
        bookingReminders: true,
        paymentAlerts: true,
        dailyScheduleSummary: true,
      },
      setupCompleted: false,
      createdAt: new Date().toISOString(),
    };

    const dataset: ServEaseDataset = {
      provider,
      customers: [],
      jobs: [],
      quotations: [],
      payments: [],
      activities: [],
    };

    demoStorage.saveDataset(dataset);
    demoStorage.saveSession({
      authenticated: true,
      providerId,
      rememberMe: true,
      lastSignedInAt: new Date().toISOString(),
    });

    return dataset;
  },

  completeBusinessSetup(
    currentDataset: ServEaseDataset,
    payload: BusinessSetupPayload
  ): ServEaseDataset {
    const updatedProvider: ProviderProfile = {
      ...currentDataset.provider,
      businessName: payload.businessName.trim(),
      serviceCategory: payload.serviceCategory,
      serviceArea: payload.serviceArea.trim(),
      businessPhone: payload.businessPhone.trim(),
      businessEmail: payload.businessEmail.trim(),
      businessDescription: payload.businessDescription.trim(),
      defaultQuotationTerms: payload.defaultQuotationTerms.trim(),
      setupCompleted: true,
    };

    let nextDataset: ServEaseDataset;
    if (payload.loadSampleData) {
      const seed = buildDemoSeed();
      nextDataset = {
        ...seed,
        provider: {
          ...updatedProvider,
          id: seed.provider.id,
        },
      };
    } else {
      nextDataset = {
        ...currentDataset,
        provider: updatedProvider,
      };
    }

    demoStorage.saveDataset(nextDataset);
    return nextDataset;
  },

  logout(): void {
    demoStorage.clearSession();
  },

  persistDataset(dataset: ServEaseDataset): void {
    demoStorage.saveDataset(dataset);
  },

  getNextQuotationNumber(quotations: Quotation[]): string {
    const year = new Date().getFullYear();
    const maxNum = quotations.reduce((max, q) => {
      const match = q.quotationNumber.match(/(\d+)$/);
      const num = match ? parseInt(match[1], 10) : 100;
      return Math.max(max, num);
    }, 100);
    return `QT-${year}-${maxNum + 1}`;
  },

  computeJobFinancials(
    job: JobBooking,
    quotations: Quotation[],
    payments: PaymentRecord[]
  ): {
    totalAmount: number;
    amountPaid: number;
    remainingBalance: number;
    paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid';
    linkedQuotation?: Quotation;
    jobPayments: PaymentRecord[];
  } {
    // Prefer accepted quotation amount if linked, otherwise estimated cost
    const linkedQuotes = quotations.filter((q) => q.jobId === job.id);
    const acceptedQuote = linkedQuotes.find((q) => q.status === 'Accepted');
    const latestQuote = linkedQuotes[0];
    const totalAmount = acceptedQuote
      ? acceptedQuote.totalAmount
      : job.estimatedCost;

    const jobPayments = payments
      .filter((p) => p.jobId === job.id)
      .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    const amountPaid = jobPayments.reduce((sum, p) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, totalAmount - amountPaid);

    let paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (totalAmount > 0 && amountPaid >= totalAmount) {
      paymentStatus = 'Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    return {
      totalAmount,
      amountPaid,
      remainingBalance,
      paymentStatus,
      linkedQuotation: acceptedQuote || latestQuote,
      jobPayments,
    };
  },

  computeCustomerMetrics(
    customer: Customer,
    jobs: JobBooking[],
    quotations: Quotation[],
    payments: PaymentRecord[]
  ) {
    const customerJobs = jobs.filter((j) => j.customerId === customer.id);
    const completedJobs = customerJobs.filter((j) => j.status === 'Completed');
    const sortedByDate = [...customerJobs].sort((a, b) =>
      b.appointmentDate.localeCompare(a.appointmentDate)
    );
    const lastServiceDate = sortedByDate[0]?.appointmentDate || '';

    const customerQuotations = quotations.filter(
      (q) => q.customerId === customer.id
    );
    const customerPayments = payments.filter(
      (p) => p.customerId === customer.id
    );

    const totalPaid = customerPayments.reduce((s, p) => s + p.amount, 0);
    const totalBilled = customerJobs
      .filter((j) => j.status !== 'Cancelled')
      .reduce((sum, job) => {
        const fin = this.computeJobFinancials(job, quotations, payments);
        return sum + fin.totalAmount;
      }, 0);

    return {
      totalJobs: customerJobs.length,
      completedJobsCount: completedJobs.length,
      lastServiceDate,
      customerJobs: sortedByDate,
      customerQuotations,
      customerPayments,
      totalPaid,
      outstandingBalance: Math.max(0, totalBilled - totalPaid),
    };
  },
};

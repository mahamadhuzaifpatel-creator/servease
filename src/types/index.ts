export type ServiceCategory =
  | 'Electrician'
  | 'Plumber'
  | 'Carpenter'
  | 'AC Technician'
  | 'Appliance Repair'
  | 'Painter'
  | 'Cleaning Professional'
  | 'General Maintenance';

export type JobStatus =
  | 'New'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

export type AppRoute =
  | 'dashboard'
  | 'customers'
  | 'bookings'
  | 'quotations'
  | 'payments'
  | 'history'
  | 'settings';

export interface NotificationPreferences {
  bookingReminders: boolean;
  paymentAlerts: boolean;
  dailyScheduleSummary: boolean;
}

export interface ProviderProfile {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  businessPhone: string;
  businessEmail: string;
  serviceCategory: ServiceCategory;
  serviceArea: string;
  businessDescription: string;
  defaultQuotationTerms: string;
  avatarUrl: string;
  notifications: NotificationPreferences;
  setupCompleted: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  providerId: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobBooking {
  id: string;
  providerId: string;
  customerId: string;
  serviceDescription: string;
  serviceCategory: ServiceCategory;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  serviceLocation: string;
  estimatedCost: number;
  status: JobStatus;
  notes: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quotation {
  id: string;
  providerId: string;
  quotationNumber: string;
  customerId: string;
  jobId?: string;
  date: string; // YYYY-MM-DD
  serviceDescription: string;
  items: QuotationItem[];
  totalAmount: number;
  status: QuotationStatus;
  termsAndConditions: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  providerId: string;
  customerId: string;
  jobId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
}

export type ActivityType =
  | 'customer_added'
  | 'booking_created'
  | 'job_completed'
  | 'job_updated'
  | 'quotation_created'
  | 'quotation_updated'
  | 'payment_recorded';

export interface ActivityLog {
  id: string;
  providerId: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO string
  relatedRoute?: AppRoute;
  relatedId?: string;
}

export interface ToastMessage {
  id: string;
  variant: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}

export interface ServEaseDataset {
  provider: ProviderProfile;
  customers: Customer[];
  jobs: JobBooking[];
  quotations: Quotation[];
  payments: PaymentRecord[];
  activities: ActivityLog[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'AC Technician',
  'Appliance Repair',
  'Painter',
  'Cleaning Professional',
  'General Maintenance',
];

export const JOB_STATUSES: JobStatus[] = [
  'New',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
];

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'Draft',
  'Sent',
  'Accepted',
  'Rejected',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Cash',
  'Bank Transfer',
  'Other',
];

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileEdit,
  Send,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { JobStatus, PaymentStatus, QuotationStatus } from '../../types';

export function JobStatusIndicator({ status }: { status: JobStatus }) {
  const config: Record<JobStatus, { color: string; icon: React.ReactNode }> = {
    New: {
      color: 'text-[#3478D4]',
      icon: <Sparkles className="w-3.5 h-3.5 shrink-0" />,
    },
    Confirmed: {
      color: 'text-[#173B67]',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    'In Progress': {
      color: 'text-[#D97706]',
      icon: <Wrench className="w-3.5 h-3.5 shrink-0" />,
    },
    Completed: {
      color: 'text-[#16A34A]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    Cancelled: {
      color: 'text-[#DC2626]',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${current.color}`}>
      {current.icon}
      <span>{status}</span>
    </span>
  );
}

export function QuotationStatusIndicator({ status }: { status: QuotationStatus }) {
  const config: Record<QuotationStatus, { color: string; icon: React.ReactNode }> = {
    Draft: {
      color: 'text-[#6B7280]',
      icon: <FileEdit className="w-3.5 h-3.5 shrink-0" />,
    },
    Sent: {
      color: 'text-[#3478D4]',
      icon: <Send className="w-3.5 h-3.5 shrink-0" />,
    },
    Accepted: {
      color: 'text-[#16A34A]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    Rejected: {
      color: 'text-[#DC2626]',
      icon: <XCircle className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${current.color}`}>
      {current.icon}
      <span>{status}</span>
    </span>
  );
}

export function PaymentStatusIndicator({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { color: string; icon: React.ReactNode }> = {
    Paid: {
      color: 'text-[#16A34A]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
    },
    'Partially Paid': {
      color: 'text-[#D97706]',
      icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
    },
    Unpaid: {
      color: 'text-[#DC2626]',
      icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" />,
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${current.color}`}>
      {current.icon}
      <span>{status}</span>
    </span>
  );
}

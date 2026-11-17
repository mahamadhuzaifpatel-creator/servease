import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { useServEase } from '../../hooks/useServEaseStore';

export function ToastContainer() {
  const { toasts, dismissToast } = useServEase();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const iconMap = {
          success: <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />,
          error: <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />,
          info: <Info className="w-4 h-4 text-[#3478D4] shrink-0 mt-0.5" />,
        };

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-white border border-[#E2E8F0] shadow-lg rounded-xl px-4 py-3 flex items-start gap-3 transition-all duration-150"
          >
            {iconMap[toast.variant]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#202938]">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-[#6B7280] mt-0.5 truncate">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-[#6B7280] hover:text-[#202938] p-1 rounded-md transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

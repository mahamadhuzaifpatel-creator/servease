import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-white border border-[#E5E9F0] rounded-xl px-6 py-12 text-center flex flex-col items-center justify-center">
      <div className="w-11 h-11 rounded-xl bg-[#F5F7FA] text-[#173B67] flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#202938]">{title}</h3>
      <p className="text-sm text-[#6B7280] mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium text-white bg-[#173B67] hover:bg-[#112C4E] rounded-lg transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

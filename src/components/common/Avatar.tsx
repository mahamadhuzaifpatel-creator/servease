import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  sizeClass?: string;
}

export function Avatar({ src, name, sizeClass = 'w-9 h-9' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'SE';

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-[#173B67] text-white text-xs font-semibold flex items-center justify-center shrink-0 select-none`}
        aria-label={name}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover border border-[#E5E9F0] shrink-0 bg-[#F5F7FA]`}
    />
  );
}

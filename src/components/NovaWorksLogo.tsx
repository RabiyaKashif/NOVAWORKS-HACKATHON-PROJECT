import React from 'react';

interface NovaWorksLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export const NovaWorksLogo: React.FC<NovaWorksLogoProps> = ({
  size = 'sm',
  showWordmark = true,
  className = '',
}) => {
  const iconSize = size === 'lg' ? 32 : size === 'md' ? 26 : 22;

  return (
    <span className={`inline-flex items-center gap-2.5 shrink-0 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="10" fill="#0d1b3e" />
        <ellipse
          cx="16"
          cy="16"
          rx="10.5"
          ry="4.8"
          transform="rotate(-28 16 16)"
          stroke="#9567ff"
          strokeWidth="1.5"
          strokeOpacity="0.85"
        />
        <circle cx="16" cy="16" r="3.4" fill="#ffffff" />
        <circle cx="24" cy="11.5" r="2.1" fill="#6344e7" stroke="#ffffff" strokeWidth="0.9" />
      </svg>
      {showWordmark && (
        <span
          className={`font-semibold tracking-tight text-[#0d1b3e] whitespace-nowrap ${
            size === 'lg' ? 'text-xl' : size === 'md' ? 'text-[17px]' : 'text-[15px]'
          }`}
        >
          NovaWorks
        </span>
      )}
    </span>
  );
};

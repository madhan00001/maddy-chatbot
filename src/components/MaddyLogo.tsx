import React, { useState } from 'react';
import logoImg from '../assets/logo.jpg';

interface MaddyLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  rounded?: 'md' | 'lg' | 'xl' | 'full';
}

export function MaddyLogo({
  className = '',
  size = 'md',
  showText = false,
  rounded = 'xl',
}: MaddyLogoProps) {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-14 h-14',
    xl: 'w-24 h-24',
  };

  const roundedClasses = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} ${roundedClasses[rounded]} overflow-hidden shrink-0 shadow-md ring-2 ring-sky-400/30 bg-white flex items-center justify-center`}
      >
        {!imgError ? (
          <img
            src={logoImg}
            alt="Maddy AI Logo"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          /* High-fidelity Vector Fallback matching the uploaded mascot */
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <circle cx="50" cy="50" r="46" fill="#1D4ED8" />
            <circle cx="50" cy="50" r="38" fill="#2563EB" />
            {/* Robot Head */}
            <rect x="26" y="24" width="48" height="40" rx="16" fill="#FFFFFF" />
            {/* Face Screen */}
            <rect x="32" y="30" width="36" height="28" rx="10" fill="#0F172A" />
            {/* Smiling Eyes */}
            <path d="M38 41 Q42 36 46 41" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 41 Q58 36 62 41" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
            {/* Smile Mouth */}
            <path d="M46 49 Q50 53 54 49" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            {/* Headphones */}
            <rect x="20" y="32" width="7" height="18" rx="3.5" fill="#38BDF8" />
            <rect x="73" y="32" width="7" height="18" rx="3.5" fill="#38BDF8" />
            {/* Antenna */}
            <path d="M50 24 V17" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="15" r="3.5" fill="#38BDF8" />
            {/* Speech bubble */}
            <rect x="68" y="44" width="22" height="15" rx="6" fill="#38BDF8" />
            <circle cx="74" cy="51.5" r="1.5" fill="#FFFFFF" />
            <circle cx="79" cy="51.5" r="1.5" fill="#FFFFFF" />
            <circle cx="84" cy="51.5" r="1.5" fill="#FFFFFF" />
          </svg>
        )}
      </div>

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-baseline leading-none">
            <span className="font-extrabold tracking-tight text-white text-base">Maddy</span>
            <span className="font-extrabold text-sky-400 text-base ml-1">ai</span>
          </div>
          <span className="text-[10px] text-sky-300/80 mt-0.5 font-medium leading-tight">
            Friendly Assistant
          </span>
        </div>
      )}
    </div>
  );
}

import type { SVGProps } from 'react';

type CurrencyKind = 'credits' | 'crypto' | 'ascension' | 'data';

interface CurrencyIconProps extends SVGProps<SVGSVGElement> {
  kind: CurrencyKind;
}

export function CurrencyIcon({ kind, className = 'h-4 w-4', ...props }: CurrencyIconProps) {
  if (kind === 'credits') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true" {...props}>
        <rect x="3" y="4" width="14" height="12" rx="4" fill="currentColor" opacity="0.14" />
        <path d="M6 7.5h8M6 12.5h5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="13.5" cy="12.5" r="1.6" fill="currentColor" />
        <circle cx="6.2" cy="7.5" r="1" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }

  if (kind === 'crypto') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true" {...props}>
        <path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6 2.5Z" fill="currentColor" opacity="0.14" />
        <path d="M10 2.5 16.5 6 10 9.5 3.5 6 10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M3.5 6v8L10 17.5l6.5-3.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M10 9.5v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'data') {
    return (
      <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true" {...props}>
        <ellipse cx="10" cy="5.5" rx="5.5" ry="2.5" fill="currentColor" opacity="0.14" />
        <path d="M4.5 5.5v8c0 1.4 2.46 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-8" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4.5 9.5c0 1.4 2.46 2.5 5.5 2.5s5.5-1.1 5.5-2.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true" {...props}>
      <path d="M10 3.2 13 7h4l-2.8 3.2 1.1 4-4.3-2.1-4.3 2.1 1.1-4L3 7h4l3-3.8Z" fill="currentColor" opacity="0.16" />
      <path d="M10 3.2 13 7h4l-2.8 3.2 1.1 4-4.3-2.1-4.3 2.1 1.1-4L3 7h4l3-3.8Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="M8 9.7h4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

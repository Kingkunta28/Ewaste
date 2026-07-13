export default function BrandMark({ compact = false }) {
  return (
    <span className="brand-mark">
      <span className="brand-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M16 4.5c4.2 3.5 6.2 6.7 6.2 9.7a6.2 6.2 0 0 1-12.4 0C9.8 11.2 11.8 8 16 4.5Z" fill="currentColor" />
          <path d="M8.2 16.5c-3.1 1.6-4.7 3.8-4.7 6.4 3.4.7 6 .1 7.8-1.8M23.8 16.5c3.1 1.6 4.7 3.8 4.7 6.4-3.4.7-6 .1-7.8-1.8M16 18v9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact ? <span>Smart E-Waste</span> : null}
    </span>
  );
}

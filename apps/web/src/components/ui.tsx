import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPORT_EMOJI } from '../api';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-brand animate-spin" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
      {message}
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold">
      <span className="inline-flex items-center gap-0.5 rounded bg-slate-800 text-white px-1.5 py-0.5">
        {rating.toFixed(1)} <span className="text-yellow-400">★</span>
      </span>
      {count != null && <span className="text-slate-400">({count} ratings)</span>}
    </span>
  );
}

export function SportIcon({ sport, size = 'text-2xl' }: { sport: string; size?: string }) {
  return <span className={size}>{SPORT_EMOJI[sport] ?? '🏟️'}</span>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-brand-light text-brand-ink flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: boolean;
  right?: ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
      {onBack && (
        <button
          onClick={() => nav(-1)}
          className="text-slate-500 text-2xl leading-none -ml-1 w-8"
          aria-label="Back"
        >
          ‹
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-slate-800 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

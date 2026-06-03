import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/explore', label: 'Explore', icon: '🔍' },
  { to: '/bookings', label: 'Bookings', icon: '🗓️' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // Hide bottom nav on deep flows with their own fixed bottom CTA
  const hideNav = /^\/(book|confirm|venue|game|host)/.test(pathname);

  return (
    <div className="mx-auto max-w-[480px] min-h-screen bg-slate-100 relative shadow-xl">
      <div className={hideNav ? '' : 'pb-20'}>{children}</div>

      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-200 grid grid-cols-4 z-30">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2.5 text-[11px] gap-0.5 ${
                  isActive ? 'text-brand font-semibold' : 'text-slate-400'
                }`
              }
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

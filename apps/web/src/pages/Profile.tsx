import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Booking, User } from '../api';
import { Avatar, Spinner, TopBar } from '../components/ui';
import InstallButton from '../components/InstallButton';

export default function Profile() {
  const [me, setMe] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.me(), api.bookings()])
      .then(([u, b]) => {
        setMe(u);
        setBookings(b.filter((x) => x.status === 'CONFIRMED'));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <TopBar title="Profile" />
      <div className="p-4 space-y-4">
        <div className="card p-5 flex items-center gap-4">
          <Avatar name={me?.name ?? '?'} size={56} />
          <div>
            <div className="text-lg font-bold text-slate-800">{me?.name}</div>
            <div className="text-sm text-slate-400">{me?.phone}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { k: 'Bookings', v: bookings.length },
            { k: 'Played', v: 0 },
            { k: 'Won', v: 0 },
          ].map((s) => (
            <div key={s.k} className="card p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{s.v}</div>
              <div className="text-xs text-slate-400">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="card divide-y divide-slate-100">
          <Link to="/bookings" className="flex items-center justify-between p-4">
            <span className="text-slate-700">🗓️ My Bookings</span>
            <span className="text-slate-300">›</span>
          </Link>
          <Link to="/host" className="flex items-center justify-between p-4">
            <span className="text-slate-700">🏸 Host a Game</span>
            <span className="text-slate-300">›</span>
          </Link>
          <Link to="/explore" className="flex items-center justify-between p-4">
            <span className="text-slate-700">🔍 Explore Venues</span>
            <span className="text-slate-300">›</span>
          </Link>
        </div>

        <div className="card p-4">
          <div className="text-sm font-semibold text-slate-700 mb-1">Install the app</div>
          <p className="text-xs text-slate-400 mb-2">
            Add CourtUp to your home screen for an app-like experience.
          </p>
          <InstallButton />
        </div>

        <p className="text-center text-xs text-slate-400 pt-2">
          CourtUp · demo build · no login required
        </p>
      </div>
    </div>
  );
}

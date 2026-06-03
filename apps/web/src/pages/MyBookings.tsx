import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, Booking, fmtHour } from '../api';
import { Spinner, TopBar } from '../components/ui';

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.bookings().then(setBookings).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    await api.cancelBooking(id);
    load();
  };

  const active = bookings.filter((b) => b.status === 'CONFIRMED');

  return (
    <div>
      <TopBar title="My Bookings" />
      {loading ? (
        <Spinner />
      ) : active.length === 0 ? (
        <div className="text-center py-20 px-8">
          <div className="text-5xl">🗓️</div>
          <p className="text-slate-500 mt-3">No bookings yet.</p>
          <Link to="/explore" className="btn-primary inline-block mt-4">
            Find a Court
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {active.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{b.facility.venue.name}</div>
                  <div className="text-sm text-slate-500">{b.facility.name}</div>
                </div>
                <span className="text-xs font-semibold text-brand bg-brand-light px-2 py-1 rounded">
                  {b.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                🗓️ {dayjs(b.date).format('ddd, D MMM YYYY')} · {fmtHour(b.startHour)} –{' '}
                {fmtHour(b.endHour)}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold">₹{b.price}</span>
                <button
                  onClick={() => cancel(b.id)}
                  className="text-red-500 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

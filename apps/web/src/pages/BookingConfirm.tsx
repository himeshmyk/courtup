import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, fmtHour } from '../api';
import { ErrorBox } from '../components/ui';

export default function BookingConfirm() {
  const { state } = useLocation() as {
    state: {
      facilityId: string;
      facilityName: string;
      venueName: string;
      date: string;
      hour: number;
      price: number;
    } | null;
  };
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!state) return <ErrorBox message="No slot selected. Go back and pick a slot." />;

  const convenience = 0;
  const total = state.price + convenience;

  const confirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.createBooking(state.facilityId, state.date, state.hour);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-8 bg-white">
        <div className="h-20 w-20 rounded-full bg-brand-light text-brand text-4xl flex items-center justify-center">
          ✓
        </div>
        <h1 className="text-xl font-bold text-slate-800 mt-4">Booking Confirmed!</h1>
        <p className="text-slate-500 mt-2 text-sm">
          {state.facilityName} at {state.venueName}
          <br />
          {dayjs(state.date).format('ddd, D MMM')} · {fmtHour(state.hour)}
        </p>
        <button onClick={() => nav('/bookings')} className="btn-primary mt-6 w-full max-w-xs">
          View My Bookings
        </button>
        <button onClick={() => nav('/')} className="mt-3 text-slate-400 text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-slate-500 text-2xl -ml-1 w-8">
          ‹
        </button>
        <h1 className="font-bold text-slate-800">Confirm Booking</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="card p-4">
          <div className="font-semibold text-slate-800">{state.venueName}</div>
          <div className="text-sm text-slate-500">{state.facilityName}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400 text-xs">Date</div>
              <div className="font-medium">{dayjs(state.date).format('ddd, D MMM YYYY')}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Time</div>
              <div className="font-medium">
                {fmtHour(state.hour)} – {fmtHour(state.hour + 1)}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Slot price</span>
            <span>₹{state.price}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Convenience fee</span>
            <span>₹{convenience}</span>
          </div>
          <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          💳 Payment is mocked for this demo — no real charge.
        </p>

        {error && <ErrorBox message={error} />}
      </div>

      <div className="p-4 border-t border-slate-100">
        <button onClick={confirm} disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Booking…' : `Pay ₹${total} & Confirm`}
        </button>
      </div>
    </div>
  );
}

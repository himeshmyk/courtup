import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, Availability, fmtHour } from '../api';
import { ErrorBox, Spinner } from '../components/ui';

interface Selected {
  date: string;
  hour: number;
  price: number;
}

export default function SlotGrid() {
  const { facilityId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState<Selected | null>(null);

  useEffect(() => {
    if (!facilityId) return;
    api
      .availability(facilityId, undefined, 7)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [facilityId]);

  if (loading) return <Spinner label="Loading slots…" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return <ErrorBox message="No availability" />;

  const now = dayjs();
  const isPast = (date: string, hour: number) =>
    dayjs(`${date}`).hour(hour).isBefore(now);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
        <button onClick={() => nav(-1)} className="text-slate-500 text-2xl -ml-1 w-8">
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 leading-tight">{data.facility.venueName}</h1>
          <p className="text-xs text-slate-400">
            {dayjs(data.from).format('DD MMM, YYYY')} ▾
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto no-scrollbar">
        <div className="inline-block min-w-full">
          {/* Day header row */}
          <div className="flex sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <div className="w-16 shrink-0" />
            {data.days.map((d) => (
              <div key={d.date} className="w-24 shrink-0 text-center py-2">
                <div className="font-bold text-slate-700 text-sm">{d.dow}</div>
                <div className="text-xs text-slate-400">{d.dom}</div>
              </div>
            ))}
          </div>

          {/* Hour rows */}
          {data.hours.map((hour) => (
            <div key={hour} className="flex border-b border-slate-100">
              {/* Time label */}
              <div className="w-16 shrink-0 px-1 py-3 text-center sticky left-0 bg-white z-[5]">
                <div className="text-[11px] font-semibold text-slate-600 leading-tight">
                  {fmtHour(hour)}
                </div>
                <div className="text-xs">{hour < 6 || hour >= 19 ? '🌙' : '☀️'}</div>
              </div>

              {data.days.map((d) => {
                const cell = data.slots[d.date]?.[hour];
                const past = isPast(d.date, hour);
                const selected = sel?.date === d.date && sel?.hour === hour;

                if (!cell || past) {
                  return (
                    <div key={d.date} className="w-24 shrink-0 p-1">
                      <div className="h-16 rounded-lg bg-slate-100" />
                    </div>
                  );
                }

                const full = cell.left === 0;
                return (
                  <div key={d.date} className="w-24 shrink-0 p-1">
                    <button
                      disabled={full}
                      onClick={() => setSel({ date: d.date, hour, price: cell.price })}
                      className={`h-16 w-full rounded-lg flex flex-col items-center justify-center text-center transition ${
                        selected
                          ? 'bg-brand text-white ring-2 ring-brand-dark'
                          : full
                            ? 'bg-red-50 text-red-400'
                            : 'bg-teal-50 text-brand-dark active:bg-teal-100'
                      }`}
                    >
                      <span className="font-bold text-sm">₹{cell.price}</span>
                      <span className="text-[11px]">
                        {full ? 'Full' : `${cell.left} left`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-brand text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{data.facility.name}</div>
          <div className="text-xs opacity-90">
            {sel
              ? `${dayjs(sel.date).format('ddd D MMM')} · ${fmtHour(sel.hour)} · ₹${sel.price}`
              : 'Select a slot to proceed'}
          </div>
        </div>
        <button
          disabled={!sel}
          onClick={() =>
            nav('/confirm', {
              state: {
                facilityId: data.facility.id,
                facilityName: data.facility.name,
                venueName: data.facility.venueName,
                ...sel,
              },
            })
          }
          className="bg-white text-brand font-bold rounded-lg px-5 py-2 disabled:opacity-50"
        >
          PROCEED
        </button>
      </div>
    </div>
  );
}

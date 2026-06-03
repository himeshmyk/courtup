import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, fmtHour, Venue } from '../api';
import { ErrorBox, SportIcon, Spinner, Stars, TopBar } from '../components/ui';

export default function VenueDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    api
      .venue(id)
      .then((v) => {
        setVenue(v);
        setSelected(v.facilities[0]?.id ?? '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner label="Loading venue…" />;
  if (error) return <ErrorBox message={error} />;
  if (!venue) return <ErrorBox message="Venue not found" />;

  return (
    <div className="pb-28">
      <div
        className="h-48 bg-slate-300 bg-cover bg-center relative"
        style={{ backgroundImage: venue.imageUrl ? `url(${venue.imageUrl})` : undefined }}
      >
        <button
          onClick={() => nav(-1)}
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-white/90 text-slate-700 text-xl"
        >
          ‹
        </button>
      </div>

      <div className="px-4 -mt-6">
        <div className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-bold text-slate-800">{venue.name}</h1>
            <Stars rating={venue.rating} count={venue.ratingCount} />
          </div>
          <p className="text-sm text-slate-400 mt-1">📍 {venue.area}</p>
          <div className="mt-2 flex items-center gap-2">
            {venue.sports.map((s) => (
              <span key={s} className="flex items-center gap-1 text-xs text-slate-500">
                <SportIcon sport={s} size="text-base" /> {s}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-brand font-semibold">🎒 Equipment Rental available</div>
        </div>
      </div>

      <section className="px-4 mt-5">
        <h2 className="text-sm font-bold text-brand tracking-wide">BOOK A SLOT</h2>
        <p className="text-xs text-slate-400 mt-1 mb-3">Select a facility to see available slots</p>

        <div className="space-y-2">
          {venue.facilities.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={`w-full card p-4 flex items-center justify-between text-left ${
                selected === f.id ? 'ring-2 ring-brand' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    selected === f.id ? 'border-brand' : 'border-slate-300'
                  }`}
                >
                  {selected === f.id && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                </span>
                <div>
                  <div className="font-medium text-slate-800">{f.name}</div>
                  <div className="text-xs text-slate-400">
                    {fmtHour(f.openHour)} to {fmtHour(f.closeHour)} · {f.courts} courts
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-800">₹{f.pricePerSlot}</div>
                <div className="text-xs text-slate-400">onwards</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-200 p-4">
        <button
          disabled={!selected}
          onClick={() => nav(`/book/${selected}`)}
          className="btn-primary w-full"
        >
          PROCEED
        </button>
      </div>
    </div>
  );
}

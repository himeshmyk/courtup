import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, Venue } from '../api';
import { ErrorBox, Spinner, TopBar } from '../components/ui';

export default function HostGame() {
  const nav = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [venueId, setVenueId] = useState('');
  const [sport, setSport] = useState('Badminton');
  const [format, setFormat] = useState('Doubles');
  const [gameType, setGameType] = useState('Friendly');
  const [date, setDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [time, setTime] = useState('19:00');
  const [duration, setDuration] = useState(60);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [perPlayerShare, setPerPlayerShare] = useState(150);

  useEffect(() => {
    api
      .venues()
      .then((v) => {
        setVenues(v);
        if (v[0]) setVenueId(v[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedVenue = venues.find((v) => v.id === venueId);
  const sportOptions = selectedVenue?.sports ?? ['Badminton'];

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const startsAt = dayjs(`${date} ${time}`).toISOString();
      const game = await api.createGame({
        venueId,
        sport: sportOptions.includes(sport) ? sport : sportOptions[0],
        gameType,
        format,
        startsAt,
        durationMins: duration,
        maxPlayers,
        perPlayerShare,
      });
      nav(`/game/${game.id}`);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  const field = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white';
  const label = 'text-xs font-semibold text-slate-500 mb-1 block';

  return (
    <div className="pb-28">
      <TopBar title="Host a Game" onBack />

      <div className="p-4 space-y-4">
        <div>
          <label className={label}>Venue</label>
          <select className={field} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Sport</label>
          <div className="flex gap-2 flex-wrap">
            {sportOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`chip ${
                  sport === s
                    ? 'bg-brand-light border-brand text-brand-ink'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Date</label>
            <input
              type="date"
              className={field}
              value={date}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className={label}>Start time</label>
            <input
              type="time"
              className={field}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Format</label>
            <select className={field} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>Singles</option>
              <option>Doubles</option>
            </select>
          </div>
          <div>
            <label className={label}>Game type</label>
            <select className={field} value={gameType} onChange={(e) => setGameType(e.target.value)}>
              <option>Friendly</option>
              <option>Competitive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Max players</label>
            <input
              type="number"
              min={2}
              max={20}
              className={field}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Per player (₹)</label>
            <input
              type="number"
              min={0}
              className={field}
              value={perPlayerShare}
              onChange={(e) => setPerPlayerShare(Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className={label}>Duration (mins)</label>
          <select
            className={field}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            <option value={60}>60</option>
            <option value={90}>90</option>
            <option value={120}>120</option>
          </select>
        </div>

        {error && <ErrorBox message={error} />}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-200 p-4">
        <button onClick={submit} disabled={submitting || !venueId} className="btn-primary w-full">
          {submitting ? 'Creating…' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}

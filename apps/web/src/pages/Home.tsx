import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Game, User, SPORT_EMOJI } from '../api';
import { GameCard } from '../components/cards';
import { Spinner } from '../components/ui';
import InstallButton from '../components/InstallButton';

const SPORTS = ['Badminton', 'Pickleball', 'Box Cricket', 'Football', 'Cricket Nets'];

export default function Home() {
  const [me, setMe] = useState<User | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([api.me(), api.games()])
      .then(([u, g]) => {
        setMe(u);
        setGames(g);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-br from-brand to-brand-dark text-white px-4 pt-5 pb-16 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">📍 Location</div>
            <div className="font-semibold">Sector 125, Noida ▾</div>
          </div>
          <Link
            to="/profile"
            className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            {me?.name?.[0] ?? '👤'}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 text-center">
          {[
            { k: 'Played', v: 0 },
            { k: 'Won', v: 0 },
            { k: 'Lost', v: 0 },
          ].map((s) => (
            <div key={s.k}>
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="text-xs opacity-80">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating "Host a Game" card */}
      <div className="px-4 -mt-10">
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏸</span>
            <div>
              <div className="font-semibold text-slate-800">Host a Game</div>
              <div className="text-xs text-slate-400">Invite players & split the cost</div>
            </div>
          </div>
          <Link
            to="/host"
            className="text-brand font-semibold text-sm border border-brand/30 rounded-lg px-3 py-1.5"
          >
            + Host
          </Link>
        </div>
      </div>

      {/* Pick a sport */}
      <section className="px-4 mt-6">
        <h2 className="text-sm font-bold text-slate-500 tracking-wide">PICK A SPORT</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => nav(`/explore?sport=${encodeURIComponent(s)}`)}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              <span className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-2xl">
                {SPORT_EMOJI[s] ?? '🏟️'}
              </span>
              <span className="text-[11px] text-slate-600 text-center leading-tight">{s}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Promo banner */}
      <section className="px-4 mt-5">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 relative overflow-hidden">
          <div className="text-xs uppercase tracking-widest opacity-80">CourtUp Series</div>
          <div className="text-2xl font-extrabold mt-1">Prize Pool ₹5 LAKH*</div>
          <div className="text-xs opacity-80 mt-1">Pickleball · Padel · Badminton</div>
        </div>
      </section>

      {/* Games near you */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-500 tracking-wide">GAMES NEAR YOU</h2>
          <Link to="/explore?tab=games" className="text-brand text-sm font-semibold">
            See All
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {loading ? (
            <Spinner />
          ) : games.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No open games right now. Host one!</p>
          ) : (
            games.slice(0, 3).map((g) => <GameCard key={g.id} game={g} />)
          )}
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="card p-4">
          <InstallButton />
        </div>
      </section>
    </div>
  );
}

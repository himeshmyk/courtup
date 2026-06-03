import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Game, Venue } from '../api';
import { GameCard, VenueCard } from '../components/cards';
import { Spinner, TopBar } from '../components/ui';

type Tab = 'all' | 'venues' | 'games';

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const sport = params.get('sport') ?? undefined;
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'all');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.venues(sport), api.games(sport)])
      .then(([v, g]) => {
        setVenues(v);
        setGames(g);
      })
      .finally(() => setLoading(false));
  }, [sport]);

  const clearSport = () => {
    params.delete('sport');
    setParams(params, { replace: true });
  };

  return (
    <div>
      <TopBar title="Explore" subtitle="Sector 125, Noida" />

      <div className="px-4 pt-3 flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'venues', 'games'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`chip capitalize ${
              tab === t
                ? 'bg-brand-light border-brand text-brand-ink'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {t}
          </button>
        ))}
        {sport && (
          <button
            onClick={clearSport}
            className="chip bg-slate-800 text-white border-slate-800"
          >
            {sport} ✕
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="px-4 py-4 space-y-6">
          {(tab === 'all' || tab === 'venues') && (
            <section>
              <h2 className="text-sm font-bold text-slate-500 tracking-wide mb-3">
                VENUES {sport ? `· ${sport}` : ''}
              </h2>
              <div className="space-y-3">
                {venues.length === 0 ? (
                  <p className="text-sm text-slate-400">No venues found.</p>
                ) : (
                  venues.map((v) => <VenueCard key={v.id} venue={v} />)
                )}
              </div>
            </section>
          )}

          {(tab === 'all' || tab === 'games') && (
            <section>
              <h2 className="text-sm font-bold text-slate-500 tracking-wide mb-3">
                OPEN GAMES {sport ? `· ${sport}` : ''}
              </h2>
              <div className="space-y-3">
                {games.length === 0 ? (
                  <p className="text-sm text-slate-400">No open games.</p>
                ) : (
                  games.map((g) => <GameCard key={g.id} game={g} />)
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

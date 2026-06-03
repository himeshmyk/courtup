import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { api, Game } from '../api';
import { Avatar, ErrorBox, SportIcon, Spinner, TopBar } from '../components/ui';

export default function GameDetail() {
  const { id } = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .game(id)
      .then(setGame)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;
  if (!game) return <ErrorBox message="Game not found" />;

  const full = game.joinedCount >= game.maxPlayers;

  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = game.isJoined ? await api.leaveGame(game.id) : await api.joinGame(game.id);
      setGame(updated);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-28">
      <TopBar title={`${game.sport} Game`} onBack right={<SportIcon sport={game.sport} />} />

      <div className="bg-gradient-to-br from-brand to-brand-dark text-white px-4 py-4">
        <div className="text-sm opacity-90">
          🗓️ {dayjs(game.startsAt).format('ddd, D MMM')} · {dayjs(game.startsAt).format('h:mm A')} –{' '}
          {dayjs(game.endsAt).format('h:mm A')}
        </div>
        <div className="text-xs opacity-80 mt-1">📍 {game.venue?.name}</div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className="card p-4 flex items-center gap-3">
          <Avatar name={game.host?.name ?? '?'} />
          <div>
            <div className="font-semibold text-slate-800">{game.host?.name}</div>
            <div className="text-xs text-brand font-medium">Game Host</div>
          </div>
        </div>

        <div className="card p-4 grid grid-cols-2 divide-x divide-slate-100">
          <div className="text-center">
            <div className="text-xs text-slate-400">Per player share</div>
            <div className="font-bold text-amber-600">🪙 ₹{game.perPlayerShare}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Game type</div>
            <div className="font-semibold text-slate-700">
              {game.gameType} · {game.format}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-wide mb-2">
            PLAYERS ({game.joinedCount}/{game.maxPlayers} joined)
          </h2>
          <div className="card p-4 flex flex-wrap gap-4">
            {game.players.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1 w-14">
                <Avatar name={p.name} />
                <span className="text-xs text-slate-600 truncate w-full text-center">{p.name}</span>
              </div>
            ))}
            {Array.from({ length: Math.max(game.maxPlayers - game.joinedCount, 0) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-14">
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  +
                </div>
                <span className="text-xs text-slate-300">Open</span>
              </div>
            ))}
          </div>
        </div>

        {error && <ErrorBox message={error} />}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-slate-200 p-4">
        <button
          onClick={toggle}
          disabled={busy || (!game.isJoined && full)}
          className={`w-full font-semibold rounded-xl px-5 py-3 ${
            game.isJoined
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'btn-primary'
          } disabled:opacity-50`}
        >
          {busy
            ? '…'
            : game.isJoined
              ? 'Leave Game'
              : full
                ? 'Game Full'
                : 'Join Game'}
        </button>
      </div>
    </div>
  );
}

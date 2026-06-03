import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Game, Venue } from '../api';
import { Avatar, SportIcon, Stars } from './ui';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <div className="card overflow-hidden flex">
      <div
        className="w-28 bg-slate-200 bg-cover bg-center shrink-0"
        style={{ backgroundImage: venue.imageUrl ? `url(${venue.imageUrl})` : undefined }}
      />
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-800 leading-tight">{venue.name}</h3>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Stars rating={venue.rating} />
          <span className="text-xs text-slate-400">📍 {venue.city}</span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          {venue.sports.slice(0, 3).map((s) => (
            <SportIcon key={s} sport={s} size="text-base" />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm">
            <span className="font-bold text-slate-800">₹{venue.priceFrom}</span>
            <span className="text-xs text-slate-400"> onwards</span>
          </span>
          <Link
            to={`/venue/${venue.id}`}
            className="bg-brand text-white text-sm font-semibold rounded-lg px-4 py-1.5"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GameCard({ game }: { game: Game }) {
  const pct = Math.round((game.joinedCount / game.maxPlayers) * 100);
  return (
    <Link to={`/game/${game.id}`} className="card p-4 block">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SportIcon sport={game.sport} size="text-xl" />
          <span className="font-semibold text-slate-800">{game.sport} game</span>
        </div>
        <span className="chip border-slate-200 text-slate-500 !py-0.5 !px-2.5 text-xs">
          {game.format}
        </span>
      </div>
      <div className="mt-2 text-sm text-slate-500 space-y-1">
        <div>📍 {game.venue?.name ?? 'TBD'}</div>
        <div>🗓️ {dayjs(game.startsAt).format('ddd, D MMM · h:mm A')}</div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar name={game.host?.name ?? '?'} size={28} />
          <div className="text-xs">
            <div className="text-slate-400">Host</div>
            <div className="font-medium text-slate-700">{game.host?.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-amber-600 font-semibold">
            ₹{game.perPlayerShare}/player
          </div>
          <div className="text-xs text-slate-400">
            {game.joinedCount}/{game.maxPlayers} joined
          </div>
        </div>
      </div>
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

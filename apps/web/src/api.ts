// API client + shared types. In dev, requests go to /api (Vite proxy -> :4000).
// In prod, set VITE_API_BASE to the API origin (e.g. https://courtup-api.run.app).
const BASE = import.meta.env.VITE_API_BASE ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---- Types ----
export interface User {
  id: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Facility {
  id: string;
  venueId: string;
  name: string;
  sport: string;
  openHour: number;
  closeHour: number;
  pricePerSlot: number;
  courts: number;
}

export interface Venue {
  id: string;
  name: string;
  area: string;
  city: string;
  rating: number;
  ratingCount: number;
  imageUrl?: string | null;
  sports: string[];
  priceFrom: number;
  facilities: Facility[];
}

export interface SlotCell {
  price: number;
  left: number;
  total: number;
}

export interface Availability {
  facility: {
    id: string;
    name: string;
    sport: string;
    pricePerSlot: number;
    courts: number;
    openHour: number;
    closeHour: number;
    venueName: string;
  };
  from: string;
  days: { date: string; dow: string; dom: string }[];
  hours: number[];
  slots: Record<string, Record<number, SlotCell>>;
}

export interface Booking {
  id: string;
  facilityId: string;
  date: string;
  startHour: number;
  endHour: number;
  price: number;
  status: string;
  facility: Facility & { venue: Venue };
}

export interface GamePlayer {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Game {
  id: string;
  sport: string;
  gameType: string;
  format: string;
  startsAt: string;
  endsAt: string;
  maxPlayers: number;
  perPlayerShare: number;
  notes?: string | null;
  host: GamePlayer | null;
  venue: { id: string; name: string; area: string } | null;
  players: GamePlayer[];
  joinedCount: number;
  isJoined: boolean;
}

// ---- Endpoints ----
export const api = {
  me: () => req<User>('/api/me'),
  sports: () => req<string[]>('/api/sports'),
  venues: (sport?: string) =>
    req<Venue[]>(`/api/venues${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`),
  venue: (id: string) => req<Venue>(`/api/venues/${id}`),
  availability: (facilityId: string, from?: string, days = 7) =>
    req<Availability>(
      `/api/facilities/${facilityId}/availability?days=${days}${from ? `&from=${from}` : ''}`,
    ),
  createBooking: (facilityId: string, date: string, startHour: number) =>
    req<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ facilityId, date, startHour }),
    }),
  bookings: () => req<Booking[]>('/api/bookings'),
  cancelBooking: (id: string) =>
    req<{ ok: true }>(`/api/bookings/${id}`, { method: 'DELETE' }),
  games: (sport?: string) =>
    req<Game[]>(`/api/games${sport ? `?sport=${encodeURIComponent(sport)}` : ''}`),
  game: (id: string) => req<Game>(`/api/games/${id}`),
  createGame: (data: {
    venueId: string;
    sport: string;
    gameType: string;
    format: string;
    startsAt: string;
    durationMins: number;
    maxPlayers: number;
    perPlayerShare: number;
    notes?: string;
  }) => req<Game>('/api/games', { method: 'POST', body: JSON.stringify(data) }),
  joinGame: (id: string) => req<Game>(`/api/games/${id}/join`, { method: 'POST' }),
  leaveGame: (id: string) => req<Game>(`/api/games/${id}/leave`, { method: 'POST' }),
};

// ---- Helpers ----
export function fmtHour(h: number): string {
  const hour = h % 24;
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${period}`;
}

export const SPORT_EMOJI: Record<string, string> = {
  Badminton: '🏸',
  Pickleball: '🥒',
  'Box Cricket': '🏏',
  Football: '⚽',
  'Cricket Nets': '🏏',
  Tennis: '🎾',
};

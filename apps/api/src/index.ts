import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma, CURRENT_USER_ID } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 4000;

/** Wrap async handlers so thrown errors hit the error middleware. */
const h =
  (fn: (req: express.Request, res: express.Response) => Promise<unknown>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) =>
    fn(req, res).catch(next);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// --- Current user (placeholder for future auth) ---
app.get(
  '/api/me',
  h(async (_req, res) => {
    const me = await prisma.user.findUnique({ where: { id: CURRENT_USER_ID } });
    res.json(me);
  }),
);

// --- Sports list (for "Pick a Sport") derived from venues ---
app.get(
  '/api/sports',
  h(async (_req, res) => {
    const venues = await prisma.venue.findMany({ select: { sports: true } });
    const set = new Set<string>();
    venues.forEach((v) => v.sports.split(',').forEach((s) => set.add(s.trim())));
    res.json([...set]);
  }),
);

// --- Venues ---
app.get(
  '/api/venues',
  h(async (req, res) => {
    const sport = (req.query.sport as string | undefined)?.trim();
    const venues = await prisma.venue.findMany({
      orderBy: { rating: 'desc' },
      include: { facilities: true },
    });
    const filtered = sport
      ? venues.filter((v) =>
          v.sports
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .includes(sport.toLowerCase()),
        )
      : venues;
    res.json(
      filtered.map((v) => ({
        ...v,
        sports: v.sports.split(',').map((s) => s.trim()),
      })),
    );
  }),
);

app.get(
  '/api/venues/:id',
  h(async (req, res) => {
    const v = await prisma.venue.findUnique({
      where: { id: req.params.id },
      include: { facilities: { orderBy: { pricePerSlot: 'asc' } } },
    });
    if (!v) return res.status(404).json({ error: 'Venue not found' });
    res.json({ ...v, sports: v.sports.split(',').map((s) => s.trim()) });
  }),
);

// --- Slot-grid availability for a facility ---
// GET /api/facilities/:id/availability?from=YYYY-MM-DD&days=7
app.get(
  '/api/facilities/:id/availability',
  h(async (req, res) => {
    const facility = await prisma.facility.findUnique({
      where: { id: req.params.id },
      include: { venue: true },
    });
    if (!facility) return res.status(404).json({ error: 'Facility not found' });

    const from = (req.query.from as string) || dayjs().format('YYYY-MM-DD');
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 14);

    const dates = Array.from({ length: days }, (_, i) =>
      dayjs(from).add(i, 'day').format('YYYY-MM-DD'),
    );

    const bookings = await prisma.booking.findMany({
      where: {
        facilityId: facility.id,
        status: 'CONFIRMED',
        date: { in: dates },
      },
      select: { date: true, startHour: true },
    });

    // Count booked courts per date+hour
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const key = `${b.date}|${b.startHour}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    const slots: Record<string, Record<number, { price: number; left: number; total: number }>> =
      {};
    for (const date of dates) {
      slots[date] = {};
      for (let hour = facility.openHour; hour < facility.closeHour; hour++) {
        const booked = counts[`${date}|${hour}`] || 0;
        slots[date][hour] = {
          price: facility.pricePerSlot,
          left: Math.max(facility.courts - booked, 0),
          total: facility.courts,
        };
      }
    }

    res.json({
      facility: {
        id: facility.id,
        name: facility.name,
        sport: facility.sport,
        pricePerSlot: facility.pricePerSlot,
        courts: facility.courts,
        openHour: facility.openHour,
        closeHour: facility.closeHour,
        venueName: facility.venue.name,
      },
      from,
      days: dates.map((d) => ({
        date: d,
        dow: dayjs(d).format('ddd'),
        dom: dayjs(d).format('DD'),
      })),
      hours: Array.from(
        { length: facility.closeHour - facility.openHour },
        (_, i) => facility.openHour + i,
      ),
      slots,
    });
  }),
);

// --- Bookings ---
app.post(
  '/api/bookings',
  h(async (req, res) => {
    const { facilityId, date, startHour } = req.body as {
      facilityId?: string;
      date?: string;
      startHour?: number;
    };
    if (!facilityId || !date || startHour == null)
      return res.status(400).json({ error: 'facilityId, date, startHour required' });

    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) return res.status(404).json({ error: 'Facility not found' });

    const booked = await prisma.booking.count({
      where: { facilityId, date, startHour, status: 'CONFIRMED' },
    });
    if (booked >= facility.courts)
      return res.status(409).json({ error: 'Slot full' });

    const booking = await prisma.booking.create({
      data: {
        facilityId,
        userId: CURRENT_USER_ID,
        date,
        startHour,
        endHour: startHour + 1,
        price: facility.pricePerSlot,
      },
      include: { facility: { include: { venue: true } } },
    });
    res.status(201).json(booking);
  }),
);

app.get(
  '/api/bookings',
  h(async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { userId: CURRENT_USER_ID },
      orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
      include: { facility: { include: { venue: true } } },
    });
    res.json(bookings);
  }),
);

app.delete(
  '/api/bookings/:id',
  h(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking || booking.userId !== CURRENT_USER_ID)
      return res.status(404).json({ error: 'Booking not found' });
    await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ ok: true });
  }),
);

// --- Games ---
const shapeGame = (g: any) => ({
  id: g.id,
  sport: g.sport,
  gameType: g.gameType,
  format: g.format,
  startsAt: g.startsAt,
  endsAt: g.endsAt,
  maxPlayers: g.maxPlayers,
  perPlayerShare: g.perPlayerShare,
  notes: g.notes,
  host: g.host ? { id: g.host.id, name: g.host.name, avatarUrl: g.host.avatarUrl } : null,
  venue: g.venue ? { id: g.venue.id, name: g.venue.name, area: g.venue.area } : null,
  players: (g.players || []).map((p: any) => ({
    id: p.user.id,
    name: p.user.name,
    avatarUrl: p.user.avatarUrl,
  })),
  joinedCount: (g.players || []).length,
  isJoined: (g.players || []).some((p: any) => p.userId === CURRENT_USER_ID),
});

app.get(
  '/api/games',
  h(async (req, res) => {
    const sport = (req.query.sport as string | undefined)?.trim();
    const games = await prisma.game.findMany({
      where: { startsAt: { gte: dayjs().startOf('day').toDate() } },
      orderBy: { startsAt: 'asc' },
      include: { host: true, venue: true, players: { include: { user: true } } },
    });
    const shaped = games.map(shapeGame);
    res.json(sport ? shaped.filter((g) => g.sport.toLowerCase() === sport.toLowerCase()) : shaped);
  }),
);

app.get(
  '/api/games/:id',
  h(async (req, res) => {
    const g = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { host: true, venue: true, players: { include: { user: true } } },
    });
    if (!g) return res.status(404).json({ error: 'Game not found' });
    res.json(shapeGame(g));
  }),
);

app.post(
  '/api/games',
  h(async (req, res) => {
    const { venueId, sport, gameType, format, startsAt, durationMins, maxPlayers, perPlayerShare, notes } =
      req.body as any;
    if (!venueId || !sport || !startsAt)
      return res.status(400).json({ error: 'venueId, sport, startsAt required' });

    const start = dayjs(startsAt);
    const game = await prisma.game.create({
      data: {
        hostId: CURRENT_USER_ID,
        venueId,
        sport,
        gameType: gameType || 'Friendly',
        format: format || 'Doubles',
        startsAt: start.toDate(),
        endsAt: start.add(Number(durationMins) || 60, 'minute').toDate(),
        maxPlayers: Number(maxPlayers) || 4,
        perPlayerShare: Number(perPlayerShare) || 0,
        notes: notes || null,
        players: { create: [{ userId: CURRENT_USER_ID }] }, // host auto-joins
      },
      include: { host: true, venue: true, players: { include: { user: true } } },
    });
    res.status(201).json(shapeGame(game));
  }),
);

app.post(
  '/api/games/:id/join',
  h(async (req, res) => {
    const g = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: { players: true },
    });
    if (!g) return res.status(404).json({ error: 'Game not found' });
    if (g.players.some((p) => p.userId === CURRENT_USER_ID))
      return res.status(409).json({ error: 'Already joined' });
    if (g.players.length >= g.maxPlayers)
      return res.status(409).json({ error: 'Game full' });
    await prisma.gamePlayer.create({ data: { gameId: g.id, userId: CURRENT_USER_ID } });
    const updated = await prisma.game.findUnique({
      where: { id: g.id },
      include: { host: true, venue: true, players: { include: { user: true } } },
    });
    res.json(shapeGame(updated));
  }),
);

app.post(
  '/api/games/:id/leave',
  h(async (req, res) => {
    const g = await prisma.game.findUnique({ where: { id: req.params.id } });
    if (!g) return res.status(404).json({ error: 'Game not found' });
    await prisma.gamePlayer.deleteMany({
      where: { gameId: g.id, userId: CURRENT_USER_ID },
    });
    const updated = await prisma.game.findUnique({
      where: { id: g.id },
      include: { host: true, venue: true, players: { include: { user: true } } },
    });
    res.json(shapeGame(updated));
  }),
);

// --- Serve the built web app in production (single-container deploy) ---
// Set SERVE_STATIC=true (or NODE_ENV=production) so one URL serves both the
// PWA and the API — ideal for ngrok / Cloud Run. Dev uses the Vite proxy.
if (process.env.SERVE_STATIC === 'true' || process.env.NODE_ENV === 'production') {
  const webDist = path.resolve(__dirname, '../../web/dist');
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDist, 'index.html'));
  });
  console.log(`Serving static web app from ${webDist}`);
}

// --- Error handler ---
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal error' });
  },
);

app.listen(PORT, () => {
  console.log(`CourtUp API listening on http://localhost:${PORT}`);
});

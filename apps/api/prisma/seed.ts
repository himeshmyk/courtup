import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient();

async function main() {
  // Wipe (idempotent re-seed)
  await prisma.gamePlayer.deleteMany();
  await prisma.game.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // --- Users (no auth: "Himesh" is the implicit current user) ---
  const himesh = await prisma.user.create({
    data: { id: 'me', name: 'Himesh', phone: '+919999900001', avatarUrl: null },
  });
  const om = await prisma.user.create({
    data: { name: 'Om', phone: '+919999900002' },
  });
  const sambhav = await prisma.user.create({
    data: { name: 'Sambhav', phone: '+919999900003' },
  });

  // --- Venues + facilities ---
  const smashPoint = await prisma.venue.create({
    data: {
      name: 'Smash Point Badminton Academy',
      area: 'Sector 63A, Noida',
      city: 'Noida',
      rating: 4.2,
      ratingCount: 18,
      imageUrl:
        'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80',
      sports: 'Badminton',
      priceFrom: 350,
      facilities: {
        create: [
          {
            name: 'Badminton (Synthetic+Wooden)',
            sport: 'Badminton',
            openHour: 5,
            closeHour: 24,
            pricePerSlot: 350,
            courts: 4,
          },
          {
            name: 'Badminton (Center Court)',
            sport: 'Badminton',
            openHour: 5,
            closeHour: 24,
            pricePerSlot: 375,
            courts: 2,
          },
        ],
      },
    },
    include: { facilities: true },
  });

  const arena44 = await prisma.venue.create({
    data: {
      name: 'Arena 44',
      area: 'Sector 44, Noida',
      city: 'Noida',
      rating: 3.2,
      ratingCount: 9,
      imageUrl:
        'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=800&q=80',
      sports: 'Badminton,Pickleball,Box Cricket',
      priceFrom: 250,
      facilities: {
        create: [
          {
            name: 'Badminton (Synthetic)',
            sport: 'Badminton',
            openHour: 6,
            closeHour: 23,
            pricePerSlot: 250,
            courts: 3,
          },
          {
            name: 'Pickleball Court',
            sport: 'Pickleball',
            openHour: 6,
            closeHour: 23,
            pricePerSlot: 300,
            courts: 2,
          },
        ],
      },
    },
    include: { facilities: true },
  });

  const skyBeam = await prisma.venue.create({
    data: {
      name: 'Sky Beam Sector 45',
      area: 'Sector 45, Noida',
      city: 'Noida',
      rating: 4.5,
      ratingCount: 26,
      imageUrl:
        'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80',
      sports: 'Badminton',
      priceFrom: 300,
      facilities: {
        create: [
          {
            name: 'Badminton (Wooden)',
            sport: 'Badminton',
            openHour: 5,
            closeHour: 24,
            pricePerSlot: 300,
            courts: 4,
          },
        ],
      },
    },
    include: { facilities: true },
  });

  const rackonnect = await prisma.venue.create({
    data: {
      name: 'Rackonnect Next Level | Sector 45',
      area: 'Sector 45, Noida',
      city: 'Noida',
      rating: 3.9,
      ratingCount: 14,
      imageUrl:
        'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?w=800&q=80',
      sports: 'Badminton,Football',
      priceFrom: 283,
      facilities: {
        create: [
          {
            name: 'Badminton (Synthetic)',
            sport: 'Badminton',
            openHour: 6,
            closeHour: 24,
            pricePerSlot: 283,
            courts: 6,
          },
          {
            name: 'Football Turf (5-a-side)',
            sport: 'Football',
            openHour: 6,
            closeHour: 24,
            pricePerSlot: 1200,
            courts: 1,
          },
        ],
      },
    },
    include: { facilities: true },
  });

  // --- Sample existing bookings (so "X left" varies, matching the screenshot) ---
  const synthetic = smashPoint.facilities.find((f) =>
    f.name.includes('Synthetic+Wooden'),
  )!;
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

  // 6AM tomorrow fully booked (all 4 courts) -> red/unavailable
  for (let i = 0; i < 4; i++) {
    await prisma.booking.create({
      data: {
        facilityId: synthetic.id,
        userId: [om.id, sambhav.id, om.id, sambhav.id][i],
        date: tomorrow,
        startHour: 6,
        endHour: 7,
        price: synthetic.pricePerSlot,
      },
    });
  }
  // 7AM tomorrow: 1 booked -> "3 left"
  await prisma.booking.create({
    data: {
      facilityId: synthetic.id,
      userId: om.id,
      date: tomorrow,
      startHour: 7,
      endHour: 8,
      price: synthetic.pricePerSlot,
    },
  });
  // 9AM tomorrow: 2 booked -> "2 left"
  for (let i = 0; i < 2; i++) {
    await prisma.booking.create({
      data: {
        facilityId: synthetic.id,
        userId: [om.id, sambhav.id][i],
        date: tomorrow,
        startHour: 9,
        endHour: 10,
        price: synthetic.pricePerSlot,
      },
    });
  }

  // --- Sample social games "near you" ---
  const at = (daysFromNow: number, hour: number) =>
    dayjs().add(daysFromNow, 'day').hour(hour).minute(0).second(0).millisecond(0).toDate();

  const game1 = await prisma.game.create({
    data: {
      hostId: sambhav.id,
      venueId: arena44.id,
      sport: 'Pickleball',
      gameType: 'Friendly',
      format: 'Doubles',
      startsAt: at(0, 18),
      endsAt: at(0, 19),
      maxPlayers: 4,
      perPlayerShare: 225,
      players: { create: [{ userId: sambhav.id }, { userId: om.id }] },
    },
  });

  const game2 = await prisma.game.create({
    data: {
      hostId: om.id,
      venueId: smashPoint.id,
      sport: 'Badminton',
      gameType: 'Friendly',
      format: 'Singles',
      startsAt: at(4, 19),
      endsAt: at(4, 20),
      maxPlayers: 5,
      perPlayerShare: 85,
      players: { create: [{ userId: om.id }] },
    },
  });

  console.log('Seed complete:', {
    users: 3,
    venues: 4,
    games: [game1.id, game2.id].length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

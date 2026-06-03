import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// No auth yet: every request acts as this implicit user (seeded as "Himesh").
export const CURRENT_USER_ID = 'me';

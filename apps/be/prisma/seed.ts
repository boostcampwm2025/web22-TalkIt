import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.xp.deleteMany();

  const xpData: Prisma.XpCreateManyInput[] = [];
  const MAX_LEVEL = 100;
  const BASE_XP = 1000;

  for (let level = 1; level <= MAX_LEVEL; level++) {
    xpData.push({ level, requiredXp: level * BASE_XP });
  }

  await prisma.xp.createMany({ data: xpData, skipDuplicates: true });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Exercise seeder — will be implemented in the exercises step (step 6)
  console.log('Seed placeholder — implement exercise data in step 6');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

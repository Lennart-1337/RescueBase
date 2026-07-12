import { createPrismaClient } from "../src/persistence/prisma-client.js";
import { seedRescueBaseDevelopmentData } from "../src/persistence/seed.js";

const prisma = createPrismaClient();

try {
  await seedRescueBaseDevelopmentData(prisma);
  console.log("RescueBase seed data written.");
} finally {
  await prisma.$disconnect();
}

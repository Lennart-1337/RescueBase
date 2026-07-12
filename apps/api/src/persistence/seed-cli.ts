import { createPrismaClient } from "./prisma-client.js";
import { seedRescueBaseDevelopmentData } from "./seed.js";

const prisma = createPrismaClient();

try {
  await seedRescueBaseDevelopmentData(prisma);
  console.log("RescueBase seed data written.");
} finally {
  await prisma.$disconnect();
}

import { PrismaClient } from "@prisma/client";
import { seedRescueBaseDevelopmentData } from "../src/persistence/seed.js";

const prisma = new PrismaClient();

try {
  await seedRescueBaseDevelopmentData(prisma);
  console.log("RescueBase seed data written.");
} finally {
  await prisma.$disconnect();
}

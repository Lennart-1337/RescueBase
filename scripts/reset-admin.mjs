#!/usr/bin/env node
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password || password.length < 12) {
  console.error("Usage: node scripts/reset-admin.mjs admin@example.org 'new-long-password'");
  console.error("Password must contain at least 12 characters.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "ADMIN") {
    console.error("Admin user not found.");
    process.exit(1);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(password, 12),
        twoFactorEnabled: false,
        twoFactorMethod: null,
        twoFactorSecret: null,
        active: true
      }
    }),
    prisma.userSession.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.emailTwoFactorChallenge.deleteMany({ where: { userId: user.id } }),
    prisma.auditEvent.create({
      data: {
        actorType: "SYSTEM",
        actorLabel: "server-cli",
        action: "ADMIN_EMERGENCY_RESET",
        entityType: "User",
        entityId: user.id,
        payload: { email }
      }
    })
  ]);

  console.log(JSON.stringify({
    action: "ADMIN_EMERGENCY_RESET",
    email,
    sessionsCleared: true,
    twoFactorDisabled: true
  }, null, 2));
} finally {
  await prisma.$disconnect();
}

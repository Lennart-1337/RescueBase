import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { MpgGuard } from "../src/auth/mpg.guard.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";

function context(id?: string): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ user: id ? { id } : undefined }) }) } as ExecutionContext;
}

describe("MPG authorization", () => {
  it.each([
    ["ADMIN", false, true], ["WAREHOUSE", true, true], ["WAREHOUSE", false, false]
  ])("checks current permission for %s", async (role, medicalDevicesManage, allowed) => {
    const prisma = { user: { findFirst: async () => ({ role, medicalDevicesManage }) } } as unknown as PrismaService;
    const result = new MpgGuard(prisma).canActivate(context("user"));
    if (allowed) await expect(result).resolves.toBe(true);
    else await expect(result).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects missing and deactivated users, regardless of stale session permissions", async () => {
    const prisma = { user: { findFirst: async () => null } } as unknown as PrismaService;
    await expect(new MpgGuard(prisma).canActivate(context())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(new MpgGuard(prisma).canActivate(context("deleted"))).rejects.toBeInstanceOf(ForbiddenException);
  });
});

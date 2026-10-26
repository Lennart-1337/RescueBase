import { ForbiddenException, type ExecutionContext } from "@nestjs/common";
import { jest } from "@jest/globals";
import { ServicesGuard } from "../src/auth/services.guard.js";
import { ServicePermissionsController } from "../src/auth/service-permissions.controller.js";
import type { PrismaService } from "../src/persistence/prisma.service.js";

describe("service permissions", () => {
  const findFirst = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const prisma = { user: { findFirst } } as unknown as PrismaService;
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: "planner", servicesManage: true } }),
    }),
  } as ExecutionContext;
  beforeEach(() => findFirst.mockReset());

  it("rejects a permission revoked after a session was cached", async () => {
    findFirst.mockResolvedValue({ role: "WAREHOUSE", servicesManage: false });
    await expect(
      new ServicesGuard(prisma).canActivate(context),
    ).rejects.toThrow(ForbiddenException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          banned: false,
          deletedAt: null,
        }),
      }),
    );
  });
  it.each([
    { role: "ADMIN", servicesManage: false },
    { role: "WAREHOUSE", servicesManage: true },
  ])("accepts current authorized users", async (user) => {
    findFirst.mockResolvedValue(user);
    await expect(new ServicesGuard(prisma).canActivate(context)).resolves.toBe(
      true,
    );
  });
  it("rejects deactivated users even when the session has permission", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      new ServicesGuard(prisma).canActivate(context),
    ).rejects.toThrow(ForbiddenException);
  });
  it("prevents removing implicit administrator access", async () => {
    findFirst.mockResolvedValue({
      id: "admin",
      role: "ADMIN",
      servicesManage: false,
    });
    const transactionPrisma = {
      ...prisma,
      $transaction: async (run: (tx: unknown) => unknown) => run(prisma),
    } as unknown as PrismaService;
    await expect(
      new ServicePermissionsController(transactionPrisma).update(
        "admin",
        { servicesManage: false },
        { user: { id: "admin", email: "admin@example.org" } } as never,
      ),
    ).rejects.toThrow("Administratoren");
  });
});

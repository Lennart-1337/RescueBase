import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { authQueries } from "./auth";
import { betterAuthClient } from "../lib/better-auth-client";
vi.mock("../lib/better-auth-client", () => ({
  betterAuthClient: { getSession: vi.fn() },
}));

it("preserves explicitly granted service access through session normalization", async () => {
  vi.mocked(betterAuthClient.getSession).mockResolvedValue({
    data: {
      user: {
        id: "planner",
        email: "planner@example.org",
        name: "Planung",
        role: "WAREHOUSE",
        servicesManage: true,
        medicalDevicesManage: false,
      },
    },
    error: null,
  } as never);
  const result = await new QueryClient().fetchQuery(authQueries.session());
  expect(result?.user).toMatchObject({
    servicesManage: true,
    medicalDevicesManage: false,
  });
});
it("does not infer service permissions from warehouse access", async () => {
  vi.mocked(betterAuthClient.getSession).mockResolvedValue({
    data: {
      user: {
        id: "warehouse",
        email: "lager@example.org",
        name: "Lager",
        role: "WAREHOUSE",
      },
    },
    error: null,
  } as never);
  const result = await new QueryClient().fetchQuery(authQueries.session());
  expect(result?.user.servicesManage).toBe(false);
});

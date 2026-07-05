import { describe, expect, it, vi } from "vitest";
import { createRescueBaseQueryClient } from "./query-client";
import { preloadAdminQueries } from "./route-preload";
import { catalogKeys, catalogQueries } from "../queries/catalog";
import { authKeys } from "../queries/auth";
import { resetTestBrowser, stubFetch, wasRequested } from "../test-support/app-test-helpers";

describe("route preload", () => {
  afterEach(resetTestBrowser);

  it("preloads admin page queries after setup and session resolve", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": { user: { id: "user-admin" } },
      "/api/catalog/kits": [],
    });

    const queryClient = createRescueBaseQueryClient();
    await preloadAdminQueries(queryClient, () =>
      queryClient.prefetchQuery(catalogQueries.kits()),
    );

    expect(wasRequested("/api/auth/setup/status", "GET")).toBe(true);
    expect(wasRequested("/api/auth/session", "GET")).toBe(true);
    expect(wasRequested("/api/catalog/kits", "GET")).toBe(true);
    expect(queryClient.getQueryData(catalogKeys.kits())).toEqual([]);
  });

  it("skips admin page queries before setup is initialized", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: false },
    });

    const queryClient = createRescueBaseQueryClient();
    await preloadAdminQueries(queryClient, () =>
      queryClient.prefetchQuery(catalogQueries.kits()),
    );

    expect(wasRequested("/api/auth/setup/status", "GET")).toBe(true);
    expect(wasRequested("/api/auth/session", "GET")).toBe(false);
    expect(wasRequested("/api/catalog/kits", "GET")).toBe(false);
    expect(queryClient.getQueryData(authKeys.session())).toBeUndefined();
  });

  it("skips admin page queries when the session preload fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const pathname = url.startsWith("http") ? new URL(url).pathname : url;
      if (pathname === "/api/auth/setup/status") {
        return new Response(JSON.stringify({ initialized: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (pathname === "/api/auth/session") {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createRescueBaseQueryClient();
    await preloadAdminQueries(queryClient, () =>
      queryClient.prefetchQuery(catalogQueries.kits()),
    );

    const requestedPaths = fetchMock.mock.calls.map(([input]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      return url.startsWith("http") ? new URL(url).pathname : url;
    });

    expect(requestedPaths).toEqual([
      "/api/auth/setup/status",
      "/api/auth/session",
    ]);
    expect(queryClient.getQueryData(authKeys.session())).toBeUndefined();
    expect(queryClient.getQueryData(catalogKeys.kits())).toBeUndefined();
  });
});

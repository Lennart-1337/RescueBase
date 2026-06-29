import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";
import { createRescueBaseQueryClient } from "./query-client";

export type RouterContext = {
  queryClient: QueryClient;
};

export function createAppRouter(options?: { history?: Parameters<typeof createRouter>[0]["history"]; queryClient?: QueryClient }) {
  return createRouter({
    context: { queryClient: options?.queryClient ?? createRescueBaseQueryClient() },
    history: options?.history,
    routeTree
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function createAppMemoryRouter(pathname: string) {
  return createAppRouter({
    history: createMemoryHistory({
      initialEntries: [pathname]
    })
  });
}

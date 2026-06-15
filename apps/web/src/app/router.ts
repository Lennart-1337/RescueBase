import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen";

export function createAppRouter(options?: { history?: Parameters<typeof createRouter>[0]["history"] }) {
  return createRouter({ history: options?.history, routeTree });
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

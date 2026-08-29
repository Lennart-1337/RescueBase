import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { createElement } from "react";
import { routeTree } from "../routeTree.gen";
import { createRescueBaseQueryClient } from "./query-client";
import { RouteErrorPage } from "./route-error-page";

export type RouterContext = {
  queryClient: QueryClient;
};

export function createAppRouter(options?: { history?: Parameters<typeof createRouter>[0]["history"]; queryClient?: QueryClient }) {
  return createRouter({
    context: { queryClient: options?.queryClient ?? createRescueBaseQueryClient() },
    defaultErrorComponent: (props) => createElement(RouteErrorPage, { error: props.error, reset: props.reset }),
    defaultNotFoundComponent: () => createElement(RouteErrorPage, { kind: "not-found" }),
    defaultPreload: "intent",
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

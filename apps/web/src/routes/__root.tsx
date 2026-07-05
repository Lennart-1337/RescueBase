import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useRouteDocumentTitle } from "../app/document-title";
import type { RouterContext } from "../app/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent
});

function RootComponent() {
  useRouteDocumentTitle();

  return (
    <>
      <Outlet />
      {import.meta.env.DEV ? <TanStackRouterDevtools initialIsOpen={false} /> : null}
    </>
  );
}

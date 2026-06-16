import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createAppMemoryRouter, createAppRouter } from "./app/router";
import "./styles.css";

export { createAppMemoryRouter, createAppRouter };

export default function App(props: { router?: ReturnType<typeof createAppRouter> }) {
  const [router] = useState(() => props.router ?? createAppRouter());
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 5_000 },
          mutations: { retry: false }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

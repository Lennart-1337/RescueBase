import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createAppMemoryRouter, createAppRouter } from "./app/router";
import { createRescueBaseQueryClient } from "./app/query-client";
import { ThemeProvider } from "./app/theme";
import "./styles.css";

export { createAppMemoryRouter, createAppRouter };

export default function App(props: { router?: ReturnType<typeof createAppRouter> }) {
  const [queryClient] = useState(() => props.router?.options.context.queryClient ?? createRescueBaseQueryClient());
  const [router] = useState(() => props.router ?? createAppRouter({ queryClient }));

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { UserServicePermission } from "./user-service-permission";

afterEach(() => vi.unstubAllGlobals());
it("loads and changes the separate service permission", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([{ id: "user", servicesManage: false }]), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <UserServicePermission
        user={{ id: "user", role: "WAREHOUSE" } as never}
      />
    </QueryClientProvider>,
  );
  const checkbox = await screen.findByRole("checkbox", {
    name: "Dienste verwalten",
  });
  fireEvent.click(checkbox);
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      "/api/service-permissions/users/user",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ servicesManage: true }),
      }),
    ),
  );
});
it("always grants administrators access without allowing removal", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("[]", { status: 200 })),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UserServicePermission user={{ id: "admin", role: "ADMIN" } as never} />
    </QueryClientProvider>,
  );
  const checkbox = await screen.findByRole("checkbox", {
    name: "Dienste verwalten",
  });
  expect(checkbox).toBeChecked();
  expect(checkbox).toBeDisabled();
});

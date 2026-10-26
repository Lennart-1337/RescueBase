import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckboxField } from "../../components/ui";
import type { UserSummary } from "../../lib/types";

type Permission = { id: string; servicesManage: boolean };
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok)
    throw new Error(
      "Die Dienstberechtigung konnte nicht gespeichert oder geladen werden.",
    );
  return response.json() as Promise<T>;
}

export function UserServicePermission({ user }: { user: UserSummary }) {
  const client = useQueryClient();
  const isAdmin = user.role === "ADMIN";
  const permissions = useQuery({
    queryKey: ["service-permissions", "users"],
    queryFn: () => request<Permission[]>("/api/service-permissions/users"),
  });
  const update = useMutation({
    mutationFn: (enabled: boolean) =>
      request(`/api/service-permissions/users/${encodeURIComponent(user.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicesManage: enabled }),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["service-permissions"] }),
        client.invalidateQueries({ queryKey: ["auth"] }),
      ]);
    },
  });
  const permission = permissions.data?.find((entry) => entry.id === user.id);
  return (
    <div className="user-management-permission">
      <h3>Dienstplanung</h3>
      {permissions.isError || update.isError ? (
        <p role="alert">
          Die Dienstberechtigung konnte nicht gespeichert oder geladen werden.
        </p>
      ) : null}
      {!permission && !isAdmin ? (
        <p>Dienstberechtigung wird geladen …</p>
      ) : (
        <CheckboxField
          aria-label="Dienste verwalten"
          checked={isAdmin || permission?.servicesManage === true}
          description={
            isAdmin
              ? "Administratoren besitzen diese Berechtigung immer."
              : "Erlaubt Dienstplanung, Personalverwaltung, Freigaben, Dokumente und sämtliche Finanzdaten."
          }
          disabled={isAdmin || update.isPending}
          label="Dienste verwalten"
          onChange={(event) => update.mutate(event.target.checked)}
        />
      )}
    </div>
  );
}

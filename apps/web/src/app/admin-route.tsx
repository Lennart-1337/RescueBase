import type { ReactNode } from "react";
import type { AuthenticatedUser } from "../lib/types";
import { AdminAuthGate } from "./auth";
import { AdminShell } from "./admin-shell";

export function AdminRoute({ children }: { children: (user: AuthenticatedUser) => ReactNode }) {
  return (
    <AdminAuthGate>
      {(user) => <AdminShell user={user}>{children(user)}</AdminShell>}
    </AdminAuthGate>
  );
}

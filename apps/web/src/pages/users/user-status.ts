import type { UserSummary } from "../../lib/types";

const invitationLabels: Record<NonNullable<UserSummary["invitationStatus"]>, string> = {
  OPEN: "Einladung offen",
  EXPIRED: "Einladung abgelaufen",
  ACCEPTED: "Einladung angenommen",
  REVOKED: "Einladung widerrufen"
};

export function formatInvitationStatus(status: UserSummary["invitationStatus"]): string | null {
  return status ? invitationLabels[status] : null;
}

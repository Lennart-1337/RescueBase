import { BadRequestException } from "@nestjs/common";
import type { ServiceStatus } from "./types.js";
const allowed: Record<ServiceStatus, ServiceStatus[]> = {
  INQUIRY: ["PLANNING", "CANCELLED"],
  PLANNING: ["RELEASED", "CANCELLED"],
  RELEASED: ["ACTIVE", "PLANNING", "CANCELLED"],
  ACTIVE: ["REVIEW", "CANCELLED"],
  REVIEW: ["COMPLETED", "PLANNING", "CANCELLED"],
  COMPLETED: ["REVIEW"],
  CANCELLED: ["PLANNING"],
};
export function validateTransition(
  from: ServiceStatus,
  to: ServiceStatus,
  reason: string,
  warnings: number,
) {
  if (!allowed[from]?.includes(to))
    throw new BadRequestException("Dieser Statuswechsel ist nicht möglich.");
  if (
    ((to === "RELEASED" && warnings > 0) ||
      from === "COMPLETED" ||
      from === "CANCELLED" ||
      to === "CANCELLED") &&
    !reason.trim()
  )
    throw new BadRequestException("Eine Begründung ist erforderlich.");
}

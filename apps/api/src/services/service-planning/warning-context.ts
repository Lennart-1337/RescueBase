import type { Prisma } from "@prisma/client";
import type { ServiceRecord } from "./record.js";
export type WarningContext = {
  people: {
    id: string;
    active: boolean;
    leader: boolean;
    qualifications: {
      qualification: string;
      validUntil: Date | string | null;
      recognizedQualifications: Prisma.JsonValue;
    }[];
  }[];
  vehicles: { id: string; active: boolean; ready: boolean }[];
  kits: { id: string; status: string; deletedAt?: Date | null }[];
  devices: { id: string; kitId: string | null; status: string }[];
  peers: Pick<
    ServiceRecord,
    "id" | "status" | "assignments" | "reservations"
  >[];
};

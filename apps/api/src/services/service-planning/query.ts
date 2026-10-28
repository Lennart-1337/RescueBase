import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  calendarDate,
  choice,
  string,
  timestamp,
  type Input,
} from "./input.js";
import { serviceStatuses } from "./types.js";
export function serviceFilter(query: Input): Prisma.ServiceEventWhereInput {
  const dates = (key: "from" | "to") => {
    if (!query[key]) return undefined;
    const raw = string(query[key], "Zeitraum", true);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      calendarDate(raw);
      // Berlin midnight offset is evaluated on the supplied calendar day, including DST.
      const utc = new Date(`${raw}T00:00:00Z`);
      const localHour = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Berlin",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(utc),
      );
      if (key === "to") {
        utc.setUTCDate(utc.getUTCDate() + 1);
        const nextOffset = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Europe/Berlin",
            hour: "2-digit",
            hourCycle: "h23",
          }).format(utc),
        );
        return new Date(utc.getTime() - nextOffset * 3600000 - 1);
      }
      return new Date(utc.getTime() - localHour * 3600000);
    }
    return new Date(timestamp(raw));
  };
  const from = dates("from"),
    to = dates("to");
  if (from && to && from > to)
    throw new BadRequestException("Filterzeitraum ist ungültig.");
  return {
    deletedAt: null,
    ...(query.status ? { status: choice(query.status, serviceStatuses) } : {}),
    ...(query.eventType
      ? { eventType: string(query.eventType, "Veranstaltungsart") }
      : {}),
    ...(query.customer
      ? { customer: string(query.customer, "Auftraggeber") }
      : {}),
    ...(from || to
      ? {
          startsAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: ["title", "customer", "location"].map((field) => ({
            [field]: { contains: string(query.search, "Suche") },
          })),
        }
      : {}),
  };
}

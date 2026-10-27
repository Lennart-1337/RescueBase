export const binding = (status: string) =>
  !["INQUIRY", "CANCELLED"].includes(status);
export const overlaps = (
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

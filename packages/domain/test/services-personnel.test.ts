import {
  calculatePersonnelMinutes,
  findPersonnelConflicts,
} from "../src/services/personnel.js";
const first = {
  id: "a",
  personId: "p",
  startsAt: "2026-10-25T01:00:00+02:00",
  endsAt: "2026-10-25T03:00:00+01:00",
};
describe("service personnel intervals", () => {
  test("calculates elapsed time across DST rather than clock difference", () => {
    expect(calculatePersonnelMinutes([first])).toEqual({
      totalMinutes: 180,
      byPerson: { p: 180 },
    });
  });
  test("adjacent intervals do not conflict; overlapping intervals do", () => {
    const second = {
      ...first,
      id: "b",
      startsAt: first.endsAt,
      endsAt: "2026-10-25T04:00:00+01:00",
    };
    expect(findPersonnelConflicts([first, second])).toEqual([]);
    expect(
      findPersonnelConflicts([
        first,
        { ...second, startsAt: "2026-10-25T02:59:00+01:00" },
      ]),
    ).toEqual([{ personId: "p", firstIntervalId: "a", secondIntervalId: "b" }]);
  });
  test("totals refuse double counting conflicting intervals", () => {
    expect(() =>
      calculatePersonnelMinutes([first, { ...first, id: "b" }]),
    ).toThrow();
  });
  test("rejects missing timezones, inverted dates, impossible dates", () => {
    for (const item of [
      { ...first, startsAt: "2026-10-25T01:00:00" },
      { ...first, startsAt: first.endsAt },
      { ...first, startsAt: "2026-02-30T01:00:00Z" },
    ])
      expect(() => calculatePersonnelMinutes([item])).toThrow();
  });
});

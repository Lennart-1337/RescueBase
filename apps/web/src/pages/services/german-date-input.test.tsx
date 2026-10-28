import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ServiceForm, datetime } from "./form";
import { germanDateValue, germanDateDisplay } from "./german-date-input";
import { QualificationsEditor } from "./qualifications-editor";

describe("native service date pickers", () => {
  it("uses a date picker for qualification expiry", () => {
    const change = vi.fn();
    const row = { qualification: "PARAMEDIC" as const, validUntil: "2026-12-31", recognizedQualifications: [] };
    render(<QualificationsEditor rows={[row]} onChange={change} />);
    const input = screen.getByLabelText("Gültig bis (leer = ohne Ablaufdatum)");
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveValue("2026-12-31");
    fireEvent.change(input, { target: { value: "2027-01-01" } });
    expect(change).toHaveBeenCalledWith([{ ...row, validUntil: "2027-01-01" }]);
  });
  it("uses a local datetime picker in Berlin time and stores ISO timestamps", async () => {
    const save = vi.fn(async () => undefined);
    render(<ServiceForm title="Dienstzeit" fields={[datetime("startsAt", "Beginn", true)]}
      initial={{ startsAt: "2026-07-12T10:30:00Z" }} onSubmit={save} />);
    expect(screen.getByLabelText("Beginn")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByLabelText("Beginn")).toHaveValue("2026-07-12T12:30");
    fireEvent.change(screen.getByLabelText("Beginn"), { target: { value: "2026-07-13T14:45" } });
    fireEvent.submit(screen.getByRole("form", { name: "Dienstzeit" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ startsAt: "2026-07-13T12:45:00.000Z" }));
  });
  it("uses calendar picker bounds and preserves optional empty dates", () => {
    render(<ServiceForm title="Zeitraum" fields={[{ name: "from", label: "Von", type: "date" }]}
      initial={{ from: "2026-11-01" }} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("Von");
    expect(input).toHaveValue("2026-11-01");
    expect(input).toHaveAttribute("min", "1000-01-01");
    expect(input).toHaveAttribute("max", "9999-12-31");
  });
  it("keeps German display formatting and strict calendar/time validation", () => {
    expect(germanDateDisplay("2026-11-01")).toBe("01.11.2026");
    expect(germanDateValue("29.02.2028")).toBe("2028-02-29");
    expect(germanDateDisplay("0026-11-01")).toBe("01.11.0026");
    expect(germanDateValue("01.01.1000")).toBe("1000-01-01");
    for (const value of ["29.02.2026", "01.13.2026", "1.2.26", "01.11.0026", "31.12.0999", ""])
      expect(() => germanDateValue(value)).toThrow();
    expect(() => germanDateValue("01.11.2026 24:00", true)).toThrow();
  });
});

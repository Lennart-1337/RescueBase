export function germanDateDisplay(value: string, withTime = false): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}${withTime && match[4] ? ` ${match[4]}:${match[5]}` : ""}`;
}
export function germanDateValue(value: string, withTime = false): string {
  const input = value.trim();
  const german = withTime
    ? /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(input)
    : /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(input);
  const iso = withTime
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input)
    : /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  const parts = german ? [german[3], german[2], german[1], german[4], german[5]] : iso?.slice(1);
  const date = parts ? `${parts[0]}-${parts[1]}-${parts[2]}` : "";
  const calendar = new Date(`${date}T00:00:00Z`);
  if (!parts || Number(parts[0]) < 1000 || !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== date ||
    (withTime && (Number(parts[3]) > 23 || Number(parts[4]) > 59)))
    throw new Error(`Bitte ein gültiges Datum${withTime ? " mit Uhrzeit im Format TT.MM.JJJJ HH:mm" : " im Format TT.MM.JJJJ"} eingeben.`);
  return `${date}${withTime ? `T${parts[3]}:${parts[4]}` : ""}`;
}
export function GermanDateInput({ value, onChange, withTime = false, required = false }: {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  required?: boolean;
}) {
  let canonical = value;
  try { canonical = value ? germanDateValue(value, withTime) : ""; }
  catch { /* Preserve legacy values so invalid years cannot become unlimited proofs. */ }
  return <input type={withTime ? "datetime-local" : "date"} lang="de-DE"
    required={required} min={withTime ? "1000-01-01T00:00" : "1000-01-01"}
    max={withTime ? "9999-12-31T23:59" : "9999-12-31"}
    value={canonical} onChange={(event) => onChange(event.target.value)} />;
}

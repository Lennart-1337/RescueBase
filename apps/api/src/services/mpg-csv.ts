type CsvRow = Record<string, string | number | null | undefined>;

function cell(value: CsvRow[string]): string {
  let text = String(value ?? "");
  if (/^[\s]*[-=+@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function inventoryCsv(rows: CsvRow[], columns = Object.keys(rows[0] ?? {})): string {
  return "\uFEFF" + [columns.map(cell).join(";"), ...rows.map((row) => columns.map((key) => cell(row[key])).join(";"))].join("\r\n") + "\r\n";
}

// ── CSV serialization (hand-rolled, RFC 4180) ────────────────────────────────
// No external CSV dependency (standing rule). Fields containing a comma, double
// quote, CR or LF are wrapped in double quotes and embedded quotes are doubled
// ("a""b" → "a""b"). Line endings are CRLF (Excel-safe). The output is UTF-8
// with a leading BOM so Excel/LibreOffice detect the charset on Windows.

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Quote when the raw value contains anything that would break the column.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(fields: Array<unknown>): string {
  return fields.map(csvField).join(",");
}

/**
 * Build a CSV Buffer from rows of fields (first row = header).
 * UTF-8 BOM + CRLF line endings + trailing newline.
 */
export function buildCsv(rows: Array<Array<unknown>>): Buffer {
  const lines = rows.map(csvRow).join("\r\n");
  return Buffer.from(`\uFEFF${lines}\r\n`, "utf8");
}

/**
 * Build a JSON Buffer from rows of keyed objects (RFC 8259, pretty-printed
 * with a 2-space indent so downloaded register files stay human-readable).
 */
export function buildJson(rows: Array<Record<string, unknown>>): Buffer {
  return Buffer.from(JSON.stringify(rows, null, 2), "utf8");
}
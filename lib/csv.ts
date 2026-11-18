/**
 * Minimal, dependency-free CSV serialisation for admin exports.
 *
 * Two hardening rules:
 *  - Cells containing quotes, commas, CR or LF are wrapped in double quotes
 *    and inner quotes are doubled (RFC 4180).
 *  - Cells that begin with a spreadsheet formula trigger character
 *    (= + - @ TAB CR) are prefixed with a single quote so spreadsheet
 *    applications treat user content as text, never as a formula.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const guarded = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',')
}

export function csvDocument(headers: string[], rows: unknown[][]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join('\r\n') + '\r\n'
}

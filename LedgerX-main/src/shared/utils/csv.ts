const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

function sanitizeCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function toCsv(rows: unknown[][]): string {
  return rows
    .map(row => row.map(value => {
      const cell = sanitizeCell(value);
      const escaped = cell.replace(/"/g, '""');
      return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(','))
    .join('\r\n');
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

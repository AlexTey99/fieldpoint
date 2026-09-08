const HEADERS = ['id', 'name', 'address', 'lat', 'lng', 'category', 'status', 'notes', 'assignedToName', 'createdAt', 'updatedAt'];

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(rows) {
  const lines = [HEADERS.join(',')];
  for (const row of rows) {
    lines.push(HEADERS.map((key) => escapeCell(row[key])).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

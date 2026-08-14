// IMPLEMENTER NOTE: Pure, dependency-free parser that builds a real first-5-rows
// preview from a blob's raw text. No DB or Shelby access here — only text in,
// structured preview out — so it can be unit tested in isolation.
// ARCHITECT CONTRACT: buildPreviewFromText(text, format) -> DatasetPreview | null

export const PREVIEW_MAX_ROWS = 5;
export const PREVIEW_MAX_COLUMNS = 12;
export const PREVIEW_MAX_CELL_CHARS = 64;

// Formats that can be rendered as a tabular preview.
export const PREVIEWABLE_FORMATS = new Set(['csv', 'tsv', 'json', 'jsonl']);

export interface DatasetPreview {
  previewable: boolean;
  format: string | null;
  columns: string[];
  rows: (string | null)[][];
}

function truncateCell(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  let text = String(value).trim();

  if (text.length === 0) {
    return null;
  }

  if (text.length > PREVIEW_MAX_CELL_CHARS) {
    text = `${text.slice(0, PREVIEW_MAX_CELL_CHARS - 1)}…`;
  }

  return text;
}

/**
 * Minimal CSV/TSV line parser that honors double-quoted fields (including
 * embedded delimiters and escaped quotes). Falls back to a plain split when a
 * quoted field is unterminated so a malformed row degrades instead of throwing.
 */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' && current.length === 0) {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  // Unterminated quote: salvage what we have rather than discarding the row.
  if (inQuotes) {
    cells.push(current.trim());
    return cells;
  }

  cells.push(current.trim());
  return cells;
}

function buildDelimitedPreview(lines: string[], delimiter: string): DatasetPreview | null {
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return null;
  }

  const headers = splitDelimitedLine(nonEmptyLines[0] ?? '', delimiter)
    .slice(0, PREVIEW_MAX_COLUMNS)
    .map((header) => header.replace(/^"(.*)"$/, '$1'));

  if (headers.length === 0 || headers.some((header) => header.length === 0)) {
    return null;
  }

  const rows: (string | null)[][] = [];

  for (const line of nonEmptyLines.slice(1, 1 + PREVIEW_MAX_ROWS)) {
    const cells = splitDelimitedLine(line, delimiter);
    const row = headers.map((_, index) => truncateCell(cells[index] ?? null));

    if (row.every((cell) => cell === null)) {
      continue;
    }

    rows.push(row);

    if (rows.length >= PREVIEW_MAX_ROWS) {
      break;
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    previewable: true,
    format: delimiter === '\t' ? 'tsv' : 'csv',
    columns: headers,
    rows,
  };
}

function buildJsonPreview(lines: string[], format: 'json' | 'jsonl'): DatasetPreview | null {
  let records: unknown[] = [];

  if (format === 'json') {
    const text = lines.join('\n');

    try {
      const parsed: unknown = JSON.parse(text);

      if (Array.isArray(parsed)) {
        records = parsed;
      } else if (parsed !== null && typeof parsed === 'object') {
        // Single object (e.g. the top-level of a config/JSON doc): treat its
        // entries as one row so it still renders as a 2-column table.
        records = [parsed];
      } else {
        return null;
      }
    } catch {
      // Fall through to JSONL-style line-by-line parsing.
      records = lines
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          try {
            return JSON.parse(line) as unknown;
          } catch {
            return null;
          }
        })
        .filter((record): record is unknown => record !== null);
    }
  } else {
    records = lines
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          return null;
        }
      })
      .filter((record): record is unknown => record !== null);
  }

  if (records.length === 0) {
    return null;
  }

  // Column order = first-seen key order across the first few records.
  const columns: string[] = [];
  const seen = new Set<string>();

  for (const record of records.slice(0, PREVIEW_MAX_ROWS)) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      continue;
    }

    for (const key of Object.keys(record as Record<string, unknown>)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }

      if (columns.length >= PREVIEW_MAX_COLUMNS) {
        break;
      }
    }

    if (columns.length >= PREVIEW_MAX_COLUMNS) {
      break;
    }
  }

  if (columns.length === 0) {
    return null;
  }

  const rows: (string | null)[][] = [];

  for (const record of records.slice(0, PREVIEW_MAX_ROWS)) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      continue;
    }

    const row = columns.map((column) => {
      const value = (record as Record<string, unknown>)[column];

      // Render nested objects/arrays as compact JSON rather than "[object Object]".
      if (value !== null && typeof value === 'object') {
        const serialized = JSON.stringify(value);
        return truncateCell(serialized);
      }

      return truncateCell(value);
    });

    rows.push(row);

    if (rows.length >= PREVIEW_MAX_ROWS) {
      break;
    }
  }

  if (rows.length === 0) {
    return null;
  }

  return {
    previewable: true,
    format,
    columns,
    rows,
  };
}

/**
 * Builds a first-5-rows preview from raw blob text. Returns null when the
 * content cannot be presented as a table (text, images, PDFs, binary, …).
 */
export function buildPreviewFromText(text: string, format: string | null): DatasetPreview | null {
  const normalizedFormat = (format ?? '').toLowerCase().trim();
  const textWithoutBom = text.replace(/^\uFEFF/, '');
  const lines = textWithoutBom.split(/\r?\n/);

  if (normalizedFormat === 'csv' || normalizedFormat === 'tsv') {
    const delimiter = normalizedFormat === 'tsv' ? '\t' : ',';
    return buildDelimitedPreview(lines, delimiter);
  }

  if (normalizedFormat === 'json' || normalizedFormat === 'jsonl') {
    return buildJsonPreview(lines, normalizedFormat);
  }

  // No declared tabular format — sniff a couple of obvious cases so uploads
  // without a schema profile still get a real preview when possible.
  const firstLine = lines.find((line) => line.trim().length > 0);

  if (firstLine !== undefined) {
    const trimmed = firstLine.trimStart();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return buildJsonPreview(lines, 'json');
    }

    const commaCount = (firstLine.match(/,/g) ?? []).length;
    const tabCount = (firstLine.match(/\t/g) ?? []).length;

    if (commaCount >= 2 || tabCount >= 2) {
      return buildDelimitedPreview(lines, tabCount > commaCount ? '\t' : ',');
    }
  }

  return null;
}

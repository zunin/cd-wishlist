export interface ParsedAlbum {
  artist: string;
  album: string;
  year?: number;
}

export type ColumnMapping = 'artist' | 'album' | 'year' | 'skip';

export interface RawCSVData {
  rows: string[][];
  delimiter: string;
  detectedDelimiter: string;
}

export interface ColumnMappingConfig {
  mappings: ColumnMapping[];
  hasHeaderRow: boolean;
  delimiter: string;
}

/**
 * Parse CSV content into raw rows without column mapping
 */
export function parseRawCSV(content: string, forcedDelimiter?: string): RawCSVData {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], delimiter: ',', detectedDelimiter: ',' };
  }

  // Detect or use forced delimiter
  const detectedDelimiter = detectDelimiter(lines[0]);
  const delimiter = forcedDelimiter || detectedDelimiter;

  const rows = lines.map(line => splitCSVLine(line, delimiter));

  return { rows, delimiter, detectedDelimiter };
}

/**
 * Parse a date string and extract the year
 * Handles various formats: "2020", "2020-03-27", "2020/03/27", "27/03/2020", etc.
 */
export function extractYear(dateString: string): number | undefined {
  if (!dateString || !dateString.trim()) {
    return undefined;
  }

  const trimmed = dateString.trim();

  // Try parsing as ISO date first (YYYY-MM-DD)
  const isoMatch = trimmed.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }

  // Try parsing as year-only (YYYY)
  const yearOnlyMatch = trimmed.match(/^(\d{4})$/);
  if (yearOnlyMatch) {
    const year = parseInt(yearOnlyMatch[1], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }

  // Try other common formats with year at start
  const yearStartMatch = trimmed.match(/^(\d{4})[/\-.]/);
  if (yearStartMatch) {
    const year = parseInt(yearStartMatch[1], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }

  // Try formats with year at end (DD/MM/YYYY or MM/DD/YYYY)
  const yearEndMatch = trimmed.match(/(\d{4})$/);
  if (yearEndMatch) {
    const year = parseInt(yearEndMatch[1], 10);
    if (year >= 1900 && year <= 2100) {
      return year;
    }
  }

  return undefined;
}

/**
 * Apply column mapping to raw CSV data
 */
export function applyColumnMapping(
  rawData: RawCSVData,
  config: ColumnMappingConfig
): ParsedAlbum[] {
  const { rows } = rawData;
  const { mappings, hasHeaderRow } = config;

  if (rows.length === 0 || mappings.length === 0) {
    return [];
  }

  const startIndex = hasHeaderRow ? 1 : 0;
  const albums: ParsedAlbum[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    
    // Collect all artist columns and concatenate them
    const artistParts: string[] = [];
    const albumParts: string[] = [];
    let year: number | undefined;

    for (let colIndex = 0; colIndex < mappings.length && colIndex < row.length; colIndex++) {
      const mapping = mappings[colIndex];
      const value = row[colIndex]?.trim() || '';

      if (mapping === 'artist' && value) {
        artistParts.push(value);
      } else if (mapping === 'album' && value) {
        albumParts.push(value);
      } else if (mapping === 'year' && value && !year) {
        // Try to extract year from the value
        const extractedYear = extractYear(value);
        if (extractedYear) {
          year = extractedYear;
        }
      }
    }

    const artist = artistParts.join(', ');
    const album = albumParts.join(', ');

    // Only add if we have both artist and album
    if (artist && album) {
      albums.push({ artist, album, year });
    }
  }

  // Deduplicate albums
  return deduplicateAlbums(albums);
}

/**
 * Deduplicate albums based on normalized artist + album combination
 * Keeps the first occurrence of each unique album
 */
export function deduplicateAlbums(albums: ParsedAlbum[]): ParsedAlbum[] {
  const seen = new Set<string>();
  const deduplicated: ParsedAlbum[] = [];

  for (const album of albums) {
    // Normalize for comparison: lowercase, trim whitespace
    const normalizedKey = `${album.artist.toLowerCase().trim()}|${album.album.toLowerCase().trim()}`;
    
    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      deduplicated.push(album);
    }
  }

  return deduplicated;
}

/**
 * Validate that the mapping configuration is valid
 */
export function validateColumnMapping(config: ColumnMappingConfig): { valid: boolean; error?: string } {
  const hasArtistColumn = config.mappings.some(m => m === 'artist');
  const hasAlbumColumn = config.mappings.some(m => m === 'album');

  if (!hasArtistColumn) {
    return { valid: false, error: 'Please map at least one column to Artist' };
  }

  if (!hasAlbumColumn) {
    return { valid: false, error: 'Please map at least one column to Album' };
  }

  return { valid: true };
}

/**
 * Get available delimiters for user selection
 */
export const AVAILABLE_DELIMITERS = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
];

/**
 * Legacy: Parse CSV content with auto-detection of delimiters
 * Handles quoted fields and common Spotify export formats
 */
export function parseCSV(content: string): ParsedAlbum[] {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  // Detect delimiter from first line
  const firstLine = lines[0];
  const delimiter = detectDelimiter(firstLine);

  // Check if first line is a header
  const hasHeader = isHeaderRow(firstLine);
  const startIndex = hasHeader ? 1 : 0;

  const albums: ParsedAlbum[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parsed = parseLine(lines[i], delimiter);
    if (parsed) {
      albums.push(parsed);
    }
  }

  // Deduplicate albums
  return deduplicateAlbums(albums);
}

/**
 * Parse plain text with artist - album format (one per line)
 */
export function parsePlainText(content: string): ParsedAlbum[] {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const albums: ParsedAlbum[] = [];

  for (const line of lines) {
    // Try common separators: " - ", " | ", " by ", " – "
    const separators = [' - ', ' | ', ' by ', ' – ', ' — '];
    let parsed: ParsedAlbum | null = null;

    for (const sep of separators) {
      const parts = line.split(sep);
      if (parts.length >= 2) {
        parsed = {
          artist: parts[0].trim(),
          album: parts.slice(1).join(sep).trim()
        };
        break;
      }
    }

    // If no separator found, treat whole line as album with unknown artist
    if (!parsed) {
      parsed = {
        artist: '',
        album: line
      };
    }

    albums.push(parsed);
  }

  // Deduplicate albums
  return deduplicateAlbums(albums);
}

function detectDelimiter(line: string): string {
  const delimiters = [',', '\t', ';', '|'];
  let bestDelimiter = ',';
  let maxCount = 0;

  for (const delim of delimiters) {
    const count = countOccurrences(line, delim);
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

function countOccurrences(str: string, substr: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

function isHeaderRow(line: string): boolean {
  const lower = line.toLowerCase();
  const headerKeywords = ['artist', 'album', 'name', 'title', 'track'];
  return headerKeywords.some(kw => lower.includes(kw));
}

function parseLine(line: string, delimiter: string): ParsedAlbum | null {
  const fields = splitCSVLine(line, delimiter);

  if (fields.length < 1) {
    return null;
  }

  // Common patterns: "Artist,Album" or "Artist,Album,Track" or "Artist,Album,Year"
  const artist = fields[0]?.trim() || '';
  const album = fields[1]?.trim() || '';

  if (!artist && !album) {
    return null;
  }

  return { artist, album };
}

/**
 * Split a CSV line respecting quoted fields
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Auto-parse content - tries CSV first, falls back to plain text
 */
export function autoParse(content: string): ParsedAlbum[] {
  // If it looks like CSV (has commas or tabs), try that first
  if (content.includes(',') || content.includes('\t')) {
    const csvResult = parseCSV(content);
    if (csvResult.length > 0 && csvResult.some(a => a.artist && a.album)) {
      return csvResult;
    }
  }

  // Fall back to plain text parsing
  return parsePlainText(content);
}

/**
 * Serialize albums to CSV format
 */
export function serializeToCSV(albums: ParsedAlbum[]): string {
  const header = 'Artist,Album';
  const rows = albums.map(a => {
    const artist = escapeCSVField(a.artist);
    const album = escapeCSVField(a.album);
    return `${artist},${album}`;
  });
  return [header, ...rows].join('\n');
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

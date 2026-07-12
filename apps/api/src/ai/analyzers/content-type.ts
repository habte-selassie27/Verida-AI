// Content-type detection using magic bytes (file-type) + fallback heuristics.
// Never trust filename extensions — always read the file signature.

import { fileTypeFromBuffer } from 'file-type';
import path from 'node:path';
import { DatasetType } from '@verida/shared';

const MIME_TO_TYPE: Record<string, DatasetType> = {
  'text/csv': DatasetType.TABULAR,
  'text/tab-separated-values': DatasetType.TABULAR,
  'application/vnd.ms-excel': DatasetType.TABULAR,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': DatasetType.TABULAR,
  'application/json': DatasetType.TEXT,
  'application/ld+json': DatasetType.TEXT,
  'text/plain': DatasetType.TEXT,
  'text/markdown': DatasetType.TEXT,
  'text/html': DatasetType.DOCUMENT,
  'text/xml': DatasetType.TEXT,
  'application/xml': DatasetType.TEXT,
  'image/png': DatasetType.IMAGE,
  'image/jpeg': DatasetType.IMAGE,
  'image/gif': DatasetType.IMAGE,
  'image/webp': DatasetType.IMAGE,
  'image/bmp': DatasetType.IMAGE,
  'image/tiff': DatasetType.IMAGE,
  'image/svg+xml': DatasetType.IMAGE,
  'video/mp4': DatasetType.VIDEO,
  'video/webm': DatasetType.VIDEO,
  'video/quicktime': DatasetType.VIDEO,
  'video/x-msvideo': DatasetType.VIDEO,
  'audio/mpeg': DatasetType.AUDIO,
  'audio/wav': DatasetType.AUDIO,
  'audio/ogg': DatasetType.AUDIO,
  'audio/flac': DatasetType.AUDIO,
  'audio/x-m4a': DatasetType.AUDIO,
  'application/pdf': DatasetType.PDF,
  'application/zip': DatasetType.ARCHIVE,
  'application/x-tar': DatasetType.ARCHIVE,
  'application/gzip': DatasetType.ARCHIVE,
  'application/x-7z-compressed': DatasetType.ARCHIVE,
  'application/x-rar-compressed': DatasetType.ARCHIVE,
};

const EXT_TO_TYPE: Record<string, DatasetType> = {
  '.csv': DatasetType.TABULAR,
  '.tsv': DatasetType.TABULAR,
  '.xls': DatasetType.TABULAR,
  '.xlsx': DatasetType.TABULAR,
  '.json': DatasetType.TEXT,
  '.jsonl': DatasetType.TEXT,
  '.txt': DatasetType.TEXT,
  '.md': DatasetType.TEXT,
  '.xml': DatasetType.TEXT,
  '.html': DatasetType.DOCUMENT,
  '.htm': DatasetType.DOCUMENT,
  '.doc': DatasetType.DOCUMENT,
  '.docx': DatasetType.DOCUMENT,
  '.rtf': DatasetType.DOCUMENT,
  '.png': DatasetType.IMAGE,
  '.jpg': DatasetType.IMAGE,
  '.jpeg': DatasetType.IMAGE,
  '.gif': DatasetType.IMAGE,
  '.webp': DatasetType.IMAGE,
  '.bmp': DatasetType.IMAGE,
  '.tiff': DatasetType.IMAGE,
  '.tif': DatasetType.IMAGE,
  '.svg': DatasetType.IMAGE,
  '.mp4': DatasetType.VIDEO,
  '.webm': DatasetType.VIDEO,
  '.mov': DatasetType.VIDEO,
  '.avi': DatasetType.VIDEO,
  '.mkv': DatasetType.VIDEO,
  '.mp3': DatasetType.AUDIO,
  '.wav': DatasetType.AUDIO,
  '.ogg': DatasetType.AUDIO,
  '.flac': DatasetType.AUDIO,
  '.m4a': DatasetType.AUDIO,
  '.pdf': DatasetType.PDF,
  '.zip': DatasetType.ARCHIVE,
  '.tar': DatasetType.ARCHIVE,
  '.gz': DatasetType.ARCHIVE,
  '.7z': DatasetType.ARCHIVE,
  '.rar': DatasetType.ARCHIVE,
};

export interface DetectedType {
  datasetType: DatasetType;
  mimeType: string;
  source: 'magic-bytes' | 'mime-header' | 'extension' | 'fallback';
}

export async function detectContentType(
  buffer: Buffer,
  declaredMimeType: string,
  fileName: string,
): Promise<DetectedType> {
  // 1. Magic bytes (most reliable)
  try {
    const result = await fileTypeFromBuffer(buffer);
    if (result?.mime) {
      const mapped = MIME_TO_TYPE[result.mime];
      if (mapped) {
        return { datasetType: mapped, mimeType: result.mime, source: 'magic-bytes' };
      }
      // Known MIME but not in our map — classify broadly
      if (result.mime.startsWith('image/')) {
        return { datasetType: DatasetType.IMAGE, mimeType: result.mime, source: 'magic-bytes' };
      }
      if (result.mime.startsWith('video/')) {
        return { datasetType: DatasetType.VIDEO, mimeType: result.mime, source: 'magic-bytes' };
      }
      if (result.mime.startsWith('audio/')) {
        return { datasetType: DatasetType.AUDIO, mimeType: result.mime, source: 'magic-bytes' };
      }
    }
  } catch {
    // file-type can throw on very small buffers — fall through
  }

  // 2. Declared MIME type from upload
  if (declaredMimeType) {
    const mapped = MIME_TO_TYPE[declaredMimeType];
    if (mapped) {
      return { datasetType: mapped, mimeType: declaredMimeType, source: 'mime-header' };
    }
    if (declaredMimeType.startsWith('text/')) {
      return { datasetType: DatasetType.TEXT, mimeType: declaredMimeType, source: 'mime-header' };
    }
  }

  // 3. File extension
  const ext = path.extname(fileName).toLowerCase();
  if (ext && EXT_TO_TYPE[ext]) {
    return { datasetType: EXT_TO_TYPE[ext], mimeType: declaredMimeType || `application/octet-stream`, source: 'extension' };
  }

  // 4. Heuristic: try to read as UTF-8 text
  if (buffer.length > 0) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
    const isText = isReadableText(sample);
    if (isText) {
      return { datasetType: DatasetType.TEXT, mimeType: 'text/plain', source: 'fallback' };
    }
  }

  return { datasetType: DatasetType.UNKNOWN, mimeType: declaredMimeType || 'application/octet-stream', source: 'fallback' };
}

function isReadableText(buffer: Buffer): boolean {
  if (buffer.length === 0) return false;
  // Check for null bytes (strong signal of binary content)
  for (let i = 0; i < Math.min(buffer.length, 512); i++) {
    if (buffer[i] === 0) return false;
  }
  // Check if >90% of bytes are printable ASCII or common UTF-8
  let printable = 0;
  const check = Math.min(buffer.length, 1024);
  for (let i = 0; i < check; i++) {
    const b = buffer[i]!;
    if (b >= 0x20 && b <= 0x7e) printable++;
    else if (b === 0x09 || b === 0x0a || b === 0x0d) printable++; // tab, LF, CR
    else if (b >= 0xc0) printable++; // UTF-8 multi-byte lead
  }
  return printable / check > 0.9;
}

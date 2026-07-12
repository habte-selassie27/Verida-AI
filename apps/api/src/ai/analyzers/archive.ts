// Archive Analyzer — lists contents of ZIP files and summarizes structure.
// Uses yauzl for safe ZIP reading. Produces a file manifest.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

interface ZipEntryInfo {
  fileName: string;
  isDirectory: boolean;
  uncompressedSize: number;
  compressedSize: number;
}

function analyzeFileTypes(entries: ZipEntryInfo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const ext = entry.fileName.split('.').pop()?.toLowerCase() ?? 'no-ext';
    counts[ext] = (counts[ext] ?? 0) + 1;
  }
  return counts;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function summarizeStructure(entries: ZipEntryInfo[]): string {
  const dirs = entries.filter((e) => e.isDirectory);
  const files = entries.filter((e) => !e.isDirectory);
  const fileTypes = analyzeFileTypes(entries);

  const topTypes = Object.entries(fileTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${count} .${ext}`)
    .join(', ');

  return `${files.length} files, ${dirs.length} directories` +
    (topTypes ? ` (${topTypes})` : '');
}

export class ArchiveAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.ARCHIVE;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const sizeKb = (buffer.length / 1024).toFixed(1);
    let entries: ZipEntryInfo[] = [];
    let totalUncompressed = 0;
    let parseError = false;

    try {
      const yauzl = await import('yauzl');
      const zip = await new Promise<import('yauzl').ZipFile>((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
          if (err) reject(err);
          else resolve(zipfile!);
        });
      });

      entries = await new Promise<ZipEntryInfo[]>((resolve) => {
        const result: ZipEntryInfo[] = [];
        let total = 0;
        zip.on('entry', (entry: import('yauzl').Entry) => {
          result.push({
            fileName: entry.fileName,
            isDirectory: entry.fileName.endsWith('/'),
            uncompressedSize: entry.uncompressedSize,
            compressedSize: entry.compressedSize,
          });
          total += entry.uncompressedSize;
          zip.readEntry();
        });
        zip.on('end', () => { totalUncompressed = total; resolve(result); });
        zip.on('error', () => { totalUncompressed = total; resolve(result); });
        zip.readEntry();
      });
    } catch {
      parseError = true;
      const headerInfo = parseZipHeader(buffer);
      entries = headerInfo.entries;
      totalUncompressed = headerInfo.totalUncompressed;
    }

    const fileTypes = analyzeFileTypes(entries);
    const structure = parseError ? `${entries.length} files detected` : summarizeStructure(entries);

    const description = `Archive (${ctx.mimeType}): ${structure}. ` +
      `${formatBytes(buffer.length)} compressed` +
      (totalUncompressed > 0 ? `, ~${formatBytes(totalUncompressed)} uncompressed` : '') +
      '.';

    return {
      title: ctx.fileName,
      description,
      modality: 'archive',
      datasetType: DatasetType.ARCHIVE,
      tags: [],
      metadata: {
        format: 'zip',
        fileCount: entries.filter((e) => !e.isDirectory).length,
        directoryCount: entries.filter((e) => e.isDirectory).length,
        fileTypes,
        totalUncompressedSize: totalUncompressed || null,
        entries: entries.slice(0, 100).map((e) => ({
          name: e.fileName,
          size: e.uncompressedSize,
          isDirectory: e.isDirectory,
        })),
        byteSize: buffer.length,
      },
    };
  }
}

function parseZipHeader(buffer: Buffer): { entries: ZipEntryInfo[]; totalUncompressed: number } {
  const entries: ZipEntryInfo[] = [];
  let totalUncompressed = 0;

  // Look for EOCD signature (50 4B 05 06)
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4b &&
      buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset < 0) return { entries, totalUncompressed };

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let offset = cdOffset;
  for (let i = 0; i < totalEntries && offset + 46 <= buffer.length; i++) {
    if (buffer[offset] !== 0x50 || buffer[offset + 1] !== 0x4b ||
      buffer[offset + 2] !== 0x01 || buffer[offset + 3] !== 0x02) break;

    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLen);
    const isDir = name.endsWith('/');

    entries.push({ fileName: name, isDirectory: isDir, uncompressedSize, compressedSize });
    totalUncompressed += uncompressedSize;

    offset += 46 + nameLen + extraLen + commentLen;
  }

  return { entries, totalUncompressed };
}

// Image Analyzer — extracts dimensions and format from PNG/JPEG magic bytes.
// No external dependencies (sharp not available). Falls back to buffer size.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

interface ImageInfo {
  format: string;
  width: number;
  height: number;
  hasAlpha: boolean;
}

function parsePngDimensions(buffer: Buffer): ImageInfo | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;

  // IHDR chunk starts at offset 8 (4 bytes length + 4 bytes "IHDR")
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  // Color types: 0=grayscale, 2=RGB, 3=indexed, 4=gray+alpha, 6=RGBA
  const hasAlpha = colorType === 4 || colorType === 6;

  return { format: 'png', width, height, hasAlpha };
}

function parseJpegDimensions(buffer: Buffer): ImageInfo | null {
  // JPEG signature: FF D8 FF
  if (buffer.length < 4) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) return null;

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1]!;

    // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (offset + 9 < buffer.length) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { format: 'jpeg', width, height, hasAlpha: false };
      }
    }

    // Skip to next marker
    if (offset + 3 < buffer.length) {
      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    } else {
      break;
    }
  }
  return null;
}

function parseGifDimensions(buffer: Buffer): ImageInfo | null {
  // GIF signature: "GIF87a" or "GIF89a"
  if (buffer.length < 13) return null;
  const sig = buffer.toString('ascii', 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const packed = buffer[10] ?? 0;
  const hasAlpha = (packed & 0x80) !== 0; // global color table flag
  return { format: 'gif', width, height, hasAlpha };
}

function parseWebpDimensions(buffer: Buffer): ImageInfo | null {
  // WebP: RIFF????WEBP
  if (buffer.length < 30) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;

  const chunkType = buffer.toString('ascii', 12, 16);
  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { format: 'webp', width, height, hasAlpha: false };
  }
  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { format: 'webp', width, height, hasAlpha: ((bits >> 28) & 1) === 1 };
  }

  return null;
}

function extractImageInfo(buffer: Buffer): ImageInfo | null {
  return parsePngDimensions(buffer) ?? parseJpegDimensions(buffer) ??
    parseGifDimensions(buffer) ?? parseWebpDimensions(buffer);
}

export class ImageAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.IMAGE;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    const info = extractImageInfo(buffer);

    const description = info
      ? `${info.format.toUpperCase()} image, ${info.width}×${info.height}px` +
        (info.hasAlpha ? ' with alpha channel' : '') +
        `. ${(buffer.length / 1024).toFixed(1)} KB.`
      : `Image file (${(buffer.length / 1024).toFixed(1)} KB).`;

    return {
      title: ctx.fileName,
      description,
      modality: 'image',
      datasetType: DatasetType.IMAGE,
      tags: [],
      metadata: {
        format: info?.format ?? 'unknown',
        width: info?.width ?? null,
        height: info?.height ?? null,
        hasAlpha: info?.hasAlpha ?? null,
        byteSize: buffer.length,
      },
    };
  }
}

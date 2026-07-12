// Video Analyzer — extracts metadata from video file headers.
// Parses MP4/MOV (ftyp + moov/mvhd) and WebM (EBML) headers.
// No ffmpeg dependency — pure header parsing.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

interface VideoMetadata {
  format: string;
  duration: number | null; // seconds
  width: number | null;
  height: number | null;
  codec: string | null;
  fps: number | null;
  bitrate: number | null;
}

function parseMp4Metadata(buffer: Buffer): VideoMetadata | null {
  // Look for 'ftyp' box
  let offset = 0;
  let hasFtyp = false;
  while (offset < buffer.length - 4) {
    const boxSize = buffer.readUInt32BE(offset);
    const boxType = buffer.toString('ascii', offset + 4, offset + 8);
    if (boxType === 'ftyp') {
      hasFtyp = true;
      break;
    }
    if (boxSize < 8 || boxSize > buffer.length) break;
    offset += boxSize;
  }
  if (!hasFtyp) return null;

  // Find moov box
  offset = 0;
  while (offset < buffer.length - 8) {
    const boxSize = buffer.readUInt32BE(offset);
    const boxType = buffer.toString('ascii', offset + 4, offset + 8);
    if (boxType === 'moov') {
      return parseMoovBox(buffer, offset + 8, offset + boxSize);
    }
    if (boxSize < 8 || boxSize > buffer.length) break;
    offset += boxSize;
  }

  return { format: 'mp4', duration: null, width: null, height: null, codec: null, fps: null, bitrate: null };
}

function parseMoovBox(buffer: Buffer, start: number, end: number): VideoMetadata {
  let offset = start;
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  let timescale: number | null = null;
  let codec: string | null = null;
  let bitrate: number | null = null;

  while (offset < end - 8) {
    const boxSize = buffer.readUInt32BE(offset);
    const boxType = buffer.toString('ascii', offset + 4, offset + 8);

    if (boxType === 'mvhd') {
      // Movie header
      const version = buffer[offset + 8];
      if (version === 0) {
        timescale = buffer.readUInt32BE(offset + 20);
        duration = buffer.readUInt32BE(offset + 24);
      } else if (version === 1) {
        timescale = buffer.readUInt32BE(offset + 28);
        duration = Number(buffer.readBigUInt64BE(offset + 32));
      }
      if (timescale && duration) {
        duration = duration / timescale;
      }
    } else if (boxType === 'tkhd') {
      // Track header — has width/height
      const version = buffer[offset + 8];
      if (version === 0) {
        width = buffer.readUInt32BE(offset + 84) >> 16;
        height = buffer.readUInt32BE(offset + 88) >> 16;
      } else if (version === 1) {
        width = buffer.readUInt32BE(offset + 96) >> 16;
        height = buffer.readUInt32BE(offset + 100) >> 16;
      }
    } else if (boxType === 'stsd') {
      // Sample description — codec info
      const entryCount = buffer.readUInt32BE(offset + 12);
      if (entryCount > 0) {
        const entryOffset = offset + 16;
        if (entryOffset + 8 < buffer.length) {
          const entrySize = buffer.readUInt32BE(entryOffset);
          const entryType = buffer.toString('ascii', entryOffset + 4, entryOffset + 8);
          codec = entryType;
          // For AVC1/H264, try to get more info
          if (entryType === 'avc1' && entryOffset + 82 < buffer.length) {
            bitrate = buffer.readUInt32BE(entryOffset + 82) * 8; // bits per second
          }
        }
      }
    }

    if (boxSize < 8 || offset + boxSize > end) break;
    offset += boxSize;
  }

  return { format: 'mp4', duration, width, height, codec, fps: null, bitrate };
}

function parseWebmMetadata(buffer: Buffer): VideoMetadata | null {
  // EBML header: 1A 45 DF A3
  if (buffer[0] !== 0x1a || buffer[1] !== 0x45 || buffer[2] !== 0xdf || buffer[3] !== 0xa3) {
    return null;
  }

  // Basic scan for common WebM elements
  const text = buffer.toString('latin1');
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  let codec: string | null = null;

  // Look for codec ID (V_VP8, V_VP9, V_AV1)
  const codecMatch = text.match(/V_(VP[89]|AV1)/);
  if (codecMatch?.[1]) codec = codecMatch[1];

  // Extract width/height from track entry (simplified parsing)
  // In practice, WebM uses variable-length EBML integers
  // For a proper parser we'd need full EBML support, but this gets basic info
  const tracks = text.match(/V_MPEG4\/ISO\/AVC|V_VP[89]/);
  if (tracks?.[0]) codec = tracks[0];

  return {
    format: 'webm',
    duration,
    width,
    height,
    codec,
    fps: null,
    bitrate: null,
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export class VideoAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.VIDEO;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    let meta: VideoMetadata | null = null;

    // Try MP4/MOV first (most common)
    meta = parseMp4Metadata(buffer);

    // Try WebM
    if (!meta) {
      meta = parseWebmMetadata(buffer);
    }

    const sizeKb = (buffer.length / 1024).toFixed(1);
    const durationStr = formatDuration(meta?.duration ?? null);
    const resolution = meta?.width && meta?.height ? `${meta.width}×${meta.height}` : '';

    const parts = [
      (meta?.format ?? 'Video').toUpperCase(),
      resolution,
      durationStr,
      (meta?.codec ?? '').toUpperCase(),
      `${sizeKb} KB`,
    ].filter(Boolean);

    return {
      title: ctx.fileName,
      description: `Video file: ${parts.join(', ')}.`,
      modality: 'video',
      datasetType: DatasetType.VIDEO,
      tags: [],
      metadata: {
        format: meta?.format ?? 'unknown',
        duration: meta?.duration ?? null,
        width: meta?.width ?? null,
        height: meta?.height ?? null,
        codec: meta?.codec ?? null,
        bitrate: meta?.bitrate ?? null,
        byteSize: buffer.length,
      },
    };
  }
}

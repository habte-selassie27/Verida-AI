// Audio Analyzer — extracts metadata from audio file headers.
// Parses WAV (RIFF header), MP3 (ID3 tags + frame info), and OGG (Vorbis header).
// No ffmpeg dependency — pure header parsing.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

interface AudioMetadata {
  format: string;
  duration: number | null; // seconds
  sampleRate: number | null;
  channels: number | null;
  bitrate: number | null;
  bitsPerSample: number | null;
}

function parseWavMetadata(buffer: Buffer): AudioMetadata | null {
  // RIFF header: "RIFF" + size + "WAVE"
  if (buffer.length < 44) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buffer.toString('ascii', 8, 12) !== 'WAVE') return null;

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataSize = 0;

  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++; // pad to even
  }

  if (sampleRate === 0) return null;

  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const duration = byteRate > 0 ? dataSize / byteRate : null;

  return {
    format: 'wav',
    duration,
    sampleRate,
    channels,
    bitrate: byteRate * 8,
    bitsPerSample,
  };
}

function parseMp3Metadata(buffer: Buffer): AudioMetadata | null {
  // Check for ID3v2 tag
  let offset = 0;
  if (buffer.length >= 10 && buffer.toString('ascii', 0, 3) === 'ID3') {
    const b6 = buffer[6] ?? 0;
    const b7 = buffer[7] ?? 0;
    const b8 = buffer[8] ?? 0;
    const b9 = buffer[9] ?? 0;
    const size = ((b6 & 0x7f) << 21) | ((b7 & 0x7f) << 14) |
      ((b8 & 0x7f) << 7) | (b9 & 0x7f);
    offset = 10 + size;
  }

  // Find sync frame (0xFF 0xFB or 0xFF 0xF3 or 0xFF 0xF2)
  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xff && ((buffer[offset + 1] ?? 0) & 0xe0) === 0xe0) {
      const header = buffer.readUInt32BE(offset);
      const versionBits = (header >> 19) & 3;
      const layerBits = (header >> 17) & 3;
      const bitrateIndex = (header >> 12) & 0xf;
      const sampleRateIndex = (header >> 10) & 3;

      // MPEG1 Layer III
      if (versionBits === 3 && layerBits === 1) {
        const bitrateTable = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        const sampleRateTable = [44100, 48000, 32000];

        const bitrate = bitrateTable[bitrateIndex] ?? 0;
        const sampleRate = sampleRateTable[sampleRateIndex] ?? 44100;

        // Estimate duration from file size
        const audioBytes = buffer.length - offset;
        const duration = bitrate > 0 ? (audioBytes * 8) / (bitrate * 1000) : null;

        return {
          format: 'mp3',
          duration,
          sampleRate,
          channels: 2, // stereo assumed
          bitrate: bitrate * 1000,
          bitsPerSample: 16,
        };
      }
    }
    offset++;
  }

  return null;
}

function parseOggMetadata(buffer: Buffer): AudioMetadata | null {
  // OGG page header: "OggS"
  if (buffer.length < 27) return null;
  if (buffer.toString('ascii', 0, 4) !== 'OggS') return null;

  // Look for Vorbis stream info after the first page
  // Vorbis identification header: vorbis
  const text = buffer.toString('latin1');
  const vorbisIdx = text.indexOf('vorbis');
  if (vorbisIdx < 0) return null;

  // Vorbis identification header is at a specific position after "OggS"
  // The header contains version, channels, sample rate, bitrate info
  // For simplicity, we'll extract what we can from the header
  let sampleRate = 0;
  let channels = 0;

  // Parse first OGG page to find the vorbis header
  if (buffer.length > 27) {
    const numSegments = buffer[26] ?? 0;
    const segTableStart = 27;
    let headerSize = 0;
    for (let i = 0; i < Math.min(numSegments, 255); i++) {
      headerSize += buffer[segTableStart + i] ?? 0;
    }

    const vorbisStart = segTableStart + numSegments;
    if (vorbisStart + 30 < buffer.length &&
      buffer.toString('ascii', vorbisStart, vorbisStart + 6) === 'vorbis') {
      // Vorbis identification header
      channels = buffer[vorbisStart + 11] ?? 2;
      sampleRate = buffer.readUInt32LE(vorbisStart + 12);
    }
  }

  if (sampleRate === 0) return null;

  // Estimate duration from file size (rough estimate)
  const bitrate = 128000; // typical vorbis bitrate
  const duration = (buffer.length * 8) / bitrate;

  return {
    format: 'ogg',
    duration,
    sampleRate,
    channels,
    bitrate,
    bitsPerSample: 16,
  };
}

function formatAudioDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export class AudioAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.AUDIO;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    let meta: AudioMetadata | null = null;

    // Try WAV
    if (buffer.toString('ascii', 0, 4) === 'RIFF') {
      meta = parseWavMetadata(buffer);
    }
    // Try MP3
    if (!meta && buffer.length >= 4) {
      const hasId3 = buffer.toString('ascii', 0, 3) === 'ID3';
      const hasSync = buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0;
      if (hasId3 || hasSync) meta = parseMp3Metadata(buffer);
    }
    // Try OGG
    if (!meta && buffer.toString('ascii', 0, 4) === 'OggS') {
      meta = parseOggMetadata(buffer);
    }

    const sizeKb = (buffer.length / 1024).toFixed(1);
    const durationStr = formatAudioDuration(meta?.duration ?? null);
    const srKhz = meta?.sampleRate ? `${(meta.sampleRate / 1000).toFixed(1)}kHz` : '';
    const channelsStr = meta?.channels === 1 ? 'mono' : meta?.channels === 2 ? 'stereo' : '';

    const parts = [
      (meta?.format ?? 'Audio').toUpperCase(),
      durationStr,
      srKhz,
      channelsStr,
      meta?.bitrate ? `${Math.round(meta.bitrate / 1000)}kbps` : '',
      `${sizeKb} KB`,
    ].filter(Boolean);

    return {
      title: ctx.fileName,
      description: `Audio file: ${parts.join(', ')}.`,
      modality: 'audio',
      datasetType: DatasetType.AUDIO,
      tags: [],
      metadata: {
        format: meta?.format ?? 'unknown',
        duration: meta?.duration ?? null,
        sampleRate: meta?.sampleRate ?? null,
        channels: meta?.channels ?? null,
        bitrate: meta?.bitrate ?? null,
        bitsPerSample: meta?.bitsPerSample ?? null,
        byteSize: buffer.length,
      },
    };
  }
}

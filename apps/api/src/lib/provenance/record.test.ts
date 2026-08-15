import { describe, expect, it } from 'vitest';
import {
  buildEmitEventArguments,
  PROVENANCE_EVENT_CODES,
  type RecordProvenanceEventInput,
} from './record.js';

function samplePayload(overrides: Partial<RecordProvenanceEventInput> = {}): Record<string, unknown> {
  const input: RecordProvenanceEventInput = {
    datasetId: 7,
    version: 2,
    eventType: 'UPLOAD',
    actorAddress: '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd',
    merkleRoot: 'd2a3d363665839ab',
    blobId: '0xabc/some-blob',
    ...overrides,
  };
  return {
    datasetId: input.datasetId,
    version: input.version,
    eventType: input.eventType,
    eventCode: PROVENANCE_EVENT_CODES[input.eventType],
    blobId: input.blobId,
    merkleRoot: input.merkleRoot,
    actor: input.actorAddress,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}

describe('PROVENANCE_EVENT_CODES', () => {
  it('maps every event type to the Move module u8 codes', () => {
    expect(PROVENANCE_EVENT_CODES).toEqual({
      UPLOAD: 0,
      VERSION_ADDED: 1,
      VERIFIED: 2,
      TAMPER_DETECTED: 3,
      ACCESSED: 4,
      OWNERSHIP_TRANSFERRED: 5,
    });
  });
});

describe('buildEmitEventArguments', () => {
  it('targets the provenance emit_event entry function', () => {
    const { function: fn } = buildEmitEventArguments(
      samplePayload(),
      '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd',
    );
    expect(fn.endsWith('::provenance::emit_event')).toBe(true);
  });

  it('passes dataset id, version, event code, and metadata JSON', () => {
    const payload = samplePayload({ eventType: 'TAMPER_DETECTED' });
    const { functionArguments } = buildEmitEventArguments(
      payload,
      '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd',
    );

    expect(functionArguments[0]).toBe(7);
    expect(functionArguments[1]).toBe(2);
    expect(functionArguments[2]).toBe(3);

    const metadata = JSON.parse(functionArguments[3] as string) as Record<string, unknown>;
    expect(metadata.blobId).toBe('0xabc/some-blob');
    expect(metadata.merkleRoot).toBe('d2a3d363665839ab');
    expect(metadata.actor).toBe('0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd');
    expect(metadata.eventType).toBe('TAMPER_DETECTED');
  });

  it('keeps the on-chain metadata free of dataset contents (identifiers only)', () => {
    const { functionArguments } = buildEmitEventArguments(
      samplePayload(),
      '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd',
    );
    const metadata = JSON.parse(functionArguments[3] as string) as Record<string, unknown>;
    const serialized = JSON.stringify(metadata);
    expect(serialized).not.toContain('description');
    expect(serialized).not.toContain('rows');
    expect(Object.keys(metadata)).toEqual(
      expect.arrayContaining(['blobId', 'merkleRoot', 'actor', 'eventType']),
    );
  });
});

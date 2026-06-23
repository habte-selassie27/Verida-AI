import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const accessRequestBodySchema = z.object({
  payerAddress: z.string().trim().min(1),
  txHash: z.string().trim().min(1).optional(),
});

describe('accessRequestBodySchema', () => {
  it('accepts valid payerAddress only', () => {
    const result = accessRequestBodySchema.safeParse({
      payerAddress: '0xabc123',
    });
    expect(result.success).toBe(true);
  });

  it('accepts payerAddress with txHash', () => {
    const result = accessRequestBodySchema.safeParse({
      payerAddress: '0xabc123',
      txHash: '0xtxhash123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.txHash).toBe('0xtxhash123');
    }
  });

  it('rejects empty payerAddress', () => {
    const result = accessRequestBodySchema.safeParse({
      payerAddress: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty txHash', () => {
    const result = accessRequestBodySchema.safeParse({
      payerAddress: '0xabc',
      txHash: '',
    });
    expect(result.success).toBe(false);
  });

  it('allows undefined txHash', () => {
    const result = accessRequestBodySchema.safeParse({
      payerAddress: '0xabc',
      txHash: undefined,
    });
    expect(result.success).toBe(true);
  });
});

const datasetIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

describe('datasetIdParamSchema', () => {
  it('coerces string id to number', () => {
    const result = datasetIdParamSchema.safeParse({ id: '42' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(42);
  });

  it('rejects non-numeric id', () => {
    const result = datasetIdParamSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects negative id', () => {
    const result = datasetIdParamSchema.safeParse({ id: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects zero', () => {
    const result = datasetIdParamSchema.safeParse({ id: '0' });
    expect(result.success).toBe(false);
  });
});

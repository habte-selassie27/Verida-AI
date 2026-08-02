import { describe, it, expect } from 'vitest';
import { computeFeeSplit } from './escrowSync.js';

describe('computeFeeSplit', () => {
  it('splits 5% off the top by default', () => {
    const split = computeFeeSplit(1000);
    expect(split.feeOctas).toBe(50);
    expect(split.publisherOctas).toBe(950);
  });

  it('rounds the fee down to whole octas', () => {
    const split = computeFeeSplit(199);
    expect(split.feeOctas).toBe(9); // 9.95 → 9
    expect(split.publisherOctas).toBe(190);
  });

  it('leaves tiny amounts whole when the fee rounds to zero', () => {
    const split = computeFeeSplit(1);
    expect(split.feeOctas).toBe(0);
    expect(split.publisherOctas).toBe(1);
  });

  it('honors a custom basis-points rate', () => {
    const split = computeFeeSplit(1000, 1000); // 10%
    expect(split.feeOctas).toBe(100);
    expect(split.publisherOctas).toBe(900);
  });

  it('handles zero', () => {
    const split = computeFeeSplit(0);
    expect(split.feeOctas).toBe(0);
    expect(split.publisherOctas).toBe(0);
  });

  it('keeps publisher + fee exactly equal to the original amount', () => {
    const { feeOctas, publisherOctas } = computeFeeSplit(123456789);
    expect(feeOctas + publisherOctas).toBe(123456789);
  });
});

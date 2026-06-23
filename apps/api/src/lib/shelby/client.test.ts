import { describe, it, expect } from 'vitest';
import { buildBlobId, parseBlobId, normalizeMerkleRoot, ShelbyConfigurationError } from './client.js';

describe('buildBlobId', () => {
  it('builds a blob id from account address and blob name', async () => {
    const result = await buildBlobId('0x123', 'my-data.csv');
    expect(result).toBe('0x123/my-data.csv');
  });

  it('normalizes account address to lowercase', async () => {
    const result = await buildBlobId('0xABC', 'file.json');
    expect(result).toBe('0xabc/file.json');
  });

  it('strips leading slashes from blob name', async () => {
    const result = await buildBlobId('0x1', '/path/to/file');
    expect(result).toBe('0x1/path/to/file');
  });

  it('normalizes backslashes to forward slashes', async () => {
    const result = await buildBlobId('0x1', 'path\\to\\file');
    expect(result).toBe('0x1/path/to/file');
  });

  it('throws on empty account address', async () => {
    await expect(buildBlobId('', 'file')).rejects.toThrow(ShelbyConfigurationError);
  });

  it('throws on empty blob name', async () => {
    await expect(buildBlobId('0x1', '')).rejects.toThrow(ShelbyConfigurationError);
  });
});

describe('parseBlobId', () => {
  it('parses a valid blob id', async () => {
    const result = await parseBlobId('0x123/my-data.csv');
    expect(result).toEqual({
      accountAddress: '0x123',
      blobName: 'my-data.csv',
    });
  });

  it('normalizes account address to lowercase', async () => {
    const result = await parseBlobId('0xABC/file.txt');
    expect(result.accountAddress).toBe('0xabc');
  });

  it('throws on blob id without slash', async () => {
    await expect(parseBlobId('noslash')).rejects.toThrow(ShelbyConfigurationError);
  });

  it('throws on blob id with empty account', async () => {
    await expect(parseBlobId('/file.txt')).rejects.toThrow(ShelbyConfigurationError);
  });

  it('throws on blob id with empty name', async () => {
    await expect(parseBlobId('0x123/')).rejects.toThrow(ShelbyConfigurationError);
  });
});

describe('normalizeMerkleRoot', () => {
  it('trims and lowercases', async () => {
    const result = await normalizeMerkleRoot('  0xABCDEF  ');
    expect(result).toBe('0xabcdef');
  });
});

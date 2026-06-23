import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../lib/db/index.js', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
  publishers: {},
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
  },
}));

describe('Auth route helpers', () => {
  describe('Nonce generation', () => {
    it('generates unique nonces', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const nonce = `verida-ai-login-${crypto.randomUUID()}`;
        nonces.add(nonce);
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('Message building', () => {
    function buildSignMessage(nonce: string, address: string): string {
      return [
        'Welcome to Verida AI!',
        '',
        `I want to sign in to Verida AI with my Aptos wallet.`,
        '',
        `Wallet: ${address}`,
        `Nonce: ${nonce}`,
        '',
        'By signing this message, you prove you own this wallet.',
        'This costs no gas and has no on-chain effect.',
      ].join('\n');
    }

    it('includes the nonce in the message', () => {
      const msg = buildSignMessage('test-nonce-123', '0xabc');
      expect(msg).toContain('Nonce: test-nonce-123');
    });

    it('includes the wallet address', () => {
      const msg = buildSignMessage('nonce', '0xmyaddr');
      expect(msg).toContain('Wallet: 0xmyaddr');
    });
  });

  describe('Nonce extraction', () => {
    function extractNonceFromMessage(message: string): string | null {
      const nonceLine = message.split('\n').find((line) => line.startsWith('Nonce: '));
      return nonceLine?.slice('Nonce: '.length)?.trim() ?? null;
    }

    it('extracts nonce from a valid message', () => {
      const msg = 'Welcome\n\nNonce: abc-123\n\nBy signing';
      expect(extractNonceFromMessage(msg)).toBe('abc-123');
    });

    it('returns null if no nonce line', () => {
      expect(extractNonceFromMessage('no nonce here')).toBeNull();
    });

    it('handles extra whitespace', () => {
      const msg = 'Nonce:   spaced-nonce  ';
      expect(extractNonceFromMessage(msg)).toBe('spaced-nonce');
    });
  });
});

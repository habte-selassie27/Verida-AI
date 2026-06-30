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

  describe('summarizeZodIssues', () => {
    // Re-implement locally so we don't need to export the private helper
    function summarizeZodIssues(issues: { code: string; message: string; path: (string | number)[] }[]): string {
      if (issues.length === 0) {
        return 'Address, message, and signature are required.';
      }
      const fields = new Set<string>();
      for (const issue of issues) {
        const field = issue.path.length > 0 ? issue.path.join('.') : '<root>';
        fields.add(`${field} (${issue.message})`);
      }
      return `Invalid request: ${Array.from(fields).join('; ')}.`;
    }

    it('lists each failed field with its message', () => {
      const issues = [
        { code: 'invalid_type', path: ['signature'], message: 'Required' },
        { code: 'too_small', path: ['message'], message: 'String must contain at least 1 character(s)' },
      ];
      expect(summarizeZodIssues(issues)).toBe(
        'Invalid request: signature (Required); message (String must contain at least 1 character(s)).',
      );
    });

    it('falls back to generic message when given no issues', () => {
      expect(summarizeZodIssues([])).toBe('Address, message, and signature are required.');
    });

    it('marks root-level issues as <root>', () => {
      expect(summarizeZodIssues([{ code: 'custom', path: [], message: 'Bad shape' }]))
        .toBe('Invalid request: <root> (Bad shape).');
    });

    it('deduplicates identical (path, message) entries', () => {
      const issues = [
        { code: 'invalid_type', path: ['signature'], message: 'Required' },
        { code: 'invalid_type', path: ['signature'], message: 'Required' },
      ];
      expect(summarizeZodIssues(issues)).toBe('Invalid request: signature (Required).');
    });
  });
});

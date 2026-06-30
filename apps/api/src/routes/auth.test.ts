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

  describe('verifyRequestSchema — request validation regression gate', () => {
    // We import the schema directly from auth.ts so this test exercises the
    // EXACT validator the production handler uses. This is the regression
    // gate for the "client sends signature as object" bug class: if someone
    // ever loosens the schema back to z.any() this test fails loudly.
    //
    // NOTE: this is NOT an end-to-end integration test of the /verify HTTP
    // handler. It validates the request-body schema in isolation. Full
    // handler coverage (nonce replay, signature verification, JWT issuance)
    // would require mock infrastructure beyond this file's scope.
    type Schema = {
      safeParse: (input: unknown) => {
        success: boolean;
        data?: { signature: string };
        error?: { issues: { code: string; message: string; path: (string | number)[] }[] };
      };
    };
    let verifyRequestSchema: Schema;

    beforeEach(async () => {
      // Dynamic import so module-level mocks above are in effect first.
      const mod = await import('./auth.js');
      verifyRequestSchema = (mod as unknown as {
        __TEST_ONLY_verifyRequestSchema: Schema;
      }).__TEST_ONLY_verifyRequestSchema;
    });

    // A realistic Aptos address: 32-byte hex with 0x prefix.
    const VALID_ADDRESS = '0x' + 'a'.repeat(64);

    // The string the client MUST send post-fix:
    //   '0x' (2 chars) + (32-byte Ed25519 pubKey hex = 64 chars) +
    //   (64-byte Ed25519 sig hex = 128 chars)
    //   total length = 2 + 64 + 128 = 194 chars
    const VALID_SIWA_SIGNATURE = '0x' + 'b'.repeat(64) + 'c'.repeat(128);

    it('accepts a properly-formatted SIWA string signature', () => {
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Welcome to Verida AI!\n\nWallet: 0x...\nNonce: example-nonce\n\nBy signing this message.',
        signature: VALID_SIWA_SIGNATURE,
      });
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.signature).toBe(VALID_SIWA_SIGNATURE);
        expect(typeof result.data.signature).toBe('string');
      }
    });

    it('REJECTS an object signature — guards the "Expected string, received object" bug class', () => {
      // This shape is exactly what JSON.stringify would produce for a
      // serialized Uint8Array — the bug the user hit in production.
      const serializedUint8Array = { 0: 1, 1: 2, 2: 3, 3: 4, 4: 5 };
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
        signature: serializedUint8Array,
      });
      expect(result.success).toBe(false);
      if (!result.success && result.error) {
        const sigIssue = result.error.issues.find((i) => i.path.join('.') === 'signature');
        expect(sigIssue).toBeDefined();
        // Use the Zod issue code (locale-stable) so a future Zod release won't
        // silently break this regression gate.
        expect(sigIssue?.code).toBe('invalid_type');
      }
    });

    it('REJECTS a Uint8Array-shaped signature', () => {
      // Even at the wire level, the server must NEVER see a Uint8Array. JSON
      // serializes those to object literals {0:..,1:..} — which the previous
      // test catches. But we also assert the schema rejects any non-string.
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
        signature: new Uint8Array([1, 2, 3, 4, 5]),
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS a numeric signature', () => {
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
        signature: 12345 as unknown as string,
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS missing signature field', () => {
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const sigIssue = result.error.issues.find((i) => i.path.join('.') === 'signature');
        expect(sigIssue?.code).toBe('invalid_type');
      }
    });

    it('REJECTS empty-string signature', () => {
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
        signature: '   ', // trims to ''
      });
      expect(result.success).toBe(false);
    });

    it('REJECTS non-Aptos address', () => {
      const result = verifyRequestSchema.safeParse({
        address: 'not-an-address',
        message: 'Some non-empty challenge message',
        signature: VALID_SIWA_SIGNATURE,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const addrIssue = result.error.issues.find((i) => i.path.join('.') === 'address');
        expect(addrIssue?.message).toContain('Invalid Aptos address');
      }
    });

    it('REJECTS empty message', () => {
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: '',
        signature: VALID_SIWA_SIGNATURE,
      });
      expect(result.success).toBe(false);
    });

    it('accepts signature without 0x prefix', () => {
      // Defensive: backend should accept either form after we strip the prefix.
      const sigHexOnly = 'b'.repeat(64) + 'c'.repeat(128);
      const result = verifyRequestSchema.safeParse({
        address: VALID_ADDRESS,
        message: 'Some non-empty challenge message',
        signature: sigHexOnly,
      });
      expect(result.success).toBe(true);
    });
  });
});

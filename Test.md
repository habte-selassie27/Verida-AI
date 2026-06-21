# Test.md — Verida AI: Testing Strategy

> **Agent:** Tester (Codex / o4-mini)
> **Trigger:** After any Implementer task completes a file.
> **Rule:** Tester never modifies source files. It only creates/updates `*.test.ts` and `e2e/**` files.

---

## Testing Stack

| Layer | Tool | Location |
|-------|------|----------|
| Unit tests | Vitest | `apps/api/src/**/*.test.ts` |
| Integration tests (API) | Vitest + Supertest | `apps/api/tests/integration/` |
| Shelby mock | Manual mock | `apps/api/src/__mocks__/shelby.ts` |
| Frontend component tests | Vitest + Testing Library | `apps/web/**/*.test.tsx` |
| E2E tests | Playwright | `e2e/` |
| Test DB | Docker PostgreSQL (isolated) | `docker-compose.test.yml` |

---

## Test Configuration

### Vitest Config (apps/api)
```typescript
// apps/api/vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: { lines: 70, functions: 70, branches: 65 },
    },
    globals: true,
  },
});
```

### Test Setup (apps/api/src/test/setup.ts)
```typescript
// Prompt Codex with:
// implement: Write the Vitest global setup file that:
//   1. Starts a test PostgreSQL connection (TEST_DATABASE_URL env)
//   2. Runs Drizzle migrations against the test DB
//   3. Clears all tables before each test (truncate cascade)
//   4. Sets up the Shelby SDK mock (import from __mocks__/shelby.ts)
//   5. Tears down DB connection after all tests
```

---

## Shelby SDK Mock

```
implement: Write apps/api/src/__mocks__/shelby.ts that mocks
@shelby-protocol/sdk with vi.mock(). The mock should:

- uploadDataset() → returns a fake ProvenanceReceipt:
  { blobId: 'mock-blob-123', merkleRoot: '0xabc...', receipt: {...},
    expiresAt: Date.now() + 86400000 }
  Simulates progress events: 0% → 50% → 100% on nextTick

- streamDataset() → returns a Node.js Readable that emits
  Buffer.from('mock-dataset-chunk') in 3 chunks then ends

- verifyIntegrity(blobId, merkleRoot):
  If blobId === 'tampered-blob' → { valid: false, ... }
  Otherwise → { valid: true, checkedAt: Date.now(), details: {} }

- createAccessSession() → { sessionId: 'sess-mock-456', expiresAt: ... }
- validateSession('sess-mock-456') → { valid: true }
- validateSession('expired-sess') → { valid: false, reason: 'expired' }
```

---

## Unit Tests

### 1. Shelby Integration Layer

```
test: Write unit tests for apps/api/src/lib/shelby/upload.ts
using the Shelby mock. Test cases:

UPLOAD:
  ✓ uploadDataset() returns blobId and merkleRoot on success
  ✓ uploadDataset() emits progress events: 0%, 50%, 100%
  ✓ uploadDataset() retries up to 3 times on network error
  ✓ uploadDataset() throws ShelbyUploadError after 3 failed retries
  ✓ uploadDataset() cleans up temp file on failure

VERIFY:
  ✓ verifyIntegrity() returns { valid: true } for matching merkle root
  ✓ verifyIntegrity() returns { valid: false } for mismatched merkle root
  ✓ verifyIntegrity() sets dataset.tampered = true in DB on failure

PROVENANCE:
  ✓ readProvenance() returns stored provenance chain from DB
  ✓ writeProvenanceMetadata() inserts new provenance_chain row
  ✓ provenance chain events are ordered by timestamp ASC

ACCESS:
  ✓ createAccessSession() creates session in DB and Shelby
  ✓ validateSession() returns valid=true for active session
  ✓ validateSession() returns valid=false for expired session
  ✓ streamDataset() pipes Shelby stream to Express res
  ✓ streamDataset() rejects with 403 if session invalid
```

### 2. Database Layer

```
test: Write unit tests for apps/api/src/lib/db/schema.ts queries:

  ✓ Insert dataset → row retrievable by id
  ✓ Insert dataset_version → linked to parent dataset
  ✓ Insert provenance_chain event → linked to dataset + version
  ✓ Query datasets with tag filter → returns only matching rows
  ✓ Query datasets by publisher_address → correct results
  ✓ Cascade delete: deleting dataset removes versions + provenance rows
  ✓ shelby_blob_id is unique across datasets table
  ✓ merkle_root field stores 66-char hex string without truncation
```

### 3. Shared Types Validation

```
test: Write unit tests for packages/shared/src/types.ts:

  ✓ Dataset type has all required fields (id, shelby_blob_id, merkle_root, etc.)
  ✓ ProvenanceReceipt matches Shelby SDK return shape
  ✓ AccessType enum has exactly: free, pay_per_access, subscription
  ✓ UploadStatus enum has: pending, uploading, processing, complete, failed
```

---

## Integration Tests (API)

```
test: Write integration tests using Supertest against the Express app
for apps/api/tests/integration/. Use real DB (test schema), mocked Shelby.

POST /api/datasets/upload:
  ✓ 400 if no file attached
  ✓ 400 if metadata missing required fields (name, access_type)
  ✓ 413 if file > 10GB limit
  ✓ 202 with { jobId } on valid upload request
  ✓ Job appears in BullMQ queue after 202 response
  ✓ WebSocket emits progress events for the jobId
  ✓ Dataset row inserted to DB after job completes
  ✓ ProvenanceReceipt stored on dataset row

GET /api/datasets:
  ✓ 200 with paginated array (default limit 20)
  ✓ Filter by tag=medical returns only medical datasets
  ✓ Filter by access_type=free returns only free datasets
  ✓ Filter by publisher_address returns that publisher's datasets
  ✓ Pagination: page=2 returns next 20 items
  ✓ Empty result: 200 with empty array (not 404)

GET /api/datasets/:id:
  ✓ 200 with full dataset including versions[] and provenance_chain[]
  ✓ 404 for non-existent id
  ✓ provenance_chain is sorted by timestamp ASC

POST /api/datasets/:id/verify:
  ✓ 202 with { jobId } on valid request
  ✓ 404 for non-existent dataset
  ✓ Dataset.verified updates to true after job completes (valid merkle)
  ✓ Dataset.verified updates to false + tampered=true (tampered blob mock)

GET /api/datasets/:id/stream:
  ✓ 403 if no valid session provided
  ✓ 403 if session expired
  ✓ 200 content-type: application/octet-stream with valid session
  ✓ Response body matches Shelby stream output

POST /api/datasets/:id/access:
  ✓ 201 with { sessionId, expiresAt }
  ✓ 404 for non-existent dataset
  ✓ Session row inserted to access_sessions table
  ✓ 429 if same address creates > 10 sessions/hour (rate limit)
```

---

## Frontend Component Tests

```
test: Write Vitest + Testing Library tests for React components.

DatasetCard.tsx:
  ✓ Renders dataset name, publisher (truncated address), size
  ✓ Shows correct badge color per AccessType
  ✓ IntegrityBadge shows "Verified" when dataset.verified = true
  ✓ IntegrityBadge shows "Pending" when dataset.verified = null
  ✓ Card links to /dataset/[id] on click

ProvenanceTree.tsx:
  ✓ Renders all provenance_chain events in timestamp order
  ✓ Each event shows actor_address (truncated to 0x1234...abcd format)
  ✓ "View on Aptos" link uses correct txHash
  ✓ Empty chain shows "No provenance events yet" message

UploadWizard.tsx:
  ✓ Step 1: File drop zone accepts files, shows file name
  ✓ Step 1: Rejects files > 10GB, shows error message
  ✓ Step 2: "Next" button disabled until name + access_type filled
  ✓ Step 3: Price input only shown when access_type = pay_per_access
  ✓ Step 4: Submit calls POST /api/datasets/upload with correct payload
  ✓ Progress bar appears after submit, tracks WebSocket progress events
  ✓ On complete: router.push('/dataset/[returned_id]') called

IntegrityBadge.tsx:
  ✓ "Verified" variant: renders teal shield
  ✓ "Tampered" variant: renders red warning icon
  ✓ Tooltip shows merkle root snippet on hover
```

---

## E2E Tests (Playwright)

```
test: Write Playwright E2E tests in e2e/ covering the critical user journey.
Use a seeded test DB and mocked Shelby SDK (via MSW in the browser).

e2e/upload-and-verify.spec.ts:
  FLOW: Upload → Marketplace → Detail → Verify

  ✓ User can upload a dataset via UploadWizard (4 steps)
  ✓ Progress bar reaches 100% during upload
  ✓ After upload, user is redirected to /dataset/[id]
  ✓ Dataset appears in marketplace listing at /marketplace
  ✓ Dataset detail page shows correct metadata
  ✓ ProvenanceTree shows the upload event
  ✓ Clicking "Verify Integrity" shows "Verified" badge after check

e2e/access-and-stream.spec.ts:
  FLOW: Browse → Purchase Access → Stream

  ✓ Unauthenticated user cannot access pay_per_access dataset stream
  ✓ User can purchase access via "Get Access" button
  ✓ After purchase, "Download / Stream" button is enabled
  ✓ Clicking stream initiates download (content-disposition header)

e2e/provenance-chain.spec.ts:
  FLOW: Upload V1 → Upload V2 → Verify chain integrity

  ✓ Uploading V2 of a dataset creates new version entry
  ✓ Provenance tree shows both V1 and V2 events
  ✓ V1 merkle root is preserved and still verifiable
  ✓ V2 has a different merkle root from V1
```

---

## Test Data Seeds

```
test: Write apps/api/src/test/seeds.ts with:

seed_datasets: Array of 20 datasets across tags, access types, publishers.
  Include: 5 free, 5 pay_per_access, 5 subscription, 5 with tampered=true.
  Each has at least 1 provenance_chain event.

seed_publishers: 5 publisher addresses with varying dataset counts.

seed_access_sessions: 10 sessions: 7 active, 3 expired.

Export: seedDatabase() and clearDatabase() functions.
```

---

## Running Tests

```bash
# Unit + Integration tests (API)
cd apps/api
npm run test               # Vitest
npm run test:coverage      # With coverage report
npm run test:watch         # Watch mode during development

# Frontend component tests
cd apps/web
npm run test

# E2E tests (requires docker-compose up first)
cd e2e
npx playwright test
npx playwright test --headed    # Visible browser for debugging
npx playwright show-report      # View HTML report

# All tests from root
npm run test                    # Runs all workspaces
```

---

## Coverage Targets

| Module | Target |
|--------|--------|
| `lib/shelby/**` | 85%+ (critical path) |
| `routes/**` | 80%+ |
| `lib/db/**` | 75%+ |
| `components/dataset/**` | 70%+ |
| Overall | 70%+ |

---

## CI Test Strategy

```yaml
# .github/workflows/test.yml (for reference)
# OpenCode prompt: "implement: Write GitHub Actions workflow that:
#   1. Spins up postgres + redis via services
#   2. Runs npm run test in apps/api and apps/web
#   3. Uploads coverage to Codecov
#   4. Runs Playwright E2E on PR to main only"
```

---

## Test Naming Conventions

All test files follow:
```
describe('[Module/Component Name]', () => {
  describe('[function/feature name]', () => {
    it('should [expected behavior] when [condition]', () => { ... });
  });
});
```

Use `expect.soft()` for non-critical assertions so all failures are visible at once.
# Review.md — Verida AI: Code Review Checklist

> **Agent:** Reviewer (Qwen2.5-Coder-32B)
> **Trigger:** After Implementer or Tester completes a task, or before any commit to `main`.
> **Output:** Append findings to the **Review Log** section at the bottom of this file.
> **Rule:** Reviewer is READ-ONLY. It posts findings as structured comments; it never directly edits source.

---

## How to Invoke the Reviewer

```bash
# Review a specific file
opencode "review: apps/api/src/lib/shelby/upload.ts"

# Review a full feature (multiple files)
opencode "review: the Shelby integration layer in apps/api/src/lib/shelby/"

# Review before merge
opencode "review: all files changed since last commit"
```

The reviewer agent loads this full `Review.md` as its system context and posts structured findings to the log below.

---

## Checklist: Security

### S1 — API Key Handling
- [ ] `SHELBY_API_KEY` is never logged (not in Morgan, not in error messages)
- [ ] API key never appears in any `console.log` or error stack traces
- [ ] API key is read from `process.env` only once at startup (not per-request)
- [ ] `.env` files are listed in `.gitignore` — never committed

### S2 — File Upload Security
- [ ] Multer limits: max file size enforced (10GB), file count = 1 per request
- [ ] File type validation: MIME type checked server-side (not just extension)
- [ ] Temp file path is sanitized before passing to Shelby SDK
- [ ] Temp files are deleted after upload completes OR fails (finally block)
- [ ] Upload endpoint rate limited (10/hour per IP) — verified in middleware

### S3 — Access Control
- [ ] Stream endpoint validates session before piping ANY data
- [ ] Session validation happens BEFORE Shelby stream is opened
- [ ] Expired sessions return 403, not 401 (session exists but expired)
- [ ] Publisher-only routes verify wallet signature before mutation

### S4 — Input Validation
- [ ] All POST/PUT body fields validated with Zod schema
- [ ] dataset `id` param validated as UUID format before DB query
- [ ] Publisher `address` param validated as Aptos address format (0x + 64 hex)
- [ ] Pagination `page` and `limit` bounded: limit max = 100

### S5 — Database
- [ ] All DB queries use parameterized statements (Drizzle ORM handles this — confirm no raw SQL strings with user input)
- [ ] No `SELECT *` on large tables — always specify columns
- [ ] Cascade deletes are intentional — review before adding ON DELETE CASCADE

---

## Checklist: Shelby Integration Correctness

### SH1 — Upload
- [ ] `blobId` from Shelby is stored in DB before responding to client
- [ ] `merkleRoot` from Shelby receipt is stored — never derived locally
- [ ] `provenanceReceipt` JSON blob is stored verbatim (no field omissions)
- [ ] Upload progress events map correctly: Shelby % → WebSocket payload
- [ ] If Shelby upload fails mid-stream, dataset row is NOT inserted to DB

### SH2 — Verification
- [ ] `verifyIntegrity()` compares against the `merkleRoot` from DB (not re-fetched from user input)
- [ ] Tampered detection writes to `datasets.tampered = true` AND inserts a `provenance_chain` event of type `TAMPER_DETECTED`
- [ ] Verification result includes `checkedAt` timestamp stored in DB

### SH3 — Streaming
- [ ] `res.pipe()` / `pipeline()` used correctly — no `res.write()` loop
- [ ] `Content-Type: application/octet-stream` set before stream starts
- [ ] `Content-Disposition: attachment; filename="[dataset-name]"` set
- [ ] Stream errors caught: Shelby stream error → 500 response (if headers not sent yet) OR connection close (if streaming started)
- [ ] Session `bytes_consumed` updated after stream completes

### SH4 — Access Sessions
- [ ] Session `expiresAt` uses server time (not client-provided time)
- [ ] `sessionId` is the Shelby-issued ID, not a locally generated UUID
- [ ] Session validated in `access_sessions` DB table AND via Shelby SDK (both must pass)

---

## Checklist: Code Quality

### Q1 — TypeScript
- [ ] No `any` types — all Shelby SDK return types properly typed
- [ ] All async functions have typed return signatures (not inferred)
- [ ] `ProvenanceReceipt` type in `packages/shared` matches actual Shelby SDK return shape
- [ ] No `@ts-ignore` or `@ts-expect-error` without a comment explaining why

### Q2 — Error Handling
- [ ] All Shelby SDK calls wrapped in try/catch with typed error handling
- [ ] API routes use `express-async-handler` — no unhandled promise rejections
- [ ] Error responses follow consistent format: `{ error: string, code: string, details?: any }`
- [ ] 500 errors never expose internal stack traces to client in production

### Q3 — Async / Performance
- [ ] Large dataset reads use streaming — never `Buffer.from(entire file)`
- [ ] DB queries in loops → refactored to batch queries (no N+1 patterns)
- [ ] BullMQ jobs are idempotent — safe to retry without duplicating data
- [ ] Redis cache used for: dataset metadata (TTL: 5min), publisher profiles (TTL: 10min)

### Q4 — React / Frontend
- [ ] No data fetching in `useEffect` — all server state via TanStack Query
- [ ] Components don't directly call `fetch()` — use query hooks from `lib/api/`
- [ ] Wallet address displayed as truncated `0x1234...abcd` — never full 66 chars inline
- [ ] All `merkleRoot` hashes displayed in monospace font (`font-mono`)
- [ ] Loading and error states handled for every async operation
- [ ] `ProvenanceTree` events sorted by `timestamp ASC` before rendering

### Q5 — Naming and Structure
- [ ] Shelby-related variables consistently named: `blobId`, `merkleRoot`, `receipt` (not `shelby_id`, `hash`, `proof`)
- [ ] Dataset events in `provenance_chain` use consistent `event_type` enum values: `UPLOAD | VERSION_ADDED | VERIFIED | TAMPER_DETECTED | ACCESSED`
- [ ] File imports use `@/` path alias — no relative `../../../` chains

---

## Checklist: Shelby Competition Alignment

These items specifically matter for the Shelby builder competition evaluation:

### C1 — Shelby as Core (not Optional)
- [ ] Datasets are ONLY stored on Shelby — no fallback to S3 or local FS
- [ ] Provenance receipts come from Shelby's actual receipt, not a locally generated hash
- [ ] Marketplace listing retrieves `shelby_blob_id` and uses it for all access/verify operations
- [ ] The README/demo clearly shows Shelby as the storage layer

### C2 — Differentiated Use of Shelby Features
- [ ] Uses Shelby's **verification layer** (Merkle check) — not just blob storage
- [ ] Uses Shelby's **streaming** (not download-then-serve)
- [ ] Uses Shelby's **access/payment** sessions — not a custom auth bypass
- [ ] Uses Shelby's **global namespace** — datasets accessible cross-region by blobId alone
- [ ] Provenance chain references Shelby's `txHash` (on-chain commitment)

### C3 — Demo Readiness
- [ ] A working demo can be run with `docker-compose up && npm run dev`
- [ ] At least 3 sample datasets seeded in the demo DB
- [ ] The "Verify Integrity" flow works end-to-end and shows a result within 5 seconds
- [ ] The streaming endpoint can be called with `curl` in the README

---

## Severity Levels

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| 🔴 BLOCKER | Security risk or data corruption | Must fix before merge |
| 🟠 MAJOR | Incorrect behavior, bad perf | Fix before merge, or document workaround |
| 🟡 MINOR | Code quality, naming | Fix in next pass |
| 🟢 SUGGESTION | Improvement idea | Optional |

---

## Review Log

> Reviewer agent appends entries here in chronological order.

```
Format per entry:
---
[DATE] Review of: [file or feature]
Reviewer: Qwen2.5-Coder-32B via OpenCode

🔴 BLOCKER:
  - [Finding and line reference]

🟠 MAJOR:
  - [Finding]

🟡 MINOR:
  - [Finding]

🟢 SUGGESTION:
  - [Finding]

Overall: PASS / NEEDS REVISION
---
```

*(Reviewer agent appends entries below this line)*

---

## Pre-Merge Final Checklist

Before pushing to `main` or submitting to Shelby competition:

```
[ ] All unit + integration tests passing (npm run test)
[ ] E2E: upload → verify → stream flow works end-to-end
[ ] No API keys in any committed file
[ ] .env.example updated with all new env vars
[ ] AGENTS.md reflects any new file boundaries added
[ ] Review.md log has no unresolved 🔴 BLOCKER items
[ ] README has: setup instructions, demo script, Shelby architecture diagram
[ ] docker-compose up starts all services without errors
[ ] /api/datasets returns data within 500ms on local
[ ] Shelby blob streaming works: curl the stream endpoint and bytes arrive
```
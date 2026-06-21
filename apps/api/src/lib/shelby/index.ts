// IMPLEMENTER NOTE: Re-exports the Shelby integration surface for the API modules and future route handlers.
// BUILD.md TASK: STEP 4 — Shelby SDK Integration Layer
// ARCHITECT CONTRACT: All Shelby upload, download, provenance, access, and verification helpers
// SHELBY SDK METHODS: Client singleton and helper functions from the sibling Shelby modules
// DB TABLES: datasets, access_sessions, provenance_chain
// HANDOFF TO TESTER: Verify the index surface includes all runtime helpers and error classes from the Shelby layer.

export * from './client.js';
export * from './upload.js';
export * from './download.js';
export * from './verify.js';
export * from './provenance.js';
export * from './access.js';

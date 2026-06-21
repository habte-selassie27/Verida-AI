// IMPLEMENTER NOTE: Re-exports the shared Verida AI domain types from a single package entrypoint.
// BUILD.md TASK: STEP 1 — Shared Types Package
// ARCHITECT CONTRACT: Dataset, DatasetVersion, ProvenanceReceipt, AccessSession, Publisher, DatasetTag, AccessType, UploadStatus, APIResponse<T>
// SHELBY SDK METHODS: None directly; this entrypoint exposes receipt and session models.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Confirm every shared type is exported from the package entrypoint and remains stable for consumers.

export * from './types.js';

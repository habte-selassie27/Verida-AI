// IMPLEMENTER NOTE: Defines the shared Verida AI domain types used by the web and API packages.
// BUILD.md TASK: STEP 1 — Shared Types Package
// ARCHITECT CONTRACT: Dataset, DatasetVersion, ProvenanceReceipt, AccessSession, Publisher, DatasetTag, AccessType, UploadStatus, APIResponse<T>
// SHELBY SDK METHODS: None directly; this file models Shelby receipt and session payloads.
// DB TABLES: datasets, dataset_versions, access_sessions, publishers, provenance_chain
// HANDOFF TO TESTER: Verify snake_case DB-shaped fields, enum values, and receipt shape stay stable for later API and UI integration.
export var DatasetTag;
(function (DatasetTag) {
    DatasetTag["AUDIO"] = "audio";
    DatasetTag["CLIMATE"] = "climate";
    DatasetTag["EDUCATION"] = "education";
    DatasetTag["ENERGY"] = "energy";
    DatasetTag["FINANCE"] = "finance";
    DatasetTag["GAMING"] = "gaming";
    DatasetTag["GEOSPATIAL"] = "geospatial";
    DatasetTag["GOVERNMENT"] = "government";
    DatasetTag["LEGAL"] = "legal";
    DatasetTag["MEDICAL"] = "medical";
    DatasetTag["NLP"] = "nlp";
    DatasetTag["OTHER"] = "other";
    DatasetTag["ROBOTICS"] = "robotics";
    DatasetTag["SCIENCE"] = "science";
    DatasetTag["SYNTHETIC"] = "synthetic";
    DatasetTag["TABULAR"] = "tabular";
    DatasetTag["TIME_SERIES"] = "time_series";
    DatasetTag["VISION"] = "vision";
    DatasetTag["WEB"] = "web";
})(DatasetTag || (DatasetTag = {}));
export var AccessType;
(function (AccessType) {
    AccessType["FREE"] = "free";
    AccessType["PAY_PER_ACCESS"] = "pay_per_access";
    AccessType["SUBSCRIPTION"] = "subscription";
})(AccessType || (AccessType = {}));
export var UploadStatus;
(function (UploadStatus) {
    UploadStatus["PENDING"] = "pending";
    UploadStatus["UPLOADING"] = "uploading";
    UploadStatus["PROCESSING"] = "processing";
    UploadStatus["COMPLETE"] = "complete";
    UploadStatus["FAILED"] = "failed";
})(UploadStatus || (UploadStatus = {}));

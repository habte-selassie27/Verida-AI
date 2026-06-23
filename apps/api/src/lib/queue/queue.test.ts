import { describe, it, expect } from 'vitest';
import { AccessType, DatasetTag } from '@verida/shared';
import {
  UploadJobTypes,
  UploadQueueEvents,
  type UploadDatasetMetadata,
  type UploadProgressEvent,
} from './queue.js';

describe('UploadJobTypes', () => {
  it('defines expected job types', () => {
    expect(UploadJobTypes.UPLOAD_DATASET).toBe('UPLOAD_DATASET');
    expect(UploadJobTypes.VERIFY_INTEGRITY).toBe('VERIFY_INTEGRITY');
    expect(UploadJobTypes.GENERATE_PREVIEW).toBe('GENERATE_PREVIEW');
  });
});

describe('UploadQueueEvents', () => {
  it('defines expected event names', () => {
    expect(UploadQueueEvents.COMPLETE).toBe('upload:complete');
    expect(UploadQueueEvents.ERROR).toBe('upload:error');
    expect(UploadQueueEvents.PROGRESS).toBe('upload:progress');
  });
});

describe('UploadProgressEvent type', () => {
  it('can be constructed with valid fields', () => {
    const progress: UploadProgressEvent = {
      bytesTotal: 1000,
      bytesUploaded: 500,
      percent: 50,
      stage: 'reading',
    };
    expect(progress.percent).toBe(50);
    expect(progress.stage).toBe('reading');
  });
});

describe('UploadDatasetMetadata type', () => {
  it('can be constructed with required fields', () => {
    const metadata: UploadDatasetMetadata = {
      accessType: AccessType.FREE,
      description: 'Test dataset',
      license: 'MIT',
      name: 'Test',
      tags: [DatasetTag.NLP],
    };
    expect(metadata.accessType).toBe(AccessType.FREE);
    expect(metadata.tags).toHaveLength(1);
  });
});

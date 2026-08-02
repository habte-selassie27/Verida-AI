# Fix WS Race Condition in Upload Flow

There is a 100% reproducible race condition in the upload flow. The frontend opens the WebSocket **after** the POST returns, but the backend worker emits progress/complete events immediately. The WS subscribes to a dead channel and stays at 0% forever.

## Required Changes

### 1. Frontend — `apps/web/src/pages/Upload.tsx`

Install `uuid` and `@types/uuid`:

```bash
npm i uuid @types/uuid
```

Rewrite `startUpload` to:
1. Generate a UUID client-side with `uuidv4()`
2. Open WebSocket **before** POSTing
3. Wait for `ws.onopen` via `await new Promise(...)`
4. Append `jobId` to FormData
5. POST only after WS is connected
6. Close WS on completion/error

The complete `startUpload` implementation is below. Replace the existing one exactly.

```ts
const startUpload = useCallback(async () => {
  if (!file || !address) {
    if (!address) alert('Please connect your wallet first.');
    return;
  }

  try {
    logout();
    await login();
  } catch {
    alert('Please sign the authentication message in your wallet to continue.');
    return;
  }

  setUploading(true);
  setUploadPercent(0);
  setUploadStage(0);
  setChunksDone(0);
  setUploadDetailOpen(false);
  setUploadError(null);

  const jobId = uuidv4();

  const wsUrl = `${WS_BASE}/ws/uploads/${jobId}`;
  const ws = new WebSocket(wsUrl);
  wsRef.current = ws;

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'progress') {
        const progress = msg.data;
        setUploadPercent(progress.percent);
        if (progress.stage === 'reading' || progress.stage === 'encoding') setUploadStage(0);
        else if (progress.stage === 'registering') setUploadStage(1);
        else if (progress.stage === 'confirming') setUploadStage(2);
        else if (progress.stage === 'uploading') setUploadStage(2);
        else if (progress.stage === 'distributing') setUploadStage(3);
        else if (progress.stage === 'complete') setUploadStage(4);
      } else if (msg.type === 'complete') {
        setUploadStage(5);
        setUploadPercent(100);
        setChunksDone(16);
        ws.close();
        setTimeout(() => {
          setUploading(false);
          clearDraft();
          setReceipt({
            jobId,
            blobId: msg.dataset?.shelby_blob_id ?? 'Pending...',
            merkleRoot: msg.dataset?.merkle_root ?? 'Pending...',
            txHash: msg.dataset?.provenance_receipt?.txHash ?? 'Pending...',
            uploadedAt: new Date().toLocaleString(),
            chunks: 16,
          });
        }, 500);
      } else if (msg.type === 'error') {
        setUploadError(msg.error || 'Upload failed');
        ws.close();
        setUploading(false);
      }
    } catch { /* ignore parse errors */ }
  };

  ws.onerror = () => {
    setUploadError(
      'Lost connection to the upload progress stream. The upload may still be ' +
      'processing — check your dashboard in a moment.',
    );
    setUploading(false);
  };

  ws.onclose = () => { wsRef.current = null; };

  await new Promise<void>((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) { resolve(); return; }
    ws.onopen = () => resolve();
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    ws.addEventListener('open', () => clearTimeout(timeout), { once: true });
    ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('WebSocket failed')); }, { once: true });
  }).catch((err) => {
    setUploadError(err.message);
    setUploading(false);
    throw err;
  });

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('license', license);
    formData.append('accessType', accessType);
    formData.append('publisherAddress', address);
    formData.append('jobId', jobId);
    tags.forEach((t) => formData.append('tags', t));
    if (accessType !== AccessType.FREE && price) {
      formData.append('pricePerAccess', String(Math.round(parseFloat(price) * 100_000_000)));
    }

    await uploadDataset(formData);
  } catch (err) {
    setUploadError(err instanceof Error ? err.message : 'Upload failed');
    setUploading(false);
    ws.close();
  }
}, [file, address, name, description, license, accessType, price, tags]);
```

Keep all existing imports and other code unchanged.

### 2. Backend upload route — `apps/api/src/routes/datasets.ts`

In the `POST /upload` handler, accept `jobId` from `req.body` instead of generating one server-side:

```ts
// After multer processing, before queue.add()
const jobId = (req.body.jobId as string) || crypto.randomUUID();

// When adding to BullMQ:
await UploadDatasetQueue.add(UploadJobTypes.UPLOAD_DATASET, jobData, {
  attempts: 3,
  backoff: { delay: 5000, type: 'exponential' },
  jobId,
  removeOnComplete: { age: 86400, count: 100 },
  removeOnFail: { age: 604800 },
});

// In the response:
response.status(202).json({
  data: { jobId, status: 'queued' },
  success: true,
});
```

### 3. Worker — `apps/api/src/lib/queue/workers/uploadWorker.ts`

In the worker file, after creating the worker, add an `active` event listener that emits initial progress:

```ts
import { emitUploadProgress } from '../queue.js';

// After createUploadWorker() definition or inside it
UploadWorker.on('active', (job) => {
  emitUploadProgress(job.id!, {
    bytesTotal: 0,
    bytesUploaded: 0,
    percent: 5,
    stage: 'reading',
  });
});
```

### Files to modify
- `apps/web/src/pages/Upload.tsx` — rewrite `startUpload`
- `apps/api/src/routes/datasets.ts` — accept `jobId` from `req.body`
- `apps/api/src/lib/queue/workers/uploadWorker.ts` — emit initial progress on `active`

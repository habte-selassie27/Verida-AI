import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { db } from '../lib/db/index.js';
import { datasets } from '../lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { parseBlobId } from '../lib/shelby/client.js';

const LOCAL = join(process.cwd(), '.shelby-blobs');

async function main() {
  for (const id of [14, 15, 16]) {
    const row = await db.select().from(datasets).where(eq(datasets.id, id)).then(r => r[0]);
    if (!row) continue;
    console.log('#' + row.id + ' ' + row.name);
    console.log('  stored merkleRoot:', row.merkleRoot);

    const { accountAddress, blobName } = await parseBlobId(row.shelbyBlobId);
    const blobPath = join(LOCAL, accountAddress, blobName);
    try {
      const data = await readFile(blobPath);
      const hash = createHash('sha256').update(data).digest('hex');
      console.log('  recomputed hash:  ', hash);
      console.log('  match:', row.merkleRoot === hash);
    } catch {
      console.log('  local file NOT FOUND at', blobPath);
    }
  }
}
main().catch(console.error);

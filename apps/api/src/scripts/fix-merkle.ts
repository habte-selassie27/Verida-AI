import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { db } from '../lib/db/index.js';
import { datasets } from '../lib/db/schema.js';
import { inArray } from 'drizzle-orm';
import { parseBlobId } from '../lib/shelby/client.js';

const LOCAL = join(process.cwd(), '.shelby-blobs');

async function main() {
  const ids = [14, 15, 16];
  const rows = await db.select().from(datasets).where(inArray(datasets.id, ids));

  for (const row of rows) {
    const { accountAddress, blobName } = await parseBlobId(row.shelbyBlobId);
    const blobPath = join(LOCAL, accountAddress, blobName);
    try {
      const data = await readFile(blobPath);
      const correctHash = createHash('sha256').update(data).digest('hex');
      await db.update(datasets).set({ merkleRoot: correctHash }).where(inArray(datasets.id, [row.id]));
      console.log('#' + row.id + ' ' + row.name + ': fixed ' + row.merkleRoot + ' -> ' + correctHash);
    } catch {
      console.log('#' + row.id + ': local file not found, skipped');
    }
  }
  console.log('Done.');
}
main().catch(console.error);

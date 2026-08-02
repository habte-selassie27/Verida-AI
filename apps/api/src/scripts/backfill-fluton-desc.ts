import { db } from '../lib/db/index.js';
import { datasets } from '../lib/db/schema.js';
import { inArray } from 'drizzle-orm';
import { generateDescription } from '../ai/serving/client.js';

const ids = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

async function main() {
  const rows = await db.select().from(datasets).where(inArray(datasets.id, ids));

  for (const row of rows) {
    try {
      const aiDescription = await generateDescription({
        schemaProfile: (row.schemaProfile as any) ?? { modality: row.modality ?? 'tabular', format: 'pdf' },
        fileName: row.name,
        existingDescription: row.description,
      });

      await db.update(datasets).set({ aiDescription }).where(inArray(datasets.id, [row.id]));
      console.log('#' + row.id + ' ' + row.name + ': ' + (aiDescription?.slice(0, 60) ?? 'null'));
    } catch (err) {
      console.error('#' + row.id + ' FAILED:', err instanceof Error ? err.message : err);
    }
  }
  console.log('Done.');
}

main().catch(console.error);

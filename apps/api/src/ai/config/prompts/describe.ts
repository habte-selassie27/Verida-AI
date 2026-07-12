// Module A — Description prompt builder (used by the LLM client).
// All dataset content is treated as untrusted data, never as instructions
// (see AI_Integration.md §17.1 — prompt-injection defense).

import type { SchemaProfile } from '@verida/shared';

export function buildDescriptionPrompt(params: {
  schemaProfile: SchemaProfile;
  fileName: string;
  existingDescription?: string;
}): string {
  const { schemaProfile, fileName, existingDescription } = params;
  const colSummary = schemaProfile.columns
    ? schemaProfile.columns
        .slice(0, 20)
        .map(
          (c) =>
            `  - ${c.name} (${c.inferredType}, ${((c.nullRate ?? 0) * 100).toFixed(1)}% null, ` +
            `${c.cardinality} unique values, category: ${c.semanticCategory ?? 'unknown'})`,
        )
        .join('\n')
    : 'No column schema available.';

  return `You are a senior data scientist writing a marketplace listing for an AI training dataset.

Dataset file: ${fileName}
Modality: ${schemaProfile.modality}
Format: ${schemaProfile.format ?? 'unknown'}
Estimated records: ${schemaProfile.estimatedRowCount?.toLocaleString() ?? 'unknown'}
${schemaProfile.estimatedTokenCount ? `Estimated tokens: ~${schemaProfile.estimatedTokenCount.toLocaleString()}` : ''}
${schemaProfile.language ? `Language: ${schemaProfile.language}` : ''}

${schemaProfile.columns ? `Schema (${schemaProfile.columns.length} columns):\n${colSummary}` : ''}
${existingDescription ? `\nPublisher's existing description: "${existingDescription}"` : ''}

Write a concise (100-150 word) dataset description for AI practitioners who want to know:
1. What the dataset contains
2. What ML tasks it is suitable for (classification, regression, NLP, CV, RL, etc.)
3. Notable structural features (size, time coverage, geographic coverage if apparent)
4. Any quality caveats you can infer from the schema

Rules:
- Do not invent information. Only state what the schema supports.
- Write in present tense, third person.
- Do not start with "This dataset".
- Do not repeat the file name verbatim.
- Be specific about ML use cases, not generic ("can be used for machine learning").`;
}

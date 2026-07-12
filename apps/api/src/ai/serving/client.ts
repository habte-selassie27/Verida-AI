// AI serving — LLM description generation + text embeddings.
//
// All providers are OPTIONAL and degrade gracefully:
//  - If no API key is set, the functions return null and the caller
//    falls back to structural-only enrichment.
//  - SDKs are imported dynamically so tsc never requires them at build time.
//
// Supported providers (checked in priority order):
//  1. Google Gemini (free tier: 15 RPM, 1M tokens/day)
//  2. Anthropic Claude (paid)
//  3. OpenAI (paid, used for embeddings)

import type { SchemaProfile } from '@verida/shared';

import { buildCacheKey, cachedInference } from './cache.js';
import { buildDescriptionPrompt } from '../config/prompts/describe.js';

const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY?.trim();
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY?.trim();
const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim();

// ── Description generation ─────────────────────────────────────────

export async function generateDescription(params: {
  schemaProfile: SchemaProfile;
  fileName: string;
  existingDescription?: string;
}): Promise<string | null> {
  const prompt = buildDescriptionPrompt(params);
  const cacheKey = buildCacheKey('desc', prompt);

  try {
    return await cachedInference(cacheKey, 86_400, async () => {
      // 1. Try Gemini (free)
      if (GEMINI_KEY) {
        const pkg = '@google/generative-ai';
        const mod = await import(pkg);
        const GoogleGenerativeAI = (mod as { GoogleGenerativeAI: new (apiKey: string) => unknown }).GoogleGenerativeAI;
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = (genAI as { getGenerativeModel: (opts: object) => unknown }).getGenerativeModel({
          model: 'gemini-2.0-flash',
        });
        const result = await (model as { generateContent: (input: string) => Promise<{ response: { text: () => string } }> }).generateContent(prompt);
        const text = result.response.text();
        return text?.trim() ?? '';
      }

      // 2. Try Anthropic (paid)
      if (ANTHROPIC_KEY) {
        const pkg = '@anthropic-ai/sdk';
        const mod = await import(pkg);
        const Anthropic = (mod as { default: new (opts: object) => AnthropicClient }).default;
        const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
        const response = await client.messages.create({
          max_tokens: 300,
          model: 'claude-haiku-4-5-20251001',
          messages: [{ content: prompt, role: 'user' }],
        });
        const first = response.content[0];
        if (first && first.type === 'text' && typeof first.text === 'string') {
          return first.text.trim();
        }
        return '';
      }

      return null;
    });
  } catch (cause: unknown) {
    console.error('[AI] description generation failed:', cause);
    return null;
  }
}

// ── Embeddings ─────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[] | null> {
  const cacheKey = buildCacheKey('emb', text);

  try {
    return await cachedInference(cacheKey, 86_400, async () => {
      // 1. Try Gemini embeddings (free)
      if (GEMINI_KEY) {
        const pkg = '@google/generative-ai';
        const mod = await import(pkg);
        const GoogleGenerativeAI = (mod as { GoogleGenerativeAI: new (apiKey: string) => unknown }).GoogleGenerativeAI;
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = (genAI as { getGenerativeModel: (opts: object) => unknown }).getGenerativeModel({
          model: 'text-embedding-004',
        });
        const result = await (model as { embedContent: (input: string) => Promise<{ embedding: { values: number[] } }> }).embedContent(text);
        return result.embedding.values;
      }

      // 2. Try OpenAI embeddings (paid)
      if (OPENAI_KEY) {
        const pkg = 'openai';
        const mod = await import(pkg);
        const OpenAI = (mod as { default: new (opts: object) => OpenAIClient }).default;
        const client = new OpenAI({ apiKey: OPENAI_KEY });
        const response = await client.embeddings.create({
          input: text,
          model: 'text-embedding-3-small',
        });
        return response.data[0]?.embedding ?? [];
      }

      return null;
    });
  } catch (cause: unknown) {
    console.error('[AI] embedding failed:', cause);
    return null;
  }
}

interface AnthropicClient {
  messages: { create: (args: object) => Promise<{ content: { type: string; text?: string }[] }> };
}
interface OpenAIClient {
  embeddings: { create: (args: object) => Promise<{ data: { embedding?: number[] }[] }> };
}

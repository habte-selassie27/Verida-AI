// Seed content for the community/blog. These are the original static blog
// posts, moved into the database so the Community page shows real data that
// the admin can edit/delete from the UI. Insertion is idempotent by slug.
import { eq } from 'drizzle-orm';
import { communityPosts } from '../db/schema.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema.js';

export interface CommunitySeedPost {
  category: 'Announcement' | 'Research' | 'Engineering' | 'Product' | 'Releases' | 'Tutorials';
  content: string;
  date: string;
  excerpt: string;
  featured: boolean;
  title: string;
}

export const SEED_COMMUNITY_POSTS: CommunitySeedPost[] = [
  {
    title: 'Introducing Verida AI: Trust-First Data Infrastructure',
    excerpt: 'Why we built a decentralized AI dataset marketplace on Aptos and Shelby.',
    date: '2025-01-15',
    category: 'Announcement',
    featured: true,
    content: `# Introducing Verida AI

We're excited to announce **Verida AI** — a trust-first data infrastructure for the AI economy, built on Aptos and the Shelby protocol.

## The problem

AI models are only as good as their training data, yet today's data marketplaces are opaque: buyers cannot verify where data came from, whether it was tampered with, or who actually produced it.

## The solution

Verida AI anchors every dataset's content hash and provenance trail on-chain, so:

- **Integrity is verifiable** — every dataset ships with a merkle root that anyone can check.
- **Provenance is permanent** — the full history of a dataset (upload, versions, transfers) lives on-chain.
- **Payments are fair** — publishers get paid per access via escrow, not one-time licensing.

## What's next

We're shipping the marketplace, the SDK, and our verification pipeline over the coming weeks. Stay tuned.`,
  },
  {
    title: 'How On-Chain Provenance Solves AI Data Trust',
    excerpt: 'The problem with training data integrity and how blockchain verification fixes it.',
    date: '2025-01-22',
    category: 'Research',
    featured: false,
    content: `# On-Chain Provenance for AI Data

## The trust gap

Training data is the foundation of every AI system, but today it is traded like an unverifiable commodity. When a model misbehaves, there is no way to audit the data that shaped it.

## How Verida closes the gap

Every dataset published on Verida produces a content hash (merkle root) stored on-chain. Verification re-reads the blob and recomputes the hash — if they match, integrity holds; if not, the dataset is flagged as tampered.

## Beyond hashing

Hashing proves *unchanged*, not *authentic*. That's why we also record provenance events: uploads, version additions, ownership transfers, and access grants, each signed and timestamped on-chain.

## The result

Buyers can verify what they're buying. Publishers get credit for their work. And the ecosystem builds a public, auditable record of where AI data actually comes from.`,
  },
  {
    title: 'Building the Shelby Network: A Technical Deep Dive',
    excerpt: 'Architecture decisions behind our decentralized storage layer.',
    date: '2025-02-03',
    category: 'Engineering',
    featured: false,
    content: `# Building the Shelby Network

## Storage that verifies itself

Shelby stores dataset blobs as chunked content-addressed data. Each chunk contributes to a merkle root that anchors the whole file on-chain — a tamper-evident, deduplicated storage layer.

## The upload pipeline

1. The file is read and chunked.
2. Chunks are pushed to Shelby storage.
3. The merkle root is computed from the chunk hashes.
4. The root is anchored in a provenance transaction.

## Why Aptos

Aptos gives us fast finality and low fees — essential for per-access micropayments that would be uneconomical on slower chains.

## What's next

We're working on replication policies and a public storage proof mechanism.`,
  },
  {
    title: 'Pay-Per-Access: fairer economics for dataset creators',
    excerpt: 'How micropayments replace one-time licensing in AI data.',
    date: '2025-02-10',
    category: 'Product',
    featured: false,
    content: `# Pay-Per-Access Economics

## The licensing problem

Traditional dataset licensing forces buyers to pay for the whole dataset up front, even when they only need a sample — and it gives publishers no ongoing revenue from their work.

## Pay-per-access on Verida

With pay-per-access, buyers deposit payment into an on-chain escrow vault and receive a time-limited access session. Publishers are paid automatically, and the escrow protects both sides.

## Never charge twice

A wallet that already paid for a dataset is entitled forever — no re-charging on repeat access.

## Better for everyone

Buyers pay only for what they use. Publishers earn per access, not per sale.`,
  },
  {
    title: "Verida SDK v2.4: What's New",
    excerpt: 'Streaming sessions, improved auth, and 3 new language bindings.',
    date: '2025-02-18',
    category: 'Releases',
    featured: false,
    content: `# Verida SDK v2.4

## Streaming sessions

Access sessions now stream dataset blobs directly, with bytes-consumed tracking built in.

## Improved auth

Wallet signatures (AIP-62 and SIWA) are now normalized across wallet providers, so authentication works with Petra, Martian, and Pontem.

## New language bindings

- Python
- Rust
- Go

## Get started

Check the [SDK docs](/sdk) for installation and quickstart guides.`,
  },
  {
    title: 'Tutorial: Upload Your First Dataset',
    excerpt: 'Step-by-step guide to publishing data on Verida AI.',
    date: '2025-02-25',
    category: 'Tutorials',
    featured: false,
    content: `# Upload Your First Dataset

## 1. Connect your wallet

Head to the Marketplace and connect your Aptos wallet (Petra, Martian, or Pontem).

## 2. Upload a file

Click **Upload** and choose your dataset. Add a name, description, license, and tags.

## 3. Verify integrity

Hit **Verify Now** on the dataset page — the API re-reads the blob and recomputes the merkle root.

## 4. Register ownership on-chain

One click registers the dataset's ownership record on-chain.

## 5. Share it

Your dataset is now live on the marketplace with a verifiable provenance trail.`,
  },
];

/**
 * Insert the seed posts idempotently (skips slugs that already exist) and
 * return the number of posts inserted.
 */
export async function seedCommunityPosts(
  dbClient: PostgresJsDatabase<typeof schema>,
  authorAddress: string,
): Promise<number> {
  let inserted = 0;
  for (const post of SEED_COMMUNITY_POSTS) {
    const existing = await dbClient
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.slug, slugify(post.title)))
      .limit(1);
    if (existing.length > 0) continue;

    await dbClient.insert(communityPosts).values({
      authorAddress: authorAddress.toLowerCase(),
      category: post.category,
      content: post.content,
      excerpt: post.excerpt,
      featured: post.featured,
      publishedAt: new Date(post.date).toISOString(),
      slug: slugify(post.title),
      status: 'published',
      title: post.title,
    });
    inserted += 1;
  }
  return inserted;
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base.length > 0 ? base : 'post';
}

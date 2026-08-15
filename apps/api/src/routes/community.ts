// Community forum routes: admin-published posts with wallet-authenticated
// comments and likes. Posts are curated (admin wallet only, same pattern as
// the dataset seed flow), while any authenticated wallet can comment and like.
import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db, communityComments, communityLikes, communityPosts, publishers } from '../lib/db/index.js';
import { getAuthenticatedAddress, requireAuth } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { ApiRouteError } from './datasets.js';

const ADMIN_WALLET =
  process.env.VITE_MARKETPLACE_CONTRACT_ADDRESS?.trim().toLowerCase() ||
  '0x141a8b5da194f039af93bdb7df81824a506fe73cade01138d2309aa7d497fddd';

const POST_CATEGORIES = [
  'Announcement',
  'Research',
  'Engineering',
  'Product',
  'Releases',
  'Tutorials',
] as const;

const postCreateSchema = z.object({
  category: z.enum(POST_CATEGORIES),
  content: z.string().trim().min(1).max(100_000),
  excerpt: z.string().trim().max(400).optional().nullable(),
  featured: z.boolean().optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  title: z.string().trim().min(3).max(200),
});

const postUpdateSchema = postCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields to update.',
  });

const commentCreateSchema = z.object({
  address: z.string().trim().min(1).max(64).optional(),
  content: z.string().trim().min(1).max(2000),
  displayName: z.string().trim().min(1).max(40).optional().nullable(),
});

const likeBodySchema = z.object({
  address: z.string().trim().min(1).max(64).optional(),
  likerId: z.string().trim().min(1).max(128),
});

const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

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

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const rows = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(
        and(
          eq(communityPosts.slug, candidate),
          excludeId !== undefined ? ne(communityPosts.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function requireAdminWallet(request: Request): string {
  const address = getAuthenticatedAddress(request).toLowerCase();
  if (address !== ADMIN_WALLET) {
    throw new ApiRouteError({
      code: 'FORBIDDEN',
      message: 'Only the platform admin can publish community posts.',
      statusCode: 403,
    });
  }
  return address;
}

// Drizzle `.returning()` rows use camelCase property names (authorAddress,
// publishedAt, createdAt) while the GET endpoints project snake_case columns
// (author_address, published_at, created_at). Normalize write responses to the
// same snake_case shape the frontend reads, or the UI crashes on undefined
// fields when it prepends a freshly created comment/post to a list.
function toPostResponse(post: {
  authorAddress: string;
  category: string;
  content: string;
  createdAt: string;
  excerpt: string | null;
  featured: boolean;
  id: number;
  publishedAt: string | null;
  slug: string;
  status: string;
  title: string;
  updatedAt: string;
}): Record<string, unknown> {
  return {
    author_address: post.authorAddress,
    category: post.category,
    content: post.content,
    created_at: post.createdAt,
    excerpt: post.excerpt,
    featured: post.featured,
    id: post.id,
    published_at: post.publishedAt,
    slug: post.slug,
    status: post.status,
    title: post.title,
    updated_at: post.updatedAt,
  };
}

function toCommentResponse(comment: {
  authorAddress: string | null;
  content: string;
  createdAt: string;
  displayName: string | null;
  id: number;
  postId: number;
}): Record<string, unknown> {
  return {
    author_address: comment.authorAddress,
    content: comment.content,
    created_at: comment.createdAt,
    display_name: comment.displayName,
    id: comment.id,
    post_id: comment.postId,
  };
}

const commentCountSubquery = db
  .select({
    commentCount: count(communityComments.id).as('comment_count'),
    postId: communityComments.postId,
  })
  .from(communityComments)
  .groupBy(communityComments.postId)
  .as('comment_counts');

const likeCountSubquery = db
  .select({
    likeCount: count(communityLikes.likerAddress).as('like_count'),
    postId: communityLikes.postId,
  })
  .from(communityLikes)
  .groupBy(communityLikes.postId)
  .as('like_counts');

const router = Router();

// GET /api/community/posts — published posts, newest first, with counts.
router.get(
  '/posts',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const category = typeof request.query.category === 'string' && request.query.category.trim().length > 0
      ? request.query.category.trim()
      : undefined;
    const page = Math.max(1, Number(request.query.page) || 1);
    const pageSize = Math.min(Math.max(Number(request.query.limit) || 20, 1), 50);
    const offset = (page - 1) * pageSize;

    const filters = [eq(communityPosts.status, 'published')];
    if (category !== undefined && (POST_CATEGORIES as readonly string[]).includes(category)) {
      filters.push(eq(communityPosts.category, category));
    }

    const rows = await db
      .select({
        author_address: communityPosts.authorAddress,
        author_username: publishers.username,
        category: communityPosts.category,
        comment_count: sql<number>`COALESCE(${commentCountSubquery.commentCount}, 0)`,
        created_at: communityPosts.createdAt,
        excerpt: communityPosts.excerpt,
        featured: communityPosts.featured,
        id: communityPosts.id,
        like_count: sql<number>`COALESCE(${likeCountSubquery.likeCount}, 0)`,
        published_at: communityPosts.publishedAt,
        slug: communityPosts.slug,
        title: communityPosts.title,
      })
      .from(communityPosts)
      .leftJoin(commentCountSubquery, eq(communityPosts.id, commentCountSubquery.postId))
      .leftJoin(likeCountSubquery, eq(communityPosts.id, likeCountSubquery.postId))
      .leftJoin(publishers, eq(publishers.address, communityPosts.authorAddress))
      .where(and(...filters))
      .orderBy(desc(communityPosts.publishedAt), desc(communityPosts.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ total: count() })
      .from(communityPosts)
      .where(and(...filters));

    response.json({
      data: {
        items: rows,
        page,
        totalItems: Number(countRow?.total ?? 0),
      },
      success: true,
    });
  }),
);

// GET /api/community/posts/:slug — post detail + comments + like state.
router.get(
  '/posts/:slug',
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsed = slugParamSchema.safeParse({ slug: request.params.slug });
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_SLUG',
        message: 'Post slug is invalid.',
        statusCode: 400,
      });
    }

    const viewer =
      typeof request.query.viewer === 'string' && request.query.viewer.trim().length > 0
        ? request.query.viewer.trim().toLowerCase()
        : null;

    const rows = await db
      .select({
        author_address: communityPosts.authorAddress,
        author_username: publishers.username,
        category: communityPosts.category,
        comment_count: sql<number>`COALESCE(${commentCountSubquery.commentCount}, 0)`,
        content: communityPosts.content,
        created_at: communityPosts.createdAt,
        excerpt: communityPosts.excerpt,
        featured: communityPosts.featured,
        id: communityPosts.id,
        like_count: sql<number>`COALESCE(${likeCountSubquery.likeCount}, 0)`,
        published_at: communityPosts.publishedAt,
        slug: communityPosts.slug,
        title: communityPosts.title,
        updated_at: communityPosts.updatedAt,
      })
      .from(communityPosts)
      .leftJoin(commentCountSubquery, eq(communityPosts.id, commentCountSubquery.postId))
      .leftJoin(likeCountSubquery, eq(communityPosts.id, likeCountSubquery.postId))
      .leftJoin(publishers, eq(publishers.address, communityPosts.authorAddress))
      .where(and(eq(communityPosts.slug, parsed.data.slug), eq(communityPosts.status, 'published')))
      .limit(1);

    const post = rows.at(0);
    if (post === undefined) {
      throw new ApiRouteError({
        code: 'POST_NOT_FOUND',
        message: `Community post "${parsed.data.slug}" was not found.`,
        statusCode: 404,
      });
    }

    const [comments, likedRows] = await Promise.all([
      db
        .select({
          author_address: communityComments.authorAddress,
          content: communityComments.content,
          created_at: communityComments.createdAt,
          display_name: communityComments.displayName,
          id: communityComments.id,
          post_id: communityComments.postId,
        })
        .from(communityComments)
        .where(eq(communityComments.postId, post.id))
        .orderBy(desc(communityComments.createdAt)),
      viewer === null
        ? Promise.resolve([])
        : db
            .select({ postId: communityLikes.postId })
            .from(communityLikes)
            .where(
              and(
                eq(communityLikes.postId, post.id),
                eq(communityLikes.likerId, viewer),
              ),
            )
            .limit(1),
    ]);

    response.json({
      data: {
        comments,
        liked_by_viewer: likedRows.length > 0,
        post,
      },
      success: true,
    });
  }),
);

// POST /api/community/posts — admin only.
router.post(
  '/posts',
  requireAuth,
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const adminAddress = requireAdminWallet(request);
    const parsed = postCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_BODY',
        details: { issues: parsed.error.issues },
        message: 'Invalid post payload.',
        statusCode: 400,
      });
    }

    const slug = await uniqueSlug(slugify(parsed.data.slug ?? parsed.data.title));

    const inserted = await db
      .insert(communityPosts)
      .values({
        authorAddress: adminAddress,
        category: parsed.data.category,
        content: parsed.data.content,
        excerpt: parsed.data.excerpt ?? null,
        featured: parsed.data.featured ?? false,
        publishedAt: new Date().toISOString(),
        slug,
        status: 'published',
        title: parsed.data.title,
      })
      .returning();

    const post = inserted.at(0);
    if (post === undefined) {
      throw new ApiRouteError({
        code: 'POST_CREATE_FAILED',
        message: 'Failed to create the community post.',
        statusCode: 500,
      });
    }

    response.status(201).json({ data: { post: toPostResponse(post) }, success: true });
  }),
);

// PATCH /api/community/posts/:slug — admin only.
router.patch(
  '/posts/:slug',
  requireAuth,
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    requireAdminWallet(request);
    const parsedSlug = slugParamSchema.safeParse({ slug: request.params.slug });
    if (!parsedSlug.success) {
      throw new ApiRouteError({
        code: 'INVALID_SLUG',
        message: 'Post slug is invalid.',
        statusCode: 400,
      });
    }

    const existing = await db
      .select({ id: communityPosts.id, slug: communityPosts.slug })
      .from(communityPosts)
      .where(eq(communityPosts.slug, parsedSlug.data.slug))
      .limit(1);
    const postRow = existing.at(0);
    if (postRow === undefined) {
      throw new ApiRouteError({
        code: 'POST_NOT_FOUND',
        message: `Community post "${parsedSlug.data.slug}" was not found.`,
        statusCode: 404,
      });
    }

    const parsed = postUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_BODY',
        details: { issues: parsed.error.issues },
        message: 'Invalid post payload.',
        statusCode: 400,
      });
    }

    let nextSlug = postRow.slug;
    if (parsed.data.slug !== undefined) {
      nextSlug = await uniqueSlug(slugify(parsed.data.slug), postRow.id);
    } else if (parsed.data.title !== undefined) {
      // Keep a stable URL — only change the slug when explicitly requested.
      nextSlug = postRow.slug;
    }

    const updated = await db
      .update(communityPosts)
      .set({
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
        ...(parsed.data.excerpt !== undefined ? { excerpt: parsed.data.excerpt } : {}),
        ...(parsed.data.featured !== undefined ? { featured: parsed.data.featured } : {}),
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(nextSlug !== postRow.slug ? { slug: nextSlug } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(communityPosts.id, postRow.id))
      .returning();

    const post = updated.at(0);
    if (post === undefined) {
      throw new ApiRouteError({
        code: 'POST_UPDATE_FAILED',
        message: 'Failed to update the community post.',
        statusCode: 500,
      });
    }

    response.json({ data: { post: toPostResponse(post) }, success: true });
  }),
);

// DELETE /api/community/posts/:slug — admin only. Deletes likes and comments
// explicitly so the DB cascade (fresh installs) and route-level deletes
// (tables created before the FK existed) both leave no orphans.
router.delete(
  '/posts/:slug',
  requireAuth,
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    requireAdminWallet(request);
    const parsed = slugParamSchema.safeParse({ slug: request.params.slug });
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_SLUG',
        message: 'Post slug is invalid.',
        statusCode: 400,
      });
    }

    const existing = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.slug, parsed.data.slug))
      .limit(1);
    const postRow = existing.at(0);
    if (postRow === undefined) {
      throw new ApiRouteError({
        code: 'POST_NOT_FOUND',
        message: `Community post "${parsed.data.slug}" was not found.`,
        statusCode: 404,
      });
    }

    await db.delete(communityLikes).where(eq(communityLikes.postId, postRow.id));
    await db.delete(communityComments).where(eq(communityComments.postId, postRow.id));
    await db.delete(communityPosts).where(eq(communityPosts.id, postRow.id));

    response.json({ data: { deleted: true, slug: parsed.data.slug }, success: true });
  }),
);

// POST /api/community/posts/:id/comments — web2 style: no wallet required.
// A wallet-connected author is stored as the address; everyone else gets a
// display name (default "Guest") and stays anonymous.
router.post(
  '/posts/:id/comments',
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsedId = idParamSchema.safeParse({ id: request.params.id });
    if (!parsedId.success) {
      throw new ApiRouteError({
        code: 'INVALID_POST_ID',
        message: 'Post id is invalid.',
        statusCode: 400,
      });
    }

    const parsed = commentCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_BODY',
        details: { issues: parsed.error.issues },
        message: 'Invalid comment payload.',
        statusCode: 400,
      });
    }

    const existing = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, parsedId.data.id))
      .limit(1);
    if (existing.at(0) === undefined) {
      throw new ApiRouteError({
        code: 'POST_NOT_FOUND',
        message: `Community post ${parsedId.data.id} was not found.`,
        statusCode: 404,
      });
    }

    const displayName = parsed.data.displayName?.trim().slice(0, 40) || 'Guest';
    const authorAddress = parsed.data.address?.trim().toLowerCase() ?? null;

    const inserted = await db
      .insert(communityComments)
      .values({
        authorAddress,
        content: parsed.data.content,
        displayName,
        postId: parsedId.data.id,
      })
      .returning();

    const comment = inserted.at(0);
    if (comment === undefined) {
      throw new ApiRouteError({
        code: 'COMMENT_CREATE_FAILED',
        message: 'Failed to post the comment.',
        statusCode: 500,
      });
    }

    response.status(201).json({ data: { comment: toCommentResponse(comment) }, success: true });
  }),
);

// DELETE /api/community/comments/:id — the author or the admin.
router.delete(
  '/comments/:id',
  requireAuth,
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const callerAddress = getAuthenticatedAddress(request).toLowerCase();
    const parsed = idParamSchema.safeParse({ id: request.params.id });
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_COMMENT_ID',
        message: 'Comment id is invalid.',
        statusCode: 400,
      });
    }

    const existing = await db
      .select({ authorAddress: communityComments.authorAddress, id: communityComments.id })
      .from(communityComments)
      .where(eq(communityComments.id, parsed.data.id))
      .limit(1);
    const commentRow = existing.at(0);
    if (commentRow === undefined) {
      throw new ApiRouteError({
        code: 'COMMENT_NOT_FOUND',
        message: `Comment ${parsed.data.id} was not found.`,
        statusCode: 404,
      });
    }

    const isAuthor = commentRow.authorAddress !== null
      && commentRow.authorAddress.toLowerCase() === callerAddress;
    if (!isAuthor && callerAddress !== ADMIN_WALLET) {
      throw new ApiRouteError({
        code: 'FORBIDDEN',
        message: 'Only the wallet-verified comment author or the platform admin can delete this comment.',
        statusCode: 403,
      });
    }

    await db.delete(communityComments).where(eq(communityComments.id, commentRow.id));

    response.json({ data: { deleted: true, id: commentRow.id }, success: true });
  }),
);

// POST /api/community/posts/:id/like — web2 style: no wallet required. The
// client sends a persistent identity (lowercased wallet address when connected,
// otherwise a stable guest id), so one like per browser/identity per post.
router.post(
  '/posts/:id/like',
  generalRateLimit,
  asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const parsedId = idParamSchema.safeParse({ id: request.params.id });
    if (!parsedId.success) {
      throw new ApiRouteError({
        code: 'INVALID_POST_ID',
        message: 'Post id is invalid.',
        statusCode: 400,
      });
    }

    const parsed = likeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ApiRouteError({
        code: 'INVALID_BODY',
        details: { issues: parsed.error.issues },
        message: 'Invalid like payload.',
        statusCode: 400,
      });
    }

    const existing = await db
      .select({ id: communityPosts.id })
      .from(communityPosts)
      .where(eq(communityPosts.id, parsedId.data.id))
      .limit(1);
    if (existing.at(0) === undefined) {
      throw new ApiRouteError({
        code: 'POST_NOT_FOUND',
        message: `Community post ${parsedId.data.id} was not found.`,
        statusCode: 404,
      });
    }

    const likerId = parsed.data.likerId.toLowerCase().slice(0, 128);
    const likerAddress = parsed.data.address?.trim().toLowerCase() ?? null;

    const likedRows = await db
      .select({ postId: communityLikes.postId })
      .from(communityLikes)
      .where(
        and(
          eq(communityLikes.postId, parsedId.data.id),
          eq(communityLikes.likerId, likerId),
        ),
      )
      .limit(1);

    let liked: boolean;
    if (likedRows.length > 0) {
      await db
        .delete(communityLikes)
        .where(
          and(
            eq(communityLikes.postId, parsedId.data.id),
            eq(communityLikes.likerId, likerId),
          ),
        );
      liked = false;
    } else {
      await db.insert(communityLikes).values({
        likerAddress,
        likerId,
        postId: parsedId.data.id,
      });
      liked = true;
    }

    const [countRow] = await db
      .select({ likeCount: count(communityLikes.likerId) })
      .from(communityLikes)
      .where(eq(communityLikes.postId, parsedId.data.id));

    response.json({
      data: { liked, likeCount: Number(countRow?.likeCount ?? 0) },
      success: true,
    });
  }),
);

export { router as communityRouter };

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ChatCircle,
  Heart,
  PencilSimple,
  Trash,
  UserCircle,
} from '@phosphor-icons/react';
import {
  addCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  getCommunityPost,
  toggleCommunityLike,
  type CommunityComment,
  type CommunityPostDetail,
} from '../api/client';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { useWalletContext } from '../context/WalletContext';
import { MARKETPLACE_CONTRACT_ADDRESS } from '../lib/contracts';
import { getGuestId, getGuestName, setGuestName } from '../lib/guest';
import { Markdown } from '../lib/markdown';
import './Blog.css';

const ADMIN_WALLET = MARKETPLACE_CONTRACT_ADDRESS.toLowerCase();

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { connected, address } = useWalletContext();

  const [detail, setDetail] = useState<CommunityPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentName, setCommentName] = useState(getGuestName);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [deletingComment, setDeletingComment] = useState<number | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const isAdmin = connected && address !== null && address.toLowerCase() === ADMIN_WALLET;
  // Identity for likes: the connected wallet when available, otherwise a
  // stable per-browser guest id — no sign-in required either way.
  const likerId = address !== null ? address.toLowerCase() : getGuestId();

  const fetchDetail = useCallback(async (currentSlug: string, viewer: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCommunityPost(currentSlug, viewer);
      setDetail(result);
    } catch (err) {
      console.error('Failed to load community post:', err);
      setError(err instanceof Error ? err.message : 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    void fetchDetail(slug, address !== null ? address.toLowerCase() : getGuestId());
    // Re-fetch when the wallet connects so liked-by-viewer follows the wallet.
  }, [slug, address, fetchDetail]);

  const handleLike = async () => {
    if (!detail) return;
    setLiking(true);
    try {
      const result = await toggleCommunityLike(detail.post.id, likerId, address);
      setDetail((prev) =>
        prev ? { ...prev, liked_by_viewer: result.liked, post: { ...prev.post, like_count: result.likeCount } } : prev,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update like');
    } finally {
      setLiking(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!detail || !detail.post) return;
    const content = commentText.trim();
    if (content.length === 0) return;
    const name = commentName.trim() || 'Guest';
    setGuestName(name);
    setSubmittingComment(true);
    try {
      const result = await addCommunityComment(detail.post.id, content, name, address);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              comments: [result.comment, ...prev.comments],
              post: { ...prev.post, comment_count: prev.post.comment_count + 1 },
            }
          : prev,
      );
      setCommentText('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (comment: CommunityComment) => {
    if (!window.confirm('Delete this comment?')) return;
    setDeletingComment(comment.id);
    try {
      await deleteCommunityComment(comment.id);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.filter((c) => c.id !== comment.id),
              post: { ...prev.post, comment_count: Math.max(0, prev.post.comment_count - 1) },
            }
          : prev,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const handleDeletePost = async () => {
    if (!detail) return;
    if (!window.confirm(`Delete "${detail.post.title}"? This removes the post and all of its comments.`)) return;
    setDeletingPost(true);
    try {
      await deleteCommunityPost(detail.post.slug);
      navigate('/blog');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
      setDeletingPost(false);
    }
  };

  if (loading) {
    return (
      <div className="blog-page">
        <div className="container"><div className="blog-empty">Loading post…</div></div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="blog-page">
        <div className="container">
          <div className="blog-empty">{error ?? 'Post not found.'}</div>
          <div className="blog-back-row">
            <Link to="/blog" className="blog-back-link"><ArrowLeft size={14} /> Back to Blog</Link>
          </div>
        </div>
      </div>
    );
  }

  const { post, comments, liked_by_viewer: likedByViewer } = detail;
  const authorLabel = post.author_username ?? 'Verida AI';

  return (
    <div className="blog-page">
      <div className="container">
        <div className="blog-back-row">
          <Link to="/blog" className="blog-back-link"><ArrowLeft size={14} /> Back to Blog</Link>
          {isAdmin && (
            <div className="blog-admin-actions">
              <Link to={`/blog/${post.slug}/edit`} className="blog-admin-btn">
                <PencilSimple size={14} /> Edit
              </Link>
              <button className="blog-admin-btn blog-admin-btn-danger" disabled={deletingPost} onClick={handleDeletePost}>
                <Trash size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        <article className="blog-post">
          <div className="blog-post-head">
            <span className="blog-featured-cat">{post.category}</span>
            <h1 className="blog-post-title">{post.title}</h1>
            <p className="blog-post-excerpt">{post.excerpt}</p>
            <div className="blog-post-meta">
              <span className="blog-post-author"><UserCircle size={15} /> {authorLabel}</span>
              <span className="blog-meta-sep">·</span>
              <span><Calendar size={13} /> {formatDate(post.published_at)}</span>
            </div>
          </div>

          <div className="blog-post-body">
            <Markdown content={post.content ?? ''} />
          </div>

          <div className="blog-post-actions">
            <button
              className={`blog-like-btn ${likedByViewer ? 'blog-like-active' : ''}`}
              disabled={liking}
              onClick={handleLike}
            >
              <Heart size={16} weight={likedByViewer ? 'fill' : 'regular'} />
              {likedByViewer ? 'Liked' : 'Like'} · {post.like_count}
            </button>
          </div>
        </article>

        <section className="blog-comments">
          <h2 className="blog-comments-title">
            <ChatCircle size={17} /> Comments ({comments.length})
          </h2>

          <div className="blog-comment-form">
            <input
              className="blog-field-input"
              placeholder="Your name (optional)"
              value={commentName}
              maxLength={40}
              onChange={(event) => setCommentName(event.target.value)}
            />
            <textarea
              className="blog-comment-input"
              placeholder="Share your thoughts… (no wallet needed)"
              value={commentText}
              maxLength={2000}
              rows={3}
              onChange={(event) => setCommentText(event.target.value)}
            />
            <button
              className="blog-comment-submit"
              disabled={commentText.trim().length === 0 || submittingComment}
              onClick={handleCommentSubmit}
            >
              {submittingComment ? 'Posting…' : 'Post Comment'}
            </button>
          </div>

          {comments.length === 0 ? (
            <div className="blog-empty">No comments yet — be the first to join the discussion.</div>
          ) : (
            <div className="blog-comment-list">
              {comments.map((comment) => {
                const authorAddress = comment.author_address ?? null;
                const canDelete =
                  (connected &&
                    address !== null &&
                    authorAddress !== null &&
                    authorAddress.toLowerCase() === address.toLowerCase()) ||
                  isAdmin;
                return (
                  <div key={comment.id} className="blog-comment">
                    <div className="blog-comment-head">
                      <span className="blog-comment-author">
                        <UserCircle size={15} />
                        {comment.display_name ?? (authorAddress ? shortAddress(authorAddress) : 'Guest')}
                        {authorAddress && (
                          <span className="blog-comment-wallet">
                            <AddressDisplay value={authorAddress} type="address" showCopyIcon={false} showAptosLink={false} />
                          </span>
                        )}
                      </span>
                      <span className="blog-comment-date">{formatDate(comment.created_at)}</span>
                      {canDelete && (
                        <button
                          className="blog-comment-delete"
                          title="Delete comment"
                          disabled={deletingComment === comment.id}
                          onClick={() => void handleDeleteComment(comment)}
                        >
                          <Trash size={13} />
                        </button>
                      )}
                    </div>
                    <div className="blog-comment-body">{comment.content}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

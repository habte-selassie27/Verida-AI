import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ArrowRight, Calendar, Plus, Trash } from '@phosphor-icons/react';
import { deleteCommunityPost, getCommunityPosts, type CommunityPost } from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import { MARKETPLACE_CONTRACT_ADDRESS } from '../lib/contracts';
import './Blog.css';

const CATEGORIES_FILTER = ['All', 'Announcement', 'Research', 'Engineering', 'Product', 'Releases', 'Tutorials'];
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

export default function Blog() {
  const { connected, address } = useWalletContext();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = connected && address !== null && address.toLowerCase() === ADMIN_WALLET;

  const fetchPosts = useCallback(async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCommunityPosts(cat === 'All' ? undefined : cat);
      setPosts(result.items);
    } catch (err) {
      console.error('Failed to load community posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts(category);
  }, [fetchPosts, category]);

  const handleDelete = async (post: CommunityPost) => {
    if (!window.confirm(`Delete "${post.title}"? This removes the post and all of its comments.`)) return;
    setDeleting(post.slug);
    try {
      await deleteCommunityPost(post.slug);
      setPosts((prev) => prev.filter((p) => p.slug !== post.slug));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeleting(null);
    }
  };

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="blog-page">
      <div className="container">
        <div className="blog-header">
          <div className="section-label"><FileText size={13} /> Blog</div>
          <h1 className="blog-title">Latest Updates</h1>
          <p className="blog-sub">News, research, and technical deep dives from the Verida AI team.</p>
        </div>

        <div className="blog-toolbar">
          <div className="blog-filters">
            {CATEGORIES_FILTER.map((c) => (
              <button
                key={c}
                className={`blog-filter-pill ${category === c ? 'blog-filter-active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button className="blog-admin-new" onClick={() => navigate('/blog/new')}>
              <Plus size={14} weight="bold" /> New Post
            </button>
          )}
        </div>

        {loading && <div className="blog-empty">Loading posts…</div>}

        {!loading && error && <div className="blog-empty">{error}</div>}

        {!loading && !error && posts.length === 0 && (
          <div className="blog-empty">
            {category === 'All' ? 'No posts yet.' : `No ${category} posts yet.`}
          </div>
        )}

        {!loading && !error && featured && (
          <Link to={`/blog/${featured.slug}`} className="blog-featured">
            <div className="blog-featured-body">
              <span className="blog-featured-cat">{featured.category}</span>
              <h2 className="blog-featured-title">{featured.title}</h2>
              <p className="blog-featured-excerpt">{featured.excerpt}</p>
              <div className="blog-featured-meta">
                <Calendar size={13} />
                <span>{formatDate(featured.published_at)}</span>
                <span className="blog-meta-sep">·</span>
                <span>{featured.comment_count} comments</span>
                <span className="blog-meta-sep">·</span>
                <span>{featured.like_count} likes</span>
              </div>
            </div>
            <ArrowRight size={20} className="blog-featured-arrow" />
            {isAdmin && (
              <button
                className="blog-card-delete"
                title="Delete post"
                disabled={deleting === featured.slug}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleDelete(featured);
                }}
              >
                <Trash size={15} />
              </button>
            )}
          </Link>
        )}

        <div className="blog-grid">
          {!loading && !error && rest.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
              <span className="blog-card-cat">{post.category}</span>
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-meta">
                <Calendar size={12} />
                <span>{formatDate(post.published_at)}</span>
                <span className="blog-meta-sep">·</span>
                <span>{post.comment_count} comments</span>
                <span className="blog-meta-sep">·</span>
                <span>{post.like_count} likes</span>
              </div>
              {isAdmin && (
                <button
                  className="blog-card-delete"
                  title="Delete post"
                  disabled={deleting === post.slug}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void handleDelete(post);
                  }}
                >
                  <Trash size={15} />
                </button>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

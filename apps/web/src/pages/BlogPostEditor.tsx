import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import {
  createCommunityPost,
  getCommunityPost,
  updateCommunityPost,
  type CommunityPostPayload,
} from '../api/client';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { MARKETPLACE_CONTRACT_ADDRESS } from '../lib/contracts';
import './Blog.css';

const CATEGORIES = ['Announcement', 'Research', 'Engineering', 'Product', 'Releases', 'Tutorials'];
const ADMIN_WALLET = MARKETPLACE_CONTRACT_ADDRESS.toLowerCase();

interface EditorForm {
  category: string;
  content: string;
  excerpt: string;
  featured: boolean;
  slug: string;
  title: string;
}

const EMPTY_FORM: EditorForm = {
  category: 'Announcement',
  content: '',
  excerpt: '',
  featured: false,
  slug: '',
  title: '',
};

export default function BlogPostEditor() {
  const { slug } = useParams<{ slug?: string }>();
  const isEdit = slug !== undefined;
  const navigate = useNavigate();
  const { connected, address, connect } = useWalletContext();
  const { isAuthenticated, login } = useAuth();

  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = connected && address !== null && address.toLowerCase() === ADMIN_WALLET;

  useEffect(() => {
    if (!isEdit || !slug) return;
    let cancelled = false;
    getCommunityPost(slug, null)
      .then((detail) => {
        if (cancelled) return;
        setForm({
          category: detail.post.category,
          content: detail.post.content ?? '',
          excerpt: detail.post.excerpt ?? '',
          featured: detail.post.featured,
          slug: detail.post.slug,
          title: detail.post.title,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load post');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, slug]);

  const update = <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!isAdmin) {
      alert('Only the platform admin can publish posts.');
      return;
    }
    if (form.title.trim().length < 3) {
      alert('Title must be at least 3 characters.');
      return;
    }
    if (form.content.trim().length === 0) {
      alert('Post content is required.');
      return;
    }

    if (!connected || !address) {
      try {
        await connect();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Please connect your wallet.');
        return;
      }
    }
    if (!isAuthenticated) {
      try {
        await login();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Please sign the authentication message to continue.');
        return;
      }
    }

    const payload: CommunityPostPayload = {
      category: form.category,
      content: form.content.trim(),
      excerpt: form.excerpt.trim().length > 0 ? form.excerpt.trim() : null,
      featured: form.featured,
      title: form.title.trim(),
    };
    if (form.slug.trim().length > 0) {
      payload.slug = form.slug.trim();
    }

    setSaving(true);
    setError(null);
    try {
      const result = isEdit
        ? await updateCommunityPost(slug!, payload)
        : await createCommunityPost(payload);
      navigate(`/blog/${result.post.slug}`);
    } catch (err) {
      console.error('Failed to save post:', err);
      setError(err instanceof Error ? err.message : 'Failed to save post');
      setSaving(false);
    }
  };

  if (!isAdmin && !loading) {
    return (
      <div className="blog-page">
        <div className="container">
          <div className="blog-empty">This page is admin-only. Connect the admin wallet to publish posts.</div>
          <div className="blog-back-row">
            <Link to="/blog" className="blog-back-link"><ArrowLeft size={14} /> Back to Blog</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <div className="container">
        <div className="blog-back-row">
          <Link to="/blog" className="blog-back-link"><ArrowLeft size={14} /> Back to Blog</Link>
        </div>

        <div className="blog-editor-head">
          <div className="section-label">Editor</div>
          <h1 className="blog-title">{isEdit ? 'Edit Post' : 'New Post'}</h1>
        </div>

        {error && <div className="blog-editor-error">{error}</div>}

        {loading ? (
          <div className="blog-empty">Loading post…</div>
        ) : (
          <div className="blog-editor">
            <label className="blog-field">
              <span className="blog-field-label">Title</span>
              <input
                className="blog-field-input"
                value={form.title}
                maxLength={200}
                placeholder="Post title"
                onChange={(event) => update('title', event.target.value)}
              />
            </label>

            <div className="blog-editor-row">
              <label className="blog-field">
                <span className="blog-field-label">Category</span>
                <select
                  className="blog-field-input"
                  value={form.category}
                  onChange={(event) => update('category', event.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label className="blog-field">
                <span className="blog-field-label">Slug (optional)</span>
                <input
                  className="blog-field-input"
                  value={form.slug}
                  maxLength={200}
                  placeholder="auto-generated from title"
                  onChange={(event) => update('slug', event.target.value)}
                />
              </label>
            </div>

            <label className="blog-field">
              <span className="blog-field-label">Excerpt</span>
              <input
                className="blog-field-input"
                value={form.excerpt}
                maxLength={400}
                placeholder="One-line summary shown on the blog grid"
                onChange={(event) => update('excerpt', event.target.value)}
              />
            </label>

            <label className="blog-field">
              <span className="blog-field-label">Content (Markdown)</span>
              <textarea
                className="blog-field-input blog-field-textarea"
                value={form.content}
                rows={16}
                placeholder={'# Heading\n\nSome **bold** text, `inline code`, and lists:\n\n- one\n- two\n\n```\ncode block\n```'}
                onChange={(event) => update('content', event.target.value)}
              />
              <span className="blog-field-hint">
                Supports # headings, **bold**, *italic*, `code`, ``` fenced blocks ```, - lists, &gt; quotes, and [links](url).
              </span>
            </label>

            <label className="blog-field-check">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
              />
              <span>Feature this post (shown as the large lead card)</span>
            </label>

            <div className="blog-editor-actions">
              <Link to="/blog" className="blog-admin-btn">Cancel</Link>
              <button
                className="blog-comment-submit"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

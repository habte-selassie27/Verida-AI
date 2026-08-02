import { FileText, ArrowRight, Calendar } from '@phosphor-icons/react';
import './Blog.css';

const POSTS = [
  { title: 'Introducing Verida AI: Trust-First Data Infrastructure', excerpt: 'Why we built a decentralized AI dataset marketplace on Aptos and Shelby.', date: 'Jan 15, 2025', category: 'Announcement', featured: true },
  { title: 'How On-Chain Provenance Solves AI Data Trust', excerpt: 'The problem with training data integrity and how blockchain verification fixes it.', date: 'Jan 22, 2025', category: 'Research' },
  { title: 'Building the Shelby Network: A Technical Deep Dive', excerpt: 'Architecture decisions behind our decentralized storage layer.', date: 'Feb 3, 2025', category: 'Engineering' },
  { title: 'Pay-Per-Access: fairer economics for dataset creators', excerpt: 'How micropayments replace one-time licensing in AI data.', date: 'Feb 10, 2025', category: 'Product' },
  { title: 'Verida SDK v2.4: What\'s New', excerpt: 'Streaming sessions, improved auth, and 3 new language bindings.', date: 'Feb 18, 2025', category: 'Releases' },
  { title: 'Tutorial: Upload Your First Dataset', excerpt: 'Step-by-step guide to publishing data on Verida AI.', date: 'Feb 25, 2025', category: 'Tutorials' },
];

const CATEGORIES_FILTER = ['All', 'Announcement', 'Research', 'Engineering', 'Product', 'Releases', 'Tutorials'];

export default function Blog() {
  return (
    <div className="blog-page">
      <div className="container">
        <div className="blog-header">
          <div className="section-label"><FileText size={13} /> Blog</div>
          <h1 className="blog-title">Latest Updates</h1>
          <p className="blog-sub">News, research, and technical deep dives from the Verida AI team.</p>
        </div>

        <div className="blog-filters">
          {CATEGORIES_FILTER.map((c) => (
            <button key={c} className="blog-filter-pill">{c}</button>
          ))}
        </div>

        {/* Featured */}
        {POSTS[0] && (
        <a href="#" className="blog-featured">
          <div className="blog-featured-body">
            <span className="blog-featured-cat">{POSTS[0].category}</span>
            <h2 className="blog-featured-title">{POSTS[0].title}</h2>
            <p className="blog-featured-excerpt">{POSTS[0].excerpt}</p>
            <div className="blog-featured-meta">
              <Calendar size={13} />
              <span>{POSTS[0].date}</span>
            </div>
          </div>
          <ArrowRight size={20} className="blog-featured-arrow" />
        </a>
        )}

        {/* Grid */}
        <div className="blog-grid">
          {POSTS.slice(1).map((post) => (
            <a key={post.title} href="#" className="blog-card">
              <span className="blog-card-cat">{post.category}</span>
              <h3 className="blog-card-title">{post.title}</h3>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <div className="blog-card-meta">
                <Calendar size={12} />
                <span>{post.date}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

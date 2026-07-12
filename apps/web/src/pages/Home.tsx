import { useState, useEffect, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Lock, Database, Lightning, Globe, ChartBar } from '@phosphor-icons/react';
import { Button } from '../components/ui/Button';
import ShelbyScene from '../components/three/ShelbyScene';
import FloatingCards from '../components/three/FloatingCards';
import AIInsightPanel from '../components/three/AIInsightPanel';
import StorageRing from '../components/three/StorageRing';
import './Home.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Immutable Provenance',
    desc: 'Every upload is cryptographically anchored to Aptos L1 with a permanent, tamper-proof record.',
  },
  {
    icon: Lock,
    title: 'Pay-Per-Access',
    desc: 'Monetize your datasets with granular, session-based access control. Set your price in APT.',
  },
  {
    icon: Globe,
    title: 'Decentralized Storage',
    desc: 'Stored on Shelby Protocol across 16 SP nodes with Clay erasure coding for redundancy.',
  },
  {
    icon: Lightning,
    title: 'AI-Powered Analysis',
    desc: 'Automatic content detection, quality scoring, schema analysis, and smart tag suggestions.',
  },
  {
    icon: Database,
    title: 'Multimodal Support',
    desc: 'CSV, JSON, images, video, audio, PDFs, archives — analyzed and classified automatically.',
  },
  {
    icon: ChartBar,
    title: 'Quality Scoring',
    desc: 'Six-dimension quality assessment: completeness, consistency, uniqueness, validity, coverage, timeliness.',
  },
];

const CATEGORIES = [
  { tag: 'nlp', label: 'NLP', color: '#60a5fa', count: 'Language & Text' },
  { tag: 'cv', label: 'Vision', color: '#fbbf24', count: 'Images & Video' },
  { tag: 'tabular', label: 'Tabular', color: '#4ade80', count: 'Structured Data' },
  { tag: 'audio', label: 'Audio', color: '#00d4c8', count: 'Speech & Sound' },
  { tag: 'medical', label: 'Medical', color: '#f87171', count: 'Healthcare' },
  { tag: 'code', label: 'Code', color: '#c4b5fd', count: 'Source Code' },
  { tag: 'financial', label: 'Finance', color: '#fbbf24', count: 'Markets & Trading' },
  { tag: 'multimodal', label: 'Multimodal', color: '#a5b4fc', count: 'Mixed Formats' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* HERO — 3D VISUALIZATION */}
      <section className="home-hero-v2">
        <div className="home-hero-v2-bg" />
        <div className="home-hero-v2-content">
          {/* Left: Text */}
          <motion.div
            className="home-hero-text"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="home-eyebrow">
              <span className="home-eyebrow-dot" />
              <span>Shelby Protocol × Verida AI</span>
            </div>

            <h1 className="home-h1-v2">
              <span className="home-h1-line1">Verifiable</span>
              <span className="home-h1-line1">AI Datasets.</span>
              <span className="home-h1-line2">Provenance you can trust.</span>
            </h1>

            <p className="home-body-v2">
              Every dataset anchored to Aptos. Every upload cryptographically proven.
              Every access metered and permanently auditable.
            </p>

            <div className="home-cta-row-v2">
              <Button variant="primary" size="lg" onClick={() => navigate('/marketplace')}>
                Browse Marketplace <ArrowRight size={16} />
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/upload')}>
                Upload Dataset
              </Button>
            </div>

            <div className="home-trust-strip-v2">
              <div className="home-trust-item-v2">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Clay erasure-coded storage</span>
              </div>
              <div className="home-trust-item-v2">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Immutable provenance chain</span>
              </div>
              <div className="home-trust-item-v2">
                <span className="home-check-icon"><CheckIcon /></span>
                <span>Pay-per-access streaming</span>
              </div>
            </div>
          </motion.div>

          {/* Right: 3D Scene */}
          <motion.div
            className="home-hero-3d"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Suspense fallback={
              <div className="home-3d-loading">
                <div className="home-3d-loading-spinner" />
                <span>Loading Network...</span>
              </div>
            }>
              <ShelbyScene />
            </Suspense>
            <FloatingCards />
            <AIInsightPanel />
            <StorageRing />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="home-features">
        <div className="container">
          <motion.div
            className="home-section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="home-section-title">Built for AI Teams</h2>
            <p className="home-section-sub">
              End-to-end infrastructure for publishing, discovering, and consuming verifiable datasets
            </p>
          </motion.div>

          <div className="home-features-grid">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="home-feature-card"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
              >
                <div className="home-feature-icon">
                  <f.icon size={20} weight="light" />
                </div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="home-categories">
        <div className="container">
          <motion.div
            className="home-section-header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="home-section-title">Explore by Category</h2>
            <p className="home-section-sub">
              Find datasets across every AI modality
            </p>
          </motion.div>

          <div className="home-categories-grid">
            {CATEGORIES.map((cat, i) => (
              <motion.button
                key={cat.tag}
                className="home-category-card"
                onClick={() => navigate(`/marketplace?tags=${cat.tag}`)}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="home-category-dot" style={{ background: cat.color }} />
                <span className="home-category-label">{cat.label}</span>
                <span className="home-category-count">{cat.count}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home-cta-section">
        <div className="container">
          <motion.div
            className="home-cta-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="home-cta-title">Ready to publish your dataset?</h2>
            <p className="home-cta-desc">
              Upload once, store forever on Shelby Protocol. Set your price, keep full control.
            </p>
            <div className="home-cta-actions">
              <Button variant="primary" size="lg" onClick={() => navigate('/upload')}>
                Start Uploading
              </Button>
              <Button variant="ghost" size="lg" onClick={() => navigate('/marketplace')}>
                Browse Marketplace
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

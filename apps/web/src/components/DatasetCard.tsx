import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowSquareOut, DownloadSimple } from '@phosphor-icons/react';
import type { Dataset } from '@verida/shared';
import { AddressDisplay } from './ui/AddressDisplay';
import { IntegrityBadge } from './ui/IntegrityBadge';
import { Badge } from './ui/Badge';
import { TagPill } from './ui/TagPill';
import './DatasetCard.css';

interface DatasetCardProps {
  dataset: Dataset;
  onClick?: () => void;
}

const CATEGORY_ICONS: Record<string, { bg: string; icon: string; color: string }> = {
  nlp: { bg: 'rgba(59,130,246,0.12)', icon: 'NL', color: '#60a5fa' },
  cv: { bg: 'rgba(245,158,11,0.12)', icon: 'CV', color: '#fbbf24' },
  tabular: { bg: 'rgba(34,197,94,0.12)', icon: 'TB', color: '#4ade80' },
  audio: { bg: 'rgba(0,212,200,0.12)', icon: 'AU', color: '#00d4c8' },
  medical: { bg: 'rgba(239,68,68,0.12)', icon: 'MD', color: '#f87171' },
  code: { bg: 'rgba(139,92,246,0.12)', icon: 'CD', color: '#c4b5fd' },
  financial: { bg: 'rgba(245,158,11,0.12)', icon: 'FN', color: '#fbbf24' },
  multimodal: { bg: 'rgba(99,102,241,0.12)', icon: 'MM', color: '#a5b4fc' },
};

const ACCESS_LABELS: Record<string, string> = {
  free: 'Free',
  pay_per_access: 'Pay per access',
  subscription: 'Subscription',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getDatasetCategory(dataset: Dataset): string {
  const known = Object.keys(CATEGORY_ICONS);
  for (const tag of dataset.tags) {
    if (known.includes(tag)) return tag;
  }
  return dataset.tags[0] ?? 'other';
}

function getVerificationStatus(dataset: Dataset): 'verified' | 'tampered' | 'pending' | undefined {
  if (dataset.tampered) return 'tampered';
  if (dataset.verified === true) return 'verified';
  if (dataset.verified === false) return 'pending';
  return undefined;
}

export function DatasetCard({ dataset, onClick }: DatasetCardProps) {
  const category = getDatasetCategory(dataset);
  const catInfo = CATEGORY_ICONS[category] ?? { bg: 'var(--bg-raised)', icon: 'DT', color: 'var(--text-tertiary)' };
  const verificationStatus = getVerificationStatus(dataset);
  const isTampered = verificationStatus === 'tampered';
  const displayTags = dataset.tags.slice(0, 3);
  const extraCount = dataset.tags.length - 3;

  const content = (
    <>
      {verificationStatus && (
        <div className="dc-badge">
          <IntegrityBadge status={verificationStatus} size="sm" />
        </div>
      )}

      <div className="dc-header">
        <div className="dc-cat-icon" style={{ background: catInfo.bg, color: catInfo.color }}>
          {catInfo.icon}
        </div>
        <div className="dc-title-area">
          <div className="dc-title">{dataset.name}</div>
          <div className="dc-publisher">
            <AddressDisplay value={dataset.publisher_address} type="address" showCopyIcon={false} />
          </div>
        </div>
      </div>

      <div className="dc-tags">
        {displayTags.map((tag) => (
          <TagPill key={tag}>{tag.replace(/_/g, ' ')}</TagPill>
        ))}
        {extraCount > 0 && <TagPill>+{extraCount} more</TagPill>}
      </div>

      <p className="dc-desc">{dataset.description}</p>

      <div className="dc-status">
        <Badge variant="version">
          {ACCESS_LABELS[dataset.access_type] ?? dataset.access_type} &middot; {formatBytes(dataset.size_bytes)}
        </Badge>
        <span className="dc-access-count">
          <DownloadSimple size={12} />
          0
        </span>
      </div>

      <div className="dc-footer">
        <span className="dc-merkle">
          <span className="dc-merkle-label">merkle: </span>
          <span className="dc-merkle-value">{dataset.merkle_root.slice(0, 14)}...</span>
        </span>
        <a
          href={`https://explorer.aptoslabs.com/txn/${dataset.merkle_root}?network=testnet`}
          className="dc-aptos-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ArrowSquareOut size={12} /> Aptos
        </a>
      </div>
    </>
  );

  const className = `dc ${isTampered ? 'dc-tampered' : ''}`;

  if (onClick) {
    return (
      <motion.div
        className={className}
        onClick={onClick}
        role="button"
        tabIndex={0}
        whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        whileTap={{ scale: 0.99 }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      whileTap={{ scale: 0.99 }}
    >
      <Link to={`/datasets/${dataset.id}`} className={className}>
        {content}
      </Link>
    </motion.div>
  );
}

export default DatasetCard;

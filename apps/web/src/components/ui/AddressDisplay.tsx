import { useState, useCallback } from 'react';
import './AddressDisplay.css';

type AddressType = 'address' | 'merkleRoot' | 'txHash' | 'blobId' | 'contentHash';

interface AddressDisplayProps {
  value: string;
  type?: AddressType;
  showAptosLink?: boolean;
  showCopyIcon?: boolean;
  className?: string;
}

function truncate(value: string, type: AddressType): string {
  switch (type) {
    case 'address':
      return `${value.slice(0, 8)}...${value.slice(-4)}`;
    case 'merkleRoot':
      return `${value.slice(0, 14)}...`;
    case 'txHash':
      return `${value.slice(0, 14)}...`;
    case 'blobId':
      return `${value.slice(0, 12)}...`;
    case 'contentHash':
      return `sha256:${value.slice(0, 8)}...`;
  }
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function AddressDisplay({
  value,
  type = 'address',
  showAptosLink = type === 'merkleRoot' || type === 'txHash',
  showCopyIcon = true,
  className = '',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const displayText = truncate(value, type);
  const aptosLink = showAptosLink
    ? `https://explorer.aptoslabs.com/txn/${value}?network=testnet`
    : null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available
    }
  }, [value]);

  const showLink = showAptosLink && aptosLink;
  const isContentHash = type === 'contentHash';

  return (
    <span className={`addr-display ${className}`}>
      {isContentHash && <span className="addr-prefix">sha256:</span>}
      <span className="addr-truncated">{isContentHash ? displayText.replace('sha256:', '') : displayText}</span>
      {showCopyIcon && (
        <button className="addr-copy" onClick={handleCopy} title="Copy to clipboard" aria-label="Copy to clipboard">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      )}
      {showLink && (
        <a
          href={aptosLink}
          className="addr-link"
          target="_blank"
          rel="noopener noreferrer"
          title="View on Aptos Explorer"
        >
          <ExternalLinkIcon />
        </a>
      )}
    </span>
  );
}

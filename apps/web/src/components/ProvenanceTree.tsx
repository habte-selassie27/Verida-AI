import { AddressDisplay } from './ui/AddressDisplay';
import { Badge } from './ui/Badge';
import { Skeleton } from './ui/Skeleton';
import './ProvenanceTree.css';

export interface ProvenanceEvent {
  id: number | string;
  eventType: string;
  timestamp: string;
  actor: string;
  txHash?: string;
  merkleRoot?: string;
  notes?: string;
  version?: number;
}

interface ProvenanceTreeProps {
  events: ProvenanceEvent[];
  loading?: boolean;
  compact?: boolean;
}

const DOT_COLORS: Record<string, string> = {
  UPLOAD: 'var(--teal-400)',
  VERSION_ADDED: 'var(--info-400)',
  VERIFIED: 'var(--success-400)',
  TAMPER_DETECTED: 'var(--danger-400)',
  ACCESSED: 'var(--text-tertiary)',
};

const EVENT_LABELS: Record<string, string> = {
  UPLOAD: 'Uploaded',
  VERSION_ADDED: 'Version Added',
  VERIFIED: 'Verified',
  TAMPER_DETECTED: 'Tamper Detected',
  ACCESSED: 'Accessed',
};

function formatTS(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AptosIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function ProvenanceTree({ events, loading = false, compact = false }: ProvenanceTreeProps) {
  if (loading) {
    return (
      <div className="pt">
        <div className="pt-line" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="pt-row">
            <div className="pt-dot" style={{ background: 'var(--border-subtle)', borderColor: 'var(--border-subtle)' }} />
            <div className="pt-content" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton variant="title" width="120px" />
              <Skeleton variant="text-sm" width="200px" />
              <Skeleton variant="text-sm" width="160px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="pt">
        <div className="pt-empty">
          <TimelineIcon />
          <span>No provenance events</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt">
      <div className="pt-line" />
      {events.map((event, i) => {
        const dotColor = DOT_COLORS[event.eventType] ?? 'var(--text-tertiary)';
        const isLatest = i === 0;
        const isTampered = event.eventType === 'TAMPER_DETECTED';

        return (
          <div key={event.id} className="pt-row">
            <div
              className={`pt-dot ${isLatest ? 'pt-dot-latest' : ''}`}
              style={{ background: dotColor, borderColor: dotColor }}
            />
            {isLatest && <div className="pt-ripple" style={{ borderColor: dotColor }} />}
            <div className={`pt-content ${isTampered ? 'pt-content-tampered' : ''}`}>
              <div className="pt-header">
                <div className="pt-header-left">
                  <Badge variant="version">
                    {EVENT_LABELS[event.eventType] ?? event.eventType}
                  </Badge>
                  <span className="pt-ts">{formatTS(event.timestamp)}</span>
                </div>
                {event.txHash && (
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${event.txHash}?network=testnet`}
                    className="pt-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <AptosIcon /> Aptos
                  </a>
                )}
              </div>
              {!compact && (
                <div className="pt-details">
                  <div className="pt-detail">
                    <span className="pt-detail-label">ACTOR</span>
                    <AddressDisplay value={event.actor} type="address" showCopyIcon={false} showAptosLink={false} />
                  </div>
                  {event.txHash && (
                    <div className="pt-detail">
                      <span className="pt-detail-label">APTOS TX</span>
                      <AddressDisplay value={event.txHash} type="txHash" showAptosLink />
                    </div>
                  )}
                  {event.merkleRoot && (event.eventType === 'UPLOAD' || event.eventType === 'VERSION_ADDED' || event.eventType === 'VERIFIED') && (
                    <div className="pt-detail">
                      <span className="pt-detail-label">MERKLE ROOT</span>
                      <AddressDisplay value={event.merkleRoot} type="merkleRoot" showAptosLink />
                    </div>
                  )}
                  {event.notes && (
                    <div className="pt-detail">
                      <span className="pt-detail-label">NOTES</span>
                      <span className="pt-detail-notes">{event.notes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

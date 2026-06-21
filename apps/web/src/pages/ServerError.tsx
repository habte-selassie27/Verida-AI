import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import './NotFound.css';

function ServerOffIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function generateRefId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function ServerError() {
  const navigate = useNavigate();
  const refId = generateRefId();

  return (
    <div className="error-page">
      <div className="error-code">500</div>
      <div className="error-icon error-icon-danger"><ServerOffIcon /></div>
      <h1 className="error-heading">Something went wrong</h1>
      <p className="error-desc">
        An unexpected error occurred. Please try again or contact support.
      </p>
      <span className="error-ref">Ref: {refId}</span>
      <div className="error-actions">
        <Button onClick={() => window.location.reload()}>Try Again</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>Contact Support</Button>
      </div>
    </div>
  );
}

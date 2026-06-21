import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import './NotFound.css';

function CloudOffIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function ShelbyUnavailable() {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-code">503</div>
      <div className="error-icon error-icon-warning"><CloudOffIcon /></div>
      <h1 className="error-heading">Shelby Network Unavailable</h1>
      <p className="error-desc">
        The Shelby network is currently unreachable. Please check the network status and try again.
      </p>
      <div className="error-actions">
        <Button onClick={() => window.open('https://status.shelbynet.xyz', '_blank')}>
          View Shelby Status &nearr;
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    </div>
  );
}

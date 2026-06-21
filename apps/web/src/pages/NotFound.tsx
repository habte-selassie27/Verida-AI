import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import './NotFound.css';

function DatabaseOffIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-code">404</div>
      <div className="error-icon"><DatabaseOffIcon /></div>
      <h1 className="error-heading">Dataset not found</h1>
      <p className="error-desc">
        This dataset doesn't exist or may have been removed from Shelby.
      </p>
      <div className="error-actions">
        <Button onClick={() => navigate('/')}>Browse Marketplace &rarr;</Button>
        <Button variant="ghost" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    </div>
  );
}

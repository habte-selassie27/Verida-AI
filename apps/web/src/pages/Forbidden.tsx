import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import './NotFound.css';

function LockIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-code">403</div>
      <div className="error-icon error-icon-warning"><LockIcon /></div>
      <h1 className="error-heading">Access Required</h1>
      <p className="error-desc">
        You don't have permission to access this resource. Contact the dataset owner or request access.
      </p>
      <div className="error-actions">
        <Button onClick={() => navigate('/')}>Get Access</Button>
        <Button variant="ghost" onClick={() => navigate('/')}>Browse Marketplace</Button>
      </div>
    </div>
  );
}

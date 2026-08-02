import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AddressDisplay } from '../components/ui/AddressDisplay';
import { updatePublisherProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import { MARKETPLACE_CONTRACT_ADDRESS, fetchResource } from '../lib/contracts';
import './Settings.css';

type Section = 'profile' | 'api-keys' | 'notifications' | 'wallet' | 'contract-admin' | 'danger-zone';

interface ApiKey {
  name: string;
  created: string;
  lastUsed: string;
}

function ProfileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="22" height="18" rx="2" ry="2" />
      <line x1="1" y1="9" x2="23" y2="9" />
      <path d="M17 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    </svg>
  );
}

function DangerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="12" y2="12" />
      <line x1="15" y1="15" x2="12" y2="12" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      className={`settings-toggle ${checked ? 'settings-toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      type="button"
    >
      <span className="settings-toggle-knob" />
    </button>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

const NAV_ITEMS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'profile', label: 'Profile', icon: <ProfileIcon /> },
  { key: 'api-keys', label: 'API Keys', icon: <KeyIcon /> },
  { key: 'notifications', label: 'Notifications', icon: <BellIcon /> },
  { key: 'wallet', label: 'Wallet', icon: <WalletIcon /> },
  { key: 'contract-admin', label: 'Contract Admin', icon: <ShieldIcon /> },
  { key: 'danger-zone', label: 'Danger Zone', icon: <DangerIcon /> },
];

const MOCK_KEYS: ApiKey[] = [
  { name: 'Production', created: '2025-11-03', lastUsed: '2 hours ago' },
  { name: 'Development', created: '2026-01-15', lastUsed: 'Just now' },
  { name: 'Staging', created: '2025-08-22', lastUsed: '3 days ago' },
];

export default function Settings() {
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [username, setUsername] = useState('alice_verida');
  const [bio, setBio] = useState('Building the future of verifiable data on Shelby Network.');
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyCopied, setKeyCopied] = useState(false);
  const [notifUpload, setNotifUpload] = useState(true);
  const [notifIntegrity, setNotifIntegrity] = useState(true);
  const [notifSession, setNotifSession] = useState(false);
  const [notifAccess, setNotifAccess] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const { connected, address, networkName, disconnect, connect, signAndSubmitTransaction } = useWalletContext();
  const { isAuthenticated, login } = useAuth();

  const [contractAdmin, setContractAdmin] = useState('');
  const [contractTreasury, setContractTreasury] = useState('');
  const [contractFee, setContractFee] = useState('500');
  const [contractPaused, setContractPaused] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminAction, setAdminAction] = useState<string | null>(null);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      try { await login(); } catch { return; }
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updatePublisherProfile({ bio: bio || null, username: username || null });
      setSaveMessage('Profile saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKey = () => {
    const key = `sk_shelby_${Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('')}`;
    setGeneratedKey(key);
    setKeyCopied(false);
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      setKeyCopied(true);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const handleSaveNotifs = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      // TODO: Implement actual API call to save notification preferences
      // await apiClient.updateNotifications({ notifUpload, notifIntegrity, notifSession, notifAccess });
      setSaveMessage('Notification preferences saved');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Failed to save notifications');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnectWallet = async () => {
    await disconnect();
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  // Fetch contract admin state
  useEffect(() => {
    const fetchContractState = async () => {
      setAdminLoading(true);
      try {
        const resourceType = `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::MarketplaceConfig`;
        const config = await fetchResource<{
          admin: string;
          treasury: string;
          fee_basis_points: string;
          paused: boolean;
        }>(resourceType);
        setContractAdmin(config.admin);
        setContractTreasury(config.treasury);
        setContractFee(config.fee_basis_points);
        setContractPaused(config.paused);
      } catch {
        // Failed to fetch
      } finally {
        setAdminLoading(false);
      }
    };
    fetchContractState();
  }, []);

  const handleSetFee = async () => {
    if (!connected) return;
    const bps = parseInt(contractFee, 10);
    if (isNaN(bps) || bps < 0 || bps > 1000) {
      alert('Fee must be between 0 and 1000 basis points (0-10%)');
      return;
    }
    setAdminAction('fee');
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::set_fee`,
          functionArguments: [bps],
        },
      });
      alert('Fee updated on-chain');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set fee');
    } finally {
      setAdminAction(null);
    }
  };

  const handleSetTreasury = async () => {
    if (!connected || !contractTreasury.startsWith('0x')) {
      alert('Enter a valid treasury address');
      return;
    }
    setAdminAction('treasury');
    try {
      await signAndSubmitTransaction({
        data: {
          function: `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::set_treasury`,
          functionArguments: [contractTreasury],
        },
      });
      alert('Treasury updated on-chain');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set treasury');
    } finally {
      setAdminAction(null);
    }
  };

  const handlePause = async () => {
    if (!connected) return;
    setAdminAction('pause');
    try {
      await signAndSubmitTransaction({
        data: {
          function: contractPaused
            ? `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::unpause`
            : `${MARKETPLACE_CONTRACT_ADDRESS}::verida_marketplace::pause`,
          functionArguments: [],
        },
      });
      setContractPaused(!contractPaused);
      alert(contractPaused ? 'Contract unpaused' : 'Contract paused');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle pause');
    } finally {
      setAdminAction(null);
    }
  };

  return (
    <div className="settings">
      <div className="settings-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`settings-nav-item ${activeSection === item.key ? 'settings-nav-active' : ''}`}
            onClick={() => setActiveSection(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        {/* ── Profile ─────────────────────────────── */}
        {activeSection === 'profile' && (
          <form onSubmit={handleSaveProfile} className="settings-form">
            <h2 className="settings-heading">Profile</h2>
            <p className="settings-desc">Manage your public profile information.</p>

            <div className="settings-avatar-row">
              <div className="settings-avatar">
                <div className="settings-avatar-img">
                  <span className="settings-avatar-initials">AV</span>
                </div>
                <div className="settings-avatar-overlay">
                  <CameraIcon />
                </div>
              </div>
              <div>
                <Button variant="ghost" size="sm">Upload Photo</Button>
                <p className="settings-avatar-hint">PNG, JPG. Max 2MB.</p>
              </div>
            </div>

            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <div className="settings-field">
              <label className="settings-field-label">Bio</label>
              <textarea
                className="settings-textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
              />
            </div>

            <div className="settings-submit-row">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        )}

        {/* ── API Keys ────────────────────────────── */}
        {activeSection === 'api-keys' && (
          <div>
            <div className="settings-header-row">
              <div>
                <h2 className="settings-heading">API Keys</h2>
                <p className="settings-desc">Manage your API keys for programmatic access.</p>
              </div>
              <Button onClick={() => setKeyModalOpen(true)} icon={<UploadIcon />}>
                Generate New Key
              </Button>
            </div>

            <Card className="settings-keys-card">
              <table className="settings-keys-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_KEYS.map((key) => (
                    <tr key={key.name}>
                      <td className="settings-key-name">{key.name}</td>
                      <td className="settings-key-meta">{key.created}</td>
                      <td className="settings-key-meta">{key.lastUsed}</td>
                      <td>
                        <Button variant="danger" size="sm">Revoke</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── Notifications ───────────────────────── */}
        {activeSection === 'notifications' && (
          <form onSubmit={handleSaveNotifs} className="settings-form">
            <h2 className="settings-heading">Notifications</h2>
            <p className="settings-desc">Configure which events trigger notifications.</p>

            <Card className="settings-notifs-card">
              <div className="settings-notif-row">
                <div>
                  <span className="settings-notif-title">Upload Complete</span>
                  <span className="settings-notif-desc">When a dataset upload finishes</span>
                </div>
                <Toggle id="notif-upload" checked={notifUpload} onChange={setNotifUpload} />
              </div>
              <div className="settings-notif-row">
                <div>
                  <span className="settings-notif-title">Integrity Check</span>
                  <span className="settings-notif-desc">When integrity verification completes</span>
                </div>
                <Toggle id="notif-integrity" checked={notifIntegrity} onChange={setNotifIntegrity} />
              </div>
              <div className="settings-notif-row">
                <div>
                  <span className="settings-notif-title">Session Events</span>
                  <span className="settings-notif-desc">When access sessions start/end</span>
                </div>
                <Toggle id="notif-session" checked={notifSession} onChange={setNotifSession} />
              </div>
              <div className="settings-notif-row">
                <div>
                  <span className="settings-notif-title">New Access</span>
                  <span className="settings-notif-desc">When someone accesses your dataset</span>
                </div>
                <Toggle id="notif-access" checked={notifAccess} onChange={setNotifAccess} />
              </div>
            </Card>

            <div className="settings-submit-row">
              <Button type="submit">Save Preferences</Button>
            </div>
          </form>
        )}

        {/* ── Wallet ──────────────────────────────── */}
        {activeSection === 'wallet' && (
          <div>
            <h2 className="settings-heading">Wallet</h2>
            <p className="settings-desc">Your connected wallet and network information.</p>

            <Card className="settings-wallet-card">
              <div className="settings-wallet-row">
                <span className="settings-wallet-label">Address</span>
                {connected && address ? (
                  <AddressDisplay value={address} />
                ) : (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Not connected</span>
                )}
              </div>
              <div className="settings-wallet-row">
                <span className="settings-wallet-label">Status</span>
                <span className="settings-wallet-status">
                  <span className="settings-status-dot" style={{ background: connected ? 'var(--teal-400)' : 'var(--text-tertiary)' }} />
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="settings-wallet-row">
                <span className="settings-wallet-label">Network</span>
                <span className="settings-wallet-network">
                  {networkName ? `${networkName} (shelbynet)` : 'Aptos Testnet (shelbynet)'}
                </span>
              </div>
            </Card>

            <div className="settings-submit-row">
              {connected ? (
                <Button variant="danger" onClick={handleDisconnectWallet}>Disconnect</Button>
              ) : (
                <Button onClick={handleConnectWallet}>Connect Wallet</Button>
              )}
            </div>
          </div>
        )}

        {/* ── Contract Admin ─────────────────────── */}
        {activeSection === 'contract-admin' && (
          <div>
            <h2 className="settings-heading">Contract Admin</h2>
            <p className="settings-desc">
              Manage on-chain marketplace parameters. Only the contract admin can execute these changes.
            </p>

            {adminLoading ? (
              <Card className="settings-wallet-card">
                <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading contract state…</span>
              </Card>
            ) : (
              <>
                {/* Fee */}
                <Card className="settings-wallet-card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Marketplace Fee</h3>
                  <div className="settings-wallet-row">
                    <span className="settings-wallet-label">Current Fee</span>
                    <span className="settings-wallet-network">{Number(contractFee) / 100}% ({contractFee} bps)</span>
                  </div>
                  <div className="settings-wallet-row" style={{ alignItems: 'flex-end', gap: 12 }}>
                    <Input
                      label="New Fee (basis points)"
                      value={contractFee}
                      onChange={(e) => setContractFee(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button onClick={handleSetFee} disabled={!connected || !!adminAction}>
                      {adminAction === 'fee' ? 'Saving…' : 'Update Fee'}
                    </Button>
                  </div>
                </Card>

                {/* Treasury */}
                <Card className="settings-wallet-card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Treasury Address</h3>
                  <div className="settings-wallet-row">
                    <span className="settings-wallet-label">Current Treasury</span>
                    {contractTreasury ? (
                      <AddressDisplay value={contractTreasury} />
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Not set</span>
                    )}
                  </div>
                  <div className="settings-wallet-row" style={{ alignItems: 'flex-end', gap: 12 }}>
                    <Input
                      label="New Treasury Address"
                      value={contractTreasury}
                      onChange={(e) => setContractTreasury(e.target.value)}
                      placeholder="0x..."
                      style={{ flex: 1 }}
                    />
                    <Button onClick={handleSetTreasury} disabled={!connected || !!adminAction}>
                      {adminAction === 'treasury' ? 'Saving…' : 'Update Treasury'}
                    </Button>
                  </div>
                </Card>

                {/* Pause */}
                <Card className="settings-wallet-card">
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Contract Pause</h3>
                  <div className="settings-wallet-row">
                    <span className="settings-wallet-label">Status</span>
                    <span className="settings-wallet-status">
                      <span className="settings-status-dot" style={{ background: contractPaused ? 'var(--red-400)' : 'var(--teal-400)' }} />
                      {contractPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                  <div className="settings-submit-row" style={{ marginTop: 12 }}>
                    <Button
                      variant={contractPaused ? 'ghost' : 'danger'}
                      onClick={handlePause}
                      disabled={!connected || !!adminAction}
                    >
                      {adminAction === 'pause'
                        ? 'Processing…'
                        : contractPaused
                          ? 'Unpause Contract'
                          : 'Pause Contract'}
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── Danger Zone ─────────────────────────── */}
        {activeSection === 'danger-zone' && (
          <div>
            <h2 className="settings-heading settings-heading-danger">Danger Zone</h2>
            <p className="settings-desc">Account management features coming soon.</p>

            <Card variant="danger" className="settings-danger-card">
              <div className="settings-danger-header">
                <DangerIcon />
                <span>Delete Account</span>
              </div>
              <p className="settings-danger-text">
                Account deletion is not yet available. This feature requires additional
                backend infrastructure to safely remove all associated data.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* ── Generate Key Modal ───────────────────── */}
      {keyModalOpen && (
        <div className="settings-modal-overlay" onClick={() => setKeyModalOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="settings-modal-title">Generate New API Key</h3>
            <p className="settings-modal-desc">This key will be shown once. Copy it now.</p>

            {!generatedKey ? (
              <Button onClick={handleGenerateKey} fullWidth icon={<UploadIcon />}>
                Generate Key
              </Button>
            ) : (
              <div className="settings-key-display">
                <div className="settings-key-value">{generatedKey}</div>
                <Button
                  variant="ghost"
                  fullWidth
                  icon={keyCopied ? <CheckSmallIcon /> : <CopyIcon />}
                  onClick={handleCopyKey}
                  disabled={keyCopied}
                >
                  {keyCopied ? 'Copied' : 'Copy Key'}
                </Button>
              </div>
            )}

            <Button variant="ghost" fullWidth onClick={() => setKeyModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

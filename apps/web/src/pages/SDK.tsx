import { Code, Terminal, Copy, Check } from '@phosphor-icons/react';
import { useState } from 'react';
import './SDK.css';

const SDKS = [
  { name: 'JavaScript', lang: 'js', version: '2.4.1', install: 'npm install @verida/sdk', color: '#fbbf24' },
  { name: 'Python', lang: 'py', version: '1.8.3', install: 'pip install verida-sdk', color: '#60a5fa' },
  { name: 'Rust', lang: 'rs', version: '0.9.2', install: 'cargo add verida-sdk', color: '#f87171' },
  { name: 'Go', lang: 'go', version: '1.2.0', install: 'go get github.com/verida/go-sdk', color: '#00E5FF' },
  { name: 'TypeScript', lang: 'ts', version: '2.4.1', install: 'npm install @verida/sdk', color: '#8B5CF6' },
  { name: 'Swift', lang: 'swift', version: '0.7.1', install: 'pod "VeridaSDK"', color: '#f472b6' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="sdk-copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export default function SDK() {
  return (
    <div className="sdk-page">
      <div className="container">
        <div className="sdk-header">
          <div className="section-label"><Code size={13} /> SDKs</div>
          <h1 className="sdk-title">Official SDKs</h1>
          <p className="sdk-sub">Build with Verida AI in your language of choice.</p>
        </div>
        <div className="sdk-grid">
          {SDKS.map((sdk) => (
            <div key={sdk.name} className="sdk-card">
              <div className="sdk-card-header">
                <span className="sdk-card-dot" style={{ background: sdk.color }} />
                <span className="sdk-card-name">{sdk.name}</span>
                <span className="sdk-card-version">v{sdk.version}</span>
              </div>
              <div className="sdk-card-install">
                <code>{sdk.install}</code>
                <CopyButton text={sdk.install} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

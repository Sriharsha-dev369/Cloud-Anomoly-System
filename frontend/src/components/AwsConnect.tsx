import { useState } from 'react';

interface Props {
  token: string;
  onConnect: () => void;
  onSkip: () => void;
}

export default function AwsConnect({ token, onConnect, onSkip }: Props) {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<{ resourceCount: number } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    fetch('/api/aws/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accessKeyId, secretAccessKey, region: region || undefined }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? 'Connection failed') });
        return r.json();
      })
      .then((d: { resourceCount: number }) => setConnected(d))
      .catch((err) => setError(String(err).replace('Error: ', '')))
      .finally(() => setLoading(false));
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ced4da',
    borderRadius: 6, fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333',
  };

  if (connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, padding: 40, width: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <h3 style={{ margin: '0 0 8px', color: '#28a745' }}>AWS Connected</h3>
          <p style={{ color: '#6c757d', fontSize: 14, margin: '0 0 24px' }}>
            {connected.resourceCount > 0
              ? `${connected.resourceCount} EC2 instance${connected.resourceCount !== 1 ? 's' : ''} synced to your account.`
              : 'Connected successfully. No EC2 instances found in this region.'}
          </p>
          <button
            onClick={onConnect}
            style={{ padding: '10px 28px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, padding: 40, width: 420 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Connect AWS Account</h2>
        <p style={{ margin: '0 0 28px', color: '#6c757d', fontSize: 13 }}>
          Enter your AWS credentials to monitor real EC2 instances.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Access Key ID</label>
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              required
              autoFocus
              placeholder="AKIAIOSFODNN7EXAMPLE"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Secret Access Key</label>
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              required
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Region <span style={{ fontWeight: 400, color: '#adb5bd' }}>(optional)</span></label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="ap-south-1"
              style={inputStyle}
            />
          </div>
          {error && (
            <p style={{ margin: '0 0 16px', color: '#dc3545', fontSize: 13 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: loading ? '#adb5bd' : '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12 }}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{ width: '100%', padding: '9px', background: 'none', color: '#6c757d', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}
          >
            Skip — use simulation mode
          </button>
        </form>
        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#adb5bd' }}>
          Credentials are encrypted and never exposed outside your account.
        </p>
      </div>
    </div>
  );
}

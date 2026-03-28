import { useState } from 'react';

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Invalid credentials');
        return r.json();
      })
      .then((d: { token: string }) => {
        localStorage.setItem('token', d.token);
        onLogin(d.token);
      })
      .catch((err) => setError(String(err).replace('Error: ', '')))
      .finally(() => setLoading(false));
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
      <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, padding: 40, width: 340 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Cloud Anomaly Dashboard</h2>
        <p style={{ margin: '0 0 28px', color: '#6c757d', fontSize: 13 }}>Sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <p style={{ margin: '0 0 16px', color: '#dc3545', fontSize: 13 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', background: loading ? '#adb5bd' : '#0d6efd', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ margin: '20px 0 0', fontSize: 12, color: '#adb5bd', textAlign: 'center' }}>
          Demo credentials: admin / demo
        </p>
      </div>
    </div>
  );
}

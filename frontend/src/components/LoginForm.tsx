import { useState } from 'react';

interface Props {
  onLogin: (token: string) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d: { error?: string }) => { throw new Error(d.error ?? 'Request failed') });
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
        <p style={{ margin: '0 0 28px', color: '#6c757d', fontSize: 13 }}>
          {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#333' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
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
            {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
        <p style={{ margin: '20px 0 0', fontSize: 13, textAlign: 'center', color: '#6c757d' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(null); }} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Sign up
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null); }} style={{ background: 'none', border: 'none', color: '#0d6efd', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * pages/Login.jsx — Login page
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center min-h-screen p-4">
      <div className="glass-card w-full max-w-md p-8 fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✦</div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Welcome back</h1>
          <p className="text-[--text-secondary] text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[--text-secondary] text-sm font-medium block mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-[--text-secondary] text-sm font-medium block mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary justify-center mt-2" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[--text-muted] text-sm mt-6">
          No account?{' '}
          <Link to="/signup" className="text-[--accent] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

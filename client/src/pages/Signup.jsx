/**
 * pages/Signup.jsx — Registration page
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Signup() {
  const { signup }   = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(form.email, form.password);
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
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">✦</div>
          <h1 className="text-2xl font-bold text-[--text-primary]">Create account</h1>
          <p className="text-[--text-secondary] text-sm mt-1">Start collaborating in seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[--text-secondary] text-sm font-medium block mb-1.5">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus
            />
          </div>

          <div>
            <label className="text-[--text-secondary] text-sm font-medium block mb-1.5">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="text-[--text-secondary] text-sm font-medium block mb-1.5">Confirm password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary justify-center mt-2" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[--text-muted] text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[--accent] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

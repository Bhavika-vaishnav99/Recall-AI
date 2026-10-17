'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/modules/auth/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, signup } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password, name);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-notebook-bg text-notebook-text">
      <div className="w-full max-w-sm px-8">
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-blue-500/10 bg-[#1e1f20] border border-notebook-border/70 p-0.5">
            <img src="/logo.png" alt="Recall AI Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <h1 className="text-xl font-medium">Recall AI Notebook</h1>
        </div>

        <div className="bg-notebook-card border border-notebook-border rounded-2xl p-6 shadow-sm">
          <div className="flex rounded-full bg-notebook-bg border border-notebook-border p-1 mb-6 text-sm">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-1.5 rounded-full transition-colors ${
                mode === 'login' ? 'bg-[#004a77] text-white' : 'text-notebook-muted hover:text-notebook-text'
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-1.5 rounded-full transition-colors ${
                mode === 'signup' ? 'bg-[#004a77] text-white' : 'text-notebook-muted hover:text-notebook-text'
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-notebook-muted mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-notebook-bg border border-notebook-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a8c7fa]/60"
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-notebook-muted mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-notebook-bg border border-notebook-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a8c7fa]/60"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-notebook-muted mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-notebook-bg border border-notebook-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#a8c7fa]/60"
                placeholder="At least 8 characters"
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 bg-[#004a77] hover:bg-[#1a6fa8] text-white text-sm font-medium rounded-full py-2.5 transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{mode === 'login' ? 'Log in' : 'Create account'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

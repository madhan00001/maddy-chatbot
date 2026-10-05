import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, User as UserIcon } from 'lucide-react';
import { User, AuthResponse } from '../types/auth.ts';
import { ThemeMode, THEMES } from '../types/theme.ts';
import { MaddyLogo } from './MaddyLogo.tsx';

interface SimpleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string) => void;
  theme: ThemeMode;
}

export function SimpleLoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  theme,
}: SimpleLoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = THEMES[theme];
  const isLight = theme === 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter your email and password.');
      return;
    }
    if (isRegister && !name.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { email, password, name } : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please check credentials.');
        setLoading(false);
        return;
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setIsRegister(false);
    setEmail('demo@acme.ai');
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 transition-all ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Close (Continue as guest)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <MaddyLogo size="sm" rounded="lg" />
          <div>
            <h2 className="text-sm font-bold tracking-tight">Maddy AI</h2>
            <div className="text-[11px] text-zinc-400">
              {isRegister ? 'Create free account' : 'Sign in to save chats'}
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Simple Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <div>
              <label className="block text-[11px] font-medium mb-1 opacity-80">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
                }`}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium mb-1 opacity-80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium mb-1 opacity-80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full px-3 py-2 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-zinc-950 border-zinc-800 text-zinc-100'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Quick Demo Button */}
        <div className="mt-3.5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4"
          >
            1-Click Demo Account
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMessage(null);
            }}
            className="text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
          >
            {isRegister ? 'Already have account?' : 'Need an account?'}
          </button>
        </div>

        {/* Guest Skip Option */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Continue as Guest (No login needed)
          </button>
        </div>
      </div>
    </div>
  );
}

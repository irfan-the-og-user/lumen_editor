import React, { useState } from 'react';
import { User as UserIcon, Lock, Mail, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { User, PendingAction } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  pendingAction: PendingAction;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pendingAction
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    const user: User = {
      id: `user-${Date.now()}`,
      name: mode === 'signup' ? name.trim() : email.split('@')[0],
      email: email.trim(),
      createdAt: Date.now()
    };

    onSuccess(user);
  };

  const actionTitle = pendingAction === 'export'
    ? 'HD File Export'
    : pendingAction === 'cloud_ai'
    ? 'Cloud AI Enhancement'
    : 'Full Canvas Access';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel max-w-md w-full p-6 sm:p-7 rounded-3xl space-y-6 border border-zinc-700/80 shadow-2xl relative overflow-hidden">
        {/* Top Decorative Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 transition-colors"
          title="Close prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Content */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Action Required: {actionTitle}</span>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            {mode === 'signup' ? 'Create a Free Account' : 'Sign In to Your Account'}
          </h2>

          <p className="text-xs text-zinc-400 leading-relaxed">
            {pendingAction === 'export'
              ? 'Guest canvas editing is free and unlimited. Create a quick account to download high-resolution PNG renders and sync your session.'
              : 'Unlock advanced cloud AI models and persistent session recovery across all your devices.'}
          </p>
        </div>

        {/* Benefits Checklist */}
        <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/80 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Instant high-resolution file export & downloads</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Automatic IndexedDB canvas session recovery</span>
          </div>
        </div>

        {/* Form Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 font-mono">
              {error}
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full tactile-btn flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shadow-lg shadow-emerald-950/40 cursor-pointer transition-all"
          >
            <span>
              {mode === 'signup' ? 'Register & Continue' : 'Sign In & Continue'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Toggle Mode */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            {mode === 'signup' ? 'Already registered?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode(mode === 'signup' ? 'signin' : 'signup');
            }}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            {mode === 'signup' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

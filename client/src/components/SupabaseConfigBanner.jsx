import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.js';

/**
 * Startup check banner: Displays if Supabase environment variables are missing or empty in client/.env
 */
export default function SupabaseConfigBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If credentials are correctly provided, do not render
  if (isSupabaseConfigured || isDismissed) {
    return null;
  }

  return (
    <aside aria-label="Supabase configuration status" className="relative z-50 bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-b border-amber-500/40 backdrop-blur-md text-amber-200 text-xs shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <span className="p-1 rounded-md bg-amber-500/20 text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <p className="leading-snug">
            <span className="font-semibold text-amber-300">Supabase Unconfigured:</span>{' '}
            Missing or empty <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-200">VITE_SUPABASE_URL</code> or{' '}
            <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-200">VITE_SUPABASE_ANON_KEY</code> in{' '}
            <code className="bg-black/40 px-1.5 py-0.5 rounded font-mono text-amber-200">client/.env</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors font-medium cursor-pointer"
          >
            <span>{isOpen ? 'Hide setup steps' : 'How to fix'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-amber-500/20 bg-black/50 px-4 py-3 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto space-y-2">
            <p className="text-amber-200 font-medium">Follow these steps to enable live Email OTP Auth:</p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-300">
              <li>
                Open the{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 underline inline-flex items-center gap-0.5"
                >
                  Supabase Dashboard <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and go to <strong>Project Settings &gt; API</strong>.
              </li>
              <li>
                Copy <strong>Project URL</strong> and paste into <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">client/.env</code> as <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">VITE_SUPABASE_URL</code>.
              </li>
              <li>
                Copy <strong>anon / public</strong> API key and paste into <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">client/.env</code> as <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">VITE_SUPABASE_ANON_KEY</code>.
              </li>
              <li>
                <strong>Restart the Vite dev server</strong> in your terminal (<code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">Ctrl + C</code> then <code className="bg-black/60 px-1.5 py-0.5 rounded font-mono text-amber-200">npm run dev</code>) so Vite re-reads the environment variables.
              </li>
            </ol>
          </div>
        </div>
      )}
    </aside>
  );
}

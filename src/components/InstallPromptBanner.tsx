import React, { useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

interface InstallPromptBannerProps {
  onInstall: () => Promise<boolean>;
}

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({ onInstall }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleInstall = async () => {
    const installed = await onInstall();
    if (installed) {
      setDismissed(true);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">Install Lumen AI</h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                PWA Offline Mode
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add to your home screen for standalone full-screen access and instant offline editing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setDismissed(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        </div>
      </div>
    </div>
  );
};

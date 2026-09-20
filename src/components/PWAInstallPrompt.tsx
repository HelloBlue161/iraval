import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [_deferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (e as BeforeInstallPromptEvent).prompt();
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!showPrompt || isInstalled) return null;

  const handleInstall = async () => {
    setShowPrompt(false);
    setIsInstalled(true);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-amber-100 border border-amber-300 rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-amber-900">Install Iraval</p>
          <p className="text-sm text-amber-700">Add to your home screen for a native app experience</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-amber-600 hover:text-amber-800 px-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

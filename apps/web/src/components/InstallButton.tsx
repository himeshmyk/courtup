import { useEffect, useState } from 'react';

// Captures the Android/Chrome "beforeinstallprompt" event and renders a
// custom Install button. iOS Safari has no such event -> shows a hint instead.
export default function InstallButton({ compact = false }: { compact?: boolean }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches,
  );
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  if (isIOS && !deferred) {
    return (
      <p className="text-xs text-slate-500">
        To install: tap <span className="font-semibold">Share</span> →{' '}
        <span className="font-semibold">Add to Home Screen</span>
      </p>
    );
  }

  if (!deferred) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <button
      onClick={install}
      className={
        compact
          ? 'text-brand font-semibold text-sm'
          : 'btn-primary w-full mt-2'
      }
    >
      ⬇️ Install CourtUp app
    </button>
  );
}

import { useEffect, useState } from 'react';
import { LiveView } from '@/ui/views/LiveView';
import { SettingsView } from '@/ui/views/SettingsView';
import { ConsentView } from '@/ui/views/ConsentView';
import { useCurrentTab } from '@/ui/hooks/useCurrentTab';
import { useSettings } from '@/ui/hooks/useSettings';
import { browserAPI } from '@/lib/browser-api';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consented, setConsented] = useState<boolean | null>(null); // null = loading
  const tab = useCurrentTab();
  const supported = !!(tab?.url && /^https?:/i.test(tab.url));

  useSettings();

  // Check if user already accepted
  useEffect(() => {
    browserAPI.storage.local.get('ct_consented', (result) => {
      setConsented(result.ct_consented === true);
    });
  }, []);

  const handleAccept = () => {
    browserAPI.storage.local.set({ ct_consented: true });
    setConsented(true);
  };

  // Loading state
  if (consented === null) return null;

  // First launch — show consent screen
  if (!consented) {
    return <ConsentView onAccept={handleAccept} />;
  }

  return (
    <div className="flex h-full flex-col">
      {settingsOpen ? (
        <div className="flex-1 overflow-auto">
          <SettingsView onBack={() => setSettingsOpen(false)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <LiveView onSettingsOpen={() => setSettingsOpen(true)} url={tab?.url} supported={supported} />
        </div>
      )}

      <footer className="shrink-0 border-t bg-background px-4 py-1.5 text-center">
        <span className="text-[10px] text-muted-foreground">
          <a href="https://consenttheater.org?utm_source=extension" target="_blank" rel="noopener" className="hover:text-link">ConsentTheater.org</a>
          {' · AGPL-3.0'}
        </span>
      </footer>
    </div>
  );
}

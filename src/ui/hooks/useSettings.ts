import { useCallback, useEffect, useState } from 'react';
import { browserAPI } from '@/lib/browser-api';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ContrastMode = 'off' | 'on' | 'system';

export interface Settings {
  theme: ThemeMode;
  highContrast: ContrastMode;
  fontScale: number; // 80 | 90 | 100 | 110 | 120
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  highContrast: 'system',
  fontScale: 100
};

type StoredSettings = Partial<Omit<Settings, 'highContrast'>> & {
  highContrast?: ContrastMode | boolean;
};

function normalize(raw: StoredSettings | undefined): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  const hc: ContrastMode =
    typeof raw.highContrast === 'boolean'
      ? raw.highContrast
        ? 'on'
        : 'off'
      : raw.highContrast ?? DEFAULT_SETTINGS.highContrast;
  return { ...DEFAULT_SETTINGS, ...raw, highContrast: hc };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load from chrome.storage.local
  useEffect(() => {
    browserAPI.storage.local.get('ct_settings', (result) => {
      setSettings(normalize(result.ct_settings as StoredSettings | undefined));
      setLoaded(true);
    });
  }, []);

  // Apply theme + contrast + font scale to <html>
  useEffect(() => {
    if (!loaded) return;
    const html = document.documentElement;

    // Theme
    if (settings.theme === 'dark') {
      html.classList.add('dark');
    } else if (settings.theme === 'light') {
      html.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.classList.toggle('dark', prefersDark);
    }

    // High contrast
    const hc =
      settings.highContrast === 'on' ||
      (settings.highContrast === 'system' &&
        window.matchMedia('(prefers-contrast: more)').matches);
    html.classList.toggle('high-contrast', hc);

    // Font scale
    html.style.fontSize = `${settings.fontScale}%`;
  }, [settings, loaded]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  // Listen for system contrast changes
  useEffect(() => {
    if (settings.highContrast !== 'system') return;
    const mq = window.matchMedia('(prefers-contrast: more)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('high-contrast', e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.highContrast]);

  const update = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      browserAPI.storage.local.set({ ct_settings: next });
      return next;
    });
  }, []);

  return { settings, update, loaded };
}

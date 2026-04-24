import { useEffect, useState } from 'react';
import { ArrowLeft, Sun, Moon, Desktop, Eye, TextAa, Database } from '@phosphor-icons/react';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Separator } from '@/ui/components/ui/separator';
import { useSettings, type ThemeMode, type ContrastMode } from '@/ui/hooks/useSettings';
import { useSendMessage } from '@/ui/hooks/useMessage';
import type { DbStatsResponse } from '@/ui/types/messages';

export function SettingsView({ onBack }: { onBack: () => void }) {
  const { settings, update } = useSettings();
  const send = useSendMessage();
  const [dbStats, setDbStats] = useState<DbStatsResponse | null>(null);

  // Fetch live Playbill stats from the background. The DB is bundled into
  // background.js; asking over the wire keeps the ~2 MB out of the UI chunk.
  useEffect(() => {
    let alive = true;
    send<DbStatsResponse>({ type: 'getDbStats' }).then((resp) => {
      if (alive && resp) setDbStats(resp);
    });
    return () => { alive = false; };
  }, [send]);

  const fmt = (n?: number) => (typeof n === 'number' ? n.toLocaleString() : '…');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 w-7 px-0">
          <ArrowLeft size={16} />
        </Button>
        <span className="text-sm font-semibold">Settings</span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-3 p-4">

          {/* Database info */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Database size={14} className="text-link" />
                <span className="text-xs font-semibold">Playbill Database</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="font-mono text-lg font-bold tabular-nums">{fmt(dbStats?.total)}</span>
                  <p className="text-[9px] text-muted-foreground">entries</p>
                </div>
                <div>
                  <span className="font-mono text-lg font-bold tabular-nums">{fmt(dbStats?.cookies)}</span>
                  <p className="text-[9px] text-muted-foreground">cookies</p>
                </div>
                <div>
                  <span className="font-mono text-lg font-bold tabular-nums">{fmt(dbStats?.domains)}</span>
                  <p className="text-[9px] text-muted-foreground">domains</p>
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                <a href="https://github.com/ConsentTheater/playbill" target="_blank" rel="noopener" className="text-link hover:underline">v{dbStats?.packageVersion ?? '…'}</a>
                {' · '}{fmt(dbStats?.companies)} companies · AGPL-3.0
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Theme */}
          <div>
            <span className="text-xs font-semibold">Theme</span>
            <div className="flex gap-1 mt-2">
              {([
                { value: 'light', icon: <Sun size={14} />, label: 'Light' },
                { value: 'dark', icon: <Moon size={14} />, label: 'Dark' },
                { value: 'system', icon: <Desktop size={14} />, label: 'System' }
              ] as const).map(({ value, icon, label }) => (
                <Button
                  key={value}
                  variant={settings.theme === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ theme: value as ThemeMode })}
                  className="flex-1 h-8 text-xs gap-1"
                >
                  {icon} {label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* High contrast */}
          <div>
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-muted-foreground" />
              <div>
                <span className="text-xs font-semibold">High Contrast</span>
                <p className="text-[10px] text-muted-foreground">
                  Sharper text and borders. <span className="font-mono">System</span> follows your OS setting.
                </p>
              </div>
            </div>
            <div role="radiogroup" aria-label="High contrast" className="flex gap-1 mt-2">
              {([
                { value: 'off', label: 'Off' },
                { value: 'on', label: 'On' },
                { value: 'system', label: 'System' }
              ] as const).map(({ value, label }) => (
                <Button
                  key={value}
                  role="radio"
                  aria-checked={settings.highContrast === value}
                  variant={settings.highContrast === value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ highContrast: value as ContrastMode })}
                  className="flex-1 h-8 text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Font scale */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TextAa size={14} className="text-muted-foreground" />
              <div>
                <span className="text-xs font-semibold">Font Size</span>
                <p className="text-[10px] text-muted-foreground">{settings.fontScale}%</p>
              </div>
            </div>
            <div className="flex gap-1">
              {[80, 90, 100, 110, 120].map(scale => (
                <Button
                  key={scale}
                  variant={settings.fontScale === scale ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => update({ fontScale: scale })}
                  className="flex-1 h-8 text-xs"
                >
                  {scale}%
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* About */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <a href="https://consenttheater.org?utm_source=extension" target="_blank" rel="noopener" className="text-link hover:underline">consenttheater.org</a>
              {' · '}
              <a href="https://github.com/ConsentTheater/extension" target="_blank" rel="noopener" className="text-link hover:underline">GitHub</a>
            </p>
            <p className="text-[10px]">See what websites are really tracking — in plain language. Powered by Playbill, the world's largest open-source tracker knowledge base.</p>
          </div>

        </div>
      </div>
    </div>
  );
}


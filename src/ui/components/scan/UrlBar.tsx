import { Globe, Warning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface UrlBarProps {
  url?: string | undefined;
  supported: boolean;
}

export function UrlBar({ url, supported }: UrlBarProps) {
  let hostname = '--';
  try { if (url) hostname = new URL(url).hostname || url; } catch { hostname = url || '--'; }
  return (
    <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
      {supported ? <Globe size={14} className="text-muted-foreground shrink-0" weight="regular" />
                 : <Warning size={14} className="text-destructive shrink-0" weight="fill" />}
      <span className={cn(
        'truncate font-mono text-xs',
        supported ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {hostname}
      </span>
    </div>
  );
}

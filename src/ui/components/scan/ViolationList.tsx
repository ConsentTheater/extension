import { Badge } from '@/ui/components/ui/badge';
import { Card } from '@/ui/components/ui/card';
import { CheckCircle } from '@phosphor-icons/react';
import type { Severity } from '@/lib/tracker-matcher';
import type { Violation } from '@/lib/risk-score';

const BORDER_BY_SEVERITY: Record<Severity, string> = {
  critical: 'border-l-red-600',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-slate-400'
};

export function ViolationList({ violations }: { violations: Violation[] }) {
  if (!violations.length) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <CheckCircle size={22} className="text-green-600 shrink-0" weight="fill" />
        <div>
          <p className="text-sm font-medium">No violations detected</p>
          <p className="text-xs text-muted-foreground">Clean scan window — nothing fired before consent.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {violations.map((v, i) => (
        <Card
          key={`${v.type}-${i}`}
          className={`border-l-4 ${BORDER_BY_SEVERITY[v.severity]} rounded-md p-3`}
        >
          <div className="flex items-start gap-2">
            <Badge variant={v.severity} className="h-5 shrink-0 px-2 text-[9px]">{v.severity}</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug text-foreground">{v.description}</p>
              {v.items && v.items.length > 0 && (
                <p className="mt-1 break-words font-mono text-[10px] text-muted-foreground">
                  {v.items.slice(0, 5).map(i => i.name || i.hostname).filter(Boolean).join(', ')}
                  {v.items.length > 5 ? ` +${v.items.length - 5} more` : ''}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

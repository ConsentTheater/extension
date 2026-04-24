import { ClockCounterClockwise } from '@phosphor-icons/react';
import { Card, CardContent } from '@/ui/components/ui/card';

export function HistoryView() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Scan History</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Coming soon. Past reports per domain with trend view.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <ClockCounterClockwise size={28} weight="duotone" className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No scans saved yet.</p>
          <p className="text-[10px] text-muted-foreground">History storage is on the roadmap.</p>
        </CardContent>
      </Card>
    </div>
  );
}

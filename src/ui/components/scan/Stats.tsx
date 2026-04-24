import { Card } from '@/ui/components/ui/card';
import type { Report } from '@/ui/types/messages';

interface StatProps {
  value: number;
  label: string;
}

function Stat({ value, label }: StatProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-0.5 p-3">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-center text-[10px] leading-tight text-muted-foreground">{label}</span>
    </Card>
  );
}

export function Stats({ report }: { report: Report }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat value={report.stats.preConsentCookies} label="cookies before consent" />
      <Stat value={report.stats.preConsentRequests} label="requests before consent" />
      <Stat value={report.stats.dataLeakRequests} label="data leaks" />
    </div>
  );
}

import { Badge } from '@/ui/components/ui/badge';
import { Card, CardContent } from '@/ui/components/ui/card';
import type { Report } from '@/ui/types/messages';
import type { BandKey } from '@/lib/risk-score';

const BAND_VARIANT: Record<BandKey, 'compliant' | 'at_risk' | 'non_compliant' | 'violating'> = {
  compliant: 'compliant',
  at_risk: 'at_risk',
  non_compliant: 'non_compliant',
  violating: 'violating'
};

export function Verdict({ report }: { report: Report }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <Badge variant={BAND_VARIANT[report.band.key]} className="text-[10px]">
          {report.band.label}
        </Badge>
        <div className="flex items-baseline gap-0.5">
          <span className="font-display text-3xl font-bold tracking-tight tabular-nums">{report.score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </CardContent>
    </Card>
  );
}

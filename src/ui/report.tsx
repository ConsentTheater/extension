import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { browserAPI } from '@/lib/browser-api';
import { PrintReport } from '@/ui/views/PrintReport';
import type { Report, ReportResponse } from '@/ui/types/messages';
import '@/ui/styles/globals.css';

function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabId = Number(params.get('tabId'));
    if (!tabId) {
      setError('Missing tabId — open this page from the sidebar Export button.');
      setLoading(false);
      return;
    }

    browserAPI.runtime.sendMessage({ type: 'getReport', tabId }, (res: ReportResponse | undefined) => {
      void browserAPI.runtime.lastError;
      if (!res?.report) {
        setError('No report available. The original tab may have been closed or the scan was never started.');
        setLoading(false);
        return;
      }
      setReport(res.report);
      setLoading(false);
      // Update tab title with the scanned origin for nicer print headers / saved-PDF filenames.
      try {
        const host = res.report.origin ? new URL(res.report.origin).hostname : 'scan';
        document.title = `ConsentTheater — ${host}`;
      } catch { /* ignore */ }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading report…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold mb-2">Report unavailable</h1>
          <p className="text-sm text-muted-foreground">{error || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return <PrintReport report={report} />;
}

const root = document.getElementById('root');
if (!root) throw new Error('ConsentTheater report: #root not found');
render(<ReportPage />, root);

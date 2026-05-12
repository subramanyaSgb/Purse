import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadBackup } from '@/services/backup';

export function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [lastFilename, setLastFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const fn = await downloadBackup();
      setLastFilename(fn);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Backup
      </h2>
      <div className="bg-card flex flex-col gap-3 rounded-md border p-4">
        <p className="text-muted-foreground text-sm">
          A backup is a single JSON file with all your data plus base64-encoded receipt images. Save
          it somewhere safe \xe2\x80\x94 cloud drive, email, USB stick \xe2\x80\x94 to move between
          devices or guard against data loss.
        </p>
        <Button onClick={handleExport} disabled={busy} className="self-start">
          <Download className="mr-2 size-4" />
          {busy ? 'Preparing…' : 'Export backup'}
        </Button>
        {lastFilename ? (
          <p role="status" className="text-muted-foreground text-xs">
            Downloaded {lastFilename}.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

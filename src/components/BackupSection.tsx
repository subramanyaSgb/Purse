import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  applyBackup,
  downloadBackup,
  parseBackup,
  previewBackup,
  type BackupFile,
  type BackupPreview,
  type ImportMode,
} from '@/services/backup';
import { BALANCES_QUERY_KEY } from '@/state/useBalances';

export function BackupSection() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportedFile, setExportedFile] = useState<string | null>(null);

  const [pending, setPending] = useState<{
    backup: BackupFile;
    preview: BackupPreview;
  } | null>(null);
  const [mode, setMode] = useState<ImportMode>('replace');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const fn = await downloadBackup();
      setExportedFile(fn);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const backup = parseBackup(text);
      setPending({ backup, preview: previewBackup(backup) });
      setMode('replace');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file');
    }
  }

  async function handleConfirmImport() {
    if (!pending) return;
    setImporting(true);
    setError(null);
    try {
      await applyBackup(pending.backup, mode);
      // Invalidate every cache that could have changed \xe2\x80\x94 effectively
      // everything Phase 3 touches.
      await Promise.all([
        qc.invalidateQueries(),
        qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY }),
      ]);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <div className="bg-card border-border flex flex-col gap-3 rounded-2xl border p-4">
        <p className="text-muted-foreground text-sm">
          A backup is a single JSON file with all your data plus base64-encoded receipt images. Save
          it somewhere safe — cloud drive, email, USB stick — to move between devices or guard
          against data loss.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 size-4" />
            {exporting ? 'Preparing…' : 'Export backup'}
          </Button>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <Upload className="mr-2 size-4" />
            Import backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {exportedFile ? (
          <p role="status" className="text-muted-foreground text-xs">
            Downloaded {exportedFile}.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        ) : null}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import backup</DialogTitle>
            <DialogDescription>
              {pending
                ? `Exported ${new Date(pending.preview.exportedAt).toLocaleString()} from app v${pending.preview.appVersion}.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {pending ? (
            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-1 text-sm">
                <dt className="text-muted-foreground">Accounts</dt>
                <dd>{pending.preview.counts.accounts}</dd>
                <dt className="text-muted-foreground">Categories</dt>
                <dd>{pending.preview.counts.categories}</dd>
                <dt className="text-muted-foreground">Subcategories</dt>
                <dd>{pending.preview.counts.subcategories}</dd>
                <dt className="text-muted-foreground">Tags</dt>
                <dd>{pending.preview.counts.tags}</dd>
                <dt className="text-muted-foreground">Places</dt>
                <dd>{pending.preview.counts.places}</dd>
                <dt className="text-muted-foreground">Payment methods</dt>
                <dd>{pending.preview.counts.paymentMethods}</dd>
                <dt className="text-muted-foreground">Transactions</dt>
                <dd>{pending.preview.counts.transactions}</dd>
                <dt className="text-muted-foreground">Images</dt>
                <dd>{pending.preview.counts.images}</dd>
              </dl>

              <RadioGroup
                value={mode}
                onValueChange={(v) => setMode(v as ImportMode)}
                className="flex flex-col gap-2"
              >
                <Label htmlFor="import-replace" className="flex items-start gap-3 font-normal">
                  <RadioGroupItem id="import-replace" value="replace" />
                  <span>
                    <span className="block font-medium">Replace</span>
                    <span className="text-muted-foreground block text-xs">
                      Wipe everything on this device first, then load the backup. Use when restoring
                      on a fresh install.
                    </span>
                  </span>
                </Label>
                <Label htmlFor="import-merge" className="flex items-start gap-3 font-normal">
                  <RadioGroupItem id="import-merge" value="merge" />
                  <span>
                    <span className="block font-medium">Merge</span>
                    <span className="text-muted-foreground block text-xs">
                      Keep existing data; rows with matching ids in the backup overwrite the local
                      ones.
                    </span>
                  </span>
                </Label>
              </RadioGroup>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={importing}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing}>
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

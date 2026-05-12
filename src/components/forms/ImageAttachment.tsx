import { useEffect, useRef, useState } from 'react';
import { Camera, ImageIcon, Plus, X } from 'lucide-react';
import { imagesService, thumbKeyFor } from '@/services/images';

/**
 * Image attachment strip.
 *
 * Two inputs (one for camera capture, one for gallery picker) feed
 * imagesService.saveForTransaction which writes both the resized main
 * blob and a 256x256 thumb to OPFS. The resulting OPFS keys are pushed
 * up through onChange so they can land on the saved Transaction.images.
 *
 * Existing images are loaded from OPFS by their thumb key on mount and
 * rendered as a horizontal scroll. Tap the × on a thumb to drop it; the
 * actual OPFS file isn't deleted until the user saves the transaction
 * (a delete-mid-edit would orphan the row's images array).
 */
export function ImageAttachment({
  /** OPFS main keys already attached to the transaction. */
  value,
  /** Owner of the temp scratch dir for in-progress images (txn id or 'draft-<uuid>'). */
  scratchId,
  onChange,
}: {
  value: string[];
  scratchId: string;
  onChange: (next: string[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Resolve thumb blob URLs for every key in `value`. Pre-paints the
  // strip on edit so the user sees what's already attached.
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const key of value) {
        try {
          const blob = await imagesService.loadBlob(thumbKeyFor(key));
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[key] = url;
        } catch {
          // Missing thumb (corrupt or hand-edited db) — render as blank tile.
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [value]);

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const arr = Array.from(files);
      const keys = await imagesService.saveForTransaction(scratchId, arr);
      onChange([...value, ...keys]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach images');
    } finally {
      setBusy(false);
    }
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing + add tiles */}
      <div className="scrollbar-hidden flex gap-2 overflow-x-auto">
        {value.map((key, idx) => (
          <div
            key={key}
            className="bg-muted border-border relative size-[76px] shrink-0 overflow-hidden rounded-xl border"
          >
            {thumbs[key] ? (
              <img
                src={thumbs[key]}
                alt={`Attached receipt ${idx + 1}`}
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center" aria-hidden>
                <ImageIcon className="size-5" style={{ color: 'var(--color-ink-faint)' }} />
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label={`Remove image ${idx + 1}`}
              className="bg-background/80 absolute top-1 right-1 grid size-5 place-items-center rounded-full backdrop-blur"
            >
              <X className="size-3" aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
          className="border-border text-muted-foreground hover:text-foreground grid size-[76px] shrink-0 place-items-center rounded-xl border border-dashed"
          aria-label="Add from gallery"
        >
          {busy ? <span className="text-[10px]">…</span> : <Plus className="size-5" aria-hidden />}
        </button>
      </div>

      {/* Action row: separate camera / gallery buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="border-border text-foreground flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-semibold"
        >
          <Camera className="size-4" aria-hidden />
          Camera
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
          className="border-border text-foreground flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-semibold"
        >
          <ImageIcon className="size-4" aria-hidden />
          Gallery
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}

      {/* Hidden inputs. capture=environment hints the OS to open the rear camera. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void onFilesPicked(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void onFilesPicked(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/**
 * OPFS-backed image storage for transactions. Storage layout:
 *
 *   txn/<txId>/<index>.jpg            main image (max 1600 px, JPEG q=0.8)
 *   txn/<txId>/thumb_<index>.jpg      256\xc3\x97256 thumbnail (JPEG q=0.7)
 *
 * The service stores **only** OPFS keys on the Transaction.images array;
 * thumb keys are derived by convention so we don't double-track them.
 *
 * Compression is feature-detected: in production we use OffscreenCanvas;
 * in tests/jsdom we fall through to a no-op passthrough. Both code paths
 * end up writing a Blob, so the on-disk layout is identical.
 */

const ROOT_DIR_NAME = 'txn';
const MAIN_MAX_EDGE = 1600;
const THUMB_EDGE = 256;
const MAIN_QUALITY = 0.8;
const THUMB_QUALITY = 0.7;

/** Subset of FileSystemDirectoryHandle we actually use. */
export interface OpfsDir {
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<OpfsDir>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<OpfsFileHandle>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
}

export interface OpfsFileHandle {
  createWritable(): Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
  getFile(): Promise<File>;
}

let injectedRoot: OpfsDir | null = null;
let injectedCompressor: ((file: File, target: 'main' | 'thumb') => Promise<Blob>) | null = null;

export function __setOpfsRootForTesting(dir: OpfsDir | null): void {
  injectedRoot = dir;
}

export function __setCompressorForTesting(
  fn: ((file: File, target: 'main' | 'thumb') => Promise<Blob>) | null,
): void {
  injectedCompressor = fn;
}

async function getRoot(): Promise<OpfsDir> {
  if (injectedRoot) return injectedRoot;
  // navigator.storage isn't typed as our subset, but the shape matches.
  const real = await navigator.storage.getDirectory();
  return real as unknown as OpfsDir;
}

/**
 * Compress + resize using OffscreenCanvas in production; passthrough when
 * the canvas pipeline isn't available (jsdom in unit tests).
 */
async function compress(file: File, target: 'main' | 'thumb'): Promise<Blob> {
  if (injectedCompressor) return injectedCompressor(file, target);
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') {
    return file; // jsdom or legacy environment \xe2\x80\x94 no-op
  }
  const bitmap = await createImageBitmap(file);
  const { width: srcW, height: srcH } = bitmap;
  let dstW: number, dstH: number;
  if (target === 'main') {
    const scale = Math.min(1, MAIN_MAX_EDGE / Math.max(srcW, srcH));
    dstW = Math.round(srcW * scale);
    dstH = Math.round(srcH * scale);
  } else {
    // thumb: square center crop to THUMB_EDGE
    dstW = THUMB_EDGE;
    dstH = THUMB_EDGE;
  }
  const canvas = new OffscreenCanvas(dstW, dstH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('OffscreenCanvas 2D context unavailable');
  if (target === 'thumb') {
    const side = Math.min(srcW, srcH);
    const sx = (srcW - side) / 2;
    const sy = (srcH - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, dstW, dstH);
  } else {
    ctx.drawImage(bitmap, 0, 0, dstW, dstH);
  }
  bitmap.close();
  return canvas.convertToBlob({
    type: 'image/jpeg',
    quality: target === 'main' ? MAIN_QUALITY : THUMB_QUALITY,
  });
}

async function getTxnDir(txId: string, create: boolean): Promise<OpfsDir> {
  const root = await getRoot();
  const txnRoot = await root.getDirectoryHandle(ROOT_DIR_NAME, { create });
  return txnRoot.getDirectoryHandle(txId, { create });
}

/**
 * Convention for deriving the thumb key from a main key.
 * `txn/abc/3.jpg` -> `txn/abc/thumb_3.jpg`.
 */
export function thumbKeyFor(mainKey: string): string {
  const parts = mainKey.split('/');
  const last = parts[parts.length - 1]!;
  parts[parts.length - 1] = `thumb_${last}`;
  return parts.join('/');
}

export const imagesService = {
  /**
   * Persist each file as a main + thumb pair under txn/<txId>/. Returns
   * the array of main keys (e.g. ['txn/<txId>/0.jpg', ...]).
   */
  async saveForTransaction(txId: string, files: File[]): Promise<string[]> {
    if (files.length === 0) return [];
    const dir = await getTxnDir(txId, true);
    const keys: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const mainName = `${i}.jpg`;
      const thumbName = `thumb_${i}.jpg`;
      const [mainBlob, thumbBlob] = await Promise.all([
        compress(file, 'main'),
        compress(file, 'thumb'),
      ]);
      const mainHandle = await dir.getFileHandle(mainName, { create: true });
      const mw = await mainHandle.createWritable();
      await mw.write(mainBlob);
      await mw.close();
      const thumbHandle = await dir.getFileHandle(thumbName, { create: true });
      const tw = await thumbHandle.createWritable();
      await tw.write(thumbBlob);
      await tw.close();
      keys.push(`${ROOT_DIR_NAME}/${txId}/${mainName}`);
    }
    return keys;
  },
  async loadBlob(key: string): Promise<Blob> {
    const root = await getRoot();
    const parts = key.split('/');
    if (parts.length < 2) throw new Error(`Bad image key: ${key}`);
    const fileName = parts.pop()!;
    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    const fh = await dir.getFileHandle(fileName);
    const file = await fh.getFile();
    return file;
  },
  async removeAllForTransaction(txId: string): Promise<void> {
    const root = await getRoot();
    const txnRoot = await root
      .getDirectoryHandle(ROOT_DIR_NAME, { create: false })
      .catch(() => null);
    if (!txnRoot) return;
    await txnRoot.removeEntry(txId, { recursive: true }).catch(() => {});
  },
};

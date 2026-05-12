import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeOpfsDir } from '@/test/fakeOpfs';
import {
  imagesService,
  thumbKeyFor,
  __setOpfsRootForTesting,
  __setCompressorForTesting,
} from './images';

let root: FakeOpfsDir;

beforeEach(() => {
  root = new FakeOpfsDir();
  __setOpfsRootForTesting(root);
  // passthrough compressor so tests don't depend on canvas / OffscreenCanvas
  __setCompressorForTesting(async (file) => file);
});

afterEach(() => {
  __setOpfsRootForTesting(null);
  __setCompressorForTesting(null);
});

function makeFile(name: string, body: string): File {
  return new File([body], name, { type: 'image/jpeg' });
}

describe('imagesService', () => {
  it('saveForTransaction([]) is a no-op and returns []', async () => {
    const keys = await imagesService.saveForTransaction('tx1', []);
    expect(keys).toEqual([]);
  });

  it('saveForTransaction writes a main + thumb per file, returns main keys', async () => {
    const files = [makeFile('a.jpg', 'main-A'), makeFile('b.jpg', 'main-B')];
    const keys = await imagesService.saveForTransaction('tx42', files);
    expect(keys).toEqual(['txn/tx42/0.jpg', 'txn/tx42/1.jpg']);

    // Walk the fake filesystem to verify both main and thumb landed.
    const txnDir = await root.getDirectoryHandle('txn');
    const tx42 = await txnDir.getDirectoryHandle('tx42');
    const m0 = await (await tx42.getFileHandle('0.jpg')).getFile();
    const t0 = await (await tx42.getFileHandle('thumb_0.jpg')).getFile();
    const m1 = await (await tx42.getFileHandle('1.jpg')).getFile();
    const t1 = await (await tx42.getFileHandle('thumb_1.jpg')).getFile();
    expect(await m0.text()).toBe('main-A');
    expect(await t0.text()).toBe('main-A');
    expect(await m1.text()).toBe('main-B');
    expect(await t1.text()).toBe('main-B');
  });

  it('loadBlob round-trips main and thumb blobs', async () => {
    const [k] = await imagesService.saveForTransaction('tx1', [makeFile('a.jpg', 'hello world')]);
    const main = await imagesService.loadBlob(k!);
    const thumb = await imagesService.loadBlob(thumbKeyFor(k!));
    expect(await main.text()).toBe('hello world');
    expect(await thumb.text()).toBe('hello world');
  });

  it('thumbKeyFor injects the thumb_ prefix correctly', () => {
    expect(thumbKeyFor('txn/abc/3.jpg')).toBe('txn/abc/thumb_3.jpg');
    expect(thumbKeyFor('txn/abc/12.jpg')).toBe('txn/abc/thumb_12.jpg');
  });

  it('removeAllForTransaction nukes the whole directory', async () => {
    await imagesService.saveForTransaction('txA', [makeFile('x.jpg', 'x')]);
    await imagesService.removeAllForTransaction('txA');
    const txnDir = await root.getDirectoryHandle('txn');
    await expect(txnDir.getDirectoryHandle('txA')).rejects.toThrow();
  });

  it('removeAllForTransaction is a no-op when nothing was saved', async () => {
    await expect(imagesService.removeAllForTransaction('never-saved')).resolves.toBeUndefined();
  });

  it('two transactions stay isolated', async () => {
    await imagesService.saveForTransaction('txA', [makeFile('x.jpg', 'A')]);
    await imagesService.saveForTransaction('txB', [makeFile('x.jpg', 'B')]);
    await imagesService.removeAllForTransaction('txA');
    const txnDir = await root.getDirectoryHandle('txn');
    await expect(txnDir.getDirectoryHandle('txA')).rejects.toThrow();
    const txB = await txnDir.getDirectoryHandle('txB');
    const m0 = await (await txB.getFileHandle('0.jpg')).getFile();
    expect(await m0.text()).toBe('B');
  });
});

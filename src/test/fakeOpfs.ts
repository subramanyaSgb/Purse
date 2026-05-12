/**
 * Tiny in-memory stand-in for the File System Access API surface that
 * imagesService uses. Implements just enough of FileSystemDirectoryHandle
 * and FileSystemFileHandle to round-trip blobs.
 *
 * Not exhaustive \xe2\x80\x94 e.g. WritableStream's seek/abort aren't modelled.
 * Production code uses `navigator.storage.getDirectory()` instead.
 */

class FakeFileHandle {
  readonly kind = 'file' as const;
  readonly name: string;
  private data: Blob = new Blob();

  constructor(name: string) {
    this.name = name;
  }

  async createWritable(): Promise<{
    write: (blob: Blob) => Promise<void>;
    close: () => Promise<void>;
  }> {
    return {
      write: async (blob: Blob) => {
        this.data = blob;
      },
      close: async () => {},
    };
  }

  async getFile(): Promise<File> {
    return new File([this.data], this.name, { type: this.data.type });
  }
}

export class FakeOpfsDir {
  readonly kind = 'directory' as const;
  readonly name: string;
  private entries = new Map<string, FakeOpfsDir | FakeFileHandle>();

  constructor(name: string = '') {
    this.name = name;
  }

  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<FakeOpfsDir> {
    const existing = this.entries.get(name);
    if (existing && existing.kind === 'directory') return existing;
    if (existing && existing.kind === 'file') {
      throw new Error(`Entry ${name} exists as a file`);
    }
    if (!opts?.create) throw new Error(`Directory ${name} not found`);
    const dir = new FakeOpfsDir(name);
    this.entries.set(name, dir);
    return dir;
  }

  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<FakeFileHandle> {
    const existing = this.entries.get(name);
    if (existing && existing.kind === 'file') return existing;
    if (existing && existing.kind === 'directory') {
      throw new Error(`Entry ${name} exists as a directory`);
    }
    if (!opts?.create) throw new Error(`File ${name} not found`);
    const fh = new FakeFileHandle(name);
    this.entries.set(name, fh);
    return fh;
  }

  async removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void> {
    const existing = this.entries.get(name);
    if (!existing) throw new Error(`Entry ${name} not found`);
    if (existing.kind === 'directory' && !opts?.recursive) {
      // Mirror the spec: non-empty dirs need recursive: true
      // (we never call without recursive in real code)
      throw new Error(`Directory ${name} not empty; pass recursive: true`);
    }
    this.entries.delete(name);
  }
}

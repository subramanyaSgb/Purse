import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { appMetaRepo } from '@/repo/appMeta';
import { useFirstRun } from './useFirstRun';
import { useUiStore } from './uiStore';

function Probe() {
  const status = useFirstRun();
  return <div data-testid="status">{status}</div>;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  useUiStore.setState({ theme: 'system' });
});

describe('useFirstRun', () => {
  it('seeds on first mount and reports ready', async () => {
    expect(await appMetaRepo.get()).toBeNull();
    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });
    expect(await appMetaRepo.get()).not.toBeNull();
  });

  it('hydrates the UI store theme from the persisted appMeta value', async () => {
    // Pre-seed with theme=dark so we can prove the hook reads it.
    await appMetaRepo.update({
      userName: 'test',
      baseCurrency: 'INR',
      defaultTxKind: 'expense',
      theme: 'dark',
      gpsEnabled: true,
      schemaVersion: 1,
      appVersion: '0.0.0',
    });
    expect(useUiStore.getState().theme).toBe('system');

    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });
    expect(useUiStore.getState().theme).toBe('dark');
  });

  it('is a no-op on subsequent runs (does not re-seed)', async () => {
    // First run
    render(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });
    const meta1 = await appMetaRepo.get();
    expect(meta1).not.toBeNull();

    // Second mount of the same hook \xe2\x80\x94 simulates app reload
    render(<Probe />);
    await waitFor(() => {
      // Both probes will report ready
      expect(screen.getAllByTestId('status').at(-1)?.textContent).toBe('ready');
    });

    const meta2 = await appMetaRepo.get();
    expect(meta2?.createdAt).toBe(meta1?.createdAt);
  });
});

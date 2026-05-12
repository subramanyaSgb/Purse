import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { db } from '@/db/db';
import { accountsRepo } from '@/repo/accounts';
import { transactionsRepo } from '@/repo/transactions';
import { useBalances, BALANCES_QUERY_KEY } from './useBalances';

function Probe() {
  const { balances, isLoading } = useBalances();
  if (isLoading) return <div data-testid="state">loading</div>;
  return (
    <ul>
      {[...balances.entries()].map(([id, v]) => (
        <li key={id} data-testid={`bal-${id}`}>
          {v}
        </li>
      ))}
    </ul>
  );
}

let qc: QueryClient;

beforeEach(async () => {
  await db.delete();
  await db.open();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

function renderWithQuery(ui: React.ReactNode) {
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('useBalances', () => {
  it('returns a Map of account ids to balances computed from the repo', async () => {
    const a = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 1000,
      colour: '#000',
      icon: 'wallet',
    });
    const b = await accountsRepo.create({
      name: 'Bank',
      type: 'bank',
      currency: 'INR',
      openingBalance: 5000,
      colour: '#000',
      icon: 'wallet',
    });

    renderWithQuery(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId(`bal-${a.id}`).textContent).toBe('1000');
    });
    expect(screen.getByTestId(`bal-${b.id}`).textContent).toBe('5000');
  });

  it('refetches when the query is invalidated by the test helper', async () => {
    const a = await accountsRepo.create({
      name: 'Cash',
      type: 'cash',
      currency: 'INR',
      openingBalance: 0,
      colour: '#000',
      icon: 'wallet',
    });
    renderWithQuery(<Probe />);
    await waitFor(() => {
      expect(screen.getByTestId(`bal-${a.id}`).textContent).toBe('0');
    });

    // Mutate the data, then invalidate \xe2\x80\x94 mimics what a repo mutation will do.
    await transactionsRepo.create({
      kind: 'income',
      amount: 250,
      currency: 'INR',
      occurredAt: '2026-05-01T00:00:00.000Z',
      accountId: a.id,
      categoryId: 'cIncome',
      note: '',
      tagIds: [],
      images: [],
    });
    await act(async () => {
      await qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
    });

    await waitFor(() => {
      expect(screen.getByTestId(`bal-${a.id}`).textContent).toBe('250');
    });
  });
});

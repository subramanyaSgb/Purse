import { useQuery, useQueryClient } from '@tanstack/react-query';
import { balancesRepo } from '@/repo/balances';

export const BALANCES_QUERY_KEY = ['balances'] as const;

export type UseBalancesResult = {
  balances: Map<string, number>;
  isLoading: boolean;
  refetch: () => void;
};

/**
 * React Query wrapper around balancesRepo.compute(). The query key
 * BALANCES_QUERY_KEY is exported so that any mutation (txn, account
 * change) can call queryClient.invalidateQueries({ queryKey:
 * BALANCES_QUERY_KEY }) to force a refresh.
 */
export function useBalances(): UseBalancesResult {
  const query = useQuery({
    queryKey: BALANCES_QUERY_KEY,
    queryFn: () => balancesRepo.compute(),
  });
  const qc = useQueryClient();
  return {
    balances: query.data ?? new Map<string, number>(),
    isLoading: query.isLoading,
    refetch: () => {
      void qc.invalidateQueries({ queryKey: BALANCES_QUERY_KEY });
    },
  };
}

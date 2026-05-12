import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared QueryClient for the app. Cached values stay fresh for 60s
 * by default — fine for local-first reads off Dexie (cheap to refetch),
 * and explicit invalidations from repo mutations push fresh data through.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

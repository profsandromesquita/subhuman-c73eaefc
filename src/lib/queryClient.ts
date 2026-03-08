import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep cached data for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Retry failed requests once
      retry: 1,
      // Refetch on window focus to keep PWA data fresh
      refetchOnWindowFocus: true,
      // Show stale data while revalidating
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

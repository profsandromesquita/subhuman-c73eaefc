import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface InfiniteScrollTriggerProps {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    const el = triggerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isFetchingNextPage) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!hasNextPage) return null;

  return <div ref={triggerRef} className="h-4" />;
}

import { cn } from "@/lib/utils";
import { useSpaces } from "@/hooks/useSpaces";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface PodcastFiltersProps {
  selectedSpaceId: string | null;
  onSpaceSelect: (spaceId: string | null) => void;
}

export function PodcastFilters({ selectedSpaceId, onSpaceSelect }: PodcastFiltersProps) {
  const { data: spaces, isLoading } = useSpaces();

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-24 rounded-full bg-secondary animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {/* "Todos" filter */}
        <button
          onClick={() => onSpaceSelect(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0",
            selectedSpaceId === null
              ? "bg-foreground text-background"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          Todos
        </button>

        {/* Space filters */}
        {spaces?.map((space) => (
          <button
            key={space.id}
            onClick={() => onSpaceSelect(space.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0",
              selectedSpaceId === space.id
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {space.name}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

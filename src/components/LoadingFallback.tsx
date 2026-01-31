import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        {/* Header skeleton */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </motion.div>

        {/* Content skeleton */}
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Skeleton className="h-24 w-full rounded-xl" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Carregando...</p>
      </motion.div>
    </div>
  );
}

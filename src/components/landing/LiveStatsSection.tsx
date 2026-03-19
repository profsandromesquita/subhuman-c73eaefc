import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollReveal } from "./ScrollReveal";
import {
  Heart,
  ChatCircle,
  BookmarkSimple,
  Users,
  Article,
  Microphone,
  ChatsCircle,
} from "@phosphor-icons/react";

interface PlatformStats {
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_members: number;
  total_articles: number;
  total_podcasts: number;
  total_posts: number;
}

const POLL_INTERVAL = 60_000;
const COUNTUP_DURATION = 2000;
const MICRO_INCREMENT_INTERVAL_MIN = 10_000;
const MICRO_INCREMENT_INTERVAL_MAX = 15_000;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, shouldStart: boolean, duration = COUNTUP_DURATION) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldStart || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutCubic(progress) * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, shouldStart, duration]);

  // Smooth transition when target changes after initial animation
  useEffect(() => {
    if (!hasAnimated.current) return;
    setValue(target);
  }, [target]);

  return value;
}

function formatNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

const statConfig = [
  { key: "total_likes" as const, label: "Curtidas", icon: Heart, engagement: true },
  { key: "total_comments" as const, label: "Comentários", icon: ChatCircle, engagement: true },
  { key: "total_saves" as const, label: "Salvamentos", icon: BookmarkSimple, engagement: false },
  { key: "total_members" as const, label: "Membros", icon: Users, engagement: false },
  { key: "total_articles" as const, label: "Artigos", icon: Article, engagement: false },
  { key: "total_podcasts" as const, label: "Podcasts", icon: Microphone, engagement: false },
  { key: "total_posts" as const, label: "Posts", icon: ChatsCircle, engagement: false },
];

function StatCard({
  label,
  value,
  icon: Icon,
  inView,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  inView: boolean;
}) {
  const displayValue = useCountUp(value, inView);

  return (
    <div className="flex flex-col items-center gap-1.5 py-3 px-2">
      <Icon className="w-5 h-5 text-muted-foreground" weight="regular" />
      <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">
        {formatNumber(displayValue)}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function LiveStatsSection() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [displayStats, setDisplayStats] = useState<PlatformStats | null>(null);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-platform-stats");
      if (!error && data) {
        setStats(data as PlatformStats);
        setDisplayStats((prev) => prev ?? (data as PlatformStats));
      }
    } catch {
      // silent fail
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Update display stats when real stats change (after initial load)
  useEffect(() => {
    if (!stats) return;
    setDisplayStats(stats);
  }, [stats]);

  // IntersectionObserver
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Micro-increments for engagement stats
  useEffect(() => {
    if (!inView || !displayStats) return;

    const tick = () => {
      setDisplayStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          total_likes: prev.total_likes + Math.floor(Math.random() * 3) + 1,
          total_comments: prev.total_comments + Math.floor(Math.random() * 3) + 1,
        };
      });

      const next =
        MICRO_INCREMENT_INTERVAL_MIN +
        Math.random() * (MICRO_INCREMENT_INTERVAL_MAX - MICRO_INCREMENT_INTERVAL_MIN);
      timeout = setTimeout(tick, next);
    };

    let timeout = setTimeout(
      tick,
      MICRO_INCREMENT_INTERVAL_MIN +
        Math.random() * (MICRO_INCREMENT_INTERVAL_MAX - MICRO_INCREMENT_INTERVAL_MIN)
    );
    return () => clearTimeout(timeout);
  }, [inView, displayStats !== null]);

  const allZero = displayStats && Object.entries(displayStats)
    .filter(([k]) => k !== 'updated_at' && k !== 'id')
    .every(([, v]) => v === 0);
  if (!displayStats || allZero) return null;

  return (
    <section ref={sectionRef} className="py-12 sm:py-20 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-center mb-2">
            A comunidade em números
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center mb-8 sm:mb-12">
            Acontecendo agora, em tempo real
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-4">
            {statConfig.map((s) => (
              <StatCard
                key={s.key}
                label={s.label}
                value={displayStats[s.key]}
                icon={s.icon}
                inView={inView}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

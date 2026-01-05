import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendUp, TrendDown } from '@phosphor-icons/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  change,
  changeLabel,
  className
}: StatsCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl p-5 transition-all hover:border-muted-foreground/30',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-secondary text-foreground">
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              isPositive && 'text-emerald-500',
              isNegative && 'text-red-500',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}
          >
            {isPositive && <TrendUp className="w-4 h-4" />}
            {isNegative && <TrendDown className="w-4 h-4" />}
            <span>
              {isPositive && '+'}
              {change}%
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {title}
          {changeLabel && (
            <span className="text-muted-foreground/70"> · {changeLabel}</span>
          )}
        </p>
      </div>
    </div>
  );
}

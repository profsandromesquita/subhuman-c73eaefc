import { SealCheck, Crown } from '@phosphor-icons/react';

interface PremiumBadgeProps {
  type: 'blue' | 'gold' | null;
  size?: number;
}

export function PremiumBadge({ type, size = 16 }: PremiumBadgeProps) {
  if (!type) return null;

  if (type === 'blue') {
    return <SealCheck className="inline-block text-blue-500" weight="fill" style={{ width: size, height: size }} />;
  }

  return <Crown className="inline-block text-amber-500" weight="fill" style={{ width: size, height: size }} />;
}

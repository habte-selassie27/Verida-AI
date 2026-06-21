import type { CSSProperties } from 'react';

type SkeletonVariant = 'text-sm' | 'text-md' | 'text-lg' | 'title' | 'badge' | 'avatar' | 'card' | 'chart' | 'icon';

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

export function Skeleton({
  variant = 'text-md',
  className = '',
  width,
  height,
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton skel-${variant} ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

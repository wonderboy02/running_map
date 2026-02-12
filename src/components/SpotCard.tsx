'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Spot } from '@/types';

interface SpotCardProps {
  spot: Spot;
}

export default function SpotCard({ spot }: SpotCardProps) {
  return (
    <div>
      <div className="mb-1 flex items-start justify-between">
        <h3 className="text-text text-lg font-bold">{spot.name}</h3>
        {spot.is_highlighted && (
          <Badge variant="secondary" className="bg-highlight-muted text-highlight-foreground ml-2 flex-shrink-0">
            추천
          </Badge>
        )}
      </div>

      <p className="text-text-secondary mb-2 text-sm">{spot.address}</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {spot.categories.map((cat) => (
          <Badge key={cat} variant="secondary" className="bg-surface-dim text-text-secondary">
            {cat}
          </Badge>
        ))}
      </div>

      {spot.phone && (
        <p className="text-text-secondary mb-3 text-sm">
          <span className="mr-1.5">&#128222;</span>
          <a href={`tel:${spot.phone}`} className="underline">
            {spot.phone}
          </a>
        </p>
      )}

      <Button variant="ghost" className="text-primary w-full" asChild>
        <Link href={`/spot/${spot.id}`}>상세 정보 보기</Link>
      </Button>
    </div>
  );
}

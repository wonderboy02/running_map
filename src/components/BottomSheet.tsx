'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import SpotCard from './SpotCard';
import type { Spot } from '@/types';

interface BottomSheetProps {
  spot: Spot | null;
  onClose: () => void;
}

export default function BottomSheet({ spot, onClose }: BottomSheetProps) {
  return (
    <Sheet open={!!spot} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6">
        <SheetHeader className="sr-only">
          <SheetTitle>{spot?.name ?? '장소 정보'}</SheetTitle>
        </SheetHeader>
        {spot && <SpotCard spot={spot} />}
      </SheetContent>
    </Sheet>
  );
}

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SameAddressTooltipProps {
  roadAddress: string;
  existingSpots: Array<{
    id: string;
    name: string;
    category: string;
  }>;
}

export function SameAddressTooltip({ roadAddress, existingSpots }: SameAddressTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-2 inline-flex items-center text-yellow-600 hover:text-yellow-700">
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm">
          <div className="space-y-2">
            <p className="font-semibold text-sm">⚠️ 같은 주소에 다른 장소 존재</p>
            <div className="border-t border-border pt-2">
              <p className="text-xs text-text-secondary mb-2">📍 {roadAddress}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium">기존 장소:</p>
                {existingSpots.map((spot) => (
                  <div key={spot.id} className="text-xs flex items-start gap-2">
                    <span>•</span>
                    <div className="flex-1">
                      <span className="font-medium">{spot.name}</span>
                      <div className="mt-1">
                        <Badge
                          variant="secondary"
                          className="text-xs px-1 py-0 h-4"
                        >
                          {spot.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-text-secondary pt-2 border-t border-border">
              이 주소에 추가하시겠습니까?
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

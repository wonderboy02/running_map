import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, SearchX } from 'lucide-react';

interface DuplicateStatusBadgeProps {
  status: 'new' | 'warning' | 'duplicate' | 'no-result';
}

export function DuplicateStatusBadge({ status }: DuplicateStatusBadgeProps) {
  const config = {
    new: {
      icon: CheckCircle,
      label: '새 장소',
      className: 'bg-green-500 text-white hover:bg-green-600'
    },
    warning: {
      icon: AlertTriangle,
      label: '같은 주소',
      className: 'bg-yellow-500 text-black hover:bg-yellow-600'
    },
    duplicate: {
      icon: XCircle,
      label: '이미 존재',
      className: 'bg-red-500 text-white hover:bg-red-600'
    },
    'no-result': {
      icon: SearchX,
      label: '결과 없음',
      className: 'bg-gray-500 text-white hover:bg-gray-600'
    }
  }[status];

  const Icon = config.icon;

  return (
    <Badge className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

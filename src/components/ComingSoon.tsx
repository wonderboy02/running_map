'use client';

import { useEffect, useState } from 'react';
import { Instagram, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const INSTAGRAM_URL = 'https://www.instagram.com/runner.spott';
const VIEW_SESSION_KEY = 'runners_spot_coming_soon_viewed';

export default function ComingSoon() {
  const [lastVote, setLastVote] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    // 세션당 1회만 view 이벤트 발화
    try {
      if (sessionStorage.getItem(VIEW_SESSION_KEY)) return;
      sessionStorage.setItem(VIEW_SESSION_KEY, '1');
    } catch {
      // sessionStorage 사용 불가 시 그냥 발화
    }
    track('coming_soon_view', {});
  }, []);

  function handleVote(vote: 'up' | 'down') {
    track('coming_soon_vote', { vote });
    setLastVote(vote);
    toast.success('의견 감사합니다!');
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface px-6">
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        {/* 이미지 플레이스홀더 — 추후 실제 이미지로 교체 */}
        <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-surface-dim">
          <span className="text-4xl text-text-muted">🏃</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="text-lg font-bold text-text">곧 업데이트 됩니다!</h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            새로운 기능을 준비하고 있어요.
            <br />
            Instagram을 팔로우하고 소식을 확인해주세요!
          </p>
        </div>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-text px-5 py-2.5 text-sm font-semibold text-surface transition-opacity active:opacity-80"
        >
          <Instagram className="h-4 w-4" />
          Instagram 팔로우
        </a>

        <div className="h-px w-full bg-border" />

        <div className="flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-text">이 기능이 필요하신가요?</p>
          <div className="flex gap-3">
            {([
              { vote: 'up' as const, icon: ThumbsUp, label: '필요해요' },
              { vote: 'down' as const, icon: ThumbsDown, label: '괜찮아요' },
            ]).map(({ vote, icon: Icon, label }) => (
              <button
                key={vote}
                type="button"
                onClick={() => handleVote(vote)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors',
                  lastVote === vote
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text active:bg-surface-dim',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

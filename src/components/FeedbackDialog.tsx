'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Star } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';
import { FEEDBACK_MAX_LENGTH } from '@/lib/constants';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmed = content.trim();
  const canSubmit = rating > 0 && trimmed.length <= FEEDBACK_MAX_LENGTH && !loading;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setRating(0);
      setContent('');
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, content: trimmed || null }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || '피드백 전송에 실패했습니다.');
        return;
      }

      track('feedback_submit', { rating: rating as 1 | 2 | 3 | 4 | 5, content_length: trimmed.length });
      toast.success('소중한 의견 감사합니다!');
      handleOpenChange(false);
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>의견 보내기</DialogTitle>
          <DialogDescription>
            개발자들이 항상 새로운 기능을 만들 준비를 하고 있습니다!
            <br />
            마구 제안해주세요
          </DialogDescription>
        </DialogHeader>

        {/* 별점 선택 */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">서비스가 마음에 드셨나요?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="transition-transform hover:scale-110"
                aria-label={`${value}점`}
                disabled={loading}
              >
                <Star
                  className={`h-8 w-8 ${
                    value <= rating
                      ? 'text-highlight fill-current'
                      : 'text-text-muted'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="불편한 점이나 개선 아이디어를 자유롭게 적어주세요 (선택)"
            rows={4}
            maxLength={FEEDBACK_MAX_LENGTH}
            disabled={loading}
          />
          <p className="text-muted-foreground text-right text-xs">
            {content.length} / {FEEDBACK_MAX_LENGTH}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? '보내는 중...' : '보내기'}
            {!loading && <Send className="ml-1.5 h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

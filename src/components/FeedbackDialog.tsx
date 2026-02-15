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
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const MAX_LENGTH = 1000;

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmed = content.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_LENGTH && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || '피드백 전송에 실패했습니다.');
        return;
      }

      track('feedback_submit', { content_length: trimmed.length });
      toast.success('소중한 의견 감사합니다!');
      setContent('');
      onOpenChange(false);
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>의견 보내기</DialogTitle>
          <DialogDescription>
            서비스 개선을 위한 소중한 의견을 보내주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="불편한 점이나 개선 아이디어를 자유롭게 적어주세요"
            rows={6}
            maxLength={MAX_LENGTH}
            disabled={loading}
          />
          <p className="text-muted-foreground text-right text-xs">
            {content.length} / {MAX_LENGTH}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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

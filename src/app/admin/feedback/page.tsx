'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CheckCircle, Circle, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Feedback } from '@/types';

type Filter = 'all' | 'unread' | 'read';

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feedback');
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch {
      toast.error('피드백 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  async function handleToggleRead(id: string, currentIsRead: boolean) {
    const newIsRead = !currentIsRead;
    // Optimistic update
    setFeedbacks((prev) =>
      prev.map((f) => (f.id === id ? { ...f, is_read: newIsRead } : f)),
    );

    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: newIsRead }),
      });

      if (!res.ok) throw new Error();
    } catch {
      // Revert
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_read: currentIsRead } : f)),
      );
      toast.error('상태 변경에 실패했습니다.');
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/admin/feedback', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      toast.success('피드백이 삭제되었습니다.');
    } else {
      toast.error('삭제에 실패했습니다.');
    }
  }

  const filtered = feedbacks.filter((f) => {
    if (filter === 'unread') return !f.is_read;
    if (filter === 'read') return f.is_read;
    return true;
  });

  const unreadCount = feedbacks.filter((f) => !f.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          피드백 관리
          <Badge variant="secondary" className="ml-2">
            {feedbacks.length}건
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-1">
              {unreadCount} 미읽음
            </Badge>
          )}
        </h2>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {([
          ['all', '전체'],
          ['unread', '읽지 않음'],
          ['read', '읽음'],
        ] as const).map(([value, label]) => (
          <Button
            key={value}
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-20 text-center text-sm">
          {feedbacks.length === 0
            ? '아직 피드백이 없습니다'
            : '해당 필터에 맞는 피드백이 없습니다'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((fb) => (
            <Card key={fb.id} className="p-4">
              <div className="flex items-start gap-3">
                {/* 읽음 상태 dot */}
                <button
                  onClick={() => handleToggleRead(fb.id, fb.is_read)}
                  className="mt-0.5 shrink-0"
                  aria-label={fb.is_read ? '읽음으로 표시됨' : '읽지 않음'}
                >
                  {fb.is_read ? (
                    <CheckCircle className="text-muted-foreground h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5 fill-blue-500 text-blue-500" />
                  )}
                </button>

                {/* 내용 */}
                <div className="min-w-0 flex-1">
                  {fb.rating != null && (
                    <div className="mb-1 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <Star
                          key={v}
                          className={`h-4 w-4 ${v <= fb.rating! ? 'text-highlight fill-current' : 'text-text-muted'}`}
                        />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">{fb.rating}/5</span>
                    </div>
                  )}
                  {fb.content ? (
                    <p className="whitespace-pre-wrap text-sm">{fb.content}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">텍스트 없음</p>
                  )}
                  <p className="text-muted-foreground mt-2 text-xs">
                    {new Date(fb.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                {/* 삭제 */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>피드백 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(fb.id)}>
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

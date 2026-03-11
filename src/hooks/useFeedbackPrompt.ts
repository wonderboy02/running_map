'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'feedback_prompt_dismissed';
const AUTO_PROMPT_DELAY = 30_000; // 30초

function isDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Private 브라우징 등 localStorage 접근 불가 — 무시
  }
}

export function useFeedbackPrompt() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptedRef = useRef(false);

  // 30초 자동 프롬프트
  useEffect(() => {
    if (isDismissed()) return;

    timerRef.current = setTimeout(() => {
      if (promptedRef.current) return;
      promptedRef.current = true;
      setFeedbackOpen(true);
    }, AUTO_PROMPT_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // 수동 버튼용 — 타이머 취소 + 즉시 열기
  const openFeedback = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    promptedRef.current = true;
    setFeedbackOpen(true);
  }, []);

  // 닫힐 때 localStorage 기록 (자동 프롬프트 영구 차단)
  const onFeedbackOpenChange = useCallback((open: boolean) => {
    setFeedbackOpen(open);
    if (!open) {
      markDismissed();
    }
  }, []);

  return { feedbackOpen, openFeedback, onFeedbackOpenChange };
}

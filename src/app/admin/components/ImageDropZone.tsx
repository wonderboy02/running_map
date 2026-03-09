'use client';

import { useRef, useEffect, useCallback } from 'react';
import { X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface ImageDropZoneProps {
  onImageReady: (file: File) => void;
  preview: string | null;
  onClear: () => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1200; // 출력 최대 가로 해상도
const ASPECT_W = 4;
const ASPECT_H = 3;

/** Canvas API로 이미지를 4:3 중앙 크롭 + 최대 1200px 리사이즈 후 PNG File로 반환 */
function cropTo4x3(img: HTMLImageElement): Promise<File> {
  return new Promise((resolve, reject) => {
    const { naturalWidth: w, naturalHeight: h } = img;
    const targetRatio = ASPECT_W / ASPECT_H;
    const currentRatio = w / h;

    let sx = 0, sy = 0, sw = w, sh = h;
    if (currentRatio > targetRatio) {
      sw = Math.round(h * targetRatio);
      sx = Math.round((w - sw) / 2);
    } else if (currentRatio < targetRatio) {
      sh = Math.round(w / targetRatio);
      sy = Math.round((h - sh) / 2);
    }

    // 출력 크기: maxWidth 캡 적용
    let outW = sw;
    let outH = sh;
    if (outW > MAX_WIDTH) {
      outH = Math.round((MAX_WIDTH / outW) * outH);
      outW = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context를 생성할 수 없습니다.'));
      return;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob 실패'));
          return;
        }
        resolve(new File([blob], 'thumbnail.png', { type: 'image/png' }));
      },
      'image/png',
    );
  });
}

/** File/Blob → <img> 로드 → 4:3 크롭 → onImageReady */
function processImage(source: File | Blob, onImageReady: (file: File) => void) {
  if (!source.type.startsWith('image/')) return;
  if (source.size > MAX_SIZE) {
    toast.error('이미지 크기가 10MB를 초과합니다.');
    return;
  }

  const url = URL.createObjectURL(source);
  const img = new Image();
  img.onload = async () => {
    try {
      const cropped = await cropTo4x3(img);
      onImageReady(cropped);
    } catch (err) {
      console.error('[ImageDropZone] crop error:', err);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

export default function ImageDropZone({ onImageReady, preview, onClear }: ImageDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+V 붙여넣기 핸들러 (document 레벨)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      // image/* 타입이 있는 경우에만 처리 — Input/Textarea 텍스트 붙여넣기 간섭 방지
      let imageItem: DataTransferItem | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          imageItem = items[i];
          break;
        }
      }
      if (!imageItem) return;

      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) processImage(blob, onImageReady);
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [onImageReady]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) processImage(file, onImageReady);
    },
    [onImageReady],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file, onImageReady);
      // 같은 파일 재선택 허용
      e.target.value = '';
    },
    [onImageReady],
  );

  if (preview) {
    return (
      <div className="relative" style={{ aspectRatio: '4/3' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="썸네일 미리보기"
          className="h-full w-full rounded-md object-cover"
        />
        <button
          type="button"
          onClick={onClear}
          className="bg-background/80 absolute top-1.5 right-1.5 rounded-full p-1 backdrop-blur-sm transition-colors hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="bg-surface-dim border-border text-text-muted flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed py-8 transition-colors hover:border-primary/50"
      >
        <Upload className="h-6 w-6" />
        <p className="text-xs">드래그 앤 드롭, Ctrl+V 붙여넣기, 또는 클릭</p>
        <p className="text-[11px] opacity-70">4:3 자동 크롭 · 최대 10MB</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="이미지 파일 선택"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

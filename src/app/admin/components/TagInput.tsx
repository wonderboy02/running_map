'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const MAX_TAGS = 20;

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ value, onChange }: TagInputProps) {
  const [input, setInput] = useState('');

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,$/, '');
    if (!tag) return;
    if (value.includes(tag)) {
      setInput('');
      return;
    }
    if (value.length >= MAX_TAGS) {
      setInput('');
      return;
    }
    onChange([...value, tag]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
          }
        }}
        placeholder="태그 입력 후 Enter 또는 콤마(,)로 추가"
        disabled={value.length >= MAX_TAGS}
      />
      {value.length >= MAX_TAGS && (
        <p className="text-xs text-muted-foreground">최대 {MAX_TAGS}개까지 추가할 수 있습니다.</p>
      )}
    </div>
  );
}

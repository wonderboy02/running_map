'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MENU_ITEMS = [
  {
    label: '피드백',
    href: 'https://forms.gle/placeholder',
    icon: MessageCircle,
  },
  {
    label: '제휴문의',
    href: 'mailto:contact@runnersspot.com',
    icon: Mail,
  },
];

export default function FABMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="absolute bottom-6 right-4 z-30">
      {isOpen && (
        <div className="mb-3 flex flex-col gap-2">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105"
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </div>
      )}

      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-12 w-12 rounded-full bg-primary text-white shadow-lg transition-transform hover:bg-primary-dark ${
          isOpen ? 'rotate-45' : ''
        }`}
        aria-label="메뉴"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

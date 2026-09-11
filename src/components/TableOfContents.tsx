'use client';

import React, { useEffect, useState } from 'react';
import { extractHeadings } from '@/lib/utils';
import { TOCItem } from '@/lib/types';
import { ListCollapse } from 'lucide-react';

interface TableOfContentsProps {
  content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    setHeadings(extractHeadings(content));
  }, [content]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="p-4 rounded-xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-sm">
      <div className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200 mb-3 text-xs tracking-wider uppercase">
        <ListCollapse className="w-4 h-4 text-neutral-500" />
        <span>On This Page</span>
      </div>
      <ul className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
        {headings.map((item, idx) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={`${item.id}-${idx}`}
              style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(item.id);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                    setActiveId(item.id);
                  }
                }}
                className={`block py-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate ${
                  isActive
                    ? 'font-semibold text-blue-600 dark:text-blue-400'
                    : ''
                }`}
                title={item.text}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

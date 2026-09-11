'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function CodeBlock({ children, className, ...props }: React.ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const isInline = !className && typeof children === 'string' && !children.includes('\n');

  if (isInline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-pink-600 dark:text-pink-400 font-mono text-sm font-medium" {...props}>
        {children}
      </code>
    );
  }

  const codeText = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/80 border-b border-neutral-700/60 text-xs text-neutral-400 font-mono">
        <span className="uppercase tracking-wider font-semibold">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-neutral dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        components={{
          code: CodeBlock,
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                {...props}
              >
                {children}
                {isExternal && <ExternalLink className="w-3 h-3 opacity-60 inline" />}
              </a>
            );
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 border-t border-neutral-200 dark:border-neutral-800" {...props}>
              {children}
            </td>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2 my-4 rounded-r-lg text-neutral-700 dark:text-neutral-300 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, className, ...props }) => {
            // Task list check
            if (className?.includes('contains-task-list')) {
              return (
                <ul className="space-y-1.5 my-3 list-none pl-0" {...props}>
                  {children}
                </ul>
              );
            }
            return (
              <ul className="list-disc pl-6 my-3 space-y-1 text-neutral-700 dark:text-neutral-300" {...props}>
                {children}
              </ul>
            );
          },
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-3 space-y-1 text-neutral-700 dark:text-neutral-300" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, className, ...props }) => {
            if (className?.includes('task-list-item')) {
              return (
                <li className="flex items-start gap-2 list-none" {...props}>
                  {children}
                </li>
              );
            }
            return <li {...props}>{children}</li>;
          },
          hr: () => <hr className="my-8 border-neutral-200 dark:border-neutral-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

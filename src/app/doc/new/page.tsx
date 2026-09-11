'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MarkdownEditor from '@/components/MarkdownEditor';
import { Document } from '@/lib/types';
import { Sparkles, FileText, Code2, Users } from 'lucide-react';

const TEMPLATES = [
  {
    name: 'Blank Document',
    icon: FileText,
    description: 'Start with a clean slate',
    title: 'Untitled Document',
    folder: '',
    tags: [],
    content: `# Untitled Document

Start writing your markdown here...
`,
  },
  {
    name: 'Technical Specification',
    icon: Code2,
    description: 'Architecture, goals, and API contracts',
    title: 'Technical Specification: New Service',
    folder: 'Engineering',
    tags: ['spec', 'architecture', 'rfc'],
    content: `# Technical Specification: New Service 🛠️

## 1. Overview & Goals
Brief summary of the system and high-level business objectives.

- **Primary Goal**: Provide a fast, shareable storage engine.
- **Non-Goals**: Real-time collaborative conflict resolution.

---

## 2. Architecture & Data Flow
Describe the high-level architecture:

\`\`\`mermaid
flowchart LR
    Client -->|REST API| Server
    Server -->|Read/Write| SQLite[(Database)]
\`\`\`

---

## 3. API Contract
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| \`GET\` | \`/api/documents\` | List documents with query filter |
| \`POST\` | \`/api/documents\` | Create a new markdown document |

---

## 4. Rollout & Monitoring Checklist
- [ ] Implement database migrations
- [ ] Add unit and end-to-end tests
- [ ] Deploy to production environment
`,
  },
  {
    name: 'Meeting Notes',
    icon: Users,
    description: 'Attendees, agenda, decisions, and action items',
    title: 'Meeting Notes: Sprint Planning',
    folder: 'Meetings',
    tags: ['notes', 'planning', 'sprint'],
    content: `# Meeting Notes: Sprint Planning 🗓️

- **Date**: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
- **Attendees**: Silvio, Engineering Team
- **Facilitator**: Lead Architect

---

## 🎯 Key Objectives
1. Review roadmap deliverables for upcoming sprint
2. Resolve open blockers in document sharing flow

---

## 📝 Key Discussions & Decisions
- Decided to adopt built-in SQLite with FTS5 for zero-latency local search.
- Agreed on read-only public viewer format for shared links.

---

## 🚀 Action Items
- [ ] Finalize markdown upload parser
- [ ] Test link copying across browsers
- [ ] Share meeting recap with broader team
`,
  },
];

export default function NewDocumentPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [initialDoc, setInitialDoc] = useState<Document>({
    id: '',
    slug: '',
    title: '',
    content: '',
    tags: [],
    folder: '',
    isPublic: true,
    shareToken: '',
    viewCount: 0,
    createdAt: '',
    updatedAt: '',
  });

  const handleSelectTemplate = (index: number) => {
    const t = TEMPLATES[index];
    setSelectedTemplate(index);
    setInitialDoc({
      ...initialDoc,
      title: t.title,
      folder: t.folder,
      tags: t.tags,
      content: t.content,
    });
  };

  const handleSave = async (data: {
    title: string;
    content: string;
    tags: string[];
    folder: string;
    isPublic: boolean;
  }): Promise<Document | null> => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success && json.document) {
        // Redirect to newly created document
        router.push(`/doc/${json.document.id}`);
        return json.document;
      }
      return null;
    } catch (err) {
      console.error('Failed to create document:', err);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 flex flex-col">
      <Navbar />

      {/* Quick Template Selector Header */}
      {selectedTemplate === null && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 pt-8 pb-4">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Choose a starting template or start writing below</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((tmpl, idx) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleSelectTemplate(idx)}
                  className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm text-left transition-all cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {tmpl.name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {tmpl.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <MarkdownEditor
          key={selectedTemplate ?? 'blank'}
          initialDocument={initialDoc}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

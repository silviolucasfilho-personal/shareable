import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MermaidRenderer from './MermaidRenderer';
import MarkdownRenderer from './MarkdownRenderer';

// Mock mermaid module
vi.mock('mermaid', () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn().mockImplementation(async (id: string, text: string) => {
        if (text.includes('INVALID_SYNTAX')) {
          throw new Error('Parse error on line 1');
        }
        return {
          svg: `<svg id="${id}" data-testid="mock-mermaid-svg"><text>Mock Diagram: ${text}</text></svg>`,
          bindFunctions: vi.fn(),
        };
      }),
    },
  };
});

describe('MermaidRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders toolbar with Mermaid label, Diagram and Code tabs', async () => {
    render(<MermaidRenderer code="flowchart TD\n  A --> B" />);

    expect(screen.getByText('Mermaid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^diagram$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^code$/i })).toBeInTheDocument();
  });

  it('renders the SVG diagram on successful mermaid render', async () => {
    render(<MermaidRenderer code="flowchart TD\n  A --> B" />);

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
    });
  });

  it('switches between Diagram and Code views', async () => {
    const code = 'flowchart TD\n  Start --> Stop';
    render(<MermaidRenderer code={code} />);

    // Initially on Diagram tab
    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
    });

    // Switch to Code tab
    fireEvent.click(screen.getByRole('button', { name: /^code$/i }));
    expect(screen.getByText(/Start --> Stop/)).toBeInTheDocument();

    // Switch back to Diagram tab
    fireEvent.click(screen.getByRole('button', { name: /^diagram$/i }));
    expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
  });

  it('handles rendering error gracefully and displays error alert', async () => {
    render(<MermaidRenderer code="INVALID_SYNTAX" />);

    await waitFor(() => {
      expect(screen.getByText('Unable to render diagram')).toBeInTheDocument();
      expect(screen.getByText(/Parse error on line 1/i)).toBeInTheDocument();
    });
  });

  it('copies code when clicking the copy button', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const code = 'sequenceDiagram\n  Alice->>Bob: Hello';
    render(<MermaidRenderer code={code} />);

    const copyBtn = screen.getByRole('button', { name: /copy mermaid code/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(code);
    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });
});

describe('MarkdownRenderer with Mermaid', () => {
  afterEach(() => {
    cleanup();
  });

  it('identifies and renders mermaid blocks using MermaidRenderer', async () => {
    const markdown = `# Architecture Spec\n\n\`\`\`mermaid\nflowchart TD\n  Client --> Server\n\`\`\`\n`;

    render(<MarkdownRenderer content={markdown} />);

    expect(screen.getByRole('heading', { name: 'Architecture Spec' })).toBeInTheDocument();
    expect(screen.getByText('Mermaid')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('mock-mermaid-svg')).toBeInTheDocument();
    });
  });
});

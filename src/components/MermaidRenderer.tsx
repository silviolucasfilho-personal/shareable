'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Workflow,
  Code,
  Eye,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

interface MermaidRendererProps {
  code: string;
  className?: string;
}

function useSafeTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setTheme(isDark ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          checkTheme();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

export default function MermaidRenderer({ code, className = '' }: MermaidRendererProps) {
  const theme = useSafeTheme();
  const rawId = useId();
  const cleanId = rawId.replace(/[^a-zA-Z0-9]/g, '');

  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diagram' | 'code'>('diagram');
  const [copied, setCopied] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const trimmedCode = code.trim();

  // Close fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const renderDiagram = async () => {
      if (!trimmedCode) {
        if (isMounted) {
          setLoading(false);
          setSvgContent('');
        }
        return;
      }

      const renderId = `mermaid-${cleanId}-${Math.random().toString(36).substring(2, 7)}`;

      try {
        const mermaidModule = await import('mermaid');
        const mermaid = mermaidModule.default || mermaidModule;

        const isDark = theme === 'dark';

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: isDark ? 'dark' : 'default',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          themeVariables: isDark
            ? {
                darkMode: true,
                background: '#171717',
                mainBkg: '#262626',
                nodeBorder: '#404040',
                clusterBkg: '#1f1f1f',
                clusterBorder: '#525252',
                textColor: '#f5f5f5',
                lineColor: '#9ca3af',
              }
            : {
                darkMode: false,
                background: '#ffffff',
                mainBkg: '#f8fafc',
                nodeBorder: '#cbd5e1',
                clusterBkg: '#f1f5f9',
                clusterBorder: '#94a3b8',
                textColor: '#0f172a',
                lineColor: '#64748b',
              },
        });

        const { svg, bindFunctions } = await mermaid.render(renderId, trimmedCode);

        if (isMounted) {
          setSvgContent(svg);
          setError(null);
          setLoading(false);

          if (bindFunctions && containerRef.current) {
            try {
              bindFunctions(containerRef.current);
            } catch (err) {
              console.warn('Mermaid bindFunctions warning:', err);
            }
          }
        }
      } catch (err: unknown) {
        // Clean up any stray DOM nodes created by mermaid on error
        const strayErrorEl = document.getElementById(`d${renderId}`);
        if (strayErrorEl) strayErrorEl.remove();
        const strayEl = document.getElementById(renderId);
        if (strayEl) strayEl.remove();

        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setError(errMsg);
          setLoading(false);
          setActiveTab('code'); // Automatically switch to code view so the user can inspect/edit
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [trimmedCode, theme, cleanId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(trimmedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <>
      <div
        className={`my-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm overflow-hidden ${className}`}
      >
        {/* Header bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700/60 text-xs">
          {/* Left badge & tabs */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
              <Workflow className="w-3.5 h-3.5 text-blue-500" />
              <span>Mermaid</span>
            </span>

            <div className="h-3.5 w-px bg-neutral-200 dark:bg-neutral-700 mx-1" />

            <div className="flex items-center bg-neutral-200/60 dark:bg-neutral-700/60 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('diagram')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'diagram'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="View Diagram"
              >
                <Eye className="w-3 h-3" />
                <span>Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
                title="View Source Code"
              >
                <Code className="w-3 h-3" />
                <span>Code</span>
              </button>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400">
            {activeTab === 'diagram' && !error && !loading && (
              <>
                {/* Zoom controls */}
                <div className="hidden sm:flex items-center gap-0.5 mr-1 border-r border-neutral-200 dark:border-neutral-700 pr-1">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                    title="Zoom Out"
                    aria-label="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-1.5 py-0.5 rounded text-[11px] font-mono hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    title="Reset Zoom"
                    aria-label="Reset Zoom"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 2.5}
                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 transition-colors"
                    title="Zoom In"
                    aria-label="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoom !== 1 && (
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      title="Reset"
                      aria-label="Reset Zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Download SVG */}
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  title="Download SVG"
                  aria-label="Download SVG"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* Fullscreen toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  title="Expand to Fullscreen"
                  aria-label="Expand to Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              title="Copy Mermaid Code"
              aria-label="Copy Mermaid Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-200 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Unable to render diagram</div>
                <div className="mt-0.5 font-mono text-[11px] opacity-80 break-words whitespace-pre-wrap">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        {activeTab === 'diagram' ? (
          <div className="relative min-h-[160px] bg-neutral-50/50 dark:bg-neutral-950/40">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-neutral-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Rendering diagram...</span>
              </div>
            ) : error ? (
              <div className="p-8 flex flex-col items-center justify-center text-center text-neutral-400 text-xs">
                <span>Diagram could not be rendered due to syntax error.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  View diagram code to fix
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto p-6 flex justify-center">
                <div
                  ref={containerRef}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center top',
                    transition: 'transform 0.15s ease-out',
                  }}
                  className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative bg-neutral-900 text-neutral-100 p-4 overflow-x-auto">
            <pre className="text-xs font-mono leading-relaxed text-neutral-200 whitespace-pre">
              <code>{trimmedCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-950 p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
                Mermaid Diagram (Fullscreen)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.5}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 ml-1"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                title="Download SVG"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                title="Close Fullscreen (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, FileCode, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.name.match(/\.(md|markdown|txt|html|htm)$/i)
      );
      if (files.length === 0) {
        setError('Please select valid Markdown (.md, .markdown), text (.txt), or HTML (.html, .htm) files.');
        return;
      }
      setSelectedFiles((prev) => [...prev, ...files]);
      setError(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((file) =>
        file.name.match(/\.(md|markdown|txt|html|htm)$/i)
      );
      if (files.length === 0) {
        setError('Please select valid Markdown (.md, .markdown), text (.txt), or HTML (.html, .htm) files.');
        return;
      }
      setSelectedFiles((prev) => [...prev, ...files]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('files', file));
      if (folderName.trim()) {
        formData.append('folder', folderName.trim());
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload files');
      }

      setSuccessCount(data.count);
      setSelectedFiles([]);
      setFolderName('');
      setTimeout(() => {
        setSuccessCount(null);
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Import Documents
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Upload Markdown (.md) or HTML (.html) files into your repository
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-neutral-200 dark:border-neutral-800 hover:border-blue-400 dark:hover:border-blue-600 bg-neutral-50/50 dark:bg-neutral-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.markdown,.txt,.html,.htm"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-600 dark:text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Click to browse or drag and drop files here
            </div>
            <p className="text-xs text-neutral-500">Supports .md, .markdown, .txt, .html, .htm</p>
          </div>
        </div>

        {/* Destination folder */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Assign Folder (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Documentation, Notes, Guides"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successCount !== null && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully imported {successCount} document(s)!</span>
          </div>
        )}

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Files to import ({selectedFiles.length})
            </div>
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {file.name.match(/\.(html|htm)$/i) ? (
                    <FileCode className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                  <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                    {file.name}
                  </span>
                  <span className="text-neutral-400 text-[11px] shrink-0">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

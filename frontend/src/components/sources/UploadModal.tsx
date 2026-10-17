'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Globe,
  Search,
  Zap,
  ChevronDown,
  Link as LinkIcon,
  HardDrive,
  Play,
  Clipboard,
  ArrowLeft
} from 'lucide-react';
import { uploadSourceFile, Source, fetchNotebookSources } from '@/modules/sources/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
  onUploadSuccess: (newSource: Source) => void;
}

const rotatingTexts = ["your documents", "your notes", "your research", "your links", "YouTube videos"];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  notebookId,
  onUploadSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sourceCount, setSourceCount] = useState<number>(0);
  const [textIndex, setTextIndex] = useState(0);
  const [activeView, setActiveView] = useState<'main' | 'website' | 'text' | 'drive' | 'play_books'>('main');
  
  // Inputs for sub-views
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');

  // Fetch source count
  useEffect(() => {
    if (isOpen) {
      fetchNotebookSources(notebookId)
        .then(sources => setSourceCount(sources.length))
        .catch(err => console.error('Failed to fetch sources count:', err));
    }
  }, [isOpen, notebookId]);

  // Rotating text animation
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTextIndex(prev => (prev + 1) % rotatingTexts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setActiveView('main');
    setError(null);
    setSuccessMsg(null);
    setUrlInput('');
    setTextInput('');
    onClose();
  };

  const uploadFileObj = async (file: File) => {
    setError(null);
    setSuccessMsg(null);

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds 25MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      const newSource = await uploadSourceFile(notebookId, file);
      setSuccessMsg(`Source '${file.name}' added successfully!`);
      setSourceCount(prev => prev + 1);
      onUploadSuccess(newSource);
      setTimeout(() => {
        setIsUploading(false);
        setSuccessMsg(null);
        handleClose();
      }, 1000);
    } catch (err: any) {
      setIsUploading(false);
      setError(err.message || 'Failed to add source.');
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const allowed = ['.pdf', '.txt', '.docx', '.md', '.markdown'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type '${ext}'. Please upload PDF, TXT, DOCX, or Markdown files.`);
      return;
    }

    await uploadFileObj(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    // Mocking website fetch by creating a text file
    const file = new File([urlInput], 'website_url.txt', { type: 'text/plain' });
    await uploadFileObj(file);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    const file = new File([textInput], 'copied_text.txt', { type: 'text/plain' });
    await uploadFileObj(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      {/* Modal Container */}
      <div className="bg-notebook-card rounded-[24px] max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-6 relative border border-notebook-border/50 overflow-hidden">

        {/* Glow effect in background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-0 left-1/4 w-96 h-48 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-notebook-muted hover:text-notebook-text rounded-full transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {activeView === 'main' && (
          <div className="space-y-6 relative z-10">
            {/* Header / Dynamic Text */}
            <div className="text-center pt-2">
              <h2 className="text-lg sm:text-[22px] font-normal text-notebook-text">
                Create Audio and Video Overviews from
              </h2>
              <div className="h-8 overflow-hidden relative mt-1">
                <div 
                  className="absolute w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ transform: `translateY(-${textIndex * 32}px)` }}
                >
                  {rotatingTexts.map((text, i) => (
                    <div 
                      key={i} 
                      className="h-8 flex items-center justify-center text-[22px] font-normal bg-gradient-to-r from-blue-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input Area */}
            <div className="mx-2 border border-notebook-border focus-within:border-[#a8c7fa]/40 rounded-2xl bg-notebook-bg/50 shadow-inner transition-colors overflow-hidden">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search the web for new sources"
                  className="w-full bg-transparent py-3.5 pl-4 pr-12 text-sm outline-none text-notebook-text placeholder:text-notebook-muted/60"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-notebook-muted" />
              </div>
              <div className="flex flex-wrap items-center gap-2 px-3 pb-3 pt-1">
                <button className="flex items-center space-x-1.5 text-xs text-notebook-text bg-notebook-hover hover:bg-notebook-active px-3 py-1.5 rounded-full transition-colors font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web</span>
                  <ChevronDown className="w-3 h-3 text-notebook-muted ml-1" />
                </button>
                <button className="flex items-center space-x-1.5 text-xs text-notebook-text bg-notebook-hover hover:bg-notebook-active px-3 py-1.5 rounded-full transition-colors font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fast research</span>
                  <ChevronDown className="w-3 h-3 text-notebook-muted ml-1" />
                </button>
              </div>
            </div>

            {/* Source Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full px-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx,.md,.markdown"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-notebook-hover hover:bg-notebook-active border border-notebook-border/50 px-5 py-2.5 rounded-full text-[13px] font-medium text-notebook-text transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-notebook-text" />
                <span>Upload files</span>
              </button>
              <button
                onClick={() => setActiveView('website')}
                className="flex items-center space-x-2 bg-notebook-hover hover:bg-notebook-active border border-notebook-border/50 px-5 py-2.5 rounded-full text-[13px] font-medium text-notebook-text transition-colors"
              >
                <LinkIcon className="w-4 h-4 text-rose-400" />
                <span>Websites</span>
              </button>
              <button
                onClick={() => setActiveView('play_books')}
                className="flex items-center space-x-2 bg-notebook-hover hover:bg-notebook-active border border-notebook-border/50 px-5 py-2.5 rounded-full text-[13px] font-medium text-notebook-text transition-colors"
              >
                <Play className="w-4 h-4 fill-blue-500 text-blue-500" />
                <span>Play Books</span>
              </button>
              <button
                onClick={() => setActiveView('drive')}
                className="flex items-center space-x-2 bg-notebook-hover hover:bg-notebook-active border border-notebook-border/50 px-5 py-2.5 rounded-full text-[13px] font-medium text-notebook-text transition-colors"
              >
                <HardDrive className="w-4 h-4 text-notebook-text" />
                <span>Drive</span>
              </button>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => setActiveView('text')}
                className="flex items-center space-x-2 bg-notebook-hover hover:bg-notebook-active border border-notebook-border/50 px-5 py-2.5 rounded-full text-[13px] font-medium text-notebook-text transition-colors"
              >
                <Clipboard className="w-4 h-4 text-notebook-muted" />
                <span>Copied text</span>
              </button>
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mx-2 border border-dashed rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center text-center transition-all relative ${
                isDragging
                  ? 'border-[#a8c7fa] bg-[#a8c7fa]/5 scale-[1.01]'
                  : 'border-notebook-border/80 bg-notebook-bg/30'
              }`}
            >
              {isUploading && (
                <div className="absolute inset-0 bg-notebook-card/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
                  <Loader2 className="w-8 h-8 animate-spin text-[#a8c7fa] mb-2" />
                  <span className="text-sm text-notebook-text">Processing source...</span>
                </div>
              )}

              <UploadCloud className="w-6 h-6 text-notebook-muted mb-3" />
              <div className="text-[15px] text-notebook-text font-normal mb-1">Drag and drop your files to upload.</div>
              <div className="text-sm text-notebook-muted">
                Supported file types: PDF, images, docs, audio <span className="underline cursor-pointer hover:text-notebook-text transition-colors">and more.</span>
              </div>
            </div>

            {/* Source Count Progress */}
            <div className="px-3 pt-2">
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-1.5 bg-notebook-hover rounded-full overflow-hidden">
                  <div
                    className="h-full bg-notebook-active rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((sourceCount / 300) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs font-medium text-notebook-muted w-10 text-right">
                  {sourceCount}/300
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Sub-views --- */}
        {activeView !== 'main' && (
          <div className="relative z-10 space-y-4 pt-4">
            <button 
              onClick={() => setActiveView('main')}
              className="flex items-center space-x-2 text-sm text-notebook-muted hover:text-notebook-text transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {activeView === 'website' && (
              <div className="space-y-4">
                <h3 className="text-lg text-notebook-text font-medium">Add a Website</h3>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  className="w-full bg-notebook-bg border border-notebook-border rounded-xl px-4 py-3 text-sm text-notebook-text focus:border-[#a8c7fa]/60 outline-none"
                />
                <button 
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim() || isUploading}
                  className="bg-[#004a77] hover:bg-[#004a77]/80 disabled:opacity-50 disabled:hover:bg-[#004a77] text-[#a8c7fa] px-6 py-2.5 rounded-lg text-sm font-medium transition-colors w-full flex justify-center items-center"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Website'}
                </button>
              </div>
            )}

            {activeView === 'text' && (
              <div className="space-y-4">
                <h3 className="text-lg text-notebook-text font-medium">Add Copied Text</h3>
                <textarea
                  placeholder="Paste your text here..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  className="w-full bg-notebook-bg border border-notebook-border rounded-xl px-4 py-3 text-sm text-notebook-text focus:border-[#a8c7fa]/60 outline-none min-h-[200px] resize-none"
                />
                <button 
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim() || isUploading}
                  className="bg-[#004a77] hover:bg-[#004a77]/80 disabled:opacity-50 disabled:hover:bg-[#004a77] text-[#a8c7fa] px-6 py-2.5 rounded-lg text-sm font-medium transition-colors w-full flex justify-center items-center"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Text'}
                </button>
              </div>
            )}

            {(activeView === 'drive' || activeView === 'play_books') && (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-notebook-hover flex items-center justify-center mx-auto">
                  {activeView === 'drive' ? <HardDrive className="w-6 h-6 text-notebook-text" /> : <Play className="w-6 h-6 text-blue-500" />}
                </div>
                <h3 className="text-lg text-notebook-text font-medium">
                  Connect to {activeView === 'drive' ? 'Google Drive' : 'Play Books'}
                </h3>
                <p className="text-sm text-notebook-muted max-w-sm mx-auto">
                  This integration requires OAuth setup. For the scope of this update, this acts as a functional UI placeholder.
                </p>
                <button 
                  onClick={() => setActiveView('main')}
                  className="text-[#a8c7fa] hover:opacity-80 text-sm font-medium"
                >
                  Return to options
                </button>
              </div>
            )}
          </div>
        )}

        {/* Global Alerts */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2 z-50">
          {error && (
            <div className="bg-rose-500/90 backdrop-blur border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 text-white text-xs shadow-lg animate-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-500/90 backdrop-blur border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-2 text-white text-xs shadow-lg animate-in slide-in-from-bottom-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

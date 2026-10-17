'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  SlidersHorizontal,
  MoreVertical,
  ArrowUp,
  Sparkles,
  BookOpen,
  Compass,
  Loader2,
  Copy,
  Check,
  Plus,
  MessageSquare,
  FileText,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  BookmarkPlus,
} from 'lucide-react';
import {
  sendChatMessage,
  fetchNotebookConversations,
  fetchConversationHistory,
  startNewConversation,
  Citation,
  Conversation,
} from '@/modules/chat/api';
import { createNote } from '@/modules/notes/api';
import { Tooltip } from '@/components/ui/Tooltip';
import { fetchNotebookSummary, NotebookSummary, Notebook } from '@/modules/notebooks/api';
import { CustomiseNotebookModal } from '../layout/CustomiseNotebookModal';
import { ModelSettingsModal, ModelSettings } from './ModelSettingsModal';

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-notebook-text">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

interface ChatPanelProps {
  sourcesCount: number;
  notebookId?: string;
  notebook?: Notebook | null;
  onNotebookUpdated?: (notebook: Notebook) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  sources_used?: string[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  sourcesCount,
  notebookId = 'default_notebook_1',
  notebook,
  onNotebookUpdated,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [summary, setSummary] = useState<NotebookSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [isCustomiseOpen, setIsCustomiseOpen] = useState(false);
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    modelName: 'Gemini 2.5 Flash',
    temperature: 0.7,
    maxTokens: 4096,
    systemPromptPreset: 'default',
    topP: 0.95,
  });

  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveToNote = async (text: string, msgId: string) => {
    try {
      const clean = text.replace(/[#*`_]/g, '').trim();
      const title = clean.slice(0, 30) + (clean.length > 30 ? '...' : '');
      await createNote(notebookId, title || 'Chat Note', text);
      setSavedNoteMsgId(msgId);
      setTimeout(() => setSavedNoteMsgId(null), 2500);
    } catch (err) {
      console.error('Failed to save to note:', err);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the bottom whenever a new message arrives or loading changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Re-focus the input box once loading finishes
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  // Load (or generate) the notebook's auto-summary; refetches when sources change
  useEffect(() => {
    if (sourcesCount === 0) {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    fetchNotebookSummary(notebookId)
      .then(setSummary)
      .catch((err) => console.error('Failed to load notebook summary:', err))
      .finally(() => setSummaryLoading(false));
  }, [notebookId, sourcesCount, summaryRefreshKey]);

  // Load conversations on mount
  useEffect(() => {
    async function loadConvs() {
      try {
        const convs = await fetchNotebookConversations(notebookId);
        setConversations(convs);
        if (convs.length > 0 && !activeConversationId) {
          setActiveConversationId(convs[0].id);
          const history = await fetchConversationHistory(notebookId, convs[0].id);
          setMessages(
            history.map((m) => ({
              id: m.id,
              sender: m.role,
              text: m.content,
              citations: m.citations,
              sources_used: m.sources_used,
            }))
          );
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    }
    loadConvs();
  }, [notebookId]);

  const handleNewChat = async () => {
    try {
      const newConv = await startNewConversation(notebookId);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || inputPrompt;
    if (!promptToUse.trim() || loading) return;

    const userText = promptToUse.trim();
    const userMsgId = Date.now().toString();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: userText },
    ]);

    if (!overridePrompt) {
      setInputPrompt('');
      // Focus input immediately after clearing so cursor is ready
      inputRef.current?.focus();
    }
    setLoading(true);

    try {
      const response = await sendChatMessage(
        notebookId,
        userText,
        activeConversationId || undefined
      );

      if (response.conversation_id && response.conversation_id !== activeConversationId) {
        setActiveConversationId(response.conversation_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: response.answer,
          citations: response.citations,
          sources_used: response.sources_used,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Error: ${err.message || 'Failed to process RAG chat request.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <main className="flex-1 bg-notebook-bg flex flex-col h-full relative overflow-hidden select-none">
      {/* Discreet Chat Controls Bar */}
      <div className="h-9 px-6 flex items-center justify-end space-x-2 shrink-0">
        <Tooltip content="Start a new chat thread" position="bottom">
          <button
            onClick={handleNewChat}
            className="flex items-center space-x-1 text-xs text-notebook-muted hover:text-notebook-text px-2.5 py-1 rounded-full hover:bg-notebook-hover/60 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New chat</span>
          </button>
        </Tooltip>
        <Tooltip content="Adjust AI parameters" position="left">
          <button
            onClick={() => setIsModelSettingsOpen(true)}
            className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover/60 rounded-full transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </Tooltip>
      </div>

      {/* Main Canvas Scrollable Area */}
      <div ref={scrollContainerRef} className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col space-y-6">
        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Auto-generated notebook summary card */}
          {summaryLoading && !summary && (
            <div className="bg-notebook-card/60 border border-notebook-border/80 rounded-2xl p-5 flex items-center space-x-3 text-xs text-notebook-muted">
              <Loader2 className="w-4 h-4 animate-spin text-[#a8c7fa]" />
              <span>Generating notebook overview...</span>
            </div>
          )}
          {summary && (
            <div className="bg-notebook-card/60 border border-notebook-border/80 rounded-2xl overflow-hidden shadow-md">
              {notebook?.cover_image && (
                <div className="w-full h-32 relative">
                  <img src={notebook.cover_image} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setIsCustomiseOpen(true)}
                    className="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/60 hover:bg-black/80 text-white text-[11px] px-2.5 py-1.5 rounded-full transition-colors backdrop-blur"
                  >
                    <span>Customise</span>
                  </button>
                </div>
              )}
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-notebook-bg border border-notebook-border flex items-center justify-center text-sky-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  {!notebook?.cover_image && (
                    <button
                      onClick={() => setIsCustomiseOpen(true)}
                      className="flex items-center space-x-1.5 bg-notebook-bg hover:bg-notebook-hover border border-notebook-border text-[11px] text-notebook-muted hover:text-notebook-text px-2.5 py-1.5 rounded-full transition-colors"
                    >
                      <span>Customise</span>
                    </button>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-notebook-text">{summary.title}</h2>
                  <p className="text-[11px] text-notebook-muted mt-0.5">
                    {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
                  </p>
                </div>
              <p className="text-xs md:text-sm text-notebook-text leading-relaxed">
                {renderBoldText(summary.summary)}
              </p>
              <div className="flex items-center space-x-1 pt-1">
                <button
                  onClick={() => handleCopyText(summary.summary, -1)}
                  className="p-1.5 text-notebook-muted hover:text-notebook-text rounded transition-colors"
                  title="Copy"
                >
                  {copiedIndex === -1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setFeedback((prev) => ({ ...prev, summary: 'up' }))}
                  className={`p-1.5 rounded transition-colors ${feedback.summary === 'up' ? 'text-emerald-400' : 'text-notebook-muted hover:text-notebook-text'}`}
                  title="Good content"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFeedback((prev) => ({ ...prev, summary: 'down' }))}
                  className={`p-1.5 rounded transition-colors ${feedback.summary === 'down' ? 'text-rose-400' : 'text-notebook-muted hover:text-notebook-text'}`}
                  title="Bad content"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="max-w-xl w-full mx-auto text-center space-y-6 animate-fadeIn py-6">
              {!summary && (
                <>
                  <div className="text-4xl">👋</div>
                  <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-semibold text-notebook-text tracking-tight">
                      Let's start your notebook...
                    </h1>
                    <p className="text-xs md:text-sm text-notebook-muted leading-relaxed max-w-md mx-auto">
                      Ask questions about your uploaded documents or explore concepts. Your AI knowledge assistant is grounded in your sources.
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-notebook-text">
                  What would you like this notebook to help you do?
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-lg mx-auto">
                  <button
                    onClick={() => handleSend('Summarize the key findings from my uploaded sources.')}
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-[#a8c7fa]/40 transition-all flex items-center justify-center space-x-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Summarize key findings</span>
                  </button>

                  <button
                    onClick={() => handleSend('What are the main concepts discussed in this notebook?')}
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-[#a8c7fa]/40 transition-all flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                    <span>Explain main concepts</span>
                  </button>

                  <button
                    onClick={() => handleSend('Create a study overview based on my sources.')}
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-[#a8c7fa]/40 transition-all flex items-center justify-center space-x-2"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Create study overview</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {messages.map((msg, idx) => (
                <div key={msg.id} className="space-y-3">
                  {idx === 0 && (
                    <div className="text-center text-[11px] text-notebook-subtle my-3 font-normal">
                      Today · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}

                  {msg.sender === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-notebook-card text-notebook-text text-xs md:text-sm rounded-full px-5 py-2.5 max-w-[80%] border border-notebook-border/50 shadow-sm">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-[95%]">
                      {/* NotebookLM Thoughts accordion */}
                      <button
                        onClick={() => toggleThoughts(msg.id)}
                        className="flex items-center space-x-1.5 text-xs text-notebook-muted hover:text-notebook-text transition-colors py-0.5 group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full border border-notebook-muted group-hover:border-[#a8c7fa]" />
                        <span className="font-medium text-xs">Thoughts</span>
                        <ChevronDown className={`w-3 h-3 text-notebook-muted transition-transform duration-150 ${expandedThoughts[msg.id] ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedThoughts[msg.id] && (
                        <div className="text-xs text-notebook-subtle bg-notebook-card/60 border border-notebook-border/40 rounded-xl p-3 leading-relaxed">
                          Grounded in {sourcesCount} active source{sourcesCount !== 1 ? 's' : ''}. Analyzing document chunks and contextual embeddings...
                        </div>
                      )}

                      <div className="text-xs md:text-sm text-notebook-text leading-relaxed space-y-2 [&_strong]:font-semibold [&_strong]:text-notebook-text [&_em]:text-notebook-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {/* Action buttons matching NotebookLM */}
                      <div className="flex items-center space-x-1.5 pt-1 text-notebook-muted">
                        <button
                          onClick={() => handleSaveToNote(msg.text, msg.id)}
                          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs hover:text-notebook-text hover:bg-notebook-hover/60 rounded-full transition-colors"
                          title="Save to note"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>{savedNoteMsgId === msg.id ? 'Saved to note!' : 'Save to note'}</span>
                        </button>

                        <button
                          onClick={() => handleCopyText(msg.text, idx)}
                          className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover/60 rounded-full transition-colors"
                          title="Copy"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: 'up' }))}
                          className={`p-1.5 rounded-full transition-colors hover:bg-notebook-hover/60 ${feedback[msg.id] === 'up' ? 'text-emerald-400' : 'hover:text-notebook-text'}`}
                          title="Good content"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: 'down' }))}
                          className={`p-1.5 rounded-full transition-colors hover:bg-notebook-hover/60 ${feedback[msg.id] === 'down' ? 'text-rose-400' : 'hover:text-notebook-text'}`}
                          title="Bad content"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="bg-notebook-card/60 border border-notebook-border/80 rounded-2xl p-4 mr-auto max-w-md flex items-center space-x-3 text-xs text-notebook-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-[#a8c7fa]" />
                  <span>Searching knowledge base & generating grounded answer...</span>
                </div>
              )}
              {/* Sentinel element — always scrolled into view on new messages */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Input Bar — floating pill without top border */}
      <div className="p-4 md:px-8 pb-3 bg-transparent shrink-0">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="bg-notebook-card rounded-full p-2 pl-6 pr-2 border border-notebook-border hover:border-notebook-active transition-all flex items-center shadow-lg">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question or create something"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              className="flex-1 bg-transparent text-notebook-text text-xs md:text-sm focus:outline-none placeholder:text-notebook-subtle disabled:opacity-50"
            />

            <div className="flex items-center space-x-2.5">
              <span className="text-[11px] font-medium text-notebook-muted bg-notebook-bg px-3 py-1 rounded-full">
                {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
              </span>

              <button
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || loading}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  inputPrompt.trim() && !loading
                    ? 'bg-[#1a6fa8] text-white hover:bg-[#15587f]'
                    : 'bg-notebook-hover text-notebook-subtle cursor-not-allowed'
                }`}
                title="Submit"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-center text-notebook-subtle">
            Gemini Notebook can make mistakes, so double-check it.
          </p>
        </div>
      </div>

      {isCustomiseOpen && notebook && (
        <CustomiseNotebookModal
          notebook={notebook}
          onClose={() => setIsCustomiseOpen(false)}
          onSaved={(updated) => {
            onNotebookUpdated?.(updated);
            setSummaryRefreshKey((k) => k + 1);
          }}
        />
      )}

      {isModelSettingsOpen && (
        <ModelSettingsModal
          currentSettings={modelSettings}
          onClose={() => setIsModelSettingsOpen(false)}
          onSave={(newSettings) => setModelSettings(newSettings)}
        />
      )}
    </main>
  );
};

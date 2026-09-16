'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  sendChatMessage,
  fetchNotebookConversations,
  fetchConversationHistory,
  startNewConversation,
  Citation,
  Conversation,
} from '@/modules/chat/api';
import { fetchNotebookSummary, NotebookSummary, Notebook } from '@/modules/notebooks/api';
import { CustomiseNotebookModal } from '../layout/CustomiseNotebookModal';

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
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
    <main className="flex-1 bg-[#131518] flex flex-col h-full relative overflow-hidden select-none">
      {/* Chat Top Header */}
      <div className="h-12 border-b border-notebook-border/50 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-notebook-text font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Chat</span>
          </h2>

          <button
            onClick={handleNewChat}
            className="flex items-center space-x-1 text-xs bg-notebook-card hover:bg-notebook-hover text-notebook-text px-2.5 py-1 rounded-lg border border-notebook-border transition-colors"
          >
            <Plus className="w-3 h-3 text-indigo-400" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 text-notebook-muted">
          <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scrollable Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col space-y-6">
        <div className="w-full max-w-3xl mx-auto space-y-6">
          {/* Auto-generated notebook summary card */}
          {summaryLoading && !summary && (
            <div className="bg-notebook-card/60 border border-notebook-border/80 rounded-2xl p-5 flex items-center space-x-3 text-xs text-notebook-muted">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
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
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-indigo-500/50 transition-all flex items-center justify-center space-x-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Summarize key findings</span>
                  </button>

                  <button
                    onClick={() => handleSend('What are the main concepts discussed in this notebook?')}
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-indigo-500/50 transition-all flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Explain main concepts</span>
                  </button>

                  <button
                    onClick={() => handleSend('Create a study overview based on my sources.')}
                    className="w-full sm:w-auto bg-notebook-card hover:bg-notebook-hover text-notebook-text text-xs px-4 py-2 rounded-full border border-notebook-border hover:border-indigo-500/50 transition-all flex items-center justify-center space-x-2"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Create study overview</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-5">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {msg.sender === 'user' ? (
                    <div className="bg-notebook-card text-notebook-text text-xs md:text-sm rounded-2xl px-4 py-3 ml-auto max-w-[80%] w-fit">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-[95%]">
                      <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-purple-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Recall AI Assistant</span>
                      </div>
                      <div className="text-xs md:text-sm text-notebook-text leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopyText(msg.text, idx)}
                          className="p-1.5 text-notebook-muted hover:text-notebook-text rounded transition-colors"
                          title="Copy"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: 'up' }))}
                          className={`p-1.5 rounded transition-colors ${feedback[msg.id] === 'up' ? 'text-emerald-400' : 'text-notebook-muted hover:text-notebook-text'}`}
                          title="Good content"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFeedback((prev) => ({ ...prev, [msg.id]: 'down' }))}
                          className={`p-1.5 rounded transition-colors ${feedback[msg.id] === 'down' ? 'text-rose-400' : 'text-notebook-muted hover:text-notebook-text'}`}
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
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                  <span>Searching knowledge base & generating grounded answer...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Input Bar */}
      <div className="p-4 md:px-8 border-t border-notebook-border/40 bg-notebook-bg">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="bg-notebook-card rounded-full p-2 pl-5 pr-2 border border-notebook-border hover:border-notebook-subtle transition-all flex items-center shadow-lg">
            <input
              type="text"
              placeholder="Ask a question or create something"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              className="flex-1 bg-transparent text-notebook-text text-xs md:text-sm focus:outline-none placeholder:text-notebook-subtle disabled:opacity-50"
            />

            <div className="flex items-center space-x-3">
              <span className="text-[11px] font-medium text-notebook-muted bg-notebook-bg px-2.5 py-1 rounded-full border border-notebook-border">
                {sourcesCount} source{sourcesCount !== 1 ? 's' : ''}
              </span>

              <button
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || loading}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  inputPrompt.trim() && !loading
                    ? 'bg-notebook-text text-notebook-bg hover:scale-105'
                    : 'bg-notebook-border text-notebook-subtle cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <p className="text-[10px] text-center text-notebook-subtle">
            Recall AI Notebook can be inaccurate; answers are grounded strictly in your uploaded sources.
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
    </main>
  );
};

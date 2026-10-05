import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Menu,
  FileText,
  LogIn
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer.tsx';
import { ThemeMode, THEMES } from '../types/theme.ts';
import { getTimeGreeting } from '../utils/greeting.ts';
import { User } from '../types/auth.ts';
import { MaddyLogo } from './MaddyLogo.tsx';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  sources?: SourceCitation[];
}

export interface SourceCitation {
  document_id: string;
  filename: string;
  chunk_index: number;
  page: number;
  snippet: string;
  score: number;
}

interface ChatWindowProps {
  messages: Message[];
  conversationTitle: string;
  useRag: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onRegenerate: () => Promise<void>;
  onStopStreaming: () => void;
  isStreaming: boolean;
  isLoading: boolean;
  onToggleSidebar: () => void;
  theme: ThemeMode;
  user?: User | null;
  onOpenLogin?: () => void;
}

export function ChatWindow({
  messages,
  conversationTitle,
  onSendMessage,
  onRegenerate,
  onStopStreaming,
  isStreaming,
  isLoading,
  onToggleSidebar,
  theme,
  user,
  onOpenLogin,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const t = THEMES[theme];
  const isLight = theme === 'light';

  const timeGreeting = getTimeGreeting(user?.name);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;
    const text = input;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSourceExpand = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const samplePrompts = [
    {
      title: 'Company Policy Query 📚',
      query: "What is Acme Corporation's annual leave and remote office stipend policy based on our indexed documents?",
    },
    {
      title: 'Creative Brainstorming 💡',
      query: 'Can you help me brainstorm 4 creative and fun project ideas to showcase AI development skills?',
    },
    {
      title: 'RAG Pipeline Explanation 🚀',
      query: 'Can you explain how semantic vector search and RAG work together in simple, friendly terms?',
    },
    {
      title: 'Draft a Warm Message ✍️',
      query: 'Draft a warm, polite, and encouraging email to my engineering team celebrating a successful sprint launch.',
    },
  ];

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${t.bgMain} ${t.textPrimary}`}>
      {/* Top Header - Streamlined, Clean, Zero-Clutter */}
      <header
        className={`h-14 px-4 md:px-6 border-b ${t.border} ${t.bgSidebar} backdrop-blur-md flex items-center justify-between shrink-0 z-20`}
      >
        {/* Left: Mobile Sidebar Toggle + Logo & Breadcrumb */}
        <div className="flex items-center gap-2.5 truncate max-w-[70%]">
          <button
            onClick={onToggleSidebar}
            className={`md:hidden p-1.5 rounded-md ${t.textMuted} hover:${t.textPrimary} transition-colors`}
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs truncate">
            <MaddyLogo size="xs" rounded="md" />
            <span className={`font-bold ${t.accentText}`}>Maddy AI</span>
            <span className={t.textMuted} aria-hidden="true">
              /
            </span>
            <span className="font-medium truncate max-w-[280px]">
              {conversationTitle || 'New Chat'}
            </span>
          </div>
        </div>

        {/* Right: User / Optional Sign In */}
        <div className="flex items-center gap-2">
          {!user && onOpenLogin ? (
            <button
              onClick={onOpenLogin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                isLight
                  ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                  : 'bg-white/10 text-white border-white/15 hover:bg-white/15'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : user ? (
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'
            }`}>
              <span className={`w-2 h-2 rounded-full ${t.accent}`} />
              <span className="truncate max-w-[120px] font-medium">{user.name || user.email}</span>
            </div>
          ) : null}
        </div>
      </header>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 py-8">
            <div className="space-y-4 flex flex-col items-center">
              <MaddyLogo size="xl" rounded="full" className="shadow-2xl ring-4 ring-sky-400/30" />
              <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${t.textPrimary}`}>
                {timeGreeting.greeting} {timeGreeting.emoji}
              </h2>
              <p className={`text-xs md:text-sm ${t.textSecondary} max-w-md mx-auto leading-relaxed`}>
                {timeGreeting.subtext} I'm <strong className={`${t.accentText} font-semibold`}>Maddy AI</strong>, your friendly AI companion!
              </p>
            </div>

            {/* Starter Prompts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {samplePrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(item.query)}
                  className={`p-3.5 text-left rounded-xl border transition-all text-xs group ${
                    isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      : `${t.bgCard} ${t.border} hover:border-white/20 hover:shadow-xs`
                  }`}
                >
                  <div className={`font-semibold mb-1 group-hover:${t.accentText} transition-colors ${t.textPrimary}`}>
                    {item.title}
                  </div>
                  <div className={`text-[11px] line-clamp-2 leading-relaxed ${t.textMuted}`}>
                    {item.query}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              const hasSources = message.sources && message.sources.length > 0;
              const isSourcesOpen = !!expandedSources[message.id];

              return (
                <div
                  key={message.id}
                  className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                >
                  {!isUser && (
                    <MaddyLogo size="sm" rounded="lg" className="shrink-0 mt-0.5" />
                  )}

                  <div className={`space-y-2 max-w-[85%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Unboxed Meta Header for Assistant (Zero-Pill Discipline) */}
                    {!isUser && (
                      <div className={`flex items-center gap-2 text-[11px] ${t.textMuted}`}>
                        <span className={`font-semibold ${t.accentText}`}>Maddy AI</span>
                        <span aria-hidden="true">·</span>
                        <span>{hasSources ? 'Grounded with Verified Context' : 'Friendly Assistant'}</span>
                        {hasSources && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{message.sources!.length} sources</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div
                      className={`p-4 rounded-xl text-sm leading-relaxed ${
                        isUser ? t.userBubble : t.botBubble
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>

                    {/* Sources Citation Drawer */}
                    {!isUser && hasSources && (
                      <div
                        className={`w-full rounded-lg border text-xs overflow-hidden ${
                          isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-black/20 border-white/10'
                        }`}
                      >
                        <button
                          onClick={() => toggleSourceExpand(message.id)}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                            isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/5 text-white/90'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className={`w-3.5 h-3.5 ${t.accentText}`} />
                            <span className="font-medium">
                              Verified Sources ({message.sources!.length})
                            </span>
                            <span className="text-[11px] opacity-60 font-mono tabular-nums">
                              match: {(message.sources![0]?.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          {isSourcesOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isSourcesOpen && (
                          <div
                            className={`p-3 space-y-2 border-t ${
                              isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/30'
                            }`}
                          >
                            {message.sources!.map((source, sIdx) => (
                              <div
                                key={sIdx}
                                className={`p-2.5 rounded-md border text-xs space-y-1.5 ${
                                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className={`${t.accentText} font-medium truncate max-w-[220px]`}>
                                    {source.filename}
                                  </span>
                                  <span className={`${t.textMuted} tabular-nums`}>
                                    Chunk #{source.chunk_index} · Page {source.page}
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] font-mono leading-relaxed line-clamp-3 p-1.5 rounded ${
                                    isLight
                                      ? 'bg-white text-slate-700 border border-slate-200'
                                      : 'bg-black/30 text-white/90'
                                  }`}
                                >
                                  "{source.snippet}"
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Strip */}
                    {!isUser && (
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                            isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/60 hover:text-white'
                          }`}
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className={`w-3 h-3 ${t.accentText}`} />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span className="text-[11px]">
                            {copiedId === message.id ? 'Copied' : 'Copy'}
                          </span>
                        </button>

                        <button
                          onClick={onRegenerate}
                          disabled={isLoading || isStreaming}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors disabled:opacity-40 ${
                            isLight ? 'hover:bg-slate-200 text-slate-600' : 'hover:bg-white/10 text-white/60 hover:text-white'
                          }`}
                          title="Regenerate response"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="text-[11px]">Regenerate</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        isLight
                          ? 'bg-slate-200 border-slate-300 text-slate-700'
                          : 'bg-white/10 border-white/15 text-white'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Streaming Indicator */}
            {(isLoading || isStreaming) && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3.5 justify-start animate-in fade-in duration-100">
                <MaddyLogo size="sm" rounded="lg" className="shrink-0 animate-pulse" />
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    isLight ? 'bg-white border-slate-200 text-slate-600' : `${t.bgCard} ${t.border} text-white/80`
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${t.accent} animate-ping`} />
                  <span>Maddy AI is formulating a friendly response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Box Area - Streamlined and Clean */}
      <div className={`p-4 md:px-8 border-t ${t.border} ${t.bgSidebar} shrink-0`}>
        <div className="max-w-3xl mx-auto space-y-2">
          <form
            onSubmit={handleSubmit}
            className={`relative flex items-end gap-2 p-2 rounded-xl border transition-all ${
              isLight
                ? 'bg-white border-slate-300 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800'
                : `${t.bgInput} ${t.border} focus-within:border-violet-500/70 focus-within:ring-1 focus-within:ring-violet-500/30`
            }`}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message Maddy AI... (Ask anything 😊)"
              className={`flex-1 max-h-48 bg-transparent border-0 resize-none text-xs md:text-sm focus:outline-none py-1.5 px-2.5 leading-relaxed ${
                isLight ? 'text-slate-900 placeholder-slate-400' : `${t.textPrimary} placeholder-white/40`
              }`}
            />

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors shrink-0"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-lg transition-all shrink-0 ${
                  isLight
                    ? 'bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white'
                    : `${t.accent} ${t.accentHover} disabled:opacity-30 text-white shadow-xs`
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Subtext info */}
          <div className={`flex items-center justify-between px-2 text-[11px] ${t.textMuted}`}>
            <span>Press Enter to send · Shift+Enter for new line</span>
            <span className="font-mono tabular-nums">Maddy AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

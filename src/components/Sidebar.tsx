import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  X,
  Sparkles,
  Sun,
  Moon,
  Palette,
  Compass,
  LogOut,
  LogIn,
  User as UserIcon
} from 'lucide-react';
import { ThemeMode, THEMES } from '../types/theme.ts';
import { User } from '../types/auth.ts';
import { MaddyLogo } from './MaddyLogo.tsx';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  user: User | null;
  onLogout: () => void;
  onOpenLogin: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpenMobile,
  onCloseMobile,
  theme,
  onThemeChange,
  user,
  onLogout,
  onOpenLogin,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const t = THEMES[theme];

  // Filter conversations by title
  const filteredConversations = conversations.filter((c) =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLight = theme === 'light';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 flex flex-col border-r transition-all duration-200 ease-out select-none ${
          t.bgSidebar
        } ${t.border} ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand / Top Zone: Maddy AI */}
        <div className={`p-4 border-b ${t.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <MaddyLogo size="sm" rounded="lg" />
            <div>
              <div className={`text-sm font-bold tracking-tight ${t.textPrimary}`}>
                Maddy AI
              </div>
              <div className={`text-[11px] ${t.textMuted} flex items-center gap-1.5`}>
                <span>Your Friendly Assistant</span>
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className={`p-1 rounded-md md:hidden ${t.textMuted} hover:${t.textPrimary}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium border transition-all shadow-xs ${
              isLight
                ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </span>
            <span className="text-[10px] opacity-70 font-mono">⌘K</span>
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pb-2">
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : 'bg-black/20 border-white/10 text-white/90'
            }`}
          >
            <Search className={`w-3.5 h-3.5 ${t.textMuted}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent border-0 text-xs focus:outline-none w-full placeholder:opacity-50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={t.textMuted}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations History List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          <div className={`px-2 py-1 text-[11px] font-semibold tracking-wider uppercase ${t.textMuted}`}>
            Conversations ({filteredConversations.length})
          </div>

          {filteredConversations.length === 0 ? (
            <div className={`px-3 py-6 text-center text-xs ${t.textMuted}`}>
              {searchQuery ? 'No matching conversations' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((convo) => {
              const isActive = convo.id === activeId;
              return (
                <div
                  key={convo.id}
                  onClick={() => {
                    onSelectConversation(convo.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? isLight
                        ? 'bg-slate-100 text-slate-900 font-medium'
                        : 'bg-white/15 text-white font-medium shadow-xs'
                      : isLight
                      ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? t.accentText : t.textMuted}`} />
                    <span className="truncate">{convo.title || 'Untitled chat'}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(convo.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-opacity ${t.textMuted}`}
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Account Tile (Optional Login) */}
        {user ? (
          <div className={`p-3 border-t ${t.border} flex items-center justify-between text-xs`}>
            <div className="flex items-center gap-2.5 truncate mr-2">
              <div className={`w-7 h-7 rounded-full ${t.accent} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="truncate">
                <div className={`text-xs font-medium truncate ${t.textPrimary}`}>
                  {user.name || 'User'}
                </div>
                <div className={`text-[10px] truncate ${t.textMuted}`}>{user.email}</div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className={`p-1.5 rounded-md hover:bg-white/10 ${t.textMuted} hover:text-red-400 transition-colors shrink-0`}
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className={`p-3 border-t ${t.border}`}>
            <button
              onClick={onOpenLogin}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                  : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In (Optional)</span>
            </button>
          </div>
        )}

        {/* Bottom Theme Strip */}
        <div className={`p-3 border-t ${t.border} flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${t.accent}`} />
            <span className={`text-[11px] ${t.textMuted}`}>
              {t.name}
            </span>
          </div>

          {/* Theme Selector Button Group */}
          <div className={`flex items-center p-0.5 rounded-md border ${t.border} ${isLight ? 'bg-slate-100' : 'bg-black/30'}`}>
            <button
              onClick={() => onThemeChange('violet')}
              className={`p-1 rounded text-xs transition-colors ${
                theme === 'violet' ? 'bg-violet-600 text-white shadow-xs' : 'opacity-50 hover:opacity-100'
              }`}
              title="Cosmic Violet theme"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('emerald')}
              className={`p-1 rounded text-xs transition-colors ${
                theme === 'emerald' ? 'bg-emerald-600 text-white shadow-xs' : 'opacity-50 hover:opacity-100'
              }`}
              title="Emerald Slate theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('light')}
              className={`p-1 rounded text-xs transition-colors ${
                theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-50 hover:opacity-100'
              }`}
              title="Clean Minimal theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThemeChange('navy')}
              className={`p-1 rounded text-xs transition-colors ${
                theme === 'navy' ? 'bg-teal-600 text-white shadow-xs' : 'opacity-50 hover:opacity-100'
              }`}
              title="Midnight Navy theme"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

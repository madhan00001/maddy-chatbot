import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatWindow, Message } from './components/ChatWindow.tsx';
import { SimpleLoginModal } from './components/SimpleLoginModal.tsx';
import { ThemeMode, THEMES } from './types/theme.ts';
import { User } from './types/auth.ts';
import { getTimeGreeting } from './utils/greeting.ts';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('auth_token');
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [useRag, setUseRag] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isSidebarMobile, setIsSidebarMobile] = useState<boolean>(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme') as ThemeMode;
    return saved && THEMES[saved] ? saved : 'violet';
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  // Verify auth on mount if token exists
  useEffect(() => {
    if (authToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Unauthorized');
        })
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('auth_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          setUser(null);
          setAuthToken(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        });
    }
  }, []);

  // Fetch conversations whenever auth token updates
  useEffect(() => {
    fetchConversations(authToken);
  }, [authToken]);

  // Fetch messages whenever activeConvoId changes
  useEffect(() => {
    if (activeConvoId) {
      fetchConversationMessages(activeConvoId, authToken);
    }
  }, [activeConvoId, authToken]);

  const getHeaders = (token?: string | null): HeadersInit => {
    const activeToken = token || authToken;
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  };

  const fetchConversations = async (token?: string | null) => {
    try {
      const res = await fetch('/api/conversations', {
        headers: getHeaders(token),
      });
      const data = await res.json();
      const convos = data.conversations || [];
      setConversations(convos);
      if (convos.length > 0 && !activeConvoId) {
        setActiveConvoId(convos[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchConversationMessages = async (id: string, token?: string | null) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: getHeaders(token),
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  };

  const handleLoginSuccess = (newUser: User, token: string) => {
    setUser(newUser);
    setAuthToken(token);
    setIsLoginModalOpen(false);
    fetchConversations(token);
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    fetchConversations(null);
  };

  // Start a new conversation with dynamic friendly time greeting
  const handleNewChat = async () => {
    const greeting = getTimeGreeting(user?.name);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({ title: `${greeting.greeting} ${greeting.emoji}` }),
      });
      const newConvo = await res.json();
      setConversations((prev) => [newConvo, ...prev]);
      setActiveConvoId(newConvo.id);

      const initialGreetingMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: greeting.starterMessage,
        created_at: new Date().toISOString(),
      };
      setMessages([initialGreetingMsg]);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConvoId === id) {
        if (remaining.length > 0) {
          setActiveConvoId(remaining[0].id);
        } else {
          setActiveConvoId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    let targetConvoId = activeConvoId;
    if (!targetConvoId) {
      try {
        const res = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getHeaders(),
          },
          body: JSON.stringify({
            title: userPrompt.slice(0, 30) + (userPrompt.length > 30 ? '...' : ''),
          }),
        });
        const newConvo = await res.json();
        targetConvoId = newConvo.id;
        setActiveConvoId(newConvo.id);
        setConversations((prev) => [newConvo, ...prev]);
      } catch (err) {
        console.error('Failed to create initial conversation:', err);
        return;
      }
    }

    const tempUserMsgId = `msg-${Date.now()}-u`;
    const userMessage: Message = {
      id: tempUserMsgId,
      role: 'user',
      content: userPrompt,
      created_at: new Date().toISOString(),
    };

    const tempAiMsgId = `msg-${Date.now()}-a`;
    const pendingAssistantMessage: Message = {
      id: tempAiMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage, pendingAssistantMessage]);
    setIsLoading(true);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders(),
        },
        body: JSON.stringify({
          message: userPrompt,
          conversation_id: targetConvoId,
          history: historyPayload,
          use_rag: useRag,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder('utf-8');
      let streamedContent = '';
      let collectedSources: any[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'sources') {
                collectedSources = data.sources || [];
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempAiMsgId ? { ...msg, sources: collectedSources } : msg
                  )
                );
              } else if (data.type === 'chunk') {
                streamedContent += data.text;
                setIsLoading(false);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempAiMsgId
                      ? { ...msg, content: streamedContent, sources: collectedSources }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                setIsStreaming(false);
                setIsLoading(false);
              } else if (data.type === 'error') {
                console.error('SSE Error:', data.error);
                setIsStreaming(false);
                setIsLoading(false);
              }
            } catch {
              // skip incomplete chunk
            }
          }
        }
      }

      fetchConversations(authToken);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream generation aborted by user.');
      } else {
        console.error('Streaming request failed:', err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAiMsgId
              ? {
                  ...msg,
                  content: `*Notice:* ${err.message || 'Unable to connect to the backend server.'}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    setMessages((prev) => prev.slice(0, -1));
    await handleSendMessage(lastUserMsg.content);
  };

  const t = THEMES[theme];
  const currentConvo = conversations.find((c) => c.id === activeConvoId);

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${t.bgMain} ${t.textPrimary} font-sans`}>
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConvoId}
        onSelectConversation={setActiveConvoId}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpenMobile={isSidebarMobile}
        onCloseMobile={() => setIsSidebarMobile(false)}
        theme={theme}
        onThemeChange={handleThemeChange}
        user={user}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <ChatWindow
          messages={messages}
          conversationTitle={currentConvo?.title || 'New Chat'}
          useRag={useRag}
          onSendMessage={handleSendMessage}
          onRegenerate={handleRegenerate}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          isLoading={isLoading}
          onToggleSidebar={() => setIsSidebarMobile((prev) => !prev)}
          theme={theme}
          user={user}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
      </main>

      {/* Optional Simple Login Modal */}
      <SimpleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
      />
    </div>
  );
}

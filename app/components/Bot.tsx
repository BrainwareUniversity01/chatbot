'use client'
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, Menu, MessageSquare,
  Plus, X, Copy, Check, Trash2, Sun, Moon
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
}

// Sub-component for individual messages to handle local "copied" state
const ChatMessage = ({ m, onCopy }: { m: Message; onCopy: (text: string) => Promise<boolean> }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async () => {
    const success = await onCopy(m.content);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative flex flex-col items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: -5, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded pointer-events-none whitespace-nowrap z-50 shadow-xl"
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div className={`relative group max-w-[85%] rounded-2xl px-5 py-3 shadow-md ${m.role === 'user'
        ? 'bg-indigo-600 text-white'
        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'
        }`}>
        {m.role === 'assistant' && (
          <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip text={isCopied ? "Copied!" : "Copy to clipboard"}>
              <button
                onClick={handleCopyClick}
                aria-label="Copy message"
                className="p-1.5 cursor-pointer bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
              </button>
            </Tooltip>
          </div>
        )}
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown
  components={{
    p: ({ children }) => (
      <p className="mb-3 leading-relaxed text-gray-800 dark:text-gray-100">
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-indigo-600 dark:text-indigo-400">
        {children}
      </strong>
    ),
    ul: ({ children }) => (
      <ul className="list-disc pl-5 mb-3 space-y-1">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal pl-5 mb-3 space-y-1">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm">
          {children}
        </code>
      ) : (
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 overflow-x-auto text-sm">
          <code>{children}</code>
        </pre>
      ),
  }}
>
  {m.content}
</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
};

export default function PremiumChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative flex flex-col items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: -5, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-[10px] rounded pointer-events-none whitespace-nowrap z-50 shadow-xl"
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // --- THEME LOGIC ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const savedSessions = localStorage.getItem('bw_sessions');
    if (savedSessions) setChatHistory(JSON.parse(savedSessions));
    setCurrentSessionId('session_' + Date.now());
  }, []);

  useEffect(() => {
    localStorage.setItem('bw_sessions', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversation = async (sessionId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setCurrentSessionId(sessionId);

    try {
      const response = await fetch(`http://198.38.84.237:8000/api/chat/history/${sessionId}`);
      if (!response.ok) throw new Error("History not found");
      const data = await response.json();
      setMessages(data.messages.map((msg: any, i: number) => ({
        id: `hist-${i}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp)
      })));
      setHasStarted(true);
    } catch (error) {
      setMessages([]);
      setHasStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(session => session.id !== id));
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    const botMsgId = Date.now() + 1 + "";

    setMessages(prev => [...prev, { id: Date.now().toString(), content: currentInput, role: 'user', timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);

    if (!hasStarted) {
      setHasStarted(true);
      setChatHistory(prev => [{ id: currentSessionId, title: currentInput.slice(0, 30) }, ...prev]);
    }

    setMessages(prev => [...prev, { id: botMsgId, content: "", role: 'assistant', timestamp: new Date() }]);

    try {
      const response = await fetch("http://198.38.84.237:8000/api/chat/stream", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: currentInput,
          user_name: "John Doe",
          phone: "1234567890"
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const rawChunk = decoder.decode(value, { stream: true });
          const lines = rawChunk.split('\n');
          for (let line of lines) {
            let target = line.trim();
            if (target.startsWith('data: ')) target = target.replace('data: ', '');
            try {
              const data = JSON.parse(target);
              if (data.type === 'chunk' && data.content) {
                accumulatedText += data.content;
                setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, content: accumulatedText } : msg));
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, content: "⚠️ Connection error." } : msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId('session_' + Date.now());
    setMessages([]);
    setHasStarted(false);
  };



  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">

      {/* SIDEBAR */}
      <motion.aside
        animate={{ width: isSidebarExpanded ? 288 : 70 }}
        className="bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 overflow-hidden"
      >
        <div className={`p-4 flex items-center  ${isSidebarExpanded ? "justify-between" : "justify-center"}`}>
          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent truncate"
              >
                BWU AI
              </motion.span>
            )}
          </AnimatePresence>
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl text-gray-500">
            {isSidebarExpanded ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <button onClick={handleNewChat} className={`mx-3 mb-6 flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all ${isSidebarExpanded ? 'p-3' : 'p-3 justify-center'}`}>
          <Plus size={20} /> {isSidebarExpanded && <span className="font-medium">New Chat</span>}
        </button>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
          {isSidebarExpanded && <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Recent</div>}
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadConversation(chat.id)}
              className={`group relative w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === chat.id
                ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
                }`}
              style={{
                opacity: isSidebarExpanded ? "100" : "0",
                
              }}
            >
              {isSidebarExpanded && (<MessageSquare size={18} className="shrink-0" />)}
              {isSidebarExpanded && (
                <>
                  <span className="text-sm truncate flex-1">{chat.title}</span>
                  <Tooltip text="Delete Chat">
                    <button
                      onClick={(e) => deleteSession(e, chat.id)}
                      aria-label="Delete conversation"
                      className="opacity-0 cursor-pointer group-hover:opacity-100 p-1.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          ))}
        </div>
      </motion.aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col relative bg-white dark:bg-gray-950">

        {/* TOP BAR / THEME TOGGLE */}
        <div className="absolute top-4 right-6 z-10">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:scale-110 transition-transform"
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {hasStarted ? (
            <div className="max-w-3xl mx-auto p-6 pt-16 pb-32">
              {messages.map((m) => (
                <ChatMessage key={m.id} m={m} onCopy={handleCopy} />
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-6">
                  <div className="bg-gray-100 dark:bg-gray-800 px-5 py-4 rounded-2xl flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-10">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6 max-w-lg">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                  <Sparkles size={40} className="text-white" />
                </div>
                <h2 className="text-4xl font-bold dark:text-white">Brainware AI</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg">Instant access to academics, administration, and insights</p>
              </motion.div>
            </div>
          )}
        </div>

        {/* INPUT */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className={`p-6 bg-linear-to-t from-white dark:from-gray-950 to-transparent
          ${hasStarted
              ? "sticky bottom-0"
              : "sticky bottom-75"
            }`}
        >

          <div className="max-w-3xl mx-auto relative group">
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl flex items-center overflow-hidden focus-within:ring-2 ring-indigo-500/50 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask anything..."
                className="w-full px-6 py-4 bg-transparent outline-none text-gray-800 dark:text-gray-100"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="mr-3 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}</style>
    </div>
  );
}
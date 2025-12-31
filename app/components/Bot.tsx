'use client'
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send, Sparkles, Menu, MessageSquare,
  Plus, History, Copy
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

export default function PremiumChatbot() {
  // --- STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load sidebar titles from LocalStorage
    const savedSessions = localStorage.getItem('bw_sessions');
    if (savedSessions) {
      setChatHistory(JSON.parse(savedSessions));
    }

    // 2. Start with a fresh Session ID
    setCurrentSessionId('session_' + Date.now());
  }, []);

  useEffect(() => {
    // Save sidebar to local storage whenever it updates
    if (chatHistory.length > 0) {
      localStorage.setItem('bw_sessions', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- API: FETCH HISTORY ---
  const loadConversation = async (sessionId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setCurrentSessionId(sessionId);

    try {
      const response = await fetch(`http://198.38.84.237:8000/api/chat/history/${sessionId}`);
      if (!response.ok) throw new Error("History not found");

      const data = await response.json();
      const formatted = data.messages.map((msg: any, i: number) => ({
        id: `hist-${i}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp)
      }));

      setMessages(formatted);
      setHasStarted(true);
    } catch (error) {
      console.error("Failed to load session:", error);
      // If history fails, we assume it's a new empty session
      setMessages([]);
      setHasStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  // --- API: STREAM CHAT ---
  const callChatbotStream = async (userMessage: string, onChunk: (text: string) => void) => {
    try {
      const response = await fetch("http://198.38.84.237:8000/api/chat/stream", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: userMessage,
          user_name: "John Doe",
          phone: "1234567890"
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (!reader) return "";

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
              onChunk(accumulatedText);
            }
          } catch (e) { /* partial chunk ignore */ }
        }
      }
      return accumulatedText;
    } catch (error) {
      return "⚠️ Connection error.";
    }
  };

  // --- HANDLERS ---
  const handleNewChat = () => {
    const newId = 'session_' + Date.now();
    setCurrentSessionId(newId);
    setMessages([]);
    setHasStarted(false);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const botMsgId = Date.now() + 1 + "";

    // Add User Message
    setMessages(prev => [...prev, { id: Date.now().toString(), content: currentInput, role: 'user', timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);

    // If this is the first message of a session, add to sidebar
    if (!hasStarted) {
      setHasStarted(true);
      const newSession = { id: currentSessionId, title: currentInput.slice(0, 30) };
      setChatHistory(prev => [newSession, ...prev]);
    }

    // Add Placeholder for Bot
    setMessages(prev => [...prev, { id: botMsgId, content: "", role: 'assistant', timestamp: new Date() }]);

    await callChatbotStream(currentInput, (updatedText) => {
      setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, content: updatedText } : msg));
    });

    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 flex flex-col z-50 ${isSidebarExpanded ? 'w-72' : 'w-20'}`}>
        <div className="p-4 flex items-center justify-between">
          {isSidebarExpanded && <span className="font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate">BRAINWARE AI</span>}
          <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400"><Menu size={20} /></button>
        </div>

        <button onClick={handleNewChat} className={`mx-3 mb-6 flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all ${isSidebarExpanded ? 'p-3' : 'p-3 justify-center'}`}>
          <Plus size={20} /> {isSidebarExpanded && <span className="font-medium">New Chat</span>}
        </button>

        <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar">
          {isSidebarExpanded && <div className="flex items-center gap-2 px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest"><History size={12} /> Recent</div>}
          {chatHistory.map((chat) => (
            <button
              key={chat.id}
              onClick={() => loadConversation(chat.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group ${currentSessionId === chat.id ? 'bg-indigo-600/20 text-white border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800/50'}`}
            >
              <MessageSquare size={18} className={currentSessionId === chat.id ? 'text-indigo-400' : ''} />
              {isSidebarExpanded && <span className="text-sm truncate text-left flex-1">{chat.title}</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="flex-1 relative overflow-y-auto custom-scrollbar">
          {hasStarted ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6 pb-32">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${m.role === 'user' ? 'bg-indigo-600 shadow-lg' : 'bg-gray-800/50 border border-gray-700/50'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                  {m.role === 'assistant' && m.content && (
                    <button
                      onClick={() => handleCopy(m.content)}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-400 transition"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  )}

                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-center animate-fadeIn">
              <div className="space-y-6 max-w-lg">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40"><Sparkles size={40} /></div>
                <h2 className="text-4xl font-bold">Brainware AI</h2>
                <p className="text-gray-400 text-lg">Select a recent chat or start a new one to begin.</p>
              </div>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-6 bg-gradient-to-t from-gray-950 to-transparent">
          <div className="max-w-3xl mx-auto relative group">
            <div className="relative bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl flex items-center overflow-hidden">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask anything..."
                className="w-full px-6 py-4 bg-transparent outline-none"
              />
              <button onClick={handleSubmit} disabled={isLoading || !input.trim()} className="mr-3 p-2 bg-indigo-600 rounded-xl disabled:opacity-50"><Send size={18} /></button>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
'use client'
import { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Copy, Check, Menu, MessageSquare, 
  Plus, History, ChevronLeft, ThumbsUp, ThumbsDown 
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([
    { id: '1', title: 'Academic Regulations 2024' },
    { id: '2', title: 'Administrative Guidelines' },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- API INTEGRATION SECTION ---
  const callChatbotAPI = async (userMessage) => {
    const API_URL = "http://198.38.84.237:8000/api/chat"; 
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // 'cors' is necessary for browser-to-IP communication
        mode: 'cors', 
        body: JSON.stringify({ 
          session_id: "user_session_123", // You can generate a unique ID here
          message: userMessage,
          username: "John Doe",           // Replace with actual user data if available
          phone: "1234567890"            // Replace with actual user data if available
        }),
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      console.log("Response Data:", data);

      // Adjust 'data.response' based on what you see in the "Response" section of /docs
      return data.response || data.message || data.answer || "Success, but no text returned.";
      
    } catch (error) {
      console.error("API Connection Failed:", error);
      return "I'm having trouble connecting to the server. Please ensure you are on a network that allows access to this IP address (try a phone hotspot).";
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
        id: Date.now().toString(), 
        content: input, 
        role: 'user', 
        timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    if (!hasStarted) {
      setHasStarted(true);
      setChatHistory(prev => [{ id: Date.now().toString(), title: currentInput.slice(0, 30) + '...' }, ...prev]);
    }

    // Call the API
    const botResponse = await callChatbotAPI(currentInput);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: botResponse,
      role: 'assistant',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100 font-sans">
      
      {/* --- SIDEBAR --- */}
      <aside className={`bg-gray-900 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-50 overflow-hidden ${isSidebarExpanded ? 'w-72' : 'w-20'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header & Toggle */}
          <div className={`p-4 mb-4 flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'}`}>
            {isSidebarExpanded && (
              <span className="font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent truncate tracking-tight">
                BRAINWARE AI
              </span>
            )}
            <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
              {isSidebarExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* New Chat */}
          <div className="px-3 mb-6">
            <button onClick={() => { setMessages([]); setHasStarted(false); }} className={`flex items-center gap-3 w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all rounded-xl ${isSidebarExpanded ? 'p-3' : 'p-3 justify-center'}`}>
              <Plus className="w-5 h-5 flex-shrink-0" />
              {isSidebarExpanded && <span className="font-medium whitespace-nowrap">New Chat</span>}
            </button>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-2">
            {/* The "Recent" icon/text disappears when collapsed as requested */}
            {isSidebarExpanded && (
               <div className="flex items-center gap-2 px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest animate-fadeIn">
                <History className="w-3 h-3" /> Recent
              </div>
            )}
            {chatHistory.map((chat) => (
              <button key={chat.id} className={`w-full flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-white transition-all group ${isSidebarExpanded ? '' : 'justify-center'}`}>
                {isSidebarExpanded ? (
  <MessageSquare className="w-5 h-5 shrink-0 group-hover:text-indigo-400" />
) : null}
                {isSidebarExpanded && <span className="text-sm truncate">{chat.title}</span>}
              </button>
            ))}
          </div>

          {/* Profile */}
          <div className="p-4 border-t border-gray-800">
            <div className={`flex items-center gap-3 ${isSidebarExpanded ? '' : 'justify-center'}`}>
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white flex-shrink-0">
                JD
              </div>
              {isSidebarExpanded && (
                <div className="overflow-hidden animate-fadeIn">
                  <p className="text-sm font-medium truncate">John Doe</p>
                  <p className="text-xs text-gray-500 truncate">Premium Plan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CHAT --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        
        {/* Messages */}
        <div className="flex-1 relative flex flex-col min-h-0">
          <div className={`flex-1 overflow-y-auto ${hasStarted ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
            <div className="max-w-4xl mx-auto p-6 space-y-6 w-full pb-8">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                  <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${message.role === 'user' ? 'bg-indigo-600 shadow-indigo-500/20 shadow-lg' : 'bg-gray-800/50 border border-gray-700/50'}`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-1.5 p-4 bg-gray-800/30 w-max rounded-2xl border border-gray-800 animate-pulse">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input & Welcome */}
          <div className={`transition-all duration-700 ${hasStarted ? 'relative border-t border-gray-800 bg-gray-900/50 backdrop-blur-xl' : 'absolute inset-0 flex items-center justify-center'}`}>
            <div className="w-full max-w-3xl mx-auto p-6">
              {!hasStarted && (
                <div className="text-center space-y-6 mb-12 animate-fadeIn">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight">Brainware AI Assistant</h2>
                  <p className="text-gray-400 text-lg">Centralized gateway to academic records and documentation.</p>
                </div>
              )}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-15 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-gray-900/80 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Ask anything..."
                    className="w-full px-6 py-4 bg-transparent text-white focus:outline-none pr-16"
                  />
                  <button onClick={handleSubmit} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
      `}</style>
    </div>
  );
}
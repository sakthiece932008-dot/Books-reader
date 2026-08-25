import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User } from 'lucide-react';
import { api } from '../lib/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

export default function TutorScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello! I am your AI Reading Tutor. Do you have any questions about the book you're reading, grammar, or cultural context?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // In a full app, we would pass the actual passage they are currently reading.
      const currentPassage = "General reading context"; 
      const response = await api.getTutorAnswer(currentPassage, userMessage.text);
      
      const aiMessage: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = { id: (Date.now() + 1).toString(), sender: 'ai', text: "Sorry, I'm having trouble connecting right now." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-950 border-b border-[var(--border)] shadow-sm shrink-0">
        <div className="p-2 bg-[var(--primary)] text-white rounded-xl">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">AI Language Tutor</h1>
          <p className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.sender === 'user' ? 'bg-indigo-100 text-[var(--primary)]' : 'bg-blue-100 text-blue-600'
            }`}>
              {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`p-3 rounded-2xl whitespace-pre-wrap text-sm md:text-base ${
              msg.sender === 'user' 
                ? 'bg-[var(--primary)] text-white rounded-tr-sm' 
                : 'bg-white dark:bg-gray-800 border border-[var(--border)] text-gray-800 dark:text-gray-200 rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border border-[var(--border)] rounded-2xl rounded-tl-sm flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-950 border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a word, sentence, or grammar rule..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-5 py-3 focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-[var(--primary)] text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

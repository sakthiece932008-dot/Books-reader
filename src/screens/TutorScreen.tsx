import { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, Bot, User, WifiOff, AlertTriangle, 
  RefreshCw, BookOpen, Code, HelpCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { useNetwork } from '../context/NetworkContext';
import { GrammarBreakdown, ComprehensionQuiz } from '../types';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  isError?: boolean;
  retryText?: string;
  grammarData?: GrammarBreakdown;
  quizData?: ComprehensionQuiz;
}

export default function TutorScreen() {
  const { isOnline, isServerReachable } = useNetwork();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Vanakkam! I am your AI Reading Tutor and Literary Companion. You can ask me questions about vocabulary, root words (பகுதி/விகுதி), grammatical sandhi rules, literary themes, or cultural historical context."
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingText]);

  async function handleSend(customPrompt?: string) {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) {
      const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: textToSend };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    
    setIsLoading(true);
    setStreamingText('');

    // Check if user specifically requested grammar or quiz
    const isGrammarRequest = /\b(grammar|sandhi|breakdown|clause|syntax|tense)\b/i.test(textToSend);
    const isQuizRequest = /\b(quiz|test|mcq|comprehension questions)\b/i.test(textToSend);

    const sampleContext = "Tamil literature and reading comprehension context";

    if (isGrammarRequest) {
      try {
        const breakdown = await api.getGrammarBreakdown(textToSend, sampleContext, 'ta', 'en');
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Here is the comprehensive grammar breakdown for: "${breakdown.sentence}"`,
          grammarData: breakdown
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      } catch (e) {
        console.warn("Grammar specialized endpoint fallback:", e);
      }
    }

    if (isQuizRequest) {
      try {
        const quiz = await api.getComprehensionQuiz(sampleContext, "Literature Reader", "General Chapter", "en");
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Here is a comprehension quiz to test your understanding:`,
          quizData: quiz
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      } catch (e) {
        console.warn("Quiz specialized endpoint fallback:", e);
      }
    }

    // Default: Streaming SSE AI response
    let accumulated = '';
    api.streamTutorAnswer(
      sampleContext,
      textToSend,
      'ta',
      'en',
      (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      },
      () => {
        setIsLoading(false);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: accumulated
        };
        setMessages(prev => [...prev, aiMessage]);
        setStreamingText('');
      },
      (error) => {
        setIsLoading(false);
        setStreamingText('');
        const errorMessageText = error?.message || "Sorry, I couldn't connect to the AI Tutor service. Please check your network connection.";
        const errorMessage: Message = { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: `⚠️ Tutor Notice: ${errorMessageText}`,
          isError: true,
          retryText: textToSend
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    );
  }

  const isDisconnected = !isOnline || !isServerReachable;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 max-w-3xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-950 border-b border-[var(--border)] shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold">AI Language Tutor</h1>
            {isDisconnected ? (
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline (Local Mode)</span>
              </p>
            ) : (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>Gemini 2.5 Flash Connected</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 max-w-[88%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
              msg.sender === 'user' 
                ? 'bg-indigo-100 text-indigo-600' 
                : msg.isError 
                ? 'bg-red-100 text-red-600' 
                : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-xs'
            }`}>
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : msg.isError ? <AlertTriangle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={`p-3.5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-xs shadow-xs' 
                : msg.isError
                ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 rounded-tl-xs space-y-2'
                : 'bg-white dark:bg-gray-800 border border-[var(--border)] text-gray-800 dark:text-gray-200 rounded-tl-xs shadow-xs space-y-3'
            }`}>
              <div>{msg.text}</div>

              {/* Render Grammar Breakdown Card if present */}
              {msg.grammarData && (
                <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2 text-xs">
                  <div className="font-semibold text-indigo-900 dark:text-indigo-200">
                    Translation: <span className="italic">{msg.grammarData.translation}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-gray-500 uppercase text-[10px]">Clauses:</div>
                    {msg.grammarData.clauses.map((c, i) => (
                      <div key={i} className="flex justify-between items-center bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-[var(--border)]">
                        <span className="font-bold">{c.text}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold">
                          {c.role}
                        </span>
                      </div>
                    ))}
                  </div>
                  {msg.grammarData.grammarRules.length > 0 && (
                    <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200/50">
                      <strong>Grammar Rules: </strong>
                      {msg.grammarData.grammarRules.join(' • ')}
                    </div>
                  )}
                </div>
              )}

              {/* Render Quiz Cards if present */}
              {msg.quizData && (
                <div className="space-y-2.5 pt-1">
                  {msg.quizData.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-[var(--border)] space-y-1.5 text-xs">
                      <div className="font-bold">{qIdx + 1}. {q.question}</div>
                      <div className="space-y-1 pl-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={`p-1.5 rounded-lg border text-[11px] ${oIdx === q.correctIndex ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold' : 'border-[var(--border)]'}`}>
                            {opt}
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 pl-2">💡 {q.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {msg.isError && msg.retryText && (
                <button
                  type="button"
                  onClick={() => handleSend(msg.retryText)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors mt-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Question</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Live SSE Streaming Bubble */}
        {isLoading && (
          <div className="flex gap-3 max-w-[88%]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl rounded-tl-xs shadow-xs text-xs leading-relaxed text-indigo-950 dark:text-indigo-100">
              {streamingText ? (
                <div>
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 bg-indigo-600 ml-1 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-500">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                  <span className="text-[11px] ml-1">Analyzing with Gemini AI...</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 border-t border-[var(--border)] flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
        <button
          type="button"
          onClick={() => handleSend("Explain the Tamil grammatical rules for Sandhi (புணர்ச்சி விதிகள்) with examples.")}
          className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-xs font-medium whitespace-nowrap hover:border-indigo-500 transition-colors flex items-center gap-1"
        >
          <Code className="w-3 h-3 text-indigo-600" />
          <span>Sandhi Rules</span>
        </button>
        <button
          type="button"
          onClick={() => handleSend("What are the root words and suffixes (பகுதி/விகுதி) in classical Tamil?")}
          className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-xs font-medium whitespace-nowrap hover:border-indigo-500 transition-colors flex items-center gap-1"
        >
          <BookOpen className="w-3 h-3 text-purple-600" />
          <span>Root Words (பகுதி)</span>
        </button>
        <button
          type="button"
          onClick={() => handleSend("Give me a 3-question comprehension quiz on classical Tamil literature.")}
          className="px-3 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-xs font-medium whitespace-nowrap hover:border-indigo-500 transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-3 h-3 text-emerald-600" />
          <span>Generate Quiz</span>
        </button>
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white dark:bg-gray-950 border-t border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()}
            placeholder={isDisconnected ? "Offline mode active..." : "Ask about grammar, root words, or literature..."}
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-[var(--primary)] rounded-full px-5 py-3 focus:ring-2 focus:ring-[var(--primary)] focus:outline-none text-xs md:text-sm"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-[var(--primary)] text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { 
  Sparkles, Bot, Send, BookOpen, HelpCircle, 
  Code, RefreshCw, X, Check, Award
} from 'lucide-react';
import { api } from '../lib/api';
import { GrammarBreakdown, ComprehensionQuiz } from '../types';

interface AiTutorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pageText: string;
  bookTitle?: string;
  chapterTitle?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  onSelectWordLookup?: (word: string) => void;
}

export default function AiTutorSheet({
  isOpen,
  onClose,
  pageText,
  bookTitle = "Current Book",
  chapterTitle = "Chapter 1",
  sourceLanguage = "ta",
  targetLanguage = "en",
  onSelectWordLookup: _onSelectWordLookup
}: AiTutorSheetProps) {
  const [activeTab, setActiveTab] = useState<'qa' | 'grammar' | 'quiz'>('qa');
  
  // Q&A State
  const [qaInput, setQaInput] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello! I am your AI Reading Tutor for "${bookTitle}". Ask me any questions about the characters, storyline, literary themes, or classical phrasing in this chapter!`
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamText, setCurrentStreamText] = useState('');

  // Grammar Analysis State
  const [grammarData, setGrammarData] = useState<GrammarBreakdown | null>(null);
  const [isLoadingGrammar, setIsLoadingGrammar] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState('');

  // Quiz State
  const [quizData, setQuizData] = useState<ComprehensionQuiz | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Extract sentences from page for quick grammar selection
  const candidateSentences = pageText
    .split(/[.!?।|॥\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 200)
    .slice(0, 5);

  useEffect(() => {
    if (candidateSentences.length > 0 && !selectedSentence) {
      setSelectedSentence(candidateSentences[0]);
    }
  }, [pageText]);

  if (!isOpen) return null;

  // Handle Q&A with Real-Time SSE Streaming
  const handleSendQuestion = (questionToSend?: string) => {
    const q = (questionToSend || qaInput).trim();
    if (!q || isStreaming) return;

    setQaHistory(prev => [...prev, { sender: 'user', text: q }]);
    if (!questionToSend) setQaInput('');
    setIsStreaming(true);
    setCurrentStreamText('');

    let accumulated = '';
    api.streamTutorAnswer(
      pageText,
      q,
      sourceLanguage,
      targetLanguage,
      (chunk) => {
        accumulated += chunk;
        setCurrentStreamText(accumulated);
      },
      () => {
        setIsStreaming(false);
        setQaHistory(prev => [...prev, { sender: 'ai', text: accumulated }]);
        setCurrentStreamText('');
      },
      (err) => {
        setIsStreaming(false);
        setQaHistory(prev => [
          ...prev, 
          { sender: 'ai', text: `Tutor Notice: ${err.message || 'Focus on root words and clause structures for this passage.'}` }
        ]);
        setCurrentStreamText('');
      }
    );
  };

  // Load Grammar Breakdown
  const handleLoadGrammar = async (sentenceToAnalyze?: string) => {
    const s = sentenceToAnalyze || selectedSentence || candidateSentences[0];
    if (!s) return;

    setSelectedSentence(s);
    setIsLoadingGrammar(true);
    try {
      const data = await api.getGrammarBreakdown(s, pageText, sourceLanguage, targetLanguage);
      setGrammarData(data);
    } catch (e) {
      console.error("Grammar error:", e);
    } finally {
      setIsLoadingGrammar(false);
    }
  };

  // Load Comprehension Quiz
  const handleLoadQuiz = async () => {
    setIsLoadingQuiz(true);
    setSelectedAnswers({});
    setShowQuizResults(false);
    try {
      const data = await api.getComprehensionQuiz(pageText, bookTitle, chapterTitle, targetLanguage);
      setQuizData(data);
    } catch (e) {
      console.error("Quiz error:", e);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const calculateScore = () => {
    if (!quizData) return 0;
    let correct = 0;
    quizData.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correct++;
      }
    });
    return correct;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col overflow-hidden text-gray-800 dark:text-gray-100 border-l border-[var(--border)]">
        
        {/* Tutor Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur border border-white/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                <span>AI Literary Tutor</span>
                <span className="text-[10px] bg-emerald-400/30 text-emerald-200 border border-emerald-300/40 px-1.5 py-0.2 rounded-full font-mono">
                  Gemini Flash
                </span>
              </h2>
              <p className="text-[11px] text-indigo-100 truncate max-w-xs">{bookTitle} • {chapterTitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border)] bg-gray-50 dark:bg-gray-950 p-1.5 gap-1 shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qa'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Interactive Q&A</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('grammar');
              if (!grammarData) handleLoadGrammar();
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'grammar'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Grammar Breakdown</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('quiz');
              if (!quizData) handleLoadQuiz();
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'quiz'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Chapter Quiz</span>
          </button>
        </div>

        {/* Tab Content 1: Interactive Q&A */}
        {activeTab === 'qa' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Context Notice */}
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                Active Context: {pageText.slice(0, 60)}...
              </span>
              <span className="font-semibold text-[10px] text-indigo-600 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full shrink-0">
                Streaming Active
              </span>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {qaHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`flex gap-2.5 max-w-[90%] ${item.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    item.sender === 'user' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
                  }`}>
                    {item.sender === 'user' ? 'U' : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    item.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-gray-100 dark:bg-gray-800 border border-[var(--border)] rounded-tl-xs shadow-xs'
                  }`}>
                    {item.text}
                  </div>
                </div>
              ))}

              {/* Real-time Streaming text bubble */}
              {isStreaming && (
                <div className="flex gap-2.5 max-w-[90%]">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs leading-relaxed whitespace-pre-wrap text-indigo-950 dark:text-indigo-100 rounded-tl-xs shadow-xs">
                    {currentStreamText || "Tutor is analyzing the reading passage..."}
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-600 ml-1 animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Quick suggested study prompts */}
            <div className="px-4 py-2 bg-gray-50/70 dark:bg-gray-950/40 border-t border-[var(--border)] flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar">
              <button
                type="button"
                onClick={() => handleSendQuestion("Explain the main poetic theme and character emotion in this excerpt.")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-[11px] font-medium whitespace-nowrap hover:border-indigo-500 transition-colors"
              >
                💡 Explain Theme
              </button>
              <button
                type="button"
                onClick={() => handleSendQuestion("What are the key classical or cultural idioms used here?")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-[11px] font-medium whitespace-nowrap hover:border-indigo-500 transition-colors"
              >
                📖 Cultural Idioms
              </button>
              <button
                type="button"
                onClick={() => handleSendQuestion("Summarize this chapter's key plot points in 3 simple sentences.")}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-[var(--border)] text-[11px] font-medium whitespace-nowrap hover:border-indigo-500 transition-colors"
              >
                ⚡ 3-Bullet Summary
              </button>
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-gray-950 border-t border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleSendQuestion()}
                  placeholder="Ask tutor about grammar, idioms, plot..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-indigo-500 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSendQuestion()}
                  disabled={!qaInput.trim() || isStreaming}
                  className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Grammar & Syntax Breakdown */}
        {activeTab === 'grammar' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Select Sentence from Chapter to Analyze
              </label>
              <div className="space-y-1.5">
                {candidateSentences.map((sentence, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadGrammar(sentence)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      selectedSentence === sentence
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-semibold shadow-xs'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-[var(--border)] text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    <p className="line-clamp-2">"{sentence}"</p>
                  </button>
                ))}
              </div>
            </div>

            {isLoadingGrammar ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Deconstructing grammar clauses with Gemini AI...</p>
              </div>
            ) : grammarData ? (
              <div className="space-y-4 animate-in fade-in">
                {/* Analyzed Sentence Box */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Full Sentence & Translation
                  </span>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    "{grammarData.sentence}"
                  </p>
                  <p className="text-xs italic text-indigo-700 dark:text-indigo-300">
                    → {grammarData.translation}
                  </p>
                  <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-[10px] font-semibold">
                    Tense: {grammarData.tense}
                  </div>
                </div>

                {/* Clause Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Clause & Syntactic Roles
                  </h4>
                  <div className="space-y-2">
                    {grammarData.clauses.map((clause, cIdx) => (
                      <div 
                        key={cIdx}
                        className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-[var(--border)] space-y-1 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            {clause.text}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            {clause.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">→ {clause.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grammar Rules & Sandhi Notes */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Grammar Rules & Inflection Notes
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs text-amber-950 dark:text-amber-200">
                    {grammarData.grammarRules.map((rule, rIdx) => (
                      <div key={rIdx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab Content 3: Interactive Comprehension Quiz */}
        {activeTab === 'quiz' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Comprehension & Vocabulary Quiz
                </h3>
                <p className="text-[11px] text-gray-400">Test your understanding of this chapter</p>
              </div>
              <button
                type="button"
                onClick={handleLoadQuiz}
                disabled={isLoadingQuiz}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuiz ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            {isLoadingQuiz ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-500">Generating chapter quiz with Gemini AI...</p>
              </div>
            ) : quizData ? (
              <div className="space-y-4">
                {quizData.questions.map((q, qIdx) => (
                  <div 
                    key={qIdx}
                    className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-[var(--border)] space-y-3 shadow-xs"
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {qIdx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-relaxed">
                        {q.question}
                      </h4>
                    </div>

                    <div className="space-y-1.5 pl-7">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswers[qIdx] === optIdx;
                        const isCorrect = optIdx === q.correctIndex;
                        let btnStyle = 'bg-gray-50 dark:bg-gray-900/60 border-[var(--border)] text-gray-700 dark:text-gray-300 hover:border-indigo-400';

                        if (showQuizResults) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300';
                          }
                        } else if (isSelected) {
                          btnStyle = 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              if (!showQuizResults) {
                                setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                              }
                            }}
                            className={`w-full text-left p-2.5 rounded-xl text-xs border transition-all flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {showQuizResults && isCorrect && (
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {showQuizResults && (
                      <div className="pl-7 pt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed border-t border-[var(--border)] mt-2">
                        <strong className="text-indigo-600 dark:text-indigo-400">Explanation: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}

                {/* Score & Check Results */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-2">
                  {showQuizResults ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                        <Award className="w-5 h-5 text-amber-500" />
                        <span>Your Score: {calculateScore()} / {quizData.questions.length}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {calculateScore() === quizData.questions.length 
                          ? '🎉 Perfect comprehension! Ready for the next chapter.' 
                          : 'Review the explanations above to strengthen your reading retention.'}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={Object.keys(selectedAnswers).length < quizData.questions.length}
                      onClick={() => setShowQuizResults(true)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      Check Answers & Show Explanations
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </div>
  );
}

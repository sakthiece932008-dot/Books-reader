import { useState, useEffect } from 'react';
import { Volume2, CheckCircle, Brain } from 'lucide-react';
import { db } from '../lib/db';
import { VocabularyEntity } from '../types';

export default function VocabularyScreen() {
  const [words, setWords] = useState<VocabularyEntity[]>([]);

  useEffect(() => {
    loadWords();
  }, []);

  async function loadWords() {
    const w = await db.getVocabulary();
    setWords(w.sort((a, b) => b.addedTimestamp - a.addedTimestamp));
  }

  async function toggleMastered(word: VocabularyEntity) {
    await db.saveVocabulary({ ...word, mastered: !word.mastered });
    loadWords();
  }

  function playAudio(text: string, lang: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[var(--primary)] text-white rounded-xl">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Vocabulary</h1>
          <p className="text-gray-500 text-sm">{words.filter(w => w.mastered).length} mastered out of {words.length} words</p>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">No words saved yet.</h2>
          <p className="text-gray-500">Read a book and highlight words to save them here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {words.map(word => (
            <div 
              key={word.id} 
              className={`p-4 rounded-2xl border transition-all ${
                word.mastered 
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                  : 'bg-[var(--surface)] border-[var(--border)]'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-[var(--primary)] flex items-center gap-2">
                    {word.word}
                    <button onClick={() => playAudio(word.word, word.sourceLanguage)} className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </h3>
                  <p className="text-sm italic text-gray-600 dark:text-gray-400">{word.transliteration}</p>
                </div>
                <button 
                  onClick={() => toggleMastered(word)}
                  className={`p-1.5 rounded-full transition-colors ${word.mastered ? 'text-green-500 bg-green-100 dark:bg-green-900/50' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <CheckCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mt-3 space-y-1">
                <p className="font-semibold">{word.translation}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{word.definition}</p>
                {word.exampleSentence && (
                  <p className="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                    "{word.exampleSentence}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

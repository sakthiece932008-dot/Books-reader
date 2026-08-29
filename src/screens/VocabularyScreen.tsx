import { useState, useEffect } from 'react';
import { Volume2, CheckCircle, Brain, Trash2 } from 'lucide-react';
import { db } from '../lib/db';
import { api } from '../lib/api';
import { VocabularyEntity } from '../types';
import { normalizeTextForSpeech, getLanguageLocale, pcmToWavBlob } from '../lib/languages';

export default function VocabularyScreen() {
  const [words, setWords] = useState<VocabularyEntity[]>([]);
  const [playingWordId, setPlayingWordId] = useState<number | null>(null);

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

  async function deleteWord(id: number) {
    await db.deleteVocabulary(id);
    setWords(prev => prev.filter(w => w.id !== id));
  }

  async function playAudio(word: VocabularyEntity) {
    setPlayingWordId(word.id);
    const cleanText = normalizeTextForSpeech(word.word);
    
    // Try Gemini AI voice first, fallback to browser
    try {
      const { audio } = await api.generateSpeech(cleanText, 'Kore', word.sourceLanguage || 'ta');
      const binaryStr = atob(audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const wavBlob = pcmToWavBlob(bytes, 24000, 1, 16);
      const blobUrl = URL.createObjectURL(wavBlob);
      const sound = new Audio(blobUrl);
      sound.onended = () => setPlayingWordId(null);
      sound.onerror = () => setPlayingWordId(null);
      await sound.play();
    } catch {
      // Browser fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = getLanguageLocale(word.sourceLanguage || 'ta');
        utterance.onend = () => setPlayingWordId(null);
        utterance.onerror = () => setPlayingWordId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingWordId(null);
      }
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-[var(--primary)] text-white rounded-xl shadow-md">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Vocabulary Notebook</h1>
          <p className="text-gray-500 text-sm">{words.filter(w => w.mastered).length} mastered out of {words.length} saved words</p>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)] space-y-3">
          <Brain className="w-12 h-12 text-gray-300 mx-auto" />
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">No words saved yet</h2>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            While reading any book in Tamil or other languages, highlight any word or phrase to see instant definitions and add it here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {words.map(word => (
            <div 
              key={word.id} 
              className={`p-4 rounded-2xl border transition-all ${
                word.mastered 
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                  : 'bg-[var(--surface)] border-[var(--border)] shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[var(--primary)]">
                      {word.word}
                    </h3>
                    <button 
                      onClick={() => playAudio(word)} 
                      disabled={playingWordId === word.id}
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 transition-colors"
                      title="Pronounce with AI Voice"
                    >
                      <Volume2 className={`w-4 h-4 ${playingWordId === word.id ? 'animate-bounce text-amber-500' : ''}`} />
                    </button>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-500">
                      {word.sourceLanguage?.toUpperCase() || 'TA'}
                    </span>
                  </div>
                  {word.transliteration && (
                    <p className="text-xs italic text-gray-600 dark:text-gray-400 mt-0.5">{word.transliteration}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => toggleMastered(word)}
                    className={`p-1.5 rounded-full transition-colors ${word.mastered ? 'text-green-500 bg-green-100 dark:bg-green-900/50' : 'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title={word.mastered ? "Mark as unlearned" : "Mark as mastered"}
                  >
                    <CheckCircle className="w-5 h-5" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => deleteWord(word.id)}
                    className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete word"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-3 space-y-1.5 text-xs">
                <p className="font-bold text-sm text-[var(--foreground)]">{word.translation}</p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{word.definition}</p>
                {word.exampleSentence && (
                  <p className="text-[11px] text-gray-500 mt-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800 italic">
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

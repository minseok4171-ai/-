
import React, { useState, useEffect } from 'react';
import { Search, Volume2, History, X, GraduationCap, BookOpen, Quote, Loader2, Sparkles, MinusCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { getWordInfo, getPronunciationAudio, decode, decodeAudioData } from './geminiService';
import { WordDefinition, SearchHistory } from './types';

// Main App Component for the K-12 Educational Dictionary
const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load search history on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('edu_dict_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.warn("Could not load search history from localStorage.");
    }
  }, []);

  // Helper to save words to local history
  const saveToHistory = (word: string) => {
    const newHistory = [
      { word, timestamp: Date.now() },
      ...history.filter(h => h.word.toLowerCase() !== word.toLowerCase())
    ].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('edu_dict_history', JSON.stringify(newHistory));
  };

  // Search handler using Gemini API
  const handleSearch = async (e?: React.FormEvent, searchWord?: string) => {
    if (e) e.preventDefault();
    const targetWord = (searchWord || query).trim();
    if (!targetWord) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getWordInfo(targetWord);
      setResult(data);
      saveToHistory(data.word);
    } catch (err: any) {
      console.error("Word Search Error:", err);
      // Friendly error messages for students
      let errorMessage = '단어를 찾는 중 오류가 발생했습니다.';
      if (err.message?.includes('401') || err.message?.includes('API_KEY')) {
        errorMessage = '시스템 오류: API 키가 올바르지 않거나 설정되지 않았습니다.';
      } else if (err.message?.includes('404')) {
        errorMessage = '검색된 정보를 찾을 수 없습니다.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Play pronunciation audio via Gemini TTS
  const playAudio = async () => {
    if (!result || isPlaying) return;
    setIsPlaying(true);
    try {
      const base64 = await getPronunciationAudio(result.word);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64), audioCtx, 24000, 1);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsPlaying(false);
    }
  };

  // Helper to highlight the searched word within example sentences
  const highlightWord = (sentence: string, word: string) => {
    if (!word) return sentence;
    const parts = sentence.split(new RegExp(`(${word})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === word.toLowerCase() ? (
            <span key={i} className="font-bold text-indigo-600 underline">{part}</span>
          ) : part
        )}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              K-12 Edu Dictionary
            </h1>
          </div>
          <BookOpen className="w-6 h-6 text-slate-400" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative group mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            className="w-full h-14 pl-12 pr-12 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 shadow-sm transition-all text-lg"
            placeholder="Search an English word..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-28 inset-y-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button 
            type="submit"
            className="absolute right-3 top-2.5 h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            disabled={loading || !query.trim()}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Empty State / Dashboard */}
        {!result && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" /> Recent Searches
              </h2>
              {history.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {history.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setQuery(item.word); handleSearch(undefined, item.word); }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {item.word}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No recent searches yet.</p>
              )}
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h2 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Learning Tip
              </h2>
              <p className="text-indigo-800/80 text-sm leading-relaxed">
                Try searching for words like "enthusiasm" or "sustainable" to see detailed meanings, examples, and synonyms specially curated for students!
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-slate-500 animate-pulse font-medium">Looking up the best definition for you...</p>
          </div>
        )}

        {/* Results View */}
        {result && (
          <article className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white p-8 rounded-3xl border shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-4xl font-bold text-slate-900 mb-2">{result.word}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xl text-slate-500 font-mono">{result.phonetic}</span>
                    <button 
                      onClick={playAudio}
                      disabled={isPlaying}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-colors disabled:opacity-50"
                      title="Listen to pronunciation"
                    >
                      <Volume2 className={`w-5 h-5 ${isPlaying ? 'animate-pulse' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {result.partsOfSpeech.map((pos, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
                      {pos}
                    </span>
                  ))}
                </div>
              </div>

              {result.synonyms.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">General Synonyms</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.synonyms.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {result.meanings.map((meaning, mIdx) => (
              <section key={mIdx} className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg font-bold">
                    {mIdx + 1}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-bold uppercase">
                    {meaning.pos}
                  </span>
                </div>

                <div>
                  <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Meaning & Korean</h4>
                  <p className="text-lg font-medium text-slate-800 mb-2">{meaning.definition}</p>
                  <div className="flex flex-wrap gap-2">
                    {meaning.koreanMeanings.map((km, i) => (
                      <span key={i} className="text-xl font-bold text-indigo-600">{km}{i < meaning.koreanMeanings.length - 1 ? ',' : ''}</span>
                    ))}
                  </div>
                </div>

                {meaning.examples.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Quote className="w-3 h-3" /> Examples
                    </h4>
                    <ul className="space-y-4">
                      {meaning.examples.map((ex, eIdx) => (
                        <li key={eIdx} className="pl-4 border-l-4 border-slate-100">
                          <p className="text-slate-800 text-lg italic mb-1">
                            {highlightWord(ex.sentence, result.word)}
                          </p>
                          <p className="text-slate-500 text-sm">{ex.translation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <PlusCircle className="w-3 h-3 text-green-500" /> Synonyms
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {meaning.synonyms.length > 0 ? meaning.synonyms.map((s, i) => (
                        <span key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border">{s}</span>
                      )) : <span className="text-slate-400 text-xs">None</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MinusCircle className="w-3 h-3 text-red-400" /> Antonyms
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {meaning.antonyms.length > 0 ? meaning.antonyms.map((a, i) => (
                        <span key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border">{a}</span>
                      )) : <span className="text-slate-400 text-xs">None</span>}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  );
};

export default App;

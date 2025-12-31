
import React, { useState, useEffect } from 'react';
import { Search, Volume2, History, X, GraduationCap, BookOpen, Quote, Loader2, Sparkles, ArrowRightLeft, ArrowRight, MinusCircle, PlusCircle } from 'lucide-react';
import { getWordInfo, getPronunciationAudio, decode, decodeAudioData } from './geminiService';
import { WordDefinition, SearchHistory } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('edu_dict_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (word: string) => {
    const newHistory = [
      { word, timestamp: Date.now() },
      ...history.filter(h => h.word !== word)
    ].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('edu_dict_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (e?: React.FormEvent, searchWord?: string) => {
    if (e) e.preventDefault();
    const targetWord = searchWord || query;
    if (!targetWord.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getWordInfo(targetWord);
      setResult(data);
      saveToHistory(data.word);
    } catch (err) {
      setError('단어를 찾는 중 오류가 발생했습니다. 다시 시도해 주세요.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('edu_dict_history');
  };

  const highlightWord = (sentence: string, word: string) => {
    const regex = new RegExp(`(${word})`, 'gi');
    return sentence.split(regex).map((part, i) => 
      part.toLowerCase() === word.toLowerCase() ? <strong key={i} className="text-blue-600 font-bold underline decoration-2 underline-offset-2">{part}</strong> : part
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <header className="w-full bg-blue-600 text-white p-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-white p-1.5 rounded-lg shadow-inner">
              <BookOpen className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Edu Dictionary</h1>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-semibold">
            <span className="flex items-center gap-1.5 opacity-90 hover:opacity-100"><GraduationCap size={18}/> 학습 맞춤</span>
            <span className="flex items-center gap-1.5 opacity-90 hover:opacity-100"><Sparkles size={18}/> AI 추천</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 mt-10 flex-grow">
        {/* Search Bar */}
        <div className="relative mb-10">
          <form onSubmit={(e) => handleSearch(e)} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="단어를 입력하면 모든 의미와 관계어를 찾아줍니다..."
              className="w-full h-16 pl-14 pr-24 rounded-2xl border-4 border-white bg-white shadow-2xl shadow-blue-100 text-xl focus:outline-none focus:border-blue-400 focus:ring-0 transition-all placeholder:text-slate-300"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={28} />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-3 rounded-xl font-black hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={24}/> : "검색"}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl flex items-center gap-3 shadow-sm">
            <X size={20} className="cursor-pointer" onClick={() => setError(null)} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Recent Searches */}
        {!result && !loading && history.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
              <h2 className="flex items-center gap-2 font-black text-slate-400 uppercase tracking-widest text-xs">
                <History size={14} /> 최근 찾아본 단어
              </h2>
              <button onClick={clearHistory} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase">지우기</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(h.word);
                    handleSearch(undefined, h.word);
                  }}
                  className="bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all text-sm font-bold text-slate-600"
                >
                  {h.word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 text-blue-600">
            <div className="relative">
              <Loader2 className="animate-spin mb-6" size={64} />
              <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-bounce" size={24} />
            </div>
            <p className="font-black text-xl tracking-tight text-slate-600">AI가 단어의 모든 의미를 분석하고 있어요</p>
            <p className="text-slate-400 mt-2 text-sm">잠시만 기다려주세요...</p>
          </div>
        )}

        {/* Result UI */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Word Main Card */}
            <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-5 mb-3">
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter">{result.word}</h1>
                    <button
                      onClick={playAudio}
                      className={`p-4 rounded-2xl transition-all shadow-sm ${isPlaying ? 'bg-blue-600 text-white scale-110' : 'bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white hover:shadow-lg'}`}
                    >
                      <Volume2 size={32} className={isPlaying ? 'animate-pulse' : ''} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-slate-400 font-medium tracking-wide">/{result.phonetic}/</span>
                    <div className="flex gap-2">
                      {result.partsOfSpeech.map((pos, i) => (
                        <span key={i} className="bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-black uppercase">
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                  {result.synonyms.slice(0, 6).map((s, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setQuery(s); handleSearch(undefined, s); }}
                      className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                    >
                      #{s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detailed Meanings with Examples, Synonyms, Antonyms */}
            <div className="grid gap-6 mb-12">
              {result.meanings.map((m, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                  {/* Meaning Header */}
                  <div className="bg-slate-50 p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm shadow-md">
                        {i + 1}
                      </span>
                      <span className="text-sm font-black text-blue-600 uppercase italic tracking-widest">{m.pos}</span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-3 mb-2">
                      {m.koreanMeanings.map((km, ki) => (
                        <h2 key={ki} className="text-3xl font-black text-slate-800">
                          {km}{ki < m.koreanMeanings.length - 1 ? ',' : ''}
                        </h2>
                      ))}
                    </div>
                    <p className="text-slate-400 italic text-base leading-snug">{m.definition}</p>

                    {/* Relation Words Grid (Synonyms & Antonyms) */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                      {m.synonyms.length > 0 && (
                        <div className="flex-1 bg-green-50/50 rounded-2xl p-4 border border-green-100">
                          <h4 className="text-[10px] font-black text-green-600 uppercase tracking-tighter mb-2 flex items-center gap-1.5">
                            <PlusCircle size={12}/> 유의어 (Synonyms)
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {m.synonyms.map((s, si) => (
                              <button 
                                key={si} 
                                onClick={() => { setQuery(s); handleSearch(undefined, s); }}
                                className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-green-200 text-green-700 hover:bg-green-600 hover:text-white transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {m.antonyms.length > 0 && (
                        <div className="flex-1 bg-red-50/50 rounded-2xl p-4 border border-red-100">
                          <h4 className="text-[10px] font-black text-red-600 uppercase tracking-tighter mb-2 flex items-center gap-1.5">
                            <MinusCircle size={12}/> 반의어 (Antonyms)
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {m.antonyms.map((a, ai) => (
                              <button 
                                key={ai} 
                                onClick={() => { setQuery(a); handleSearch(undefined, a); }}
                                className="text-xs font-bold bg-white px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-600 hover:text-white transition-colors"
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meaning Examples */}
                  <div className="p-6 md:p-8 bg-white">
                    <div className="flex items-center gap-2 mb-6 text-slate-400">
                      <Quote size={18} />
                      <h3 className="text-sm font-black uppercase tracking-widest">문장에서 확인하기</h3>
                    </div>
                    <div className="space-y-8">
                      {m.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="relative pl-6 border-l-4 border-blue-100 hover:border-blue-400 transition-colors py-1">
                          <p className="text-xl md:text-2xl font-semibold text-slate-800 leading-relaxed mb-2">
                            {highlightWord(ex.sentence, result.word)}
                          </p>
                          <p className="text-lg text-slate-500 font-medium">{ex.translation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-40 h-40 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 rotate-3">
              <BookOpen size={80} className="text-blue-100" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4">공부가 즐거워지는 스마트 영어 사전</h2>
            <p className="max-w-md mx-auto text-slate-400 text-lg leading-relaxed px-6">
              단어를 검색하면 AI가 <span className="text-blue-600 font-bold">뜻별 유의어와 반의어</span>까지 한눈에 정리해줍니다. <br/>지금 바로 검색해보세요!
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400 font-bold">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span>AI Service Online</span>
          </div>
          <p>© 2024 WAWA LEARNING COACHING CENTER</p>
          <div className="flex gap-6">
            <button className="hover:text-blue-600 transition-colors uppercase">도움말</button>
            <button className="hover:text-blue-600 transition-colors uppercase">의견보내기</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

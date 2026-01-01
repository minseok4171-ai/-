
import React, { useState, useEffect } from 'react';
import { Search, Volume2, History, X, GraduationCap, BookOpen, Quote, Loader2, Sparkles, MinusCircle, PlusCircle, AlertCircle, WifiOff, BookmarkPlus, NotebookPen, Trash2, CheckCircle2, ListChecks } from 'lucide-react';
import { getWordInfo, getPronunciationAudio, decode, decodeAudioData } from './geminiService';
import { WordDefinition, SearchHistory, SavedWordEntry, ProficiencyLevel } from './types';

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [savedWords, setSavedWords] = useState<SavedWordEntry[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('new');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    try {
      const savedHistory = localStorage.getItem('wawa_dict_history');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.warn("History load failed");
    }

    try {
      const savedWordbook = localStorage.getItem('wawa_dict_saved');
      if (savedWordbook) setSavedWords(JSON.parse(savedWordbook));
    } catch (e) {
      console.warn("Saved words load failed");
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!result) {
      setNoteInput('');
      setProficiency('new');
      return;
    }

    const existing = savedWords.find(
      (entry) => entry.word.toLowerCase() === result.word.toLowerCase()
    );
    setNoteInput(existing?.note || '');
    setProficiency(existing?.proficiency || 'new');
  }, [result, savedWords]);

  const saveToHistory = (word: string) => {
    const newHistory = [
      { word, timestamp: Date.now() },
      ...history.filter(h => h.word.toLowerCase() !== word.toLowerCase())
    ].slice(0, 10);
    setHistory(newHistory);
    try {
      localStorage.setItem('wawa_dict_history', JSON.stringify(newHistory));
    } catch (e) {
      console.warn("History save failed");
    }
  };

  const persistSavedWords = (entries: SavedWordEntry[]) => {
    setSavedWords(entries);
    try {
      localStorage.setItem('wawa_dict_saved', JSON.stringify(entries));
    } catch (e) {
      console.warn("Saved words persist failed");
    }
  };

  const removeSavedWord = (word: string) => {
    const filtered = savedWords.filter(entry => entry.word.toLowerCase() !== word.toLowerCase());
    persistSavedWords(filtered);
  };

  const handleSaveWord = () => {
    if (!result) return;

    const existing = savedWords.find(entry => entry.word.toLowerCase() === result.word.toLowerCase());
    const updatedEntry: SavedWordEntry = {
      word: result.word,
      definition: result,
      note: noteInput.trim(),
      proficiency,
      savedAt: existing?.savedAt || Date.now(),
    };

    const updated = [
      updatedEntry,
      ...savedWords.filter(entry => entry.word.toLowerCase() !== result.word.toLowerCase())
    ];

    persistSavedWords(updated);
    setSaveMessage('단어장이 업데이트되었습니다.');
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const handleSearch = async (e?: React.FormEvent, searchWord?: string) => {
    if (e) e.preventDefault();
    const targetWord = (searchWord || query).trim();
    if (!targetWord) return;

    if (!navigator.onLine) {
      setError("인터넷 연결이 끊겨 있습니다. 네트워크 상태를 확인해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getWordInfo(targetWord);
      setResult(data);
      saveToHistory(data.word);
    } catch (err: any) {
      console.error("Search Error:", err);
      setError(err.message || '단어를 찾는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
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
      console.error("Audio error:", err);
      setIsPlaying(false);
    }
  };

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

  const proficiencyLabels: Record<ProficiencyLevel, string> = {
    new: '학습 시작',
    learning: '복습 중',
    mastered: '완벽하게 숙지',
  };

  const proficiencyAccent: Record<ProficiencyLevel, string> = {
    new: 'bg-amber-50 text-amber-700 border-amber-200',
    learning: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    mastered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const formatSavedDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const currentSavedEntry = result
    ? savedWords.find(entry => entry.word.toLowerCase() === result.word.toLowerCase())
    : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              WAWA 학습코칭학원 영어사전
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {!isOnline && (
              <div className="flex items-center gap-1 text-red-500 text-xs font-bold animate-pulse">
                <WifiOff className="w-4 h-4" /> 오프라인
              </div>
            )}
            <BookOpen className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <form onSubmit={handleSearch} className="relative group mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            className="w-full h-14 pl-12 pr-12 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 shadow-sm transition-all text-lg"
            placeholder="궁금한 영어 단어를 입력하세요..."
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '검색'}
          </button>
        </form>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">검색에 실패했습니다</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" /> 최근 검색어
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
                <p className="text-slate-400 text-sm">검색 기록이 없습니다.</p>
              )}
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h2 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> 오늘의 학습 팁
              </h2>
              <p className="text-indigo-800/80 text-sm leading-relaxed">
                인터넷 연결이 원활할 때 더 정확한 발음과 예문을 확인할 수 있어요. WAWA 영어사전은 여러분의 매일 성장을 응원합니다!
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-indigo-500" /> 내 단어장
              </h2>
              {savedWords.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {savedWords.map((entry) => (
                    <div
                      key={entry.word}
                      onClick={() => { setQuery(entry.word); handleSearch(undefined, entry.word); }}
                      className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-white transition cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.word}</p>
                          <p className="text-xs text-slate-500">{formatSavedDate(entry.savedAt)} 저장</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${proficiencyAccent[entry.proficiency]}`}>
                          {proficiencyLabels[entry.proficiency]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 truncate">
                        {entry.note || '메모가 없습니다.'}
                      </p>
                      <div className="flex items-center justify-end gap-2 mt-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSearch(undefined, entry.word); }}
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1"
                        >
                          바로 보기
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSavedWord(entry.word); }}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                          aria-label="단어장에서 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed">
                  자주 쓰는 단어를 저장하고 메모를 남겨보세요. 학습 단계도 함께 기록할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-900 font-bold">정보를 찾는 중...</p>
              <p className="text-slate-400 text-sm">네트워크 상태에 따라 2~3초 정도 소요될 수 있습니다.</p>
            </div>
          </div>
        )}

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
            </section>

            <section className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <NotebookPen className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900">학습 메모 & 단어장</h3>
                    <p className="text-sm text-indigo-800/70">단어를 저장하고 복습 단계를 기록하세요.</p>
                  </div>
                </div>
                {currentSavedEntry && (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> 이미 단어장에 저장됨
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-800">학습 메모</label>
                  <textarea
                    className="w-full min-h-[110px] rounded-2xl border border-indigo-100 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white px-4 py-3 text-slate-800 outline-none transition"
                    placeholder="예문, 암기 팁, 선생님 피드백 등을 기록하세요."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">메모는 단어장에 함께 저장되어 다시 볼 때 도움이 됩니다.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">학습 단계</p>
                    <div className="flex flex-wrap gap-2">
                      {( ['new', 'learning', 'mastered'] as ProficiencyLevel[]).map(level => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setProficiency(level)}
                          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${proficiency === level ? `${proficiencyAccent[level]} ring-2 ring-indigo-100` : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-700'}`}
                        >
                          {proficiencyLabels[level]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {saveMessage && <p className="text-xs text-emerald-700">{saveMessage}</p>}
                  <button
                    type="button"
                    onClick={handleSaveWord}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    {currentSavedEntry ? '단어장 업데이트' : '단어장에 저장'}
                  </button>
                </div>
              </div>
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
                  <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">뜻 풀이</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {meaning.koreanMeanings.map((km, i) => (
                      <span key={i} className="text-xl font-bold text-indigo-600">{km}{i < meaning.koreanMeanings.length - 1 ? ',' : ''}</span>
                    ))}
                  </div>
                  <p className="text-lg font-medium text-slate-600 leading-relaxed">{meaning.definition}</p>
                </div>

                {meaning.examples.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Quote className="w-3 h-3 text-indigo-400" /> 학습용 예문
                    </h4>
                    <ul className="space-y-4">
                      {meaning.examples.map((ex, eIdx) => (
                        <li key={eIdx} className="pl-4 border-l-4 border-indigo-100 bg-slate-50/50 p-3 rounded-r-xl">
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
                      <PlusCircle className="w-3 h-3 text-green-500" /> 유의어
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {meaning.synonyms.length > 0 ? meaning.synonyms.map((s, i) => (
                        <span key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border hover:bg-white cursor-help transition-colors">{s}</span>
                      )) : <span className="text-slate-400 text-xs">없음</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <MinusCircle className="w-3 h-3 text-red-400" /> 반의어
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {meaning.antonyms.length > 0 ? meaning.antonyms.map((a, i) => (
                        <span key={i} className="text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded border hover:bg-white cursor-help transition-colors">{a}</span>
                      )) : <span className="text-slate-400 text-xs">없음</span>}
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

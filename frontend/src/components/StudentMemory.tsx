import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiClient } from '../api/client';
import {
  Brain,
  Sparkles,
  CheckCircle,
  RotateCw,
  RefreshCw,
  Clock,
  Keyboard,
  Plus,
  X,
  Search,
  Filter,
  Download,
  Trash2,
  FileX,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check,
  Layers
} from 'lucide-react';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic?: string;
  document_id?: number | null;
  repetition_number?: number;
  interval_days?: number;
  ease_factor?: number;
}

export const StudentMemory: React.FC = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetText, setSnippetText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Flashcard[]>('/memory/due');
      if (Array.isArray(res.data)) {
        setFlashcards(res.data);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isCardOrphaned = useCallback((card: Flashcard) => {
    return card.document_id == null && (!card.topic || card.topic.trim() === '');
  }, []);

  const topicStatusMap = useMemo(() => {
    const statusMap = new Map<string, boolean>();
    flashcards.forEach((card) => {
      if (card.topic) {
        const isOrphan = isCardOrphaned(card);
        if (!statusMap.has(card.topic)) {
          statusMap.set(card.topic, isOrphan);
        } else if (!isOrphan) {
          statusMap.set(card.topic, false);
        }
      }
    });
    return statusMap;
  }, [flashcards, isCardOrphaned]);

  const topicOptions = useMemo(() => {
    return Array.from(topicStatusMap.entries()).map(([topic, isRemoved]) => ({
      value: topic,
      label: isRemoved ? `${topic} (Removed)` : topic,
      isRemoved
    }));
  }, [topicStatusMap]);

  const filteredCards = useMemo(() => {
    return flashcards.filter((card) => {
      const matchesSearch =
        card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic =
        selectedTopic === 'all' || card.topic === selectedTopic;
      return matchesSearch && matchesTopic;
    });
  }, [flashcards, searchQuery, selectedTopic]);

  const currentCard = filteredCards[currentIndex];
  const hasOrphanedCards = useMemo(
    () => flashcards.some(isCardOrphaned),
    [flashcards, isCardOrphaned]
  );

  const handleReview = useCallback(
    async (quality: number) => {
      if (!currentCard || submitting) return;

      setSubmitting(true);
      try {
        await apiClient.post(`/memory/review/${currentCard.id}`, { quality });
        setIsFlipped(false);
        setReviewedCount((prev) => prev + 1);

        if (currentIndex < filteredCards.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          fetchCards();
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error('Failed to submit review:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, currentIndex, filteredCards.length, submitting]
  );

  const handleDeleteCard = async (cardId: number) => {
    try {
      try {
        await apiClient.delete(`/memory/cards/${cardId}`);
      } catch {
        await apiClient.delete(`/memory/${cardId}`);
      }

      setIsFlipped(false);
      const updated = flashcards.filter((c) => c.id !== cardId);
      setFlashcards(updated);
      if (currentIndex >= updated.length && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (err) {
      console.error('Failed to delete flashcard:', err);
    }
  };

  const handleClearOrphaned = async () => {
    try {
      await apiClient.delete('/memory/orphaned');
      setShowClearConfirm(false);
      fetchCards();
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to clear orphaned flashcards:', err);
    }
  };

  const exportFlashcardsJSON = () => {
    if (filteredCards.length === 0) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(filteredCards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'studyvault_flashcards.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleGenerateSnippetCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetTitle.trim() || !snippetText.trim()) return;

    setIsGenerating(true);
    try {
      await apiClient.post('/memory/generate-from-snippet', {
        title: snippetTitle,
        snippet: snippetText
      });
      setSnippetTitle('');
      setSnippetText('');
      setShowSnippetModal(false);
      fetchCards();
    } catch (err) {
      console.error('Failed to generate snippet card:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard shortcuts handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showSnippetModal ||
        showClearConfirm ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName
        )
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped && !submitting) {
        if (e.key === '1') handleReview(1);      // Again
        else if (e.key === '2') handleReview(3); // Hard
        else if (e.key === '3') handleReview(4); // Good
        else if (e.key === '4') handleReview(5); // Easy
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, handleReview, showSnippetModal, showClearConfirm, submitting]);

  const progressPercent =
    flashcards.length > 0
      ? Math.min(100, (reviewedCount / (reviewedCount + flashcards.length)) * 100)
      : 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-3.5 animate-fadeIn pb-2 antialiased px-2 sm:px-4">
      {/* Header & Global Toolbar */}
      <div className="w-full flex items-center justify-between flex-nowrap gap-4">
        <div className="min-w-0 shrink">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 whitespace-nowrap">
            <Brain className="w-6 h-6 text-indigo-500 shrink-0" /> Spaced Repetition Review
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Review your cards to strengthen active recall retention.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 ml-auto">
          {hasOrphanedCards && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold border border-rose-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Delete all flashcards with missing source documents"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Removed Cards</span>
            </button>
          )}

          <button
            onClick={() => fetchCards()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            title="Refresh Queue"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Refresh</span>
          </button>

          {filteredCards.length > 0 && (
            <button
              onClick={exportFlashcardsJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export Flashcards</span>
            </button>
          )}

          <button
            onClick={() => setShowSnippetModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Cards from Snippet</span>
          </button>
        </div>
      </div>

      {/* Search & Topic Filter Bar */}
      {flashcards.length > 0 && (
        <div className="w-full bg-white dark:bg-slate-800/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flashcards by question or answer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentIndex(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="relative w-full sm:w-72" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between transition-all cursor-pointer hover:border-indigo-500/50"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  {selectedTopic === 'all'
                    ? `All Topics (${flashcards.length})`
                    : topicOptions.find((t) => t.value === selectedTopic)?.label || selectedTopic}
                </span>
              </div>
              {isDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-full z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-2xl space-y-1 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopic('all');
                    setCurrentIndex(0);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                    selectedTopic === 'all'
                      ? 'bg-indigo-600/15 text-indigo-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>All Topics ({flashcards.length})</span>
                  {selectedTopic === 'all' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                </button>

                {topicOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedTopic(opt.value);
                      setCurrentIndex(0);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      selectedTopic === opt.value
                        ? 'bg-indigo-600/15 text-indigo-400 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {selectedTopic === opt.value && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Flashcard Container */}
      {loading ? (
        <div className="w-full bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center space-y-3 shadow-xs">
          <RotateCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading your memory queue...
          </p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {flashcards.length === 0 ? 'All caught up for today! 🎉' : 'No matching flashcards found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {flashcards.length === 0
              ? 'You have no due flashcards in your review queue. Check back tomorrow to maintain your active study streak.'
              : 'You have no due flashcards matching your current search or topic filter.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTopic('all');
              fetchCards();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          <div className="w-full bg-white dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Card {currentIndex + 1} of {filteredCards.length}
            </span>
            <span>{Math.round(progressPercent)}% Session Progress</span>
          </div>

          <div className="w-full bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  CARD {currentIndex + 1} OF {filteredCards.length}
                </span>

                <button
                  onClick={() => handleDeleteCard(currentCard.id)}
                  className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 normal-case font-bold transition-colors cursor-pointer bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md text-[11px]"
                  title="Delete this specific flashcard"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Card</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[11px]">
                  {currentCard.topic || 'General Vault'}
                </span>

                {currentCard.repetition_number !== undefined && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> Rep #{currentCard.repetition_number}
                  </span>
                )}

                {isCardOrphaned(currentCard) && (
                  <span
                    className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[11px] font-medium"
                    title="The original document for this card has been removed, but your review progress is kept."
                  >
                    <FileX className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                    Document removed
                  </span>
                )}
              </div>
            </div>

            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="relative min-h-[190px] sm:min-h-[220px] w-full cursor-pointer group"
              style={{ perspective: '1200px' }}
            >
              <div
                className="relative w-full h-full min-h-[190px] sm:min-h-[220px] transition-transform duration-500 rounded-xl"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'translateZ(1px)'
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
                    QUESTION (CLICK TO FLIP)
                  </span>
                  <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed max-w-3xl">
                    {currentCard.question}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-3 flex items-center gap-1.5">
                    <span>Click or press</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 shadow-xs">
                      Space
                    </kbd>
                    <span>to reveal answer</span>
                  </p>
                </div>

                {/* Back Side */}
                <div
                  className="absolute inset-0 w-full h-full bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg) translateZ(1px)'
                  }}
                >
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 mb-2">
                    ANSWER
                  </span>
                  <p className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed max-w-3xl">
                    {currentCard.answer}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-3">
                    Rate your active recall difficulty below:
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Action Buttons */}
            {isFlipped ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    disabled={submitting}
                    onClick={() => handleReview(1)}
                    className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-colors cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Again</span>
                      <kbd className="px-1.5 py-0.2 bg-rose-500/20 text-[10px] font-mono rounded">1</kbd>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">&lt; 1 min</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleReview(3)}
                    className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl text-xs transition-colors cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Hard</span>
                      <kbd className="px-1.5 py-0.2 bg-amber-500/20 text-[10px] font-mono rounded">2</kbd>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">SM-2 Adjust</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleReview(4)}
                    className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs transition-colors cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Good</span>
                      <kbd className="px-1.5 py-0.2 bg-indigo-500/20 text-[10px] font-mono rounded">3</kbd>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Optimal</span>
                  </button>

                  <button
                    disabled={submitting}
                    onClick={() => handleReview(5)}
                    className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition-colors cursor-pointer flex flex-col items-center gap-0.5 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Easy</span>
                      <kbd className="px-1.5 py-0.2 bg-emerald-500/20 text-[10px] font-mono rounded">4</kbd>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Max Interval</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Show Answer</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-6 text-[11px] text-slate-600 dark:text-slate-400 font-medium pt-0.5">
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-800 dark:text-slate-200 font-bold">
                Space
              </kbd>
              Flip Card
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-800 dark:text-slate-200 font-bold">
                1-4
              </kbd>
              Rate Recall
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clear Removed Cards?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete all flashcards whose source documents have been removed? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearOrphaned}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Yes, Clear Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snippet Card Generation Modal */}
      {showSnippetModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> Generate Card from Snippet
              </h3>
              <button
                onClick={() => setShowSnippetModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateSnippetCard} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Topic / Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Computer Architecture - Cache Memory"
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Text Snippet
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste lecture notes, definitions, or textbook paragraphs here..."
                  value={snippetText}
                  onChange={(e) => setSnippetText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSnippetModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Create Flashcards</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
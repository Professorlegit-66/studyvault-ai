import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Brain, Download, CheckCircle, RotateCw, RefreshCw, Search, Filter } from 'lucide-react';

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic?: string;
  repetition_number?: number;
  interval_days?: number;
}

export const StudentMemory: React.FC = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Flashcard[]>('/memory/due');
      setFlashcards(res.data);
    } catch (err) {
      console.error('Failed to load flashcards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleReview = async (quality: number) => {
    if (filteredCards.length === 0) return;
    const card = filteredCards[currentIndex];
    try {
      await apiClient.post(`/memory/review/${card.id}`, { quality });
      setIsFlipped(false);
      if (currentIndex < filteredCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        fetchCards();
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    }
  };

  const exportFlashcardsJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredCards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "studyvault_flashcards.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const topics = Array.from(new Set(flashcards.map(c => c.topic).filter(Boolean))) as string[];

  const filteredCards = flashcards.filter(card => {
    const matchesSearch = 
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      card.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = selectedTopic === 'all' || card.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Loading your memory queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" /> Spaced Repetition Review
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Review your cards to strengthen active recall retention.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCards()}
            className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            title="Refresh Queue"
          >
            <RefreshCw className="w-4 h-4 text-indigo-500" />
            <span>Refresh</span>
          </button>
          {filteredCards.length > 0 && (
            <button
              onClick={exportFlashcardsJSON}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-500" />
              <span>Export Flashcards</span>
            </button>
          )}
        </div>
      </div>

      {flashcards.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search flashcards by question or answer..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentIndex(0); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="relative sm:w-64">
            <Filter className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <select
              value={selectedTopic}
              onChange={(e) => { setSelectedTopic(e.target.value); setCurrentIndex(0); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            >
              <option value="all">All Topics ({flashcards.length})</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredCards.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No matching flashcards found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You have no due flashcards matching your current search or topic filter.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedTopic('all'); fetchCards(); }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center text-xs font-medium text-slate-400 uppercase tracking-wider">
            <span>Card {currentIndex + 1} of {filteredCards.length}</span>
            <span>{filteredCards[currentIndex].topic || 'General Vault'}</span>
          </div>

          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[200px] p-8 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-center items-center text-center cursor-pointer transition-all"
          >
            <span className="text-xs uppercase font-semibold text-indigo-500 mb-2">
              {isFlipped ? 'Answer' : 'Question (Click to flip)'}
            </span>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-100">
              {isFlipped ? filteredCards[currentIndex].answer : filteredCards[currentIndex].question}
            </p>
          </div>

          {isFlipped ? (
            <div className="space-y-3">
              <p className="text-xs text-center text-slate-400">Rate your recall difficulty:</p>
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleReview(1)} className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-medium rounded-xl text-xs transition-colors cursor-pointer">Again</button>
                <button onClick={() => handleReview(3)} className="py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-medium rounded-xl text-xs transition-colors cursor-pointer">Hard</button>
                <button onClick={() => handleReview(4)} className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-medium rounded-xl text-xs transition-colors cursor-pointer">Good</button>
                <button onClick={() => handleReview(5)} className="py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-medium rounded-xl text-xs transition-colors cursor-pointer">Easy</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Show Answer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
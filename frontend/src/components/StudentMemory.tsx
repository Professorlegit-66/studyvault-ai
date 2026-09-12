import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Brain, RotateCw, CheckCircle2, Award, Loader2 } from 'lucide-react';

export interface Flashcard {
  id: number;
  topic: string;
  question: string;
  answer: string;
  repetition_number: number;
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
}

export const StudentMemory: React.FC = () => {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDueCards = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<Flashcard[]>('/memory/due');
      setDueCards(res.data);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      console.error('Error fetching due flashcards', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueCards();
  }, []);

  const handleReview = async (quality: number) => {
    if (dueCards.length === 0) return;
    const currentCard = dueCards[currentIndex];
    try {
      setSubmitting(true);
      await apiClient.post(`/memory/review/${currentCard.id}`, { quality });
      setIsFlipped(false);
      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Refetch to check if any cards remain or list is cleared
        fetchDueCards();
      }
    } catch (err) {
      console.error('Error submitting review score', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (dueCards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-10 rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-xl">
        <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
          <Award className="w-10 h-10" />
        </div>
        <h3 className="font-bold text-2xl text-slate-900 dark:text-slate-100">All Caught Up!</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          You have no active spaced-repetition flashcards due for review right now. Check back later or generate more from your documents!
        </p>
        <button
          onClick={fetchDueCards}
          className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
        >
          Refresh Due Cards
        </button>
      </div>
    );
  }

  const card = dueCards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-500" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Spaced Repetition Review</h3>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full">
          Card {currentIndex + 1} of {dueCards.length}
        </span>
      </div>

      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-8 min-h-[260px] flex flex-col justify-between shadow-xl cursor-pointer transition-all hover:border-indigo-500/50"
      >
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-indigo-400">{card.topic}</span>
          <span className="flex items-center gap-1">
            <RotateCw className="w-3.5 h-3.5" /> Click card to flip
          </span>
        </div>

        <div className="my-auto py-6 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400 mb-2 font-bold">
            {isFlipped ? 'Answer' : 'Question'}
          </p>
          <p className="text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
            {isFlipped ? card.answer : card.question}
          </p>
        </div>

        <div className="text-center text-xs text-slate-400">
          Repetition: {card.repetition_number} | Interval: {card.interval_days}d
        </div>
      </div>

      {isFlipped ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400 text-center">Rate your recall accuracy:</p>
          <div className="grid grid-cols-4 gap-3">
            <button
              disabled={submitting}
              onClick={() => handleReview(1)}
              className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Again (1)
            </button>
            <button
              disabled={submitting}
              onClick={() => handleReview(3)}
              className="py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Hard (3)
            </button>
            <button
              disabled={submitting}
              onClick={() => handleReview(4)}
              className="py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Good (4)
            </button>
            <button
              disabled={submitting}
              onClick={() => handleReview(5)}
              className="py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Easy (5)
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsFlipped(true)}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          Show Answer
        </button>
      )}
    </div>
  );
};
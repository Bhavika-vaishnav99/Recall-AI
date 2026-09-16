'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  MoreVertical,
  Share2,
  Maximize2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import {
  StudioArtifact,
  FlashcardsContent,
  QuizContent,
  ReportContent,
  SlidesContent,
  DataTableContent,
} from '@/modules/studio/api';

interface StudioArtifactViewProps {
  artifact: StudioArtifact;
  sourceCount: number;
}

const FLASH_DURATION_MS = 650;

const FlashcardsViewer: React.FC<{ content: FlashcardsContent }> = ({ content }) => {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const card = content.cards[index];

  const goTo = (next: number) => {
    setRevealed(false);
    setFlash(null);
    setIndex(Math.max(0, Math.min(content.cards.length - 1, next)));
  };

  const grade = (isCorrect: boolean) => {
    if (isCorrect) setCorrectCount((c) => c + 1);
    else setWrongCount((w) => w + 1);
    setFlash(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      if (index < content.cards.length - 1) {
        goTo(index + 1);
      } else {
        setFlash(null);
        setRevealed(true);
      }
    }, FLASH_DURATION_MS);
  };

  if (!card) return <p className="text-notebook-muted text-sm">No flashcards generated.</p>;

  return (
    <div className="flex flex-col items-center space-y-5">
      <div
        onClick={() => !flash && setRevealed((r) => !r)}
        className={`relative w-full max-w-md min-h-[260px] rounded-2xl p-6 flex flex-col cursor-pointer transition-colors select-none border ${
          flash === 'correct'
            ? 'bg-emerald-100 border-emerald-300'
            : flash === 'wrong'
            ? 'bg-rose-100 border-rose-300'
            : 'bg-notebook-bg border-notebook-border hover:border-indigo-500/40'
        }`}
      >
        {flash ? (
          <div className="flex-1 flex items-center justify-center">
            <p className={`text-2xl font-semibold ${flash === 'correct' ? 'text-emerald-700' : 'text-rose-600'}`}>
              {flash === 'correct' ? 'Got it' : "You'll get it next time"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-notebook-muted font-mono">
              <span>{index + 1}/{content.cards.length}</span>
              <MoreVertical className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 flex items-center justify-center text-center px-2">
              <p className="text-lg text-notebook-text leading-snug">
                {revealed ? card.answer : card.question}
              </p>
            </div>
            {!revealed && (
              <p className="text-center text-[11px] text-notebook-muted pb-1">See answer</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0 || !!flash}
          className="w-9 h-9 rounded-full bg-notebook-card border border-notebook-border text-notebook-muted hover:text-notebook-text disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => grade(false)}
          disabled={!revealed || !!flash}
          className="w-10 h-10 rounded-full border-2 border-rose-500/50 text-rose-400 flex items-center justify-center text-xs font-semibold hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
          title="Mark as incorrect"
        >
          <span className="flex items-center gap-1"><X className="w-3.5 h-3.5" />{wrongCount}</span>
        </button>

        <button
          onClick={() => grade(true)}
          disabled={!revealed || !!flash}
          className="w-10 h-10 rounded-full border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center text-xs font-semibold hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
          title="Mark as correct"
        >
          <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" />{correctCount}</span>
        </button>

        <button
          onClick={() => goTo(index + 1)}
          disabled={index === content.cards.length - 1 || !!flash}
          className="w-9 h-9 rounded-full bg-notebook-card border border-notebook-border text-notebook-muted hover:text-notebook-text disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const QuizViewer: React.FC<{ content: QuizContent }> = ({ content }) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = content.questions[index];

  const handleSelect = (optionIdx: number) => {
    if (selected !== null) return;
    setSelected(optionIdx);
    if (optionIdx === question.correct_index) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (index + 1 >= content.questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  if (finished) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-3xl font-semibold text-notebook-text">
          {score} / {content.questions.length}
        </p>
        <p className="text-sm text-notebook-muted">Quiz complete.</p>
        <button
          onClick={() => { setIndex(0); setSelected(null); setScore(0); setFinished(false); }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
        >
          Retake quiz
        </button>
      </div>
    );
  }

  if (!question) return <p className="text-notebook-muted text-sm">No quiz questions generated.</p>;

  return (
    <div className="space-y-5 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between text-xs text-notebook-muted">
        <span>Question {index + 1} of {content.questions.length}</span>
        <span>Score: {score}</span>
      </div>

      <p className="text-sm font-medium text-notebook-text">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((option, optIdx) => {
          const isCorrect = optIdx === question.correct_index;
          const isSelected = optIdx === selected;
          let stateClasses = 'border-notebook-border hover:border-notebook-subtle bg-notebook-bg';
          if (selected !== null) {
            if (isCorrect) stateClasses = 'border-emerald-500/50 bg-emerald-500/10';
            else if (isSelected) stateClasses = 'border-rose-500/50 bg-rose-500/10';
          }
          return (
            <button
              key={optIdx}
              onClick={() => handleSelect(optIdx)}
              disabled={selected !== null}
              className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs text-notebook-text transition-colors flex items-center justify-between ${stateClasses}`}
            >
              <span>{option}</span>
              {selected !== null && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              {selected !== null && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="bg-notebook-bg border border-notebook-border rounded-xl p-3 text-xs text-notebook-muted leading-relaxed">
          {question.explanation}
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={selected === null}
        className="w-full py-2.5 rounded-xl bg-notebook-text text-notebook-bg text-xs font-semibold disabled:opacity-40 hover:bg-white transition-colors"
      >
        {index + 1 >= content.questions.length ? 'Finish' : 'Next question'}
      </button>
    </div>
  );
};

const ReportViewer: React.FC<{ content: ReportContent }> = ({ content }) => (
  <div className="space-y-5 max-w-2xl">
    <p className="text-sm text-notebook-text leading-relaxed">{content.summary}</p>
    {content.sections.map((section, idx) => (
      <div key={idx} className="space-y-1.5">
        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{section.heading}</h4>
        <p className="text-sm text-notebook-text leading-relaxed">{section.content}</p>
      </div>
    ))}
  </div>
);

const SlidesViewer: React.FC<{ content: SlidesContent }> = ({ content }) => {
  const [index, setIndex] = useState(0);
  const slide = content.slides[index];
  if (!slide) return <p className="text-notebook-muted text-sm">No slides generated.</p>;

  return (
    <div className="space-y-5 max-w-md mx-auto w-full">
      <div className="w-full min-h-[220px] bg-notebook-bg border border-notebook-border rounded-2xl p-6 flex flex-col justify-center space-y-3">
        <h4 className="text-base font-semibold text-notebook-text">{slide.title}</h4>
        <ul className="space-y-1.5">
          {slide.bullets.map((bullet, i) => (
            <li key={i} className="text-sm text-notebook-muted flex items-start space-x-2">
              <span className="text-indigo-400 mt-1">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="w-9 h-9 rounded-full bg-notebook-card border border-notebook-border text-notebook-muted hover:text-notebook-text disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-notebook-muted font-mono">{index + 1} / {content.slides.length}</span>
        <button
          onClick={() => setIndex((i) => Math.min(content.slides.length - 1, i + 1))}
          disabled={index === content.slides.length - 1}
          className="w-9 h-9 rounded-full bg-notebook-card border border-notebook-border text-notebook-muted hover:text-notebook-text disabled:opacity-30 transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const DataTableViewer: React.FC<{ content: DataTableContent }> = ({ content }) => (
  <div className="overflow-x-auto rounded-xl border border-notebook-border">
    <table className="w-full text-xs text-left">
      <thead className="bg-notebook-bg text-notebook-muted uppercase text-[10px]">
        <tr>
          {content.columns.map((col, i) => (
            <th key={i} className="px-3 py-2 font-semibold whitespace-nowrap">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {content.rows.map((row, rIdx) => (
          <tr key={rIdx} className="border-t border-notebook-border/60">
            {row.map((cell, cIdx) => (
              <td key={cIdx} className="px-3 py-2 text-notebook-text align-top">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const StudioArtifactView: React.FC<StudioArtifactViewProps> = ({ artifact, sourceCount }) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-notebook-border/50 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notebook-text truncate pr-2">{artifact.title}</h2>
          <div className="flex items-center space-x-1 text-notebook-muted shrink-0">
            <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors" title="Share">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors" title="Expand">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors" title="More">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button className="flex items-center space-x-1.5 text-[11px] text-notebook-muted bg-notebook-card hover:bg-notebook-hover border border-notebook-border px-2.5 py-1 rounded-full transition-colors">
          <span>View {sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
        {artifact.type === 'flashcards' && <FlashcardsViewer content={artifact.content as FlashcardsContent} />}
        {artifact.type === 'quiz' && <QuizViewer content={artifact.content as QuizContent} />}
        {artifact.type === 'report' && <ReportViewer content={artifact.content as ReportContent} />}
        {artifact.type === 'slides' && <SlidesViewer content={artifact.content as SlidesContent} />}
        {artifact.type === 'datatable' && <DataTableViewer content={artifact.content as DataTableContent} />}
      </div>

      <div className="px-5 py-3 border-t border-notebook-border/40 flex items-center space-x-2 shrink-0">
        <button
          onClick={() => setFeedback('up')}
          className={`flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
            feedback === 'up'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'border-notebook-border text-notebook-muted hover:text-notebook-text'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span>Good content</span>
        </button>
        <button
          onClick={() => setFeedback('down')}
          className={`flex items-center space-x-1.5 text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
            feedback === 'down'
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              : 'border-notebook-border text-notebook-muted hover:text-notebook-text'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          <span>Bad content</span>
        </button>
      </div>
    </div>
  );
};

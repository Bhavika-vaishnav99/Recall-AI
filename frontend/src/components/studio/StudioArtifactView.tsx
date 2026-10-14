'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  X,
  Check,
  MoreVertical,
  Share2,
  Maximize2,
  Minimize2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { ShareNotebookModal } from '../layout/ShareNotebookModal';
import {
  StudioArtifact,
  FlashcardsContent,
  QuizContent,
  QuizQuestion,
  ReportContent,
  SlidesContent,
  DataTableContent,
} from '@/modules/studio/api';

interface StudioArtifactViewProps {
  artifact: StudioArtifact;
  sourceCount: number;
  onClose?: () => void;
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
    <div className="flex flex-col items-center space-y-6">
      <div className="relative w-full max-w-md">
        {/* Card peeking out behind, so the stack reads as a deck */}
        {flash && (
          <div
            aria-hidden
            className={`absolute inset-0 rounded-[28px] rotate-[3deg] translate-y-1.5 ${
              flash === 'correct' ? 'bg-emerald-950/60' : 'bg-rose-950/60'
            }`}
          />
        )}
        <div
          onClick={() => !flash && setRevealed((r) => !r)}
          className={`relative w-full min-h-[280px] rounded-[28px] p-6 flex flex-col cursor-pointer select-none border transition-all duration-300 ${
            flash === 'correct'
              ? 'bg-emerald-100 border-emerald-200 -rotate-[2deg] shadow-2xl'
              : flash === 'wrong'
              ? 'bg-rose-100 border-rose-200 -rotate-[2deg] shadow-2xl'
              : 'bg-notebook-bg border-notebook-border hover:border-[#a8c7fa]/40'
          }`}
        >
        {flash ? (
          <div className="flex-1 flex items-center justify-center px-2">
            <p
              className={`text-3xl italic font-medium text-center ${
                flash === 'correct' ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
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
      </div>

      <div className="flex items-center space-x-5">
        <button
          onClick={() => goTo(index - 1)}
          disabled={index === 0 || !!flash}
          className="w-11 h-11 rounded-full bg-notebook-card border border-notebook-border text-[#a8c7fa] hover:bg-notebook-hover disabled:opacity-30 transition-colors flex items-center justify-center"
          title="Previous card"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => grade(false)}
          disabled={!revealed || !!flash}
          className="h-11 px-4 rounded-full border border-notebook-border flex items-center gap-2 text-sm font-medium text-notebook-text hover:bg-rose-500/10 disabled:opacity-30 transition-colors"
          title="Mark as incorrect"
        >
          <X className="w-4 h-4 text-rose-400" />
          <span>{wrongCount}</span>
        </button>

        <button
          onClick={() => grade(true)}
          disabled={!revealed || !!flash}
          className="h-11 px-4 rounded-full border border-notebook-border flex items-center gap-2 text-sm font-medium text-notebook-text hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
          title="Mark as correct"
        >
          <span>{correctCount}</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => goTo(index + 1)}
          disabled={index === content.cards.length - 1 || !!flash}
          className="w-11 h-11 rounded-full bg-notebook-card border border-notebook-border text-[#a8c7fa] hover:bg-notebook-hover disabled:opacity-30 transition-colors flex items-center justify-center"
          title="Next card"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple choice',
  multiple_select: 'Multiple select',
  fill_blank: 'Fill in the blank',
  short_answer: 'Short answer',
};

/** Older quizzes stored `correct_index` and no `type`; fill in the modern shape. */
function normalizeQuestion(q: QuizQuestion) {
  const correctIndices =
    q.correct_indices ?? (typeof q.correct_index === 'number' ? [q.correct_index] : []);
  const options = q.options || [];
  let type = q.type;
  if (!type) {
    if (options.length === 0 && q.answer) type = 'short_answer';
    else type = correctIndices.length > 1 ? 'multiple_select' : 'multiple_choice';
  }
  return { ...q, type, options, correctIndices, answer: q.answer || '' };
}

const QuizViewer: React.FC<{ content: QuizContent }> = ({ content }) => {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const raw = content.questions[index];
  const question = raw ? normalizeQuestion(raw) : null;
  const isChoice =
    question?.type === 'multiple_choice' || question?.type === 'multiple_select';

  const resetForNext = () => {
    setPicked([]);
    setTypedAnswer('');
    setSubmitted(false);
  };

  const gradeChoice = () => {
    if (!question) return false;
    const correct = [...question.correctIndices].sort().join(',');
    const chosen = [...picked].sort().join(',');
    return correct === chosen;
  };

  const gradeText = () => {
    if (!question) return false;
    const norm = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:"']/g, '');
    const expected = norm(question.answer);
    const given = norm(typedAnswer);
    if (!given) return false;
    // Fill-in-the-blank has one short expected term, so require a close match;
    // short answer is graded leniently since phrasing legitimately varies.
    return question.type === 'fill_blank'
      ? given === expected || expected.includes(given) || given.includes(expected)
      : expected.split(/\s+/).filter((w) => w.length > 4).some((w) => given.includes(w));
  };

  const handleOptionClick = (optIdx: number) => {
    if (submitted || !question) return;
    if (question.type === 'multiple_choice') {
      setPicked([optIdx]);
    } else {
      setPicked((prev) =>
        prev.includes(optIdx) ? prev.filter((i) => i !== optIdx) : [...prev, optIdx]
      );
    }
  };

  const handleSubmit = () => {
    if (submitted) return;
    const wasCorrect = isChoice ? gradeChoice() : gradeText();
    if (wasCorrect) setScore((s) => s + 1);
    setSubmitted(true);
  };

  const handleNext = () => {
    if (index + 1 >= content.questions.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    resetForNext();
  };

  if (finished) {
    return (
      <div className="text-center space-y-3 py-8">
        <p className="text-3xl font-semibold text-notebook-text">
          {score} / {content.questions.length}
        </p>
        <p className="text-sm text-notebook-muted">Quiz complete.</p>
        <button
          onClick={() => {
            setIndex(0);
            setScore(0);
            setFinished(false);
            resetForNext();
          }}
          className="text-xs text-[#a8c7fa] hover:text-[#c2d9fb] font-medium"
        >
          Retake quiz
        </button>
      </div>
    );
  }

  if (!question) return <p className="text-notebook-muted text-sm">No quiz questions generated.</p>;

  const answeredCorrectly = submitted && (isChoice ? gradeChoice() : gradeText());
  const canSubmit = isChoice ? picked.length > 0 : typedAnswer.trim().length > 0;

  return (
    <div className="space-y-5 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between text-xs text-notebook-muted">
        <span>
          Question {index + 1} of {content.questions.length}
        </span>
        <span>Score: {score}</span>
      </div>

      <div className="space-y-2">
        <span className="inline-block text-[10px] uppercase tracking-wide text-notebook-muted border border-notebook-border rounded-full px-2 py-0.5">
          {QUESTION_TYPE_LABELS[question.type] || 'Question'}
        </span>
        <p className="text-sm font-medium text-notebook-text">{question.question}</p>
        {question.type === 'multiple_select' && !submitted && (
          <p className="text-[11px] text-notebook-muted">Select all that apply.</p>
        )}
      </div>

      {isChoice ? (
        <div className="space-y-2">
          {question.options.map((option, optIdx) => {
            const isCorrect = question.correctIndices.includes(optIdx);
            const isPicked = picked.includes(optIdx);
            let stateClasses = 'border-notebook-border hover:border-notebook-subtle bg-notebook-bg';
            if (submitted) {
              if (isCorrect) stateClasses = 'border-emerald-500/50 bg-emerald-500/10';
              else if (isPicked) stateClasses = 'border-rose-500/50 bg-rose-500/10';
            } else if (isPicked) {
              stateClasses = 'border-[#a8c7fa]/50 bg-[#a8c7fa]/10';
            }
            return (
              <button
                key={optIdx}
                onClick={() => handleOptionClick(optIdx)}
                disabled={submitted}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs text-notebook-text transition-colors flex items-center justify-between gap-2 ${stateClasses}`}
              >
                <span>{option}</span>
                {submitted && isCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                {submitted && isPicked && !isCorrect && (
                  <X className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                {!submitted && isPicked && (
                  <span className="w-3.5 h-3.5 rounded-sm bg-[#a8c7fa] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            disabled={submitted}
            placeholder={question.type === 'fill_blank' ? 'Type the missing term' : 'Type your answer'}
            className={`w-full bg-notebook-bg text-notebook-text text-xs px-4 py-2.5 rounded-xl border focus:outline-none placeholder:text-notebook-subtle disabled:opacity-70 ${
              submitted
                ? answeredCorrectly
                  ? 'border-emerald-500/50'
                  : 'border-rose-500/50'
                : 'border-notebook-border focus:border-[#a8c7fa]/60'
            }`}
          />
          {submitted && (
            <div className="bg-notebook-bg border border-notebook-border rounded-xl p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-notebook-muted">
                Expected answer
              </p>
              <p className="text-xs text-notebook-text leading-relaxed">{question.answer}</p>
            </div>
          )}
        </div>
      )}

      {submitted && (
        <div
          className={`text-xs font-medium ${
            answeredCorrectly ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {answeredCorrectly ? 'Correct' : 'Not quite'}
        </div>
      )}

      {submitted && question.explanation && (
        <div className="bg-notebook-bg border border-notebook-border rounded-xl p-3 text-xs text-notebook-muted leading-relaxed">
          {question.explanation}
        </div>
      )}

      <button
        onClick={submitted ? handleNext : handleSubmit}
        disabled={!submitted && !canSubmit}
        className="w-full py-2.5 rounded-xl bg-notebook-text text-notebook-bg text-xs font-semibold disabled:opacity-40 hover:bg-white transition-colors"
      >
        {!submitted
          ? 'Check answer'
          : index + 1 >= content.questions.length
          ? 'Finish'
          : 'Next question'}
      </button>
    </div>
  );
};

const ReportViewer: React.FC<{ content: ReportContent }> = ({ content }) => (
  <div className="space-y-5 max-w-2xl">
    <p className="text-sm text-notebook-text leading-relaxed">{content.summary}</p>
    {content.sections.map((section, idx) => (
      <div key={idx} className="space-y-1.5">
        <h4 className="text-xs font-semibold text-[#a8c7fa] uppercase tracking-wide">{section.heading}</h4>
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
              <span className="text-[#a8c7fa] mt-1">•</span>
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

export const StudioArtifactView: React.FC<StudioArtifactViewProps> = ({
  artifact,
  sourceCount,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const renderContent = () => (
    <>
      {artifact.type === 'flashcards' && <FlashcardsViewer content={artifact.content as FlashcardsContent} />}
      {artifact.type === 'quiz' && <QuizViewer content={artifact.content as QuizContent} />}
      {artifact.type === 'report' && <ReportViewer content={artifact.content as ReportContent} />}
      {artifact.type === 'slides' && <SlidesViewer content={artifact.content as SlidesContent} />}
      {artifact.type === 'datatable' && <DataTableViewer content={artifact.content as DataTableContent} />}
    </>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-notebook-bg flex flex-col p-6 overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between border-b border-notebook-border/50 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-notebook-text">{artifact.title}</h2>
            <span className="text-xs text-notebook-muted bg-notebook-card border border-notebook-border px-2.5 py-1 rounded-full">
              {sourceCount} source{sourceCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-xl transition-colors"
              title="Exit fullscreen"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={() => {
                  setIsExpanded(false);
                  onClose();
                }}
                className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-xl transition-colors"
                title="Close section"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center max-w-4xl mx-auto w-full">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-notebook-border/50 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-notebook-text truncate pr-2">{artifact.title}</h2>
          <div className="flex items-center space-x-1 text-notebook-muted shrink-0">
            <Tooltip content="Share this studio output" position="left">
              <button
                onClick={() => setIsShareOpen(true)}
                className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <Tooltip content="Expand view to full screen" position="left">
              <button
                onClick={() => setIsExpanded(true)}
                className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            <Tooltip content="More options" position="left">
              <button className="p-1.5 hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </Tooltip>

            {onClose && (
              <Tooltip content="Close view and return to Studio" position="left">
                <button
                  onClick={onClose}
                  className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors ml-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <Tooltip content="Sources grounded to generate this output" position="right">
          <button className="flex items-center space-x-1.5 text-[11px] text-notebook-muted bg-notebook-card hover:bg-notebook-hover border border-notebook-border px-2.5 py-1 rounded-full transition-colors">
            <span>View {sourceCount} source{sourceCount !== 1 ? 's' : ''}</span>
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
        {renderContent()}
      </div>

      <div className="px-5 py-3 border-t border-notebook-border/40 flex items-center space-x-2 shrink-0">
        <Tooltip content="Mark content as high quality and accurate" position="top">
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
        </Tooltip>

        <Tooltip content="Mark content as inaccurate or unhelpful" position="top">
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
        </Tooltip>
      </div>

      {isShareOpen && (
        <ShareNotebookModal
          notebookTitle={artifact.title}
          onClose={() => setIsShareOpen(false)}
        />
      )}
    </div>
  );
};

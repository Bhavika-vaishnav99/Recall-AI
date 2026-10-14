'use client';

import React, { useEffect, useState } from 'react';
import { X, Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  StudioArtifactType,
  StudioGenerateOptions,
  DEFAULT_STUDIO_OPTIONS,
  CountPreset,
  DifficultyLevel,
  QuestionType,
} from '@/modules/studio/api';
import { fetchNotebookSources, Source } from '@/modules/sources/api';

interface StudioGenerateDialogProps {
  notebookId: string;
  tool: { id: StudioArtifactType; label: string; icon: React.ElementType };
  generating: boolean;
  /** Generations already run in this notebook today, for the usage meter. */
  usedToday: number;
  onClose: () => void;
  onGenerate: (options: StudioGenerateOptions, defer: boolean) => void;
}

/** Soft daily guideline the usage meter is drawn against. */
const DAILY_GENERATION_GUIDE = 20;

const COUNT_LABELS: Record<CountPreset, string> = {
  fewer: 'Fewer',
  standard: 'Standard (default)',
  more: 'More',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium (default)',
  hard: 'Hard',
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple choice',
  multiple_select: 'Multiple select',
  fill_blank: 'Fill in the blank',
  short_answer: 'Short answer',
};

/** Which controls make sense for each output type. */
const SHOWS_DIFFICULTY: StudioArtifactType[] = ['quiz', 'flashcards', 'report'];

const COUNT_NOUN: Record<StudioArtifactType, string> = {
  quiz: 'Number of questions',
  flashcards: 'Number of cards',
  slides: 'Number of slides',
  report: 'Number of sections',
  datatable: 'Number of rows',
};

const TOPIC_HINTS: Record<StudioArtifactType, string[]> = {
  quiz: [
    'Create a quiz to help me prepare for my exam on this material',
    "The quiz must focus solely on the key concepts of the RAG architecture",
    'Only cover the account management section',
  ],
  flashcards: [
    'Focus on definitions and terminology I need to memorise',
    'Only make cards about the troubleshooting advice',
  ],
  slides: [
    'Build a deck I can present to non-technical stakeholders',
    'Focus the deck on how the system handles user questions',
  ],
  report: [
    'Write it as an executive briefing for a product manager',
    'Focus the report on the privacy and data storage details',
  ],
  datatable: [
    'One row per FAQ, with columns for question, answer and category',
    'Compare each feature against when it is available',
  ],
};

const Segmented = <T extends string>({
  values,
  labels,
  active,
  onSelect,
}: {
  values: T[];
  labels: Record<T, string>;
  active: T;
  onSelect: (value: T) => void;
}) => (
  <div className="inline-flex rounded-full border border-notebook-border overflow-hidden">
    {values.map((value) => {
      const isActive = value === active;
      return (
        <button
          key={value}
          onClick={() => onSelect(value)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs transition-colors ${
            isActive
              ? 'bg-notebook-hover text-notebook-text font-medium'
              : 'text-notebook-muted hover:text-notebook-text'
          }`}
        >
          {isActive && <Check className="w-3.5 h-3.5" />}
          <span>{labels[value]}</span>
        </button>
      );
    })}
  </div>
);

export const StudioGenerateDialog: React.FC<StudioGenerateDialogProps> = ({
  notebookId,
  tool,
  generating,
  usedToday,
  onClose,
  onGenerate,
}) => {
  const [options, setOptions] = useState<StudioGenerateOptions>({
    ...DEFAULT_STUDIO_OPTIONS,
  });
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    fetchNotebookSources(notebookId)
      .then((data) => {
        setSources(data);
        setOptions((prev) => ({
          ...prev,
          source_ids: data.filter((s) => s.is_active).map((s) => s.id),
        }));
      })
      .catch((err) => console.error('Failed to load sources:', err));
  }, [notebookId]);

  const selectedIds = options.source_ids || [];

  const toggleSource = (sourceId: string) => {
    setOptions((prev) => {
      const current = prev.source_ids || [];
      const next = current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId];
      return { ...prev, source_ids: next };
    });
  };

  const toggleQuestionType = (type: QuestionType) => {
    setOptions((prev) => {
      const active = prev.question_types.includes(type);
      // Never let the user clear every type — there'd be nothing to generate.
      if (active && prev.question_types.length === 1) return prev;
      return {
        ...prev,
        question_types: active
          ? prev.question_types.filter((t) => t !== type)
          : [...prev.question_types, type],
      };
    });
  };

  const Icon = tool.icon;
  const canGenerate = selectedIds.length > 0 && !generating;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-notebook-card border border-notebook-border rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-notebook-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-notebook-bg border border-notebook-border flex items-center justify-center text-[#a8c7fa]">
              <Icon className="w-4 h-4" />
            </div>
            <h2 className="text-base font-medium text-notebook-text">{tool.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-notebook-hover text-notebook-text hover:bg-notebook-active transition-colors flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2.5">
              <p className="text-sm text-notebook-text">{COUNT_NOUN[tool.id]}</p>
              <Segmented<CountPreset>
                values={['fewer', 'standard', 'more']}
                labels={COUNT_LABELS}
                active={options.count}
                onSelect={(count) => setOptions((prev) => ({ ...prev, count }))}
              />
            </div>

            {SHOWS_DIFFICULTY.includes(tool.id) && (
              <div className="space-y-2.5">
                <p className="text-sm text-notebook-text">Level of difficulty</p>
                <Segmented<DifficultyLevel>
                  values={['easy', 'medium', 'hard']}
                  labels={DIFFICULTY_LABELS}
                  active={options.difficulty}
                  onSelect={(difficulty) => setOptions((prev) => ({ ...prev, difficulty }))}
                />
              </div>
            )}
          </div>

          {tool.id === 'quiz' && (
            <div className="space-y-2.5">
              <p className="text-sm text-notebook-text flex items-center gap-2">
                <span>Question types</span>
                <span className="text-[10px] font-semibold text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded-full px-2 py-0.5">
                  New!
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((type) => {
                  const isActive = options.question_types.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleQuestionType(type)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs transition-colors ${
                        isActive
                          ? 'bg-notebook-hover border-notebook-subtle text-notebook-text font-medium'
                          : 'border-notebook-border text-notebook-muted hover:text-notebook-text'
                      }`}
                    >
                      {isActive && <Check className="w-3.5 h-3.5" />}
                      <span>{QUESTION_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sources */}
          <div className="space-y-2.5">
            <p className="text-sm text-notebook-text">Sources</p>
            <div className="relative inline-block">
              <button
                onClick={() => setSourcesOpen((v) => !v)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-notebook-border text-xs text-notebook-text hover:bg-notebook-hover transition-colors"
              >
                <span>
                  {selectedIds.length} source{selectedIds.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-notebook-muted" />
              </button>

              {sourcesOpen && (
                <div className="absolute left-0 top-11 w-72 max-h-56 overflow-y-auto bg-notebook-card border border-notebook-border rounded-xl shadow-xl py-1 z-20">
                  {sources.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-notebook-muted">
                      No sources in this notebook yet.
                    </p>
                  ) : (
                    sources.map((source) => {
                      const checked = selectedIds.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-notebook-text hover:bg-notebook-hover text-left"
                        >
                          <span className="truncate">{source.title}</span>
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked
                                ? 'bg-[#a8c7fa] border-[#a8c7fa] text-[#131314]'
                                : 'border-notebook-subtle'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" />}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {selectedIds.length === 0 && (
              <p className="text-[11px] text-rose-400">Select at least one source.</p>
            )}
          </div>

          {/* Topic */}
          <div className="space-y-2.5">
            <p className="text-sm text-notebook-text">What should the topic be?</p>
            <textarea
              value={options.topic || ''}
              onChange={(e) => setOptions((prev) => ({ ...prev, topic: e.target.value }))}
              className="w-full bg-notebook-bg text-notebook-text text-xs px-4 py-3 rounded-xl border border-notebook-border focus:outline-none focus:border-[#a8c7fa]/60 min-h-[120px] resize-none placeholder:text-notebook-subtle"
              placeholder={`Things to try\n${TOPIC_HINTS[tool.id]
                .map((hint) => `  • ${hint}`)
                .join('\n')}`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-notebook-border flex items-center justify-between gap-4 shrink-0">
          {/* AI usage: generations already run in this notebook today */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] text-notebook-muted shrink-0">AI usage</span>
            <div className="space-y-1.5 min-w-0">
              <div className="w-32 h-1 rounded-full bg-notebook-border overflow-hidden flex">
                <div
                  className="h-full bg-notebook-subtle"
                  style={{ width: `${Math.min(100, (usedToday / DAILY_GENERATION_GUIDE) * 100)}%` }}
                />
                <div
                  className="h-full bg-[#a8c7fa]"
                  style={{ width: `${Math.min(100, (1 / DAILY_GENERATION_GUIDE) * 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-notebook-muted">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-notebook-subtle" />
                  Already used
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a8c7fa]" />
                  Estimated use
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onGenerate(options, true)}
              disabled={!canGenerate}
              title="Queue this for the next off-peak window"
              className="text-xs font-medium text-notebook-text px-4 py-2.5 rounded-full border border-notebook-border hover:bg-notebook-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate later
            </button>
            <button
              onClick={() => onGenerate(options, false)}
              disabled={!canGenerate}
              className="flex items-center gap-2 bg-[#004a77] hover:bg-[#004a77]/80 text-[#a8c7fa] border border-[#a8c7fa]/20 text-xs font-semibold px-5 py-2.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{generating ? 'Generating…' : 'Generate now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

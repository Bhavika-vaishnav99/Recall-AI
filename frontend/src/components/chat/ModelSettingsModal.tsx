'use client';

import React, { useState } from 'react';
import { X, Sliders, Cpu, Sparkles, Zap, Check, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

export interface ModelSettings {
  modelName: string;
  temperature: number;
  maxTokens: number;
  systemPromptPreset: string;
  topP: number;
}

interface ModelSettingsModalProps {
  currentSettings: ModelSettings;
  onClose: () => void;
  onSave: (settings: ModelSettings) => void;
}

const AVAILABLE_MODELS = [
  {
    id: 'Gemini 2.5 Flash',
    name: 'Gemini 2.5 Flash',
    tag: 'Recommended',
    description: 'Fast, state-of-the-art multimodal model optimized for low latency and high quality.',
    badgeColor: 'bg-[#a8c7fa]/10 text-[#c2d9fb] border-[#a8c7fa]/30',
  },
  {
    id: 'Gemini 1.5 Pro',
    name: 'Gemini 1.5 Pro',
    tag: 'Complex Reasoning',
    description: 'Best for complex multi-step reasoning, deep synthesis across large documents, and coding.',
    badgeColor: 'bg-[#a8c7fa]/10 text-[#a8c7fa] border-[#a8c7fa]/30',
  },
  {
    id: 'Gemini 1.5 Flash',
    name: 'Gemini 1.5 Flash',
    tag: 'Fast & Light',
    description: 'Lightweight model tuned for speed and efficiency on standard QA and summaries.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  {
    id: 'Gemini 2.0 Flash',
    name: 'Gemini 2.0 Flash',
    tag: 'Experimental',
    description: 'Next-gen experimental flash model with ultra-fast responsiveness.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
];

const PROMPT_PRESETS = [
  { id: 'default', label: 'Balanced Assistant', desc: 'Standard grounded response style' },
  { id: 'concise', label: 'Concise & Direct', desc: 'Short, bulleted, and key takeaway focus' },
  { id: 'academic', label: 'Academic & Detailed', desc: 'In-depth analysis with formal structure' },
  { id: 'code', label: 'Code & Data Focus', desc: 'Emphasizes technical accuracy and code snippets' },
];

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  currentSettings,
  onClose,
  onSave,
}) => {
  const [selectedModel, setSelectedModel] = useState(currentSettings.modelName);
  const [temperature, setTemperature] = useState(currentSettings.temperature);
  const [maxTokens, setMaxTokens] = useState(currentSettings.maxTokens);
  const [systemPreset, setSystemPreset] = useState(currentSettings.systemPromptPreset);
  const [topP, setTopP] = useState(currentSettings.topP);

  const handleSave = () => {
    onSave({
      modelName: selectedModel,
      temperature,
      maxTokens,
      systemPromptPreset: systemPreset,
      topP,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-notebook-card border border-notebook-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-notebook-border flex items-center justify-between bg-notebook-bg/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#a8c7fa]/10 border border-[#a8c7fa]/20 flex items-center justify-center text-[#a8c7fa]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-notebook-text">Model & Parameter Settings</h2>
              <p className="text-[11px] text-notebook-muted">Configure AI generation parameters for this notebook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-notebook-muted hover:text-notebook-text rounded-lg hover:bg-notebook-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Active Model Selection */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-notebook-text flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#a8c7fa]" />
                Select AI Model
              </span>
              <span className="text-[11px] text-notebook-muted font-normal">Provider: Google Gemini</span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-[#a8c7fa]/10 border-[#a8c7fa]/50 ring-1 ring-[#a8c7fa]/20'
                        : 'bg-notebook-bg/60 border-notebook-border/70 hover:border-notebook-subtle hover:bg-notebook-bg'
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-notebook-text">{model.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${model.badgeColor}`}>
                          {model.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-notebook-muted leading-relaxed">{model.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-[#a8c7fa] bg-[#a8c7fa] text-[#131314]'
                          : 'border-notebook-border bg-notebook-card'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-notebook-border/50" />

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-notebook-text flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa]" />
                Temperature (Creativity)
              </label>
              <span className="text-xs font-mono font-medium text-[#a8c7fa] bg-[#a8c7fa]/10 px-2 py-0.5 rounded border border-[#a8c7fa]/20">
                {temperature.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[#a8c7fa] bg-notebook-bg rounded-lg h-1.5 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[10px] text-notebook-muted pt-0.5">
              <span>Precise / Fact-based (0.0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative / Expressive (1.0)</span>
            </div>
          </div>

          {/* Preset Persona */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-notebook-text flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Response Style Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROMPT_PRESETS.map((preset) => {
                const isSelected = systemPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSystemPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#a8c7fa]/10 border-[#a8c7fa]/40 text-notebook-text'
                        : 'bg-notebook-bg/40 border-notebook-border/60 text-notebook-muted hover:bg-notebook-bg hover:text-notebook-text'
                    }`}
                  >
                    <div className="text-xs font-medium">{preset.label}</div>
                    <div className="text-[10px] text-notebook-muted truncate mt-0.5">{preset.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced: Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-notebook-text flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                Max Output Tokens
              </label>
              <select
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="bg-notebook-bg text-notebook-text text-xs px-3 py-1 rounded-lg border border-notebook-border focus:outline-none focus:border-[#a8c7fa]/60"
              >
                <option value={1024}>1,024 tokens (~750 words)</option>
                <option value={2048}>2,048 tokens (~1500 words)</option>
                <option value={4096}>4,096 tokens (~3000 words)</option>
                <option value={8192}>8,192 tokens (~6000 words)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-notebook-border bg-notebook-bg/50 flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedModel('Gemini 2.5 Flash');
              setTemperature(0.7);
              setMaxTokens(4096);
              setSystemPreset('default');
              setTopP(0.95);
            }}
            className="text-xs text-notebook-muted hover:text-notebook-text transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-notebook-muted hover:text-notebook-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-[#004a77] hover:bg-[#004a77]/80 text-[#a8c7fa] text-xs font-medium px-4 py-1.5 rounded-lg transition-colors shadow-md shadow-[#004a77]/20"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

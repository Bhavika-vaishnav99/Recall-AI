'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Moon, Sun, Check } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Detect current active theme from document element or localStorage
    const isLight = document.documentElement.classList.contains('light') || localStorage.getItem('theme') === 'light';
    setThemeMode(isLight ? 'light' : 'dark');
  }, []);

  const handleSaveSettings = () => {
    if (themeMode === 'light') {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
    window.dispatchEvent(new Event('themechange'));

    setSaveSuccessMsg('Theme settings applied!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-notebook-card border border-notebook-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-notebook-border flex items-center justify-between bg-notebook-bg/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#a8c7fa]/10 border border-[#a8c7fa]/20 flex items-center justify-center text-[#a8c7fa]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-notebook-text">Settings</h2>
              <p className="text-[11px] text-notebook-muted">Manage theme mode preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-notebook-muted hover:text-notebook-text rounded-lg hover:bg-notebook-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-notebook-text flex items-center gap-2">
              {themeMode === 'dark' ? (
                <Moon className="w-4 h-4 text-[#a8c7fa]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span>Theme Mode</span>
            </label>
            
            {/* Dropdown with Dark Mode and Light Mode */}
            <select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value as 'dark' | 'light')}
              className="w-full bg-notebook-bg text-notebook-text text-xs px-3.5 py-2.5 rounded-xl border border-notebook-border focus:outline-none focus:border-[#a8c7fa]/60 cursor-pointer font-medium shadow-sm"
            >
              <option value="dark" className="bg-notebook-card text-notebook-text">Dark mode</option>
              <option value="light" className="bg-notebook-card text-notebook-text">Light mode</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-notebook-border bg-notebook-bg/50 flex items-center justify-between">
          {saveSuccessMsg ? (
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" /> {saveSuccessMsg}
            </span>
          ) : (
            <span className="text-[11px] text-notebook-muted">Select your theme preference</span>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-notebook-muted hover:text-notebook-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              className="bg-[#004a77] hover:bg-[#004a77]/80 text-[#a8c7fa] text-xs font-semibold px-5 py-2 rounded-xl transition-colors shadow-md shadow-[#004a77]/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Globe, Lock, UserPlus, UserCheck, ShieldCheck, ChevronDown, Trash2 } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';

interface ShareNotebookModalProps {
  notebookTitle: string;
  onClose: () => void;
}

interface Collaborator {
  id: string;
  email: string;
  role: 'Viewer' | 'Editor';
}

export const ShareNotebookModal: React.FC<ShareNotebookModalProps> = ({
  notebookTitle,
  onClose,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Viewer' | 'Editor'>('Viewer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: '1', email: 'colleague@organization.com', role: 'Viewer' },
  ]);
  const [accessLevel, setAccessLevel] = useState<'restricted' | 'anyone'>('anyone');
  const [linkRole, setLinkRole] = useState<'Viewer' | 'Editor'>('Viewer');
  const [copied, setCopied] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) return;

    const newCollab: Collaborator = {
      id: Date.now().toString(),
      email: emailInput.trim(),
      role: selectedRole,
    };

    setCollaborators((prev) => [...prev, newCollab]);
    setInviteSuccess(`Invited ${emailInput.trim()} as ${selectedRole}`);
    setEmailInput('');
    setTimeout(() => setInviteSuccess(null), 3000);
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-notebook-card border border-notebook-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-notebook-border flex items-center justify-between bg-notebook-bg/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#a8c7fa]/10 border border-[#a8c7fa]/20 flex items-center justify-center text-[#a8c7fa]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-notebook-text">
                Share &lsquo;{notebookTitle || 'Untitled notebook'}&rsquo;
              </h2>
              <p className="text-[11px] text-notebook-muted">Manage collaborators and general access permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-notebook-muted hover:text-notebook-text rounded-lg hover:bg-notebook-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {/* Invite Input */}
          <form onSubmit={handleAddCollaborator} className="space-y-2">
            <label className="text-xs font-semibold text-notebook-text">Add people or groups</label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                placeholder="Enter email address..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-notebook-bg text-notebook-text text-xs px-3.5 py-2.5 rounded-xl border border-notebook-border focus:outline-none focus:border-[#a8c7fa]/60 placeholder:text-notebook-subtle"
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'Viewer' | 'Editor')}
                className="bg-notebook-bg text-notebook-text text-xs px-3 py-2.5 rounded-xl border border-notebook-border focus:outline-none focus:border-[#a8c7fa]/60 cursor-pointer"
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={!emailInput.trim() || !emailInput.includes('@')}
                className="bg-[#004a77] hover:bg-[#004a77]/80 disabled:opacity-40 text-[#a8c7fa] text-xs font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Invite
              </button>
            </div>
            {inviteSuccess && (
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 pt-1">
                <Check className="w-3.5 h-3.5" /> {inviteSuccess}
              </p>
            )}
          </form>

          {/* People with Access */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-notebook-text">People with access</span>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {/* Owner */}
              <div className="flex items-center justify-between bg-notebook-bg/50 p-2.5 rounded-xl border border-notebook-border/60 text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#004a77] to-[#1a6fa8] flex items-center justify-center text-[#a8c7fa] text-[11px] font-semibold">
                    You
                  </div>
                  <div>
                    <p className="font-medium text-notebook-text">You (Owner)</p>
                    <p className="text-[10px] text-notebook-muted">owner@recall.ai</p>
                  </div>
                </div>
                <span className="text-[11px] text-notebook-muted font-medium bg-notebook-card px-2.5 py-1 rounded-full border border-notebook-border">
                  Owner
                </span>
              </div>

              {/* Collaborators List */}
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between bg-notebook-bg/30 p-2.5 rounded-xl border border-notebook-border/40 text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-notebook-card border border-notebook-border flex items-center justify-center text-notebook-muted text-[11px] font-semibold uppercase">
                      {collab.email[0]}
                    </div>
                    <span className="font-medium text-notebook-text truncate max-w-[200px]">
                      {collab.email}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={collab.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'Viewer' | 'Editor';
                        setCollaborators((prev) =>
                          prev.map((c) => (c.id === collab.id ? { ...c, role: newRole } : c))
                        );
                      }}
                      className="bg-notebook-bg text-notebook-text text-[11px] px-2 py-1 rounded-lg border border-notebook-border focus:outline-none"
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Editor">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRemoveCollaborator(collab.id)}
                      className="p-1 text-notebook-muted hover:text-rose-400 rounded transition-colors"
                      title="Remove access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-notebook-border/50" />

          {/* General Access Settings */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-notebook-text">General access</span>
            <div className="flex items-start justify-between bg-notebook-bg/50 p-3 rounded-xl border border-notebook-border/60">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    accessLevel === 'anyone'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {accessLevel === 'anyone' ? (
                    <Globe className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                <div className="space-y-1">
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as 'restricted' | 'anyone')}
                    className="bg-transparent font-semibold text-xs text-notebook-text focus:outline-none cursor-pointer border-b border-notebook-border/60 pb-0.5"
                  >
                    <option value="anyone" className="bg-notebook-card">
                      Anyone with the link
                    </option>
                    <option value="restricted" className="bg-notebook-card">
                      Restricted (Only added people can open)
                    </option>
                  </select>
                  <p className="text-[11px] text-notebook-muted leading-relaxed">
                    {accessLevel === 'anyone'
                      ? 'Anyone on the internet with this link can view this notebook'
                      : 'Only people explicitly added above can access this notebook'}
                  </p>
                </div>
              </div>

              {accessLevel === 'anyone' && (
                <select
                  value={linkRole}
                  onChange={(e) => setLinkRole(e.target.value as 'Viewer' | 'Editor')}
                  className="bg-notebook-bg text-notebook-text text-xs px-2.5 py-1.5 rounded-lg border border-notebook-border focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Editor">Editor</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-notebook-border bg-notebook-bg/50 flex items-center justify-between">
          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 text-xs text-notebook-text hover:bg-notebook-hover border border-notebook-border px-3.5 py-2 rounded-xl transition-all font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Link copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#a8c7fa]" />
                <span>Copy link</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="bg-notebook-text hover:bg-white text-notebook-bg text-xs font-semibold px-5 py-2 rounded-xl transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Bot, Minimize2, Plus, Sparkles, MessageSquare, Settings, Check, Edit2, Trash2, HardDrive, MoreHorizontal, Network, GitBranch, FolderPlus } from 'lucide-react';
import { ChatSession } from '../types';
import { WorkspaceSelector, WorkspaceInfo } from './WorkspaceSelector';

export type NavTab = 'chat' | 'agents' | 'files' | 'sync' | 'upgrade' | 'settings';

export interface NewRoomOptions {
  name?: string;
  repoUrl?: string;
  token?: string;
}

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onOpenSession: (id: string) => void;
  onNewRoom: (opts: NewRoomOptions) => Promise<void>;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  availableModels: any[];
  selectedModel: string;
  selectedProvider: string;
  onSelectModel: (model: any) => void;
  activeTab: NavTab;
  onNavigateTab: (tab: NavTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  chatMinimized: boolean;
  minimizeTimer: number;
  formatTime: (s: number) => string;
  activeWorkspace: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  onSwitchWorkspace: (id: string) => void;
  onAddLocalWorkspace: (name: string, path: string) => Promise<void>;
  onCloneWorkspace: (repoUrl: string, name: string, token: string) => Promise<void>;
  onRemoveWorkspace: (id: string) => void;
}

export function Sidebar({
  sessions, activeSessionId, onOpenSession, onNewRoom, onDeleteSession, onRenameSession,
  availableModels, selectedModel, selectedProvider, onSelectModel,
  activeTab, onNavigateTab, sidebarOpen, setSidebarOpen, chatMinimized, minimizeTimer, formatTime,
  activeWorkspace, workspaces, onSwitchWorkspace, onAddLocalWorkspace, onCloneWorkspace, onRemoveWorkspace
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [nrName, setNrName] = useState('');
  const [nrRepo, setNrRepo] = useState('');
  const [nrToken, setNrToken] = useState('');
  const [nrBusy, setNrBusy] = useState(false);
  const [nrErr, setNrErr] = useState('');

  const startRename = (s: ChatSession) => { setRenamingId(s.id); setRenameTitle(s.title); setMenuId(null); };
  const commitRename = (id: string) => { if (renameTitle.trim()) onRenameSession(id, renameTitle); setRenamingId(null); };

  const closeNewRoom = () => { setShowNewRoom(false); setNrName(''); setNrRepo(''); setNrToken(''); setNrErr(''); setNrBusy(false); };
  const submitNewRoom = async () => {
    if (nrBusy) return;
    if (nrRepo.trim() && !nrToken.trim()) { setNrErr('PAT wajib untuk clone repo.'); return; }
    setNrBusy(true); setNrErr('');
    try {
      await onNewRoom({ name: nrName.trim() || undefined, repoUrl: nrRepo.trim() || undefined, token: nrToken.trim() || undefined });
      closeNewRoom();
    } catch (e: any) {
      setNrErr(e.message || 'Gagal membuat ruang.'); setNrBusy(false);
    }
  };

  return (
    <aside className={`fixed md:relative z-20 h-full bg-theme-sidebar border-r border-theme-border flex flex-col p-4 transition-all duration-300 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'} overflow-hidden`}>
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20"><Bot size={18} className="text-white" /></div>
          <span className="font-bold text-theme-text-primary text-base">RocAgent</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-theme-btn-hover rounded text-theme-text-muted transition-colors md:hidden"><Minimize2 size={15} /></button>
      </div>

      <button onClick={() => setShowNewRoom(true)} className="flex items-center justify-center gap-2 w-full p-2.5 mb-4 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md cursor-pointer">
        <Plus size={14} /> New Room
      </button>

      {showNewRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeNewRoom}>
          <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-card shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-theme-text-primary">Ruang Baru</span>
              <button onClick={closeNewRoom} className="p-1 text-theme-text-muted hover:text-theme-text-primary cursor-pointer"><Minimize2 size={15} /></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wide text-theme-text-muted">Nama ruang (opsional)</label>
              <input value={nrName} onChange={(e) => setNrName(e.target.value)} placeholder="mis. webui, api-server" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2.5 py-2 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wide text-theme-text-muted">Clone repo GitHub (opsional)</label>
              <input value={nrRepo} onChange={(e) => setNrRepo(e.target.value)} placeholder="https://github.com/owner/repo" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2.5 py-2 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              {nrRepo.trim() && (
                <input value={nrToken} onChange={(e) => setNrToken(e.target.value)} type="password" placeholder="GitHub PAT (sekali pakai)" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2.5 py-2 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              )}
            </div>

            {nrErr && <div className="text-[11px] text-red-400">{nrErr}</div>}

            <div className="flex gap-2 pt-1">
              <button onClick={submitNewRoom} disabled={nrBusy} className="flex-1 flex items-center justify-center gap-1.5 p-2.5 text-xs font-bold uppercase tracking-wide rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer">
                {nrRepo.trim() ? <GitBranch size={14} /> : <FolderPlus size={14} />}
                {nrBusy ? (nrRepo.trim() ? 'Cloning…' : 'Membuat…') : (nrRepo.trim() ? 'Clone & Buat' : 'Buat Ruang')}
              </button>
              <button onClick={closeNewRoom} className="p-2.5 text-xs font-bold uppercase tracking-wide rounded-xl border border-theme-border text-theme-text-muted cursor-pointer">Batal</button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceSelector
        active={activeWorkspace}
        workspaces={workspaces}
        onSwitch={onSwitchWorkspace}
        onAddLocal={onAddLocalWorkspace}
        onClone={onCloneWorkspace}
        onRemove={onRemoveWorkspace}
      />

      <div className="mb-4 pr-1 space-y-1">
        <div className="flex items-center justify-between px-2 mb-1.5">
          <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 tracking-wider flex items-center gap-1"><Sparkles size={11} className="animate-pulse" /> AI Models ({availableModels.length})</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase">{selectedProvider}</span>
        </div>

        {/* Agent Multi — mode multi-role, dipilih seperti "model" dari sini */}
        <button
          onClick={() => onNavigateTab('agents')}
          className={`w-full flex items-center gap-2 p-2 px-2.5 rounded-lg text-xs transition-all font-semibold mb-1 ${
            activeTab === 'agents'
              ? 'bg-purple-600/25 text-purple-200 border border-purple-500/50 cursor-pointer'
              : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/20 cursor-pointer'
          }`}
          title="Agent Multi — 6 pipeline multi-role (Scout→Builder→Breaker→Closer, dst.)"
        >
          <Network size={14} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">Agent Multi</span>
          <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-300">6 pipa</span>
        </button>

        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {availableModels.map((m) => {
            // Matched on (id, provider) together, not id alone — see the
            // identical note in Header.tsx/ModelQuickSwitch.tsx: different
            // providers can expose the same upstream model id.
            const sel = selectedModel === m.id && selectedProvider === m.provider;
            // Model tanpa kunci API tetap ditampilkan supaya terlihat apa saja
            // yang tersedia bila dikonfigurasi, tetapi tidak bisa dipilih —
            // memilihnya hanya menghasilkan kegagalan tanpa penjelasan.
            const usable = m.active !== false;
            const isDefault = m.id === 'openai/gpt-oss-120b';
            return (
              <button
                key={`${m.provider}:${m.id}`}
                onClick={() => usable && onSelectModel(m)}
                disabled={!usable}
                title={usable ? m.name : (m.reason || `Tidak ada kunci API untuk ${m.provider}`)}
                className={`w-full flex items-center justify-between p-2 px-2.5 rounded-lg text-xs transition-all font-mono ${
                  !usable
                    ? 'text-theme-text-secondary/40 cursor-not-allowed'
                    : sel
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold cursor-pointer'
                      : 'text-theme-text-secondary hover:bg-theme-btn-hover hover:text-theme-text-primary cursor-pointer'
                }`}>
                <span className="flex items-center gap-2 truncate">{m.icon ? <span className="text-sm">{m.icon}</span> : null}<span className="truncate">{m.name}</span></span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  {isDefault && <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">default</span>}
                  {sel && usable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {!usable && <span className="text-[9px] uppercase tracking-wide opacity-70">no key</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 pr-1 min-h-0">
        <span className="text-[11px] font-medium text-slate-500 px-2 block mb-1">Sessions</span>
        {sessions.map((s) => {
          const active = s.id === activeSessionId;
          return (
            <div key={s.id} onClick={() => !renamingId && onOpenSession(s.id)} className={`group flex items-center justify-between p-2 px-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all relative mb-1 ${active ? 'bg-slate-800/90 text-slate-100 font-semibold border border-slate-700/60' : 'text-slate-300 hover:bg-slate-800/50'}`}>
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                <Sparkles size={13} className="flex-shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                {renamingId === s.id ? (
                  <input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(s.id); if (e.key === 'Escape') setRenamingId(null); }} onClick={(e) => e.stopPropagation()} autoFocus className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-100 focus:outline-none" />
                ) : <span className="truncate">{s.title}</span>}
              </div>
              {renamingId === s.id ? (
                <button onClick={(e) => { e.stopPropagation(); commitRename(s.id); }} className="p-1 hover:bg-slate-700 text-emerald-400 rounded"><Check size={12} /></button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setMenuId(menuId === s.id ? null : s.id); }} className="p-1 hover:bg-slate-700/80 text-slate-400 hover:text-slate-100 rounded-lg"><MoreHorizontal size={14} /></button>
              )}
              {menuId === s.id && (
                <div onClick={(e) => e.stopPropagation()} className="absolute right-2 top-8 z-30 bg-theme-card border border-theme-border shadow-2xl rounded-xl p-1.5 min-w-[120px] text-xs space-y-0.5 animate-fade-in">
                  <button onClick={() => startRename(s)} className="flex items-center gap-2 w-full px-2.5 py-1.5 hover:bg-theme-btn-hover text-theme-text-primary rounded-lg cursor-pointer"><Edit2 size={13} className="text-indigo-400" />Rename</button>
                  <button onClick={() => { onNavigateTab('files'); setMenuId(null); }} className="flex items-center gap-2 w-full px-2.5 py-1.5 hover:bg-theme-btn-hover text-theme-text-primary rounded-lg cursor-pointer"><HardDrive size={13} className="text-indigo-400" />Archive</button>
                  <button onClick={() => { onDeleteSession(s.id); setMenuId(null); }} className="flex items-center gap-2 w-full px-2.5 py-1.5 hover:bg-red-500/20 text-red-400 rounded-lg cursor-pointer font-medium"><Trash2 size={13} />Delete</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <nav className="space-y-1 border-t border-theme-border/60 pt-4">
        <button onClick={() => onNavigateTab('chat')} className={`flex items-center gap-3 w-full p-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-text-secondary hover:bg-theme-btn-hover'}`}>
          <MessageSquare size={15} /> Workspace Chat
          {chatMinimized && <span className="ml-auto text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded animate-pulse">{formatTime(minimizeTimer)}</span>}
        </button>
        <button onClick={() => onNavigateTab('agents')} className={`flex items-center gap-3 w-full p-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${activeTab === 'agents' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-text-secondary hover:bg-theme-btn-hover'}`}>
          <Network size={15} /> Agent Multi
        </button>
        <button onClick={() => onNavigateTab('settings')} className={`flex items-center gap-3 w-full p-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-theme-text-secondary hover:bg-theme-btn-hover'}`}>
          <Settings size={15} /> Pengaturan
        </button>
      </nav>
    </aside>
  );
}

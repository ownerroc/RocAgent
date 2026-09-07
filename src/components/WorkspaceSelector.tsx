import React, { useState } from 'react';
import { Folder, Plus, X, GitBranch, FolderPlus } from 'lucide-react';

export interface WorkspaceInfo {
  id: string;
  name: string;
  path: string;
  source?: string;
}

interface Props {
  active: WorkspaceInfo | null;
  workspaces: WorkspaceInfo[];
  onSwitch: (id: string) => void;
  onAddLocal: (name: string, path: string) => Promise<void>;
  onClone: (repoUrl: string, name: string, token: string) => Promise<void>;
  onRemove: (id: string) => void;
}

export function WorkspaceSelector({ active, workspaces, onSwitch, onAddLocal, onClone, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'none' | 'local' | 'clone'>('none');
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => { setMode('none'); setName(''); setPath(''); setRepoUrl(''); setToken(''); setErr(''); setBusy(false); };

  const submitLocal = async () => {
    if (!name.trim() || !path.trim()) { setErr('Nama dan path wajib.'); return; }
    setBusy(true); setErr('');
    try { await onAddLocal(name.trim(), path.trim()); reset(); setOpen(false); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };

  const submitClone = async () => {
    if (!repoUrl.trim() || !name.trim() || !token.trim()) { setErr('URL, nama, dan PAT wajib.'); return; }
    setBusy(true); setErr('');
    try { await onClone(repoUrl.trim(), name.trim(), token.trim()); reset(); setOpen(false); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  };

  return (
    <div className="relative mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 p-2.5 text-xs font-semibold rounded-xl border border-theme-border bg-theme-btn-hover text-theme-text-primary transition-all cursor-pointer shadow-xs"
      >
        <span className="flex items-center gap-2 truncate">
          <Folder size={14} className="text-indigo-400 flex-shrink-0" />
          <span className="truncate">{active?.name || 'Pilih workspace'}</span>
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase flex-shrink-0">
          {workspaces.length} ws
        </span>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-theme-border bg-theme-sidebar shadow-2xl p-2 space-y-1">
          {workspaces.map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between gap-2 p-2 rounded-lg cursor-pointer transition-colors ${w.id === active?.id ? 'bg-indigo-600/20 border border-indigo-500/40' : 'hover:bg-theme-btn-hover'}`}
            >
              <button onClick={() => { onSwitch(w.id); setOpen(false); }} className="flex-1 text-left flex items-center gap-2 min-w-0">
                <GitBranch size={13} className={w.source ? 'text-emerald-400 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-theme-text-primary truncate">{w.name}</div>
                  <div className="text-[9px] font-mono text-theme-text-muted truncate">{w.path}</div>
                </div>
              </button>
              {w.id !== 'rocsystem' && (
                <button onClick={() => onRemove(w.id)} className="p-1 text-theme-text-muted hover:text-red-400 transition-colors cursor-pointer" title="Hapus workspace (tidak menghapus folder)">
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          {mode === 'none' && (
            <div className="flex gap-1.5 pt-1">
              <button onClick={() => setMode('clone')} className="flex-1 flex items-center justify-center gap-1 p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer">
                <GitBranch size={12} /> Clone repo
              </button>
              <button onClick={() => setMode('local')} className="flex-1 flex items-center justify-center gap-1 p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors cursor-pointer">
                <FolderPlus size={12} /> Local
              </button>
            </div>
          )}

          {mode === 'local' && (
            <div className="pt-1 space-y-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (mis. webui)" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="Path absolut (mis. ~/webui)" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              {err && <div className="text-[10px] text-red-400">{err}</div>}
              <div className="flex gap-1.5">
                <button onClick={submitLocal} disabled={busy} className="flex-1 p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-indigo-600 text-white disabled:opacity-50 cursor-pointer">{busy ? '…' : 'Tambah'}</button>
                <button onClick={reset} className="p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border border-theme-border text-theme-text-muted cursor-pointer">Batal</button>
              </div>
            </div>
          )}

          {mode === 'clone' && (
            <div className="pt-1 space-y-1.5">
              <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama folder" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="GitHub PAT (sekali pakai)" className="w-full text-xs bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-theme-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
              {err && <div className="text-[10px] text-red-400">{err}</div>}
              <div className="flex gap-1.5">
                <button onClick={submitClone} disabled={busy} className="flex-1 p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-indigo-600 text-white disabled:opacity-50 cursor-pointer">{busy ? 'Cloning…' : 'Clone'}</button>
                <button onClick={reset} className="p-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border border-theme-border text-theme-text-muted cursor-pointer">Batal</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

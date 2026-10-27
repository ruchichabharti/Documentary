/**
 * components/Editor.jsx — The collaborative document editor
 *
 * A contentEditable div driven entirely by our OT state machine.
 * We intercept keydown events and generate OT ops — we do NOT
 * let the browser handle text insertion, because contentEditable
 * makes it nearly impossible to track exact character positions.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCollabEditor } from '../hooks/useCollabEditor.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import PresenceSidebar from './PresenceSidebar.jsx';
import StatusBar from './StatusBar.jsx';

const TITLE_DEBOUNCE_MS = 800;

export default function Editor({ docId }) {
  const { token } = useAuth();
  const effectiveToken = token || 'guest-collab-token';
  const { editorRef, presence, status, title, setTitle, handleKeyDown, clientId } =
    useCollabEditor(docId, effectiveToken);

  const [localTitle, setLocalTitle] = useState('Untitled');
  const titleDebounce = useRef(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const onTitleChange = (e) => {
    const val = e.target.value;
    setLocalTitle(val);
    clearTimeout(titleDebounce.current);
    titleDebounce.current = setTimeout(() => {
      api.updateTitle(docId, val).catch(console.error);
      setTitle(val);
    }, TITLE_DEBOUNCE_MS);
  };

  // Prevent paste from inserting HTML — strip to plain text
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // Insert each character as individual ops
    // (In production, you'd compose a single multi-insert op)
    const el  = editorRef.current;
    const sel = window.getSelection();
    if (!sel || !el) return;
    // Simulate keydown for each character in the pasted text
    for (const char of text) {
      const syntheticEvent = {
        key: char === '\n' ? 'Enter' : char,
        preventDefault: () => {},
        ctrlKey: false, metaKey: false, altKey: false,
      };
      handleKeyDown(syntheticEvent);
    }
  }, [handleKeyDown, editorRef]);

  return (
    <div className="flex flex-col h-screen bg-[--bg-primary]">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <Link to="/dashboard" className="text-[--accent] font-bold text-lg mr-2 no-underline flex items-center gap-1 hover:opacity-90 transition-opacity">
          <span>✦</span>
          <span>DocMind Editor</span>
        </Link>
        <div className="w-px h-6 bg-[--border]" />
        <input
          type="text"
          value={localTitle}
          onChange={onTitleChange}
          className="flex-1 bg-transparent text-[--text-primary] font-medium text-sm outline-none border-b border-transparent hover:border-[--border] focus:border-[--accent] transition-colors px-2 py-1 max-w-xs"
          placeholder="Document title"
        />
        <div className="ml-auto flex items-center gap-3">
          {/* Presence avatars */}
          <div className="flex items-center">
            {presence.filter(u => u.userId !== clientId).slice(0, 5).map((u) => (
              <div
                key={u.socketId}
                className="presence-avatar"
                style={{ background: u.color }}
                title={u.email}
              >
                {u.email?.[0]?.toUpperCase() ?? '?'}
              </div>
            ))}
          </div>
          <StatusBar status={status} />
        </div>
      </header>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor column */}
        <main className="flex-1 overflow-y-auto bg-[#e8e8e8] py-8 px-4">
          <div className="editor-canvas">
            <div
              ref={editorRef}
              className="editor-content"
              contentEditable
              suppressContentEditableWarning
              spellCheck
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              data-placeholder="Start typing..."
              aria-label="Document editor"
              role="textbox"
              aria-multiline="true"
            />
            {/* Remote cursor overlays are complex with contentEditable;
                in this version, presence is shown in the sidebar */}
          </div>
        </main>

        {/* Sidebar */}
        <PresenceSidebar presence={presence} currentClientId={clientId} />
      </div>
    </div>
  );
}

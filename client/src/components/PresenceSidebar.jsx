/**
 * components/PresenceSidebar.jsx — Active collaborators panel
 */

export default function PresenceSidebar({ presence, currentClientId }) {
  const others = presence.filter(u => u.socketId !== currentClientId);

  return (
    <aside className="sidebar">
      <p className="text-[--text-muted] text-xs font-semibold uppercase tracking-wider mb-2 px-1">
        Active Users
      </p>

      {others.length === 0 ? (
        <p className="text-[--text-muted] text-sm px-1">
          No other editors right now
        </p>
      ) : (
        others.map((u) => (
          <div
            key={u.socketId}
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[--bg-hover] transition-colors"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
              style={{ background: u.color }}
            >
              {u.email?.[0]?.toUpperCase() ?? '?'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-[--text-primary] text-sm font-medium truncate">
                {u.email}
              </p>
              {u.cursor !== null && (
                <p className="text-[--text-muted] text-xs">
                  cursor @ {u.cursor}
                </p>
              )}
            </div>

            {/* Online indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: u.color, boxShadow: `0 0 6px ${u.color}` }}
            />
          </div>
        ))
      )}
    </aside>
  );
}

/**
 * components/StatusBar.jsx — WebSocket connection status badge
 */

export default function StatusBar({ status }) {
  const configs = {
    connected:    { label: 'Live',         className: 'status-connected' },
    connecting:   { label: 'Connecting…',  className: 'status-connecting' },
    disconnected: { label: 'Offline',      className: 'status-disconnected' },
  };
  const { label, className } = configs[status] ?? configs.connecting;

  return (
    <div className={`status-badge ${className}`}>
      <div className="status-dot" />
      <span>{label}</span>
    </div>
  );
}

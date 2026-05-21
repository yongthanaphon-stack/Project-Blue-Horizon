import { Activity } from 'lucide-react';

const RADAR_NODES = [
  { label: 'Signal node 1', className: 'auth-radar-node auth-radar-node--one' },
  { label: 'Signal node 2', className: 'auth-radar-node auth-radar-node--two' },
  { label: 'Signal node 3', className: 'auth-radar-node auth-radar-node--three' },
];

export default function AuthRadarPreview({ title = 'Signal horizon scan', description = 'Tracking PESTEL signals in real time.' }) {
  return (
    <div className="auth-radar-panel" aria-label="Environmental scanning preview">
      <div className="auth-radar-orbit" aria-hidden="true">
        <div className="auth-radar-grid" />
        <div className="auth-radar-rings">
          <span />
          <span />
          <span />
        </div>
        <div className="auth-radar-axis auth-radar-axis--x" />
        <div className="auth-radar-axis auth-radar-axis--y" />
        <div className="auth-radar-core" />
        {RADAR_NODES.map((node) => (
          <span key={node.label} className={node.className} aria-label={node.label} />
        ))}
      </div>

      <div className="auth-radar-copy">
        <span className="auth-radar-status">
          <Activity size={14} />
          Environmental scan
        </span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

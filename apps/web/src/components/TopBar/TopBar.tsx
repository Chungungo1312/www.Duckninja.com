import { useState } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import { ShortcutsModal } from '../ShortcutsModal/ShortcutsModal';

const RESOLUTIONS = [
  { label: '9:16 · 1080x1920', width: 1080, height: 1920 },
  { label: '16:9 · 1920x1080', width: 1920, height: 1080 },
  { label: '1:1 · 1080x1080', width: 1080, height: 1080 },
  { label: '4:5 · 1080x1350', width: 1080, height: 1350 },
];

export function TopBar({ onExport }: { onExport: () => void }) {
  const project = useTimelineStore((s) => s.project);
  const setProjectName = useTimelineStore((s) => s.setProjectName);
  const setResolution = useTimelineStore((s) => s.setResolution);
  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);
  const historyPast = useTimelineStore((s) => s.historyPast);
  const historyFuture = useTimelineStore((s) => s.historyFuture);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const currentValue = `${project.resolution.width}x${project.resolution.height}`;

  return (
    <>
      <div style={{
        height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '15px' }}>VideoEditor</div>
          <button onClick={undo} disabled={historyPast.length === 0} title="Deshacer (Cmd/Ctrl+Z)">↶</button>
          <button onClick={redo} disabled={historyFuture.length === 0} title="Rehacer (Cmd/Ctrl+Shift+Z)">↷</button>
        </div>

        <input
          type="text"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ width: '260px', textAlign: 'center' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setShowShortcuts(true)} title="Atajos de teclado">⌨</button>
          <select
            value={currentValue}
            onChange={(e) => {
              const found = RESOLUTIONS.find((r) => `${r.width}x${r.height}` === e.target.value);
              if (found) setResolution(found.width, found.height);
            }}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.label} value={`${r.width}x${r.height}`}>{r.label}</option>
            ))}
          </select>
          <button className="cta" onClick={onExport}>Exportar</button>
        </div>
      </div>

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}

const SHORTCUTS = [
  { keys: 'Espacio', action: 'Reproducir / pausar' },
  { keys: 'Cmd/Ctrl + D', action: 'Duplicar clip seleccionado' },
  { keys: 'Cmd/Ctrl + C', action: 'Copiar clip seleccionado' },
  { keys: 'Cmd/Ctrl + V', action: 'Pegar en la posición del playhead' },
  { keys: 'Cmd/Ctrl + Z', action: 'Deshacer' },
  { keys: 'Cmd/Ctrl + Shift + Z', action: 'Rehacer' },
  { keys: 'Delete / Backspace', action: 'Eliminar clip seleccionado' },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)',
          borderRadius: '10px', padding: '24px', width: '360px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px' }}>Atajos de teclado</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {SHORTCUTS.map((s) => (
          <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--accent)' }}>{s.keys}</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useTimelineStore } from '../../store/timelineStore';

export function Toast() {
  const toast = useTimelineStore((s) => s.toast);
  const clearToast = useTimelineStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => clearToast(), 1800);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '240px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-panel-alt)', border: '1px solid var(--accent)', color: 'var(--text-primary)',
      padding: '8px 16px', borderRadius: '8px', fontSize: '13px', zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      {toast}
    </div>
  );
}

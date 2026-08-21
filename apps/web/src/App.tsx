import { useRef, useState } from 'react';
import { FFmpegExporter } from '@video-editor/engine';
import { useTimelineStore } from './store/timelineStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { TopBar } from './components/TopBar/TopBar';
import { LeftPanel } from './components/LeftPanel/LeftPanel';
import { CenterStage } from './components/CenterStage/CenterStage';
import { RightPanel } from './components/RightPanel/RightPanel';
import { BottomTimeline } from './components/BottomTimeline/BottomTimeline';
import { Toast } from './components/Toast/Toast';

function App() {
  useKeyboardShortcuts();

  const project = useTimelineStore((s) => s.project);
  const exporterRef = useRef<FFmpegExporter | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'exporting' | 'done'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = async () => {
    const hasClips = project.tracks.some((t) => t.clips.length > 0);
    if (!hasClips) { alert('Agrega al menos un clip antes de exportar'); return; }

    try {
      setExportStatus('loading');
      if (!exporterRef.current) exporterRef.current = new FFmpegExporter();
      await exporterRef.current.load();
      setExportStatus('exporting');
      const blob = await exporterRef.current.exportProject(project);
      setDownloadUrl(URL.createObjectURL(blob));
      setExportStatus('done');
    } catch (e) {
      alert((e as Error).message);
      setExportStatus('idle');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar onExport={handleExport} />

      {exportStatus !== 'idle' && (
        <div style={{ padding: '6px 16px', background: 'var(--bg-panel-alt)', fontSize: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {exportStatus === 'loading' && 'Cargando FFmpeg...'}
          {exportStatus === 'exporting' && 'Exportando...'}
          {exportStatus === 'done' && downloadUrl && (
            <>
              Exportación lista.
              <a href={downloadUrl} download="video-exportado.mp4" style={{ color: 'var(--accent)' }}>Descargar</a>
            </>
          )}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftPanel />
        <CenterStage />
        <RightPanel />
      </div>

      <BottomTimeline />
      <Toast />
    </div>
  );
}

export default App;

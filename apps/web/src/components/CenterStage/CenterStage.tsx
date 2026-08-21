import { useEffect, useRef, useState } from 'react';
import { CanvasRenderer, TimelineModel } from '@video-editor/engine';
import { useTimelineStore } from '../../store/timelineStore';
import type { Clip } from '@video-editor/types';

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const mm = Math.floor(totalSeconds / 60);
  const ss = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 1000);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function CenterStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedClipsRef = useRef<Map<string, string>>(new Map()); // clipId -> assetId
  const clockRef = useRef<{ startTime: number; startFrame: number }>({ startTime: 0, startFrame: 0 });

  const project = useTimelineStore((s) => s.project);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const setPlaying = useTimelineStore((s) => s.setPlaying);
  const [showSafeZone, setShowSafeZone] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, project);
    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, [Object.keys(project.assets).join(',')]);

  useEffect(() => {
    rendererRef.current?.updateResolution(project.resolution);
  }, [project.resolution.width, project.resolution.height]);

  const model = new TimelineModel(project);
  const totalDuration = model.getTotalDuration();

  // Scrubbing: solo cuando NO se reproduce
  useEffect(() => {
    if (isPlaying || !rendererRef.current) return;
    const activeClips = model.getClipsAtFrame(playheadFrame);
    if (activeClips.length > 0) {
      rendererRef.current.renderFrame(playheadFrame, activeClips);
    } else {
      rendererRef.current.renderTestFrame();
    }
  }, [playheadFrame, project, isPlaying]);

  // Loop de reproducción: reloj de pared (no depende de un solo clip), activa/desactiva
  // clips de CUALQUIER pista de video según corresponda a cada frame.
  useEffect(() => {
    if (!isPlaying || !rendererRef.current) {
      rendererRef.current?.pauseAll();
      startedClipsRef.current.clear();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    clockRef.current = { startTime: performance.now(), startFrame: playheadFrame };

    const tick = () => {
      if (!rendererRef.current) return;

      const elapsedSeconds = (performance.now() - clockRef.current.startTime) / 1000;
      const currentFrame = Math.floor(clockRef.current.startFrame + elapsedSeconds * project.fps);

      if (currentFrame >= totalDuration) {
        rendererRef.current.pauseAll();
        startedClipsRef.current.clear();
        setPlayhead(totalDuration);
        setPlaying(false);
        return;
      }

      const activeClips = model.getClipsAtFrame(currentFrame);
      const videoClips = activeClips.filter((c) => c.text === undefined);
      const textClips = activeClips.filter((c) => c.text !== undefined);
      const activeIds = new Set(videoClips.map((c) => c.id));

      // Arranca clips que se volvieron activos y aún no se habían iniciado
      for (const clip of videoClips) {
        if (!startedClipsRef.current.has(clip.id)) {
          rendererRef.current.startClip(clip, currentFrame);
          startedClipsRef.current.set(clip.id, clip.assetId);
        }
      }
      // Detiene clips que ya no están activos
      for (const [clipId, assetId] of startedClipsRef.current.entries()) {
        if (!activeIds.has(clipId)) {
          rendererRef.current.stopClip(assetId);
          startedClipsRef.current.delete(clipId);
        }
      }

      rendererRef.current.drawActiveClips(videoClips, currentFrame, textClips);
      setPlayhead(currentFrame);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const togglePlay = () => {
    if (playheadFrame >= totalDuration) setPlayhead(0);
    setPlaying(!isPlaying);
  };

  const goToStart = () => { setPlaying(false); setPlayhead(0); };
  const goToEnd = () => { setPlaying(false); setPlayhead(totalDuration); };

  const aspectRatio = project.resolution.width / project.resolution.height;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-base)', padding: '24px', minWidth: 0,
    }}>
      <div style={{
        position: 'relative', height: '100%', maxHeight: '520px', aspectRatio: String(aspectRatio),
        background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)',
      }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {showSafeZone && (
          <div style={{
            position: 'absolute', inset: '5% 8%', border: '1px dashed rgba(124,242,156,0.6)',
            pointerEvents: 'none', borderRadius: '4px',
          }} />
        )}
      </div>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={goToStart}>⏮</button>
        <button className="cta" onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
        <button onClick={goToEnd}>⏭</button>
        <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {formatTimecode(playheadFrame, project.fps)} / {formatTimecode(totalDuration, project.fps)}
        </span>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input type="checkbox" checked={showSafeZone} onChange={(e) => setShowSafeZone(e.target.checked)} />
          Zona segura
        </label>
      </div>
    </div>
  );
}

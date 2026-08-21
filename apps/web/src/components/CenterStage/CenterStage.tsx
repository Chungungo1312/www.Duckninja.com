import { useEffect, useRef, useState } from 'react';
import { CanvasRenderer, TimelineModel } from '@video-editor/engine';
import { useTimelineStore } from '../../store/timelineStore';

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
  const startedClipsRef = useRef<Map<string, string>>(new Map());
  const clockRef = useRef<{ startTime: number; startFrame: number }>({ startTime: 0, startFrame: 0 });

  const project = useTimelineStore((s) => s.project);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const setPlaying = useTimelineStore((s) => s.setPlaying);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, project);
    rendererRef.current = renderer;
    setAssetsReady(false);
    renderer.preloadAssets().then(() => setAssetsReady(true));
    return () => renderer.dispose();
  }, [Object.keys(project.assets).join(',')]);

  useEffect(() => {
    rendererRef.current?.updateResolution(project.resolution);
  }, [project.resolution.width, project.resolution.height]);

  const model = new TimelineModel(project);
  const totalDuration = model.getTotalDuration();

  useEffect(() => {
    if (isPlaying || !rendererRef.current || !assetsReady) return;
    const activeClips = model.getClipsAtFrame(playheadFrame);
    if (activeClips.length > 0) rendererRef.current.renderFrame(playheadFrame, activeClips);
    else rendererRef.current.renderTestFrame();
  }, [playheadFrame, project, isPlaying, assetsReady]);

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
      const mediaClips = activeClips.filter((c) => c.text === undefined); // video + audio
      const textClips = activeClips.filter((c) => c.text !== undefined);
      const activeIds = new Set(mediaClips.map((c) => c.id));

      for (const clip of mediaClips) {
        if (!startedClipsRef.current.has(clip.id)) {
          rendererRef.current.startClip(clip, currentFrame);
          startedClipsRef.current.set(clip.id, clip.assetId);
        }
      }
      for (const [clipId, assetId] of startedClipsRef.current.entries()) {
        if (!activeIds.has(clipId)) {
          rendererRef.current.stopClip(assetId);
          startedClipsRef.current.delete(clipId);
        }
      }

      rendererRef.current.drawActiveClips(mediaClips, currentFrame, textClips);
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

  const scrubBarRef = useRef<HTMLDivElement>(null);
  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setPlaying(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const updateFromEvent = (clientX: number) => {
      const rect = scrubBarRef.current!.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setPlayhead(Math.floor(ratio * totalDuration));
    };
    updateFromEvent(e.clientX);

    const onMove = (moveEvent: PointerEvent) => updateFromEvent(moveEvent.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const aspectRatio = project.resolution.width / project.resolution.height;
  const progressRatio = totalDuration > 0 ? playheadFrame / totalDuration : 0;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-base)', padding: '24px', minWidth: 0,
    }}>
      <div style={{
        position: 'relative', height: '100%', maxHeight: '480px', aspectRatio: String(aspectRatio),
        background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)',
      }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {showSafeZone && (
          <div style={{ position: 'absolute', inset: '5% 8%', border: '1px dashed rgba(124,242,156,0.6)', pointerEvents: 'none', borderRadius: '4px' }} />
        )}
      </div>

      {/* Mini pista de reproducción: se mueve junto al video y es arrastrable */}
      {totalDuration > 0 && (
        <div
          ref={scrubBarRef}
          onPointerDown={handleScrubPointerDown}
          style={{
            width: '100%', maxWidth: '480px', height: '14px', marginTop: '10px',
            display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '4px', background: 'var(--bg-panel-alt)', borderRadius: '2px' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${progressRatio * 100}%`, background: 'var(--accent)', borderRadius: '2px',
            }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${progressRatio * 100}%`,
              transform: 'translate(-50%, -50%)', width: '12px', height: '12px',
              borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(124,242,156,0.25)',
            }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

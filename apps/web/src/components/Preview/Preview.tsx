import { useEffect, useRef, useState } from 'react';
import { CanvasRenderer, TimelineModel } from '@video-editor/engine';
import { useTimelineStore } from '../../store/timelineStore';

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const rafRef = useRef<number | null>(null);

  const project = useTimelineStore((s) => s.project);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, project);
    rendererRef.current = renderer;
    return () => renderer.dispose();
  }, [Object.keys(project.assets).join(',')]);

  useEffect(() => {
    if (isPlaying || !rendererRef.current) return;
    const model = new TimelineModel(project);
    const activeClips = model.getClipsAtFrame(playheadFrame);
    if (activeClips.length > 0) {
      rendererRef.current.renderFrame(playheadFrame, activeClips);
    } else {
      rendererRef.current.renderTestFrame();
    }
  }, [playheadFrame, project, isPlaying]);

  const model = new TimelineModel(project);
  const totalDuration = model.getTotalDuration();

  useEffect(() => {
    if (!isPlaying || !rendererRef.current) {
      rendererRef.current?.pauseAll();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const activeClips = model.getClipsAtFrame(playheadFrame);
    const videoClip = activeClips.find((c) => c.text === undefined);

    if (!videoClip) {
      setIsPlaying(false);
      return;
    }

    rendererRef.current.playClip(videoClip, playheadFrame);

    const tick = () => {
      if (!rendererRef.current) return;

      const currentFrame = rendererRef.current.getFrameFromClip(videoClip);
      const currentActive = model.getClipsAtFrame(currentFrame);
      const currentText = currentActive.filter((c) => c.text !== undefined);

      rendererRef.current.drawCurrentFrame(videoClip, currentFrame, currentText);

      if (currentFrame >= videoClip.startFrame + videoClip.durationFrames || currentFrame >= totalDuration) {
        setPlayhead(totalDuration);
        setIsPlaying(false);
        return;
      }

      setPlayhead(currentFrame);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const togglePlay = () => {
    if (playheadFrame >= totalDuration) setPlayhead(0);
    setIsPlaying((p) => !p);
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '480px', height: '270px', border: '2px solid #333', borderRadius: '8px' }}
      />
      {totalDuration > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <button onClick={togglePlay} style={{ marginRight: '0.5rem' }}>
            {isPlaying ? 'Pausar' : 'Reproducir'}
          </button>
          <input
            type="range" min={0} max={totalDuration} value={playheadFrame}
            onChange={(e) => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
            style={{ width: '400px', verticalAlign: 'middle' }}
          />
          <div>Frame: {playheadFrame} / {totalDuration}</div>
        </div>
      )}
    </div>
  );
}

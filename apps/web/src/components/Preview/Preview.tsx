import { useEffect, useRef, useState } from 'react';
import { CanvasRenderer, TimelineModel } from '@video-editor/engine';
import { useTimelineStore } from '../../store/timelineStore';
import type { Clip } from '@video-editor/types';

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const referenceClipRef = useRef<Clip | null>(null);

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

    // Inicia (o reinicia) la reproducción de los clips activos en un frame dado
    const startPlaybackAt = (frame: number) => {
      if (!rendererRef.current) return;

      const activeClips = model.getClipsAtFrame(frame);
      const videoClips = activeClips.filter((c) => c.text === undefined);

      if (videoClips.length === 0) {
        // No hay clip de video en este punto: buscamos el siguiente clip de video que empiece después
        const nextClip = project.tracks
          .flatMap((t) => t.clips)
          .filter((c) => c.text === undefined && c.startFrame >= frame)
          .sort((a, b) => a.startFrame - b.startFrame)[0];

        if (!nextClip || nextClip.startFrame >= totalDuration) {
          setPlayhead(totalDuration);
          setIsPlaying(false);
          return;
        }

        setPlayhead(nextClip.startFrame);
        startPlaybackAt(nextClip.startFrame);
        return;
      }

      rendererRef.current.playClips(videoClips, frame);
      referenceClipRef.current = videoClips[0];
    };

    startPlaybackAt(playheadFrame);

    const tick = () => {
      if (!rendererRef.current || !referenceClipRef.current) return;

      const referenceClip = referenceClipRef.current;
      const currentFrame = rendererRef.current.getFrameFromClip(referenceClip);
      const clipEndFrame = referenceClip.startFrame + referenceClip.durationFrames;

      // Si ya pasamos el final del clip de referencia, saltamos al/los siguiente(s) clip(s)
      if (currentFrame >= clipEndFrame || currentFrame >= totalDuration) {
        if (clipEndFrame >= totalDuration) {
          setPlayhead(totalDuration);
          setIsPlaying(false);
          return;
        }
        setPlayhead(clipEndFrame);
        startPlaybackAt(clipEndFrame);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const currentActive = model.getClipsAtFrame(currentFrame);
      const currentVideo = currentActive.filter((c) => c.text === undefined);
      const currentText = currentActive.filter((c) => c.text !== undefined);

      rendererRef.current.drawActiveClips(currentVideo, currentFrame, currentText);
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

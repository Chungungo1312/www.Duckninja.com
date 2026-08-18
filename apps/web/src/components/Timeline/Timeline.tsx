import { useRef, useState } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import type { Clip, TrackType } from '@video-editor/types';

const PIXELS_PER_FRAME = 0.15;
const HANDLE_WIDTH = 8;

const TRACK_COLORS: Record<TrackType, string> = {
  video: '#4f46e5',
  audio: '#059669',
  text: '#d97706',
  sticker: '#db2777',
};

interface TrimState {
  clipId: string;
  edge: 'start' | 'end';
  startX: number;
}

interface MoveState {
  clipId: string;
  startX: number;
  originalStartFrame: number;
}

export function Timeline() {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const splitClip = useTimelineStore((s) => s.splitClip);
  const deleteClip = useTimelineStore((s) => s.deleteClip);
  const trimClip = useTimelineStore((s) => s.trimClip);
  const moveClip = useTimelineStore((s) => s.moveClip);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const addTextClip = useTimelineStore((s) => s.addTextClip);

  const trimRef = useRef<TrimState | null>(null);
  const moveRef = useRef<MoveState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleSplit = () => {
    if (!selectedClipId) return;
    try {
      splitClip(selectedClipId, playheadFrame);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    deleteClip(selectedClipId);
  };

  const handleAddText = () => {
    const content = prompt('Texto a mostrar:', 'Mi título');
    if (content) addTextClip(content);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setPlayhead(Math.floor(x / PIXELS_PER_FRAME));
  };

  const handleTrimStart = (e: React.MouseEvent, clipId: string, edge: 'start' | 'end') => {
    e.stopPropagation();
    trimRef.current = { clipId, edge, startX: e.clientX };
    setIsDragging(true);

    const onMove = (moveEvent: MouseEvent) => {
      if (!trimRef.current) return;
      const deltaX = moveEvent.clientX - trimRef.current.startX;
      const deltaFrames = Math.round(deltaX / PIXELS_PER_FRAME);
      if (deltaFrames === 0) return;
      try {
        trimClip(trimRef.current.clipId, trimRef.current.edge, deltaFrames);
        trimRef.current.startX = moveEvent.clientX;
      } catch {
        // trim inválido, se ignora
      }
    };

    const onUp = () => {
      trimRef.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleMoveStart = (e: React.MouseEvent, clip: Clip) => {
    e.stopPropagation();
    selectClip(clip.id);
    moveRef.current = { clipId: clip.id, startX: e.clientX, originalStartFrame: clip.startFrame };
    setIsDragging(true);

    const onMove = (moveEvent: MouseEvent) => {
      if (!moveRef.current) return;
      const deltaX = moveEvent.clientX - moveRef.current.startX;
      const deltaFrames = Math.round(deltaX / PIXELS_PER_FRAME);
      const newStart = moveRef.current.originalStartFrame + deltaFrames;
      try {
        moveClip(moveRef.current.clipId, newStart);
      } catch {
        // se superpone, se ignora ese movimiento
      }
    };

    const onUp = () => {
      moveRef.current = null;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h3>Timeline</h3>

      <div style={{ marginBottom: '0.5rem' }}>
        <button onClick={handleSplit} disabled={!selectedClipId} style={{ marginRight: '0.5rem' }}>
          Cortar en playhead
        </button>
        <button onClick={handleDelete} disabled={!selectedClipId} style={{ marginRight: '0.5rem' }}>
          Eliminar clip
        </button>
        <button onClick={() => addTrack('audio')} style={{ marginRight: '0.5rem' }}>
          + Pista de audio
        </button>
        <button onClick={handleAddText}>
          + Agregar texto
        </button>
      </div>

      <div style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '8px', overflowX: 'auto', position: 'relative' }}>
        {project.tracks.length === 0 && (
          <div style={{ color: '#888' }}>Importa un video para ver la timeline</div>
        )}

        {project.tracks.map((track) => (
          <div
            key={track.id}
            onClick={handleTrackClick}
            style={{
              position: 'relative',
              height: '48px',
              marginBottom: '4px',
              background: '#2a2a2a',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {track.clips.map((clip) => (
              <div
                key={clip.id}
                onMouseDown={(e) => handleMoveStart(e, clip)}
                style={{
                  position: 'absolute',
                  left: `${clip.startFrame * PIXELS_PER_FRAME}px`,
                  width: `${clip.durationFrames * PIXELS_PER_FRAME}px`,
                  height: '100%',
                  background: selectedClipId === clip.id ? '#818cf8' : TRACK_COLORS[track.type],
                  border: selectedClipId === clip.id ? '2px solid #fff' : '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'grab',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  color: 'white',
                  fontSize: '12px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {clip.text ?? project.assets[clip.assetId]?.name ?? clip.id}

                {selectedClipId === clip.id && (
                  <>
                    <div
                      onMouseDown={(e) => handleTrimStart(e, clip.id, 'start')}
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${HANDLE_WIDTH}px`, background: 'rgba(255,255,255,0.6)', cursor: 'ew-resize',
                      }}
                    />
                    <div
                      onMouseDown={(e) => handleTrimStart(e, clip.id, 'end')}
                      style={{
                        position: 'absolute', right: 0, top: 0, bottom: 0,
                        width: `${HANDLE_WIDTH}px`, background: 'rgba(255,255,255,0.6)', cursor: 'ew-resize',
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        ))}

        {project.tracks.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '1rem', bottom: '1rem',
              left: `${playheadFrame * PIXELS_PER_FRAME + 16}px`,
              width: '2px', background: '#ef4444', pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}

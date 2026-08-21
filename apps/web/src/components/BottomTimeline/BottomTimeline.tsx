import { useRef, useState } from 'react';
import { useTimelineStore } from '../../store/timelineStore';
import { TimelineModel } from '@video-editor/engine';
import type { Clip, TrackType } from '@video-editor/types';

const BASE_PIXELS_PER_FRAME = 0.15;
const SNAP_THRESHOLD_PX = 8;

const TRACK_COLORS: Record<TrackType, string> = {
  video: 'var(--track-video)', audio: 'var(--track-audio)',
  text: 'var(--track-text)', sticker: 'var(--track-sticker)',
};

interface TrimState { clipId: string; edge: 'start' | 'end'; startX: number; }
interface DragState {
  clipId: string; originTrackId: string; originTrackType: TrackType; originStartFrame: number;
  pointerStartX: number; pointerStartY: number; deltaX: number; deltaY: number;
  hoveredTrackId: string | null; isCompatible: boolean; snappedFrame: number; snapLineX: number | null;
}

export function BottomTimeline() {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectClip = useTimelineStore((s) => s.selectClip);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const splitClip = useTimelineStore((s) => s.splitClip);
  const deleteClip = useTimelineStore((s) => s.deleteClip);
  const duplicateClip = useTimelineStore((s) => s.duplicateClip);
  const trimClip = useTimelineStore((s) => s.trimClip);
  const moveClip = useTimelineStore((s) => s.moveClip);
  const activeVideoTrackId = useTimelineStore((s) => s.activeVideoTrackId);
  const setActiveVideoTrack = useTimelineStore((s) => s.setActiveVideoTrack);
  const addVideoTrack = useTimelineStore((s) => s.addVideoTrack);
  const addTrack = useTimelineStore((s) => s.addTrack);
  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const togglePlaying = useTimelineStore((s) => s.togglePlaying);

  const trimRef = useRef<TrimState | null>(null);
  const trackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [rejectedClipId, setRejectedClipId] = useState<string | null>(null);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);

  const pixelsPerFrame = BASE_PIXELS_PER_FRAME * (zoom / 4);
  const snapThresholdFrames = SNAP_THRESHOLD_PX / pixelsPerFrame;
  const model = new TimelineModel(project);
  const totalDuration = model.getTotalDuration();
  const secondsMarkStep = 5;
  const framesPerMark = project.fps * secondsMarkStep;
  const markCount = Math.max(4, Math.ceil((totalDuration || project.fps * 20) / framesPerMark) + 2);

  const handleSplit = () => {
    if (!selectedClipId) return;
    try { splitClip(selectedClipId, playheadFrame); } catch (e) { alert((e as Error).message); }
  };
  const handleDuplicate = () => { if (selectedClipId) duplicateClip(selectedClipId); };
  const handleDelete = () => { if (selectedClipId) deleteClip(selectedClipId); };

  const handleAddTrack = (type: TrackType) => {
    if (type === 'video') addVideoTrack();
    else addTrack(type);
    setShowAddTrackMenu(false);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, trackId: string, trackType: TrackType) => {
    if (isDragging) return;
    if (trackType === 'video') setActiveVideoTrack(trackId);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setPlayhead(Math.floor(x / pixelsPerFrame));
  };

  const handleTrimStart = (e: React.MouseEvent, clipId: string, edge: 'start' | 'end') => {
    e.stopPropagation();
    trimRef.current = { clipId, edge, startX: e.clientX };
    setIsDragging(true);
    const onMove = (moveEvent: MouseEvent) => {
      if (!trimRef.current) return;
      const deltaFrames = Math.round((moveEvent.clientX - trimRef.current.startX) / pixelsPerFrame);
      if (deltaFrames === 0) return;
      try { trimClip(trimRef.current.clipId, trimRef.current.edge, deltaFrames); trimRef.current.startX = moveEvent.clientX; } catch {}
    };
    const onUp = () => {
      trimRef.current = null; setIsDragging(false);
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const findEdgeCandidates = (excludeClipId: string): number[] => {
    const edges: number[] = [playheadFrame];
    for (const track of project.tracks) {
      for (const c of track.clips) {
        if (c.id === excludeClipId) continue;
        edges.push(c.startFrame); edges.push(c.startFrame + c.durationFrames);
      }
    }
    return edges;
  };

  const handlePointerDown = (e: React.PointerEvent, clip: Clip, track: { id: string; type: TrackType }) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    selectClip(clip.id);
    setIsDragging(true);

    const edgeCandidates = findEdgeCandidates(clip.id);
    const state: DragState = {
      clipId: clip.id, originTrackId: track.id, originTrackType: track.type, originStartFrame: clip.startFrame,
      pointerStartX: e.clientX, pointerStartY: e.clientY, deltaX: 0, deltaY: 0,
      hoveredTrackId: track.id, isCompatible: true, snappedFrame: clip.startFrame, snapLineX: null,
    };
    setDrag(state);

    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - state.pointerStartX;
      const deltaY = moveEvent.clientY - state.pointerStartY;
      let rawFrame = state.originStartFrame + Math.round(deltaX / pixelsPerFrame);
      let snapLineX: number | null = null;

      for (const edge of edgeCandidates) {
        if (Math.abs(edge - rawFrame) <= snapThresholdFrames) { rawFrame = edge; snapLineX = edge * pixelsPerFrame; break; }
        const endEdge = edge - clip.durationFrames;
        if (Math.abs(endEdge - rawFrame) <= snapThresholdFrames) { rawFrame = endEdge; snapLineX = edge * pixelsPerFrame; break; }
      }

      let hoveredTrackId: string | null = state.originTrackId;
      let isCompatible = true;
      for (const [trackId, el] of trackRefs.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom) {
          hoveredTrackId = trackId;
          const hoveredTrack = project.tracks.find((t) => t.id === trackId);
          isCompatible = hoveredTrack?.type === state.originTrackType;
          break;
        }
      }

      const updated: DragState = { ...state, deltaX, deltaY, hoveredTrackId, isCompatible, snappedFrame: Math.max(0, rawFrame), snapLineX };
      Object.assign(state, updated);
      setDrag(updated);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsDragging(false);

      if (!state.isCompatible) {
        setRejectedClipId(state.clipId);
        setTimeout(() => setRejectedClipId(null), 320);
        setDrag(null);
        return;
      }
      try {
        moveClip(state.clipId, state.snappedFrame, state.hoveredTrackId !== state.originTrackId ? state.hoveredTrackId ?? undefined : undefined);
      } catch {
        setRejectedClipId(state.clipId);
        setTimeout(() => setRejectedClipId(null), 320);
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div style={{
      height: '220px', flexShrink: 0, background: 'var(--bg-panel)', borderTop: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
        <button onClick={handleSplit} disabled={!selectedClipId}>✂ Cortar</button>
        <button onClick={handleDuplicate} disabled={!selectedClipId}>⧉ Duplicar</button>
        <button onClick={handleDelete} disabled={!selectedClipId}>🗑 Eliminar</button>
        <button onClick={togglePlaying}>{isPlaying ? '⏸ Pausar' : '▶ Reproducir'}</button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowAddTrackMenu((v) => !v)}>+ Nueva línea de tiempo</button>
          {showAddTrackMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-panel-alt)',
              border: '1px solid var(--border-subtle)', borderRadius: '6px', zIndex: 30, minWidth: '140px',
            }}>
              {(['video', 'audio', 'text'] as TrackType[]).map((type) => (
                <div
                  key={type}
                  onClick={() => handleAddTrack(type)}
                  style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TRACK_COLORS[type] }} />
                  {type === 'video' ? 'Pista de video' : type === 'audio' ? 'Pista de audio' : 'Pista de texto'}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Zoom</span>
          <button onClick={() => setZoom(zoom - 1)}>-</button>
          <span className="mono" style={{ fontSize: '12px', width: '40px', textAlign: 'center' }}>{Math.round((zoom / 4) * 100)}%</span>
          <button onClick={() => setZoom(zoom + 1)}>+</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: '90px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          {project.tracks.map((track) => (
            <div key={track.id} style={{ height: '48px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TRACK_COLORS[track.type], flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{track.type}</span>
            </div>
          ))}
          {project.tracks.length === 0 && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '0 8px' }}>Sin pistas</div>
          )}
        </div>

        <div style={{ flex: 1, overflowX: 'auto', position: 'relative', padding: '0 12px' }}>
          <div style={{ position: 'relative', height: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
            {Array.from({ length: markCount }).map((_, i) => (
              <div key={i} className="mono" style={{ position: 'absolute', left: `${i * framesPerMark * pixelsPerFrame}px`, top: 0, fontSize: '10px', color: 'var(--text-secondary)' }}>
                {i * secondsMarkStep}s
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', paddingTop: '4px' }}>
            {project.tracks.map((track) => {
              const isHoveredDropTarget = drag && drag.hoveredTrackId === track.id && drag.originTrackId !== track.id;
              const isInvalidHover = isHoveredDropTarget && !drag.isCompatible;

              return (
                <div
                  key={track.id}
                  ref={(el) => { if (el) trackRefs.current.set(track.id, el); else trackRefs.current.delete(track.id); }}
                  onClick={(e) => handleTrackClick(e, track.id, track.type)}
                  style={{
                    position: 'relative', height: '48px', marginBottom: '4px',
                    background: isInvalidHover ? 'rgba(224,120,86,0.15)' : isHoveredDropTarget ? 'rgba(124,242,156,0.15)'
                      : track.id === activeVideoTrackId ? 'rgba(124,242,156,0.08)' : 'var(--bg-panel-alt)',
                    border: track.id === activeVideoTrackId ? '1px solid var(--accent)' : '1px solid transparent',
                    borderRadius: '4px', cursor: 'pointer', transition: 'background 0.1s',
                  }}
                >
                  {track.clips.map((clip) => {
                    const isBeingDragged = drag?.clipId === clip.id;
                    const isRejected = rejectedClipId === clip.id;
                    return (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => handlePointerDown(e, clip, track)}
                        className={isRejected ? 'clip-reject' : ''}
                        style={{
                          position: 'absolute', left: `${clip.startFrame * pixelsPerFrame}px`,
                          top: isBeingDragged ? `${drag.deltaY}px` : 0,
                          transform: isBeingDragged ? `translateX(${drag.deltaX}px)` : 'none',
                          width: `${clip.durationFrames * pixelsPerFrame}px`, height: '100%',
                          background: selectedClipId === clip.id ? 'var(--accent)' : TRACK_COLORS[track.type],
                          border: selectedClipId === clip.id ? '2px solid #fff' : '1px solid var(--border-subtle)',
                          borderRadius: '4px', cursor: 'grab', boxSizing: 'border-box',
                          display: 'flex', alignItems: 'center', padding: '0 8px',
                          color: selectedClipId === clip.id ? '#0b0d10' : '#fff',
                          fontSize: '11px', overflow: 'hidden', whiteSpace: 'nowrap',
                          opacity: isBeingDragged ? 0.55 : 1, zIndex: isBeingDragged ? 20 : 1, touchAction: 'none',
                        }}
                      >
                        {clip.text ?? project.assets[clip.assetId]?.name ?? clip.id}
                        {selectedClipId === clip.id && !isBeingDragged && (
                          <>
                            <div onMouseDown={(e) => handleTrimStart(e, clip.id, 'start')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '8px', background: 'rgba(11,13,16,0.4)', cursor: 'ew-resize' }} />
                            <div onMouseDown={(e) => handleTrimStart(e, clip.id, 'end')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', background: 'rgba(11,13,16,0.4)', cursor: 'ew-resize' }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {drag?.snapLineX !== null && drag?.snapLineX !== undefined && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${drag.snapLineX}px`, width: '1px', background: '#fff', pointerEvents: 'none', zIndex: 15 }} />
            )}
            {project.tracks.length > 0 && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${playheadFrame * pixelsPerFrame}px`, width: '2px', background: 'var(--accent)', pointerEvents: 'none', zIndex: 10 }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

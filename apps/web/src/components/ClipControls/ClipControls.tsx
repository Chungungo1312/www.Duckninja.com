import { useTimelineStore } from '../../store/timelineStore';

export function ClipControls() {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const setClipVolume = useTimelineStore((s) => s.setClipVolume);
  const setClipFade = useTimelineStore((s) => s.setClipFade);
  const setClipSpeed = useTimelineStore((s) => s.setClipSpeed);
  const setClipEffect = useTimelineStore((s) => s.setClipEffect);

  const clip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);
  if (!clip) return null;

  const isText = clip.text !== undefined;
  const getEffect = (type: 'brightness' | 'contrast' | 'saturation') =>
    clip.effects.find((e) => e.type === type)?.value ?? 100;

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
      {!isText && (
        <>
          <h4 style={{ margin: '0 0 0.5rem' }}>Velocidad y audio</h4>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Velocidad: {clip.speed.toFixed(2)}x</label>
            <input
              type="range" min={0.25} max={4} step={0.25}
              value={clip.speed}
              onChange={(e) => setClipSpeed(clip.id, Number(e.target.value))}
              style={{ width: '200px', display: 'block' }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Volumen: {(clip.volume * 100).toFixed(0)}%</label>
            <input
              type="range" min={0} max={2} step={0.05}
              value={clip.volume}
              onChange={(e) => setClipVolume(clip.id, Number(e.target.value))}
              style={{ width: '200px', display: 'block' }}
            />
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem' }}>Efectos</h4>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Brillo: {getEffect('brightness')}%</label>
            <input
              type="range" min={0} max={200}
              value={getEffect('brightness')}
              onChange={(e) => setClipEffect(clip.id, 'brightness', Number(e.target.value))}
              style={{ width: '200px', display: 'block' }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Contraste: {getEffect('contrast')}%</label>
            <input
              type="range" min={0} max={200}
              value={getEffect('contrast')}
              onChange={(e) => setClipEffect(clip.id, 'contrast', Number(e.target.value))}
              style={{ width: '200px', display: 'block' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Saturación: {getEffect('saturation')}%</label>
            <input
              type="range" min={0} max={200}
              value={getEffect('saturation')}
              onChange={(e) => setClipEffect(clip.id, 'saturation', Number(e.target.value))}
              style={{ width: '200px', display: 'block' }}
            />
          </div>
        </>
      )}

      <h4 style={{ margin: '0 0 0.5rem' }}>Transición (fade in/out)</h4>

      <div style={{ marginBottom: '0.5rem' }}>
        <label>Fade in (frames): {clip.fadeInFrames}</label>
        <input
          type="range" min={0} max={60}
          value={clip.fadeInFrames}
          onChange={(e) => setClipFade(clip.id, Number(e.target.value), clip.fadeOutFrames)}
          style={{ width: '200px', display: 'block' }}
        />
      </div>

      <div>
        <label>Fade out (frames): {clip.fadeOutFrames}</label>
        <input
          type="range" min={0} max={60}
          value={clip.fadeOutFrames}
          onChange={(e) => setClipFade(clip.id, clip.fadeInFrames, Number(e.target.value))}
          style={{ width: '200px', display: 'block' }}
        />
      </div>
    </div>
  );
}

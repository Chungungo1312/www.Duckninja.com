import { useTimelineStore } from '../../store/timelineStore';

const SWATCH_LUTS = [
  { name: 'Normal', color: '#8a9099' },
  { name: 'Cálido', color: '#e07856' },
  { name: 'Frío', color: '#4f7cff' },
  { name: 'B/N', color: '#cccccc' },
];

// IMPORTANTE: estos componentes viven FUERA de RightPanel a propósito.
// Si se definen dentro, React los recrea como un tipo nuevo en cada render
// y remonta el <input> nativo a mitad de un arrastre, cortando el gesto del
// slider (por eso antes "no se movían" al arrastrar).
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{title}</h4>
      {children}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number | string;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function SliderRow({ label, value, unit, min, max, step, onChange }: SliderRowProps) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
        <span>{label}</span>
        <span className="mono" style={{ color: 'var(--accent)' }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        style={{ width: '100%' }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export function RightPanel() {
  const project = useTimelineStore((s) => s.project);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const setClipVolume = useTimelineStore((s) => s.setClipVolume);
  const setClipFade = useTimelineStore((s) => s.setClipFade);
  const setClipSpeed = useTimelineStore((s) => s.setClipSpeed);
  const setClipEffect = useTimelineStore((s) => s.setClipEffect);
  const setClipText = useTimelineStore((s) => s.setClipText);
  const setClipFontSize = useTimelineStore((s) => s.setClipFontSize);

  const clip = project.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  return (
    <div style={{
      width: '260px', flexShrink: 0, background: 'var(--bg-panel)', borderLeft: '1px solid var(--border-subtle)',
      padding: '16px', overflowY: 'auto',
    }}>
      {!clip && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Selecciona un clip en la timeline para editar sus propiedades
        </div>
      )}

      {clip && clip.text !== undefined && (
        <>
          <Section title="Texto">
            <textarea
              value={clip.text}
              onChange={(e) => setClipText(clip.id, e.target.value)}
              style={{ width: '100%', minHeight: '60px', background: 'var(--bg-panel-alt)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px', fontFamily: 'var(--font-ui)' }}
            />
          </Section>
          <Section title="Tamaño de fuente">
            <SliderRow label="Tamaño" unit="px" min={16} max={120} value={clip.fontSize ?? 48}
              onChange={(e) => setClipFontSize(clip.id, Number(e.target.value))} />
          </Section>
        </>
      )}

      {clip && clip.text === undefined && (
        <>
          <Section title="Velocidad">
            <SliderRow label="Velocidad" unit="x" min={0.25} max={4} step={0.25} value={clip.speed}
              onChange={(e) => setClipSpeed(clip.id, Number(e.target.value))} />
          </Section>

          <Section title="Color">
            <SliderRow label="Brillo" unit="%" min={0} max={200}
              value={clip.effects.find((e) => e.type === 'brightness')?.value ?? 100}
              onChange={(e) => setClipEffect(clip.id, 'brightness', Number(e.target.value))} />
            <SliderRow label="Contraste" unit="%" min={0} max={200}
              value={clip.effects.find((e) => e.type === 'contrast')?.value ?? 100}
              onChange={(e) => setClipEffect(clip.id, 'contrast', Number(e.target.value))} />
            <SliderRow label="Saturación" unit="%" min={0} max={200}
              value={clip.effects.find((e) => e.type === 'saturation')?.value ?? 100}
              onChange={(e) => setClipEffect(clip.id, 'saturation', Number(e.target.value))} />
          </Section>

          <Section title="Filtros / LUTs">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SWATCH_LUTS.map((lut) => (
                <div key={lut.name} title={lut.name} style={{
                  width: '32px', height: '32px', borderRadius: '6px', background: lut.color,
                  border: '1px solid var(--border-subtle)', cursor: 'pointer',
                }} />
              ))}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>
              (próximamente funcionales)
            </div>
          </Section>

          <Section title="Audio">
            <SliderRow label="Volumen" unit="%" min={0} max={200} value={Math.round(clip.volume * 100)}
              onChange={(e) => setClipVolume(clip.id, Number(e.target.value) / 100)} />
          </Section>
        </>
      )}

      {clip && (
        <Section title="Transición">
          <SliderRow label="Fade in" unit=" fr" min={0} max={60} value={clip.fadeInFrames}
            onChange={(e) => setClipFade(clip.id, Number(e.target.value), clip.fadeOutFrames)} />
          <SliderRow label="Fade out" unit=" fr" min={0} max={60} value={clip.fadeOutFrames}
            onChange={(e) => setClipFade(clip.id, clip.fadeInFrames, Number(e.target.value))} />
        </Section>
      )}
    </div>
  );
}

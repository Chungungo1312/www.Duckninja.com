import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useTimelineStore } from '../../store/timelineStore';

type Tab = 'media' | 'texto' | 'efectos' | 'audio' | 'stickers';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'texto', label: 'Texto', icon: 'T' },
  { id: 'efectos', label: 'Efectos', icon: '✨' },
  { id: 'audio', label: 'Audio', icon: '♪' },
  { id: 'stickers', label: 'Stickers', icon: '★' },
];

export function LeftPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('media');
  const project = useTimelineStore((s) => s.project);
  const addAsset = useTimelineStore((s) => s.addAsset);
  const addVideoClip = useTimelineStore((s) => s.addVideoClip);
  const addTextClip = useTimelineStore((s) => s.addTextClip);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const assetId = nanoid();
    const tempVideo = document.createElement('video');
    tempVideo.src = url;

    await new Promise<void>((resolve) => { tempVideo.onloadedmetadata = () => resolve(); });

    const fps = 30;
    const durationFrames = Math.floor(tempVideo.duration * fps);

    addAsset({
      id: assetId, name: file.name, type: 'video', url,
      durationFrames, width: tempVideo.videoWidth, height: tempVideo.videoHeight,
    });

    e.target.value = '';
  };

  const handleAddText = () => {
    const content = prompt('Texto a mostrar:', 'Mi título');
    if (content) addTextClip(content);
  };

  const videoAssets = Object.values(project.assets).filter((a) => a.type === 'video');

  return (
    <div style={{ width: '220px', display: 'flex', flexShrink: 0, background: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)' }}>
      <div style={{ width: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '12px', gap: '4px', borderRight: '1px solid var(--border-subtle)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: activeTab === tab.id ? 'var(--bg-panel-alt)' : 'transparent',
              border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid transparent',
              borderRadius: '8px', fontSize: '16px', padding: 0,
            }}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          {TABS.find((t) => t.id === activeTab)?.label}
        </h4>

        {activeTab === 'media' && (
          <>
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <input type="file" accept="video/*" onChange={handleFileChange} style={{ fontSize: '11px', width: '100%' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {videoAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => addVideoClip(asset.id, asset.durationFrames ?? 90)}
                  title="Click para agregar a la timeline"
                  style={{
                    aspectRatio: '1', background: 'var(--bg-panel-alt)', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'var(--text-secondary)', padding: '4px', textAlign: 'center',
                    cursor: 'pointer', overflow: 'hidden', border: '1px solid var(--border-subtle)',
                  }}
                >
                  {asset.name}
                </div>
              ))}
              {videoAssets.length === 0 && (
                <div style={{ gridColumn: '1 / -1', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Sin videos importados
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'texto' && (
          <button className="cta" onClick={handleAddText} style={{ width: '100%' }}>
            + Agregar texto
          </button>
        )}

        {(activeTab === 'efectos' || activeTab === 'audio' || activeTab === 'stickers') && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Próximamente
          </div>
        )}
      </div>
    </div>
  );
}

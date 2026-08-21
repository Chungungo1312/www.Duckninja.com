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
  const addAudioClip = useTimelineStore((s) => s.addAudioClip);
  const addTextClip = useTimelineStore((s) => s.addTextClip);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith('audio') || /\.(mp3|wav)$/i.test(file.name);
    const url = URL.createObjectURL(file);
    const assetId = nanoid();

    const tempEl = document.createElement(isAudio ? 'audio' : 'video');
    tempEl.src = url;

    await new Promise<void>((resolve) => { tempEl.onloadedmetadata = () => resolve(); });

    const fps = 30;
    const durationFrames = Math.floor((tempEl as HTMLMediaElement).duration * fps);

    addAsset({
      id: assetId,
      name: file.name,
      type: isAudio ? 'audio' : 'video',
      url,
      durationFrames,
      width: isAudio ? undefined : (tempEl as HTMLVideoElement).videoWidth,
      height: isAudio ? undefined : (tempEl as HTMLVideoElement).videoHeight,
    });

    e.target.value = '';
  };

  const handleAddText = () => {
    const content = prompt('Texto a mostrar:', 'Mi título');
    if (content) addTextClip(content);
  };

  const videoAssets = Object.values(project.assets).filter((a) => a.type === 'video');
  const audioAssets = Object.values(project.assets).filter((a) => a.type === 'audio');

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
                    aspectRatio: '1', background: '#000', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative',
                  }}
                >
                  <video
                    src={asset.url}
                    muted
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
                  />
                  <span style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2px 4px',
                    fontSize: '9px', background: 'rgba(0,0,0,0.6)', color: '#fff',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {asset.name}
                  </span>
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

        {activeTab === 'audio' && (
          <>
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <input type="file" accept="audio/mpeg,audio/wav,.mp3,.wav" onChange={handleFileChange} style={{ fontSize: '11px', width: '100%' }} />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {audioAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => addAudioClip(asset.id, asset.durationFrames ?? 90)}
                  title="Click para agregar a la timeline"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                    background: 'var(--bg-panel-alt)', borderRadius: '6px', cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>♪</span>
                  <span style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {asset.name}
                  </span>
                </div>
              ))}
              {audioAssets.length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Sin audios importados (mp3, wav)
                </div>
              )}
            </div>
          </>
        )}

        {(activeTab === 'efectos' || activeTab === 'stickers') && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Próximamente</div>
        )}
      </div>
    </div>
  );
}

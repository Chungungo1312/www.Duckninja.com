import { nanoid } from 'nanoid';
import { useTimelineStore } from '../../store/timelineStore';

export function ImportVideo() {
  const addAsset = useTimelineStore((s) => s.addAsset);
  const addTrackWithClip = useTimelineStore((s) => s.addTrackWithClip);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const assetId = nanoid();

    // Cargamos el video temporalmente para leer su duración real
    const tempVideo = document.createElement('video');
    tempVideo.src = url;

    await new Promise<void>((resolve) => {
      tempVideo.onloadedmetadata = () => resolve();
    });

    const fps = 30; // asumimos 30fps por ahora; se puede detectar con más precisión luego
    const durationFrames = Math.floor(tempVideo.duration * fps);

    addAsset({
      id: assetId,
      name: file.name,
      type: 'video',
      url,
      durationFrames,
      width: tempVideo.videoWidth,
      height: tempVideo.videoHeight,
    });

    addTrackWithClip(assetId, durationFrames);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Importar video:
      </label>
      <input type="file" accept="video/*" onChange={handleFileChange} />
    </div>
  );
}

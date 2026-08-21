import { nanoid } from 'nanoid';
import { useTimelineStore } from '../../store/timelineStore';

export function ImportVideo() {
  const addAsset = useTimelineStore((s) => s.addAsset);
  const addVideoClip = useTimelineStore((s) => s.addVideoClip);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const assetId = nanoid();

    const tempVideo = document.createElement('video');
    tempVideo.src = url;

    await new Promise<void>((resolve) => {
      tempVideo.onloadedmetadata = () => resolve();
    });

    const fps = 30;
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

    addVideoClip(assetId, durationFrames);

    // Permite volver a importar el mismo archivo si se desea
    e.target.value = '';
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>
        Importar video (puedes importar varios, se agregan uno tras otro):
      </label>
      <input type="file" accept="video/*" onChange={handleFileChange} />
    </div>
  );
}

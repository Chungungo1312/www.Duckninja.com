import { Project, Clip } from '@video-editor/types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private videoCache = new Map<string, HTMLVideoElement>();

  constructor(private canvas: HTMLCanvasElement, private project: Project) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener contexto 2D');
    this.ctx = ctx;
    canvas.width = project.resolution.width;
    canvas.height = project.resolution.height;
  }

  updateResolution(resolution: { width: number; height: number }): void {
    this.project = { ...this.project, resolution };
    this.canvas.width = resolution.width;
    this.canvas.height = resolution.height;
  }

  private getOrCreateVideo(assetId: string): HTMLVideoElement | null {
    if (this.videoCache.has(assetId)) return this.videoCache.get(assetId)!;
    const asset = this.project.assets[assetId];
    if (!asset || asset.type !== 'video') return null;
    const video = document.createElement('video');
    video.src = asset.url;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    this.videoCache.set(assetId, video);
    return video;
  }

  private getClipOpacity(clip: Clip, frame: number): number {
    const relativeFrame = frame - clip.startFrame;
    let opacity = 1;
    if (clip.fadeInFrames > 0 && relativeFrame < clip.fadeInFrames) {
      opacity = Math.min(opacity, relativeFrame / clip.fadeInFrames);
    }
    const framesFromEnd = clip.durationFrames - relativeFrame;
    if (clip.fadeOutFrames > 0 && framesFromEnd < clip.fadeOutFrames) {
      opacity = Math.min(opacity, framesFromEnd / clip.fadeOutFrames);
    }
    return Math.max(0, Math.min(1, opacity));
  }

  private applyEffectsFilter(clip: Clip): void {
    if (!clip.effects || clip.effects.length === 0) {
      this.ctx.filter = 'none';
      return;
    }
    const filters = clip.effects
      .map((effect) => {
        switch (effect.type) {
          case 'brightness': return `brightness(${effect.value}%)`;
          case 'contrast': return `contrast(${effect.value}%)`;
          case 'saturation': return `saturate(${effect.value}%)`;
          default: return '';
        }
      })
      .filter(Boolean)
      .join(' ');
    this.ctx.filter = filters || 'none';
  }

  private drawTextClip(clip: Clip, frame: number): void {
    const { width, height } = this.project.resolution;
    this.ctx.save();
    this.ctx.filter = 'none';
    this.ctx.globalAlpha = this.getClipOpacity(clip, frame);
    this.ctx.fillStyle = clip.textColor ?? '#ffffff';
    this.ctx.font = `bold ${clip.fontSize ?? 48}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;
    const text = clip.text ?? '';
    this.ctx.strokeText(text, width / 2, height - 100);
    this.ctx.fillText(text, width / 2, height - 100);
    this.ctx.restore();
  }

  async renderFrame(frame: number, activeClips: Clip[]): Promise<void> {
    const { width, height } = this.project.resolution;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (const clip of activeClips) {
      if (clip.text !== undefined) {
        this.drawTextClip(clip, frame);
        continue;
      }
      const video = this.getOrCreateVideo(clip.assetId);
      if (!video) continue;

      const relativeFrame = frame - clip.startFrame;
      const sourceFrame = clip.trimStart + relativeFrame * clip.speed;
      const targetTime = sourceFrame / this.project.fps;

      if (Math.abs(video.currentTime - targetTime) > 1 / this.project.fps) {
        video.currentTime = targetTime;
        await this.waitForSeek(video);
      }

      this.ctx.save();
      this.applyEffectsFilter(clip);
      this.ctx.globalAlpha = this.getClipOpacity(clip, frame);
      this.ctx.drawImage(video, 0, 0, width, height);
      this.ctx.restore();
    }
  }

  // Arranca la reproducción nativa de UN clip individual (usado para activar clips
  // de distintas pistas de forma independiente cuando cada uno comienza)
  startClip(clip: Clip, frame: number): void {
    const video = this.getOrCreateVideo(clip.assetId);
    if (!video) return;

    const relativeFrame = frame - clip.startFrame;
    const sourceFrame = clip.trimStart + relativeFrame * clip.speed;
    const targetTime = sourceFrame / this.project.fps;

    video.currentTime = targetTime;
    video.playbackRate = clip.speed;
    video.muted = false;
    video.volume = Math.max(0, Math.min(clip.volume, 1));
    video.play().catch(() => {});
  }

  // Detiene un clip específico (por assetId) sin afectar a otros clips reproduciéndose
  stopClip(assetId: string): void {
    const video = this.videoCache.get(assetId);
    if (!video) return;
    video.pause();
    video.muted = true;
  }

  pauseAll(): void {
    this.videoCache.forEach((video) => {
      video.pause();
      video.muted = true;
    });
  }

  // Dibuja todos los clips de video activos (compuestos por orden de pista) + overlays de texto
  drawActiveClips(videoClips: Clip[], frame: number, textClips: Clip[] = []): void {
    const { width, height } = this.project.resolution;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (const clip of videoClips) {
      const video = this.videoCache.get(clip.assetId);
      if (!video) continue;
      this.ctx.save();
      this.applyEffectsFilter(clip);
      this.ctx.globalAlpha = this.getClipOpacity(clip, frame);
      this.ctx.drawImage(video, 0, 0, width, height);
      this.ctx.restore();
    }

    for (const overlay of textClips) {
      this.drawTextClip(overlay, frame);
    }
  }

  renderTestFrame(): void {
    const { width, height } = this.project.resolution;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.fillStyle = '#7cf29c';
    this.ctx.fillRect(width / 4, height / 4, width / 2, height / 2);
    this.ctx.fillStyle = '#0b0d10';
    this.ctx.font = '32px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Preview', width / 2, height / 2);
  }

  private waitForSeek(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      const handler = () => {
        video.removeEventListener('seeked', handler);
        resolve();
      };
      video.addEventListener('seeked', handler);
    });
  }

  dispose(): void {
    this.videoCache.forEach((video) => {
      video.pause();
      video.src = '';
    });
    this.videoCache.clear();
  }
}

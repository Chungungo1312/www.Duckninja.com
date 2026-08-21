import { Project, Clip } from '@video-editor/types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private mediaCache = new Map<string, HTMLVideoElement | HTMLAudioElement>();

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

  private getOrCreateMedia(assetId: string): HTMLVideoElement | HTMLAudioElement | null {
    if (this.mediaCache.has(assetId)) return this.mediaCache.get(assetId)!;
    const asset = this.project.assets[assetId];
    if (!asset || (asset.type !== 'video' && asset.type !== 'audio')) return null;

    const el: HTMLVideoElement | HTMLAudioElement =
      asset.type === 'video' ? document.createElement('video') : document.createElement('audio');
    el.src = asset.url;
    el.muted = true;
    el.crossOrigin = 'anonymous';
    el.preload = 'auto';
    if (el instanceof HTMLVideoElement) el.playsInline = true;
    this.mediaCache.set(assetId, el);
    return el;
  }

  // Crea y empieza a bufferear TODOS los assets del proyecto por adelantado.
  // Esto evita que, al llegar el turno de un clip que recién se activa durante
  // la reproducción, la pantalla quede en negro mientras el navegador todavía
  // está descargando/decodificando ese video por primera vez.
  async preloadAssets(): Promise<void> {
    const mediaAssets = Object.values(this.project.assets).filter(
      (a) => a.type === 'video' || a.type === 'audio'
    );

    await Promise.all(
      mediaAssets.map((asset) => {
        const el = this.getOrCreateMedia(asset.id);
        if (!el) return Promise.resolve();
        if (el.readyState >= 2) return Promise.resolve(); // HAVE_CURRENT_DATA o más

        return new Promise<void>((resolve) => {
          const onReady = () => { el.removeEventListener('loadeddata', onReady); resolve(); };
          el.addEventListener('loadeddata', onReady);
          // failsafe: no bloquear indefinidamente si un asset tarda demasiado
          setTimeout(resolve, 4000);
        });
      })
    );
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
    if (!clip.effects || clip.effects.length === 0) { this.ctx.filter = 'none'; return; }
    const filters = clip.effects
      .map((effect) => {
        switch (effect.type) {
          case 'brightness': return `brightness(${effect.value}%)`;
          case 'contrast': return `contrast(${effect.value}%)`;
          case 'saturation': return `saturate(${effect.value}%)`;
          default: return '';
        }
      })
      .filter(Boolean).join(' ');
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

  // Scrubbing: dibuja todos los clips activos (solo video visualmente) haciendo seek preciso
  async renderFrame(frame: number, activeClips: Clip[]): Promise<void> {
    const { width, height } = this.project.resolution;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (const clip of activeClips) {
      if (clip.text !== undefined) { this.drawTextClip(clip, frame); continue; }
      const asset = this.project.assets[clip.assetId];
      if (!asset || asset.type !== 'video') continue; // el audio no se dibuja

      const video = this.getOrCreateMedia(clip.assetId) as HTMLVideoElement | null;
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

  // Arranca UN clip individual (video o audio) — usado durante Play para activar
  // clips de cualquier pista de forma independiente cuando cada uno comienza.
  startClip(clip: Clip, frame: number): void {
    const media = this.getOrCreateMedia(clip.assetId);
    if (!media) return;

    const relativeFrame = frame - clip.startFrame;
    const sourceFrame = clip.trimStart + relativeFrame * clip.speed;
    const targetTime = sourceFrame / this.project.fps;

    media.currentTime = targetTime;
    media.playbackRate = clip.speed;
    media.muted = false;
    media.volume = Math.max(0, Math.min(clip.volume, 1));
    media.play().catch(() => {});
  }

  stopClip(assetId: string): void {
    const media = this.mediaCache.get(assetId);
    if (!media) return;
    media.pause();
    media.muted = true;
  }

  pauseAll(): void {
    this.mediaCache.forEach((media) => { media.pause(); media.muted = true; });
  }

  // Dibuja los clips de video activos (compuestos) + overlays de texto.
  // Los clips de audio se ignoran aquí (ya están sonando vía startClip).
  drawActiveClips(mediaClips: Clip[], frame: number, textClips: Clip[] = []): void {
    const { width, height } = this.project.resolution;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (const clip of mediaClips) {
      const asset = this.project.assets[clip.assetId];
      if (!asset || asset.type !== 'video') continue;

      const video = this.mediaCache.get(clip.assetId) as HTMLVideoElement | undefined;
      if (!video || video.readyState < 2) continue; // aún sin frame decodificado: se omite en vez de pintar negro

      this.ctx.save();
      this.applyEffectsFilter(clip);
      this.ctx.globalAlpha = this.getClipOpacity(clip, frame);
      this.ctx.drawImage(video, 0, 0, width, height);
      this.ctx.restore();
    }

    for (const overlay of textClips) this.drawTextClip(overlay, frame);
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
      const handler = () => { video.removeEventListener('seeked', handler); resolve(); };
      video.addEventListener('seeked', handler);
    });
  }

  dispose(): void {
    this.mediaCache.forEach((media) => { media.pause(); media.src = ''; });
    this.mediaCache.clear();
  }
}

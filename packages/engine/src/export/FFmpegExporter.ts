import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
export class FFmpegExporter {
  private ffmpeg: FFmpeg;
  private loaded = false;
  constructor() { this.ffmpeg = new FFmpeg(); }
  async load() {
    if (this.loaded) return;
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      this.loaded = true;
    } catch (error) { throw new Error('Error cargando FFmpeg'); }
  }
  async exportVideo(data: Uint8Array): Promise<Blob> {
    if (!this.loaded) throw new Error('FFmpeg no cargado');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }
}

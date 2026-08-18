import { Project, Track, Clip, TrackType } from '@video-editor/types';
export class TimelineModel {
  constructor(private project: Project) {}
  getTracks(): Track[] { return this.project.tracks || []; }
  getClips(): Clip[] { return this.project.tracks?.flatMap(t => t.clips) || []; }
  addTrack(type: TrackType): void { if (!this.project.tracks) this.project.tracks = []; this.project.tracks.push({ id: `track-${Date.now()}`, type, clips: [] }); }
  addClip(clip: Clip): void { const track = this.project.tracks?.find(t => t.id === clip.trackId); if (track) track.clips.push(clip); }
  removeClip(clipId: string): void { this.project.tracks?.forEach(track => { track.clips = track.clips.filter(c => c.id !== clipId); }); }
}

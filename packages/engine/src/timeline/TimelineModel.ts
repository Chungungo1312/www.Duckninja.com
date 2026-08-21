import { Project, Track, Clip, TrackType } from '@video-editor/types';
import { nanoid } from 'nanoid';

export class TimelineModel {
  private project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  getProject(): Project {
    return this.project;
  }

  addTrack(type: TrackType): Track {
    const track: Track = {
      id: nanoid(),
      type,
      clips: [],
      order: this.project.tracks.length,
    };
    this.project.tracks.push(track);
    return track;
  }

  addClip(trackId: string, clip: Omit<Clip, 'id' | 'trackId'>): Clip {
    const track = this.findTrack(trackId);
    if (!track) throw new Error(`Track ${trackId} no existe`);

    const newClip: Clip = { ...clip, id: nanoid(), trackId };

    if (this.hasOverlap(track, newClip)) {
      throw new Error('El clip se superpone con otro en la misma pista');
    }

    track.clips.push(newClip);
    track.clips.sort((a, b) => a.startFrame - b.startFrame);
    return newClip;
  }

  splitClip(clipId: string, atFrame: number): [Clip, Clip] {
    const { track, clip } = this.findClip(clipId);
    if (!track || !clip) throw new Error('Clip no encontrado');

    const relativeFrame = atFrame - clip.startFrame;
    if (relativeFrame <= 0 || relativeFrame >= clip.durationFrames) {
      throw new Error('Punto de corte fuera de los límites del clip');
    }

    const firstPart: Clip = {
      ...clip,
      durationFrames: relativeFrame,
      trimEnd: clip.trimStart + relativeFrame * clip.speed,
    };

    const secondPart: Clip = {
      ...clip,
      id: nanoid(),
      startFrame: clip.startFrame + relativeFrame,
      durationFrames: clip.durationFrames - relativeFrame,
      trimStart: clip.trimStart + relativeFrame * clip.speed,
    };

    const index = track.clips.findIndex((c) => c.id === clipId);
    track.clips.splice(index, 1, firstPart, secondPart);

    return [firstPart, secondPart];
  }

  trimClip(clipId: string, edge: 'start' | 'end', deltaFrames: number): Clip {
    const { clip } = this.findClip(clipId);
    if (!clip) throw new Error('Clip no encontrado');

    if (edge === 'start') {
      clip.startFrame += deltaFrames;
      clip.trimStart += deltaFrames * clip.speed;
      clip.durationFrames -= deltaFrames;
    } else {
      clip.durationFrames += deltaFrames;
      clip.trimEnd += deltaFrames * clip.speed;
    }

    if (clip.durationFrames <= 0) {
      throw new Error('El clip no puede tener duración cero o negativa');
    }

    return clip;
  }

  moveClip(clipId: string, newStartFrame: number, newTrackId?: string): void {
    const { track: sourceTrack, clip } = this.findClip(clipId);
    if (!sourceTrack || !clip) throw new Error('Clip no encontrado');

    const targetTrack = newTrackId ? this.findTrack(newTrackId) : sourceTrack;
    if (!targetTrack) throw new Error('Track destino no existe');

    const updatedClip = { ...clip, startFrame: newStartFrame, trackId: targetTrack.id };

    if (this.hasOverlap(targetTrack, updatedClip, clipId)) {
      throw new Error('Movimiento inválido: se superpone con otro clip');
    }

    sourceTrack.clips = sourceTrack.clips.filter((c) => c.id !== clipId);
    targetTrack.clips.push(updatedClip);
    targetTrack.clips.sort((a, b) => a.startFrame - b.startFrame);
  }

  deleteClip(clipId: string): void {
    const { track } = this.findClip(clipId);
    if (!track) return;
    track.clips = track.clips.filter((c) => c.id !== clipId);
  }

  getTotalDuration(): number {
    let max = 0;
    for (const track of this.project.tracks) {
      for (const clip of track.clips) {
        max = Math.max(max, clip.startFrame + clip.durationFrames);
      }
    }
    return max;
  }

  getClipsAtFrame(frame: number): Clip[] {
    const result: Clip[] = [];
    for (const track of this.project.tracks) {
      if (track.locked) continue;
      for (const clip of track.clips) {
        if (frame >= clip.startFrame && frame < clip.startFrame + clip.durationFrames) {
          result.push(clip);
        }
      }
    }
    return result;
  }

  private findTrack(trackId: string): Track | undefined {
    return this.project.tracks.find((t) => t.id === trackId);
  }

  private findClip(clipId: string): { track?: Track; clip?: Clip } {
    for (const track of this.project.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return { track, clip };
    }
    return {};
  }

  private hasOverlap(track: Track, clip: Clip, excludeId?: string): boolean {
    const clipEnd = clip.startFrame + clip.durationFrames;
    return track.clips.some((c) => {
      if (c.id === excludeId || c.id === clip.id) return false;
      const cEnd = c.startFrame + c.durationFrames;
      return clip.startFrame < cEnd && clipEnd > c.startFrame;
    });
  }
}

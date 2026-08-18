import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Clip, Asset, TrackType, Effect } from '@video-editor/types';
import { TimelineModel, ProjectStorage } from '@video-editor/engine';
import { nanoid } from 'nanoid';

interface TimelineState {
  project: Project;
  playheadFrame: number;
  selectedClipId: string | null;
  zoom: number;
  isSaving: boolean;
  isLoading: boolean;

  addTrack: (type: TrackType) => string;
  addAsset: (asset: Asset) => void;
  addTrackWithClip: (assetId: string, durationFrames: number) => void;
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => void;
  addTextClip: (content: string) => void;
  splitClip: (clipId: string, atFrame: number) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', deltaFrames: number) => void;
  moveClip: (clipId: string, newStartFrame: number, newTrackId?: string) => void;
  deleteClip: (clipId: string) => void;
  setClipVolume: (clipId: string, volume: number) => void;
  setClipFade: (clipId: string, fadeInFrames: number, fadeOutFrames: number) => void;
  setClipSpeed: (clipId: string, speed: number) => void;
  setClipEffect: (clipId: string, type: Effect['type'], value: number) => void;
  setPlayhead: (frame: number) => void;
  selectClip: (clipId: string | null) => void;
  setZoom: (zoom: number) => void;
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

const emptyProject: Project = {
  id: 'draft',
  name: 'Proyecto sin título',
  fps: 30,
  resolution: { width: 1920, height: 1080 },
  tracks: [],
  assets: {},
};

const defaultEffects = (): Effect[] => [
  { id: nanoid(), type: 'brightness', value: 100 },
  { id: nanoid(), type: 'contrast', value: 100 },
  { id: nanoid(), type: 'saturation', value: 100 },
];

export const useTimelineStore = create<TimelineState>()(
  immer((set, get) => ({
    project: emptyProject,
    playheadFrame: 0,
    selectedClipId: null,
    zoom: 4,
    isSaving: false,
    isLoading: false,

    addTrack: (type) => {
      const model = new TimelineModel(get().project);
      const track = model.addTrack(type);
      set((state) => {
        state.project = model.getProject();
      });
      return track.id;
    },

    addAsset: (asset) =>
      set((state) => {
        state.project.assets[asset.id] = asset;
      }),

    addTrackWithClip: (assetId, durationFrames) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        const track = model.addTrack('video');
        model.addClip(track.id, {
          assetId,
          startFrame: 0,
          durationFrames,
          trimStart: 0,
          trimEnd: durationFrames,
          speed: 1,
          volume: 1,
          fadeInFrames: 0,
          fadeOutFrames: 0,
          effects: defaultEffects(),
        });
        state.project = model.getProject();
      }),

    addClip: (trackId, clip) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        model.addClip(trackId, clip);
        state.project = model.getProject();
      }),

    addTextClip: (content) => {
      const state = get();
      let textTrack = state.project.tracks.find((t) => t.type === 'text');
      let trackId = textTrack?.id;

      if (!trackId) {
        trackId = get().addTrack('text');
      }

      set((s) => {
        const model = new TimelineModel(s.project);
        model.addClip(trackId!, {
          assetId: '',
          startFrame: s.playheadFrame,
          durationFrames: 90,
          trimStart: 0,
          trimEnd: 90,
          speed: 1,
          volume: 1,
          fadeInFrames: 5,
          fadeOutFrames: 5,
          effects: [],
          text: content,
          textColor: '#ffffff',
          fontSize: 48,
        });
        s.project = model.getProject();
      });
    },

    splitClip: (clipId, atFrame) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        model.splitClip(clipId, atFrame);
        state.project = model.getProject();
      }),

    trimClip: (clipId, edge, deltaFrames) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        model.trimClip(clipId, edge, deltaFrames);
        state.project = model.getProject();
      }),

    moveClip: (clipId, newStartFrame, newTrackId) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        model.moveClip(clipId, Math.max(0, newStartFrame), newTrackId);
        state.project = model.getProject();
      }),

    deleteClip: (clipId) =>
      set((state) => {
        const model = new TimelineModel(state.project);
        model.deleteClip(clipId);
        state.project = model.getProject();
        if (state.selectedClipId === clipId) state.selectedClipId = null;
      }),

    setClipVolume: (clipId, volume) =>
      set((state) => {
        for (const track of state.project.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.volume = Math.max(0, Math.min(volume, 2));
            break;
          }
        }
      }),

    setClipFade: (clipId, fadeInFrames, fadeOutFrames) =>
      set((state) => {
        for (const track of state.project.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.fadeInFrames = Math.max(0, fadeInFrames);
            clip.fadeOutFrames = Math.max(0, fadeOutFrames);
            break;
          }
        }
      }),

    setClipSpeed: (clipId, speed) =>
      set((state) => {
        for (const track of state.project.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            clip.speed = Math.max(0.25, Math.min(speed, 4));
            break;
          }
        }
      }),

    setClipEffect: (clipId, type, value) =>
      set((state) => {
        for (const track of state.project.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (clip) {
            const effect = clip.effects.find((e) => e.type === type);
            if (effect) {
              effect.value = value;
            } else {
              clip.effects.push({ id: nanoid(), type, value });
            }
            break;
          }
        }
      }),

    setPlayhead: (frame) =>
      set((state) => {
        state.playheadFrame = Math.max(0, frame);
      }),

    selectClip: (clipId) =>
      set((state) => {
        state.selectedClipId = clipId;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.zoom = Math.max(0.5, Math.min(zoom, 50));
      }),

    saveProject: async () => {
      set((state) => { state.isSaving = true; });
      try {
        await ProjectStorage.save(get().project);
      } finally {
        set((state) => { state.isSaving = false; });
      }
    },

    loadProject: async (projectId) => {
      set((state) => { state.isLoading = true; });
      try {
        const loaded = await ProjectStorage.load(projectId);
        if (loaded) {
          set((state) => {
            state.project = loaded;
            state.playheadFrame = 0;
            state.selectedClipId = null;
          });
        }
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },
  }))
);

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Project, Clip, Asset, TrackType, Effect } from '@video-editor/types';
import { TimelineModel, ProjectStorage } from '@video-editor/engine';
import { nanoid } from 'nanoid';

const MAX_VIDEO_TRACKS = 5;
const MAX_HISTORY = 50;

interface TimelineState {
  project: Project;
  playheadFrame: number;
  selectedClipId: string | null;
  activeVideoTrackId: string | null;
  zoom: number;
  isPlaying: boolean;
  isSaving: boolean;
  isLoading: boolean;
  clipboard: Clip | null;
  toast: string | null;
  historyPast: Project[];
  historyFuture: Project[];

  addTrack: (type: TrackType) => string;
  addVideoTrack: () => void;
  setActiveVideoTrack: (trackId: string) => void;
  addAsset: (asset: Asset) => void;
  addVideoClip: (assetId: string, durationFrames: number) => void;
  addAudioClip: (assetId: string, durationFrames: number) => void;
  addClip: (trackId: string, clip: Omit<Clip, 'id' | 'trackId'>) => void;
  addTextClip: (content: string) => void;
  duplicateClip: (clipId: string) => void;
  copyClip: (clipId: string) => void;
  pasteClip: () => void;
  splitClip: (clipId: string, atFrame: number) => void;
  trimClip: (clipId: string, edge: 'start' | 'end', deltaFrames: number) => void;
  moveClip: (clipId: string, newStartFrame: number, newTrackId?: string) => void;
  deleteClip: (clipId: string) => void;
  setClipVolume: (clipId: string, volume: number) => void;
  setClipFade: (clipId: string, fadeInFrames: number, fadeOutFrames: number) => void;
  setClipSpeed: (clipId: string, speed: number) => void;
  setClipEffect: (clipId: string, type: Effect['type'], value: number) => void;
  setClipText: (clipId: string, text: string) => void;
  setClipFontSize: (clipId: string, fontSize: number) => void;
  setPlayhead: (frame: number) => void;
  selectClip: (clipId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setResolution: (width: number, height: number) => void;
  setProjectName: (name: string) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  undo: () => void;
  redo: () => void;
  saveProject: () => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

const emptyProject: Project = {
  id: 'draft', name: 'Proyecto sin título', fps: 30,
  resolution: { width: 1080, height: 1920 }, tracks: [], assets: {},
};

const defaultEffects = (): Effect[] => [
  { id: nanoid(), type: 'brightness', value: 100 },
  { id: nanoid(), type: 'contrast', value: 100 },
  { id: nanoid(), type: 'saturation', value: 100 },
];

const cloneProject = (p: Project): Project => JSON.parse(JSON.stringify(p));

export const useTimelineStore = create<TimelineState>()(
  immer((set, get) => {
    const snapshot = (state: TimelineState) => {
      state.historyPast.push(cloneProject(state.project));
      if (state.historyPast.length > MAX_HISTORY) state.historyPast.shift();
      state.historyFuture = [];
    };

    return {
      project: emptyProject,
      playheadFrame: 0,
      selectedClipId: null,
      activeVideoTrackId: null,
      zoom: 4,
      isPlaying: false,
      isSaving: false,
      isLoading: false,
      clipboard: null,
      toast: null,
      historyPast: [],
      historyFuture: [],

      addTrack: (type) => {
        const model = new TimelineModel(get().project);
        const track = model.addTrack(type);
        set((state) => { snapshot(state); state.project = model.getProject(); });
        return track.id;
      },

      addVideoTrack: () =>
        set((state) => {
          const videoTracks = state.project.tracks.filter((t) => t.type === 'video');
          if (videoTracks.length >= MAX_VIDEO_TRACKS) return;
          snapshot(state);
          const model = new TimelineModel(state.project);
          const track = model.addTrack('video');
          state.project = model.getProject();
          state.activeVideoTrackId = track.id;
        }),

      setActiveVideoTrack: (trackId) => set((state) => { state.activeVideoTrackId = trackId; }),

      addAsset: (asset) => set((state) => { state.project.assets[asset.id] = asset; }),

      addVideoClip: (assetId, durationFrames) =>
        set((state) => {
          snapshot(state);
          const model = new TimelineModel(state.project);
          let targetTrack = state.activeVideoTrackId
            ? state.project.tracks.find((t) => t.id === state.activeVideoTrackId)
            : state.project.tracks.find((t) => t.type === 'video');
          if (!targetTrack) targetTrack = model.addTrack('video');

          const lastClipEnd = targetTrack.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
          model.addClip(targetTrack.id, {
            assetId, startFrame: lastClipEnd, durationFrames,
            trimStart: 0, trimEnd: durationFrames, speed: 1, volume: 1,
            fadeInFrames: 0, fadeOutFrames: 0, effects: defaultEffects(),
          });
          state.project = model.getProject();
          state.activeVideoTrackId = targetTrack.id;
        }),

      addAudioClip: (assetId, durationFrames) =>
        set((state) => {
          snapshot(state);
          const model = new TimelineModel(state.project);
          let targetTrack = state.project.tracks.find((t) => t.type === 'audio');
          if (!targetTrack) targetTrack = model.addTrack('audio');

          const lastClipEnd = targetTrack.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
          model.addClip(targetTrack.id, {
            assetId, startFrame: lastClipEnd, durationFrames,
            trimStart: 0, trimEnd: durationFrames, speed: 1, volume: 1,
            fadeInFrames: 0, fadeOutFrames: 0, effects: [],
          });
          state.project = model.getProject();
        }),

      addClip: (trackId, clip) =>
        set((state) => {
          snapshot(state);
          const model = new TimelineModel(state.project);
          model.addClip(trackId, clip);
          state.project = model.getProject();
        }),

      addTextClip: (content) => {
        const st = get();
        let textTrack = st.project.tracks.find((t) => t.type === 'text');
        let trackId = textTrack?.id;
        if (!trackId) trackId = get().addTrack('text');

        set((state) => {
          snapshot(state);
          const model = new TimelineModel(state.project);
          model.addClip(trackId!, {
            assetId: '', startFrame: state.playheadFrame, durationFrames: 90,
            trimStart: 0, trimEnd: 90, speed: 1, volume: 1,
            fadeInFrames: 5, fadeOutFrames: 5, effects: [],
            text: content, textColor: '#ffffff', fontSize: 48,
          });
          state.project = model.getProject();
        });
      },

      duplicateClip: (clipId) =>
        set((state) => {
          const track = state.project.tracks.find((t) => t.clips.some((c) => c.id === clipId));
          const clip = track?.clips.find((c) => c.id === clipId);
          if (!track || !clip) return;
          snapshot(state);
          const model = new TimelineModel(state.project);
          const { id, trackId, ...rest } = clip;
          const newStart = clip.startFrame + clip.durationFrames;
          try {
            model.addClip(track.id, { ...rest, startFrame: newStart });
          } catch {
            const lastClipEnd = track.clips.reduce((max, c) => Math.max(max, c.startFrame + c.durationFrames), 0);
            model.addClip(track.id, { ...rest, startFrame: lastClipEnd });
          }
          state.project = model.getProject();
          state.toast = 'Clip duplicado';
        }),

      copyClip: (clipId) =>
        set((state) => {
          const clip = state.project.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
          if (!clip) return;
          state.clipboard = cloneProject({ tracks: [{ id: '', type: 'video', clips: [clip], order: 0 }], assets: {}, id: '', name: '', fps: 30, resolution: { width: 0, height: 0 } } as any).tracks[0].clips[0];
          state.toast = 'Clip copiado';
        }),

      pasteClip: () =>
        set((state) => {
          const clip = state.clipboard;
          if (!clip) return;
          let targetTrack = state.project.tracks.find((t) => t.type === (clip.text !== undefined ? 'text' : 'video'));
          snapshot(state);
          const model = new TimelineModel(state.project);
          if (!targetTrack) targetTrack = model.addTrack(clip.text !== undefined ? 'text' : 'video');
          const { id, trackId, ...rest } = clip;
          try {
            model.addClip(targetTrack.id, { ...rest, startFrame: state.playheadFrame });
          } catch {
            state.historyPast.pop();
            state.toast = 'No se pudo pegar: se superpone con otro clip';
            return;
          }
          state.project = model.getProject();
          state.toast = 'Clip pegado';
        }),

      splitClip: (clipId, atFrame) =>
        set((state) => {
          snapshot(state);
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
          snapshot(state);
          const model = new TimelineModel(state.project);
          model.deleteClip(clipId);
          state.project = model.getProject();
          if (state.selectedClipId === clipId) state.selectedClipId = null;
          state.toast = 'Clip eliminado';
        }),

      setClipVolume: (clipId, volume) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) { clip.volume = Math.max(0, Math.min(volume, 2)); break; }
          }
        }),

      setClipFade: (clipId, fadeInFrames, fadeOutFrames) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) { clip.fadeInFrames = Math.max(0, fadeInFrames); clip.fadeOutFrames = Math.max(0, fadeOutFrames); break; }
          }
        }),

      setClipSpeed: (clipId, speed) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) { clip.speed = Math.max(0.25, Math.min(speed, 4)); break; }
          }
        }),

      setClipEffect: (clipId, type, value) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) {
              const effect = clip.effects.find((e) => e.type === type);
              if (effect) effect.value = value; else clip.effects.push({ id: nanoid(), type, value });
              break;
            }
          }
        }),

      setClipText: (clipId, text) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) { clip.text = text; break; }
          }
        }),

      setClipFontSize: (clipId, fontSize) =>
        set((state) => {
          for (const track of state.project.tracks) {
            const clip = track.clips.find((c) => c.id === clipId);
            if (clip) { clip.fontSize = fontSize; break; }
          }
        }),

      setPlayhead: (frame) => set((state) => { state.playheadFrame = Math.max(0, frame); }),
      selectClip: (clipId) => set((state) => { state.selectedClipId = clipId; }),
      setZoom: (zoom) => set((state) => { state.zoom = Math.max(0.5, Math.min(zoom, 50)); }),
      setPlaying: (playing) => set((state) => { state.isPlaying = playing; }),
      togglePlaying: () => set((state) => { state.isPlaying = !state.isPlaying; }),
      setResolution: (width, height) => set((state) => { state.project.resolution = { width, height }; }),
      setProjectName: (name) => set((state) => { state.project.name = name; }),
      showToast: (message) => set((state) => { state.toast = message; }),
      clearToast: () => set((state) => { state.toast = null; }),

      undo: () =>
        set((state) => {
          const previous = state.historyPast.pop();
          if (!previous) return;
          state.historyFuture.push(cloneProject(state.project));
          state.project = previous;
          state.selectedClipId = null;
          state.toast = 'Deshecho';
        }),

      redo: () =>
        set((state) => {
          const next = state.historyFuture.pop();
          if (!next) return;
          state.historyPast.push(cloneProject(state.project));
          state.project = next;
          state.selectedClipId = null;
          state.toast = 'Rehecho';
        }),

      saveProject: async () => {
        set((state) => { state.isSaving = true; });
        try { await ProjectStorage.save(get().project); } finally { set((state) => { state.isSaving = false; }); }
      },

      loadProject: async (projectId) => {
        set((state) => { state.isLoading = true; });
        try {
          const loaded = await ProjectStorage.load(projectId);
          if (loaded) set((state) => { state.project = loaded; state.playheadFrame = 0; state.selectedClipId = null; });
        } finally { set((state) => { state.isLoading = false; }); }
      },
    };
  })
);

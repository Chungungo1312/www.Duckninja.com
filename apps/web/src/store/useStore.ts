import { create } from 'zustand';

interface Project {
  width: number;
  height: number;
  clips?: any[];
}

interface Store {
  project: Project;
  activeClips: any[];
  setProject: (project: Project) => void;
  addClip: (clip: any) => void;
}

export const useStore = create<Store>((set) => ({
  project: {
    width: 1920,
    height: 1080,
    clips: []
  },
  activeClips: [],
  setProject: (project) => set({ project }),
  addClip: (clip) => set((state) => ({ 
    activeClips: [...state.activeClips, clip] 
  }))
}));

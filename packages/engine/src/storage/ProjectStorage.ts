import { Project, Asset } from '@video-editor/types';
export class ProjectStorage {
  async saveProject(project: Project): Promise<void> { return Promise.resolve(); }
  async loadProject(id: string): Promise<Project | null> { return Promise.resolve(null); }
  async saveAsset(asset: Asset): Promise<void> { return Promise.resolve(); }
  async loadAsset(id: string): Promise<Asset | null> { return Promise.resolve(null); }
}

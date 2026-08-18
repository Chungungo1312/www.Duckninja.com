import React from 'react';
import './App.css';
import { Preview } from './components/Preview/Preview';
import { Timeline } from './components/Timeline/Timeline';
import { ExportButton } from './components/ExportButton/ExportButton';
import { ImportVideo } from './components/ImportVideo/ImportVideo';
import { ProjectActions } from './components/ProjectActions/ProjectActions';
import { useStore } from './store/useStore';

function App() {
  const { project } = useStore();

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 Video Editor</h1>
        <div className="header-actions">
          <ProjectActions />
          <ExportButton />
        </div>
      </header>
      
      <main className="App-main">
        <div className="preview-section">
          <Preview />
        </div>
        
        <div className="timeline-section">
          <div className="timeline-controls">
            <ImportVideo />
            <span className="clip-count">
              Clips: {project.clips?.length || 0}
            </span>
          </div>
          <Timeline />
        </div>
      </main>
    </div>
  );
}

export default App;

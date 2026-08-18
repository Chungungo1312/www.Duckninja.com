import { useTimelineStore } from '../../store/timelineStore';

export function ProjectActions() {
  const saveProject = useTimelineStore((s) => s.saveProject);
  const isSaving = useTimelineStore((s) => s.isSaving);
  const project = useTimelineStore((s) => s.project);

  const handleSave = async () => {
    await saveProject();
    alert('Proyecto guardado localmente ✅');
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <button onClick={handleSave} disabled={isSaving || project.tracks.length === 0}>
        {isSaving ? 'Guardando...' : '💾 Guardar proyecto'}
      </button>
    </div>
  );
}

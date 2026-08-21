import { useEffect } from 'react';
import { useTimelineStore } from '../store/timelineStore';

function isTypingInField(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
}

export function useKeyboardShortcuts() {
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const duplicateClip = useTimelineStore((s) => s.duplicateClip);
  const copyClip = useTimelineStore((s) => s.copyClip);
  const pasteClip = useTimelineStore((s) => s.pasteClip);
  const deleteClip = useTimelineStore((s) => s.deleteClip);
  const togglePlaying = useTimelineStore((s) => s.togglePlaying);
  const undo = useTimelineStore((s) => s.undo);
  const redo = useTimelineStore((s) => s.redo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingInField()) return;

      const modifier = e.metaKey || e.ctrlKey;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlaying();
        return;
      }

      if (modifier && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedClipId) duplicateClip(selectedClipId);
        return;
      }

      if (modifier && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (selectedClipId) copyClip(selectedClipId);
        return;
      }

      if (modifier && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClip();
        return;
      }

      if (modifier && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        redo();
        return;
      }

      if (modifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedClipId) deleteClip(selectedClipId);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedClipId, duplicateClip, copyClip, pasteClip, deleteClip, togglePlaying, undo, redo]);
}

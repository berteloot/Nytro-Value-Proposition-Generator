'use client';

import { useEffect } from 'react';

export default function CopyProtection() {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for copy, cut, paste, select all
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+A, Ctrl+S, Ctrl+P
      if (e.ctrlKey || e.metaKey) {
        if (
          e.key === 'c' ||
          e.key === 'C' ||
          e.key === 'x' ||
          e.key === 'X' ||
          e.key === 'v' ||
          e.key === 'V' ||
          e.key === 'a' ||
          e.key === 'A' ||
          e.key === 's' ||
          e.key === 'S' ||
          e.key === 'p' ||
          e.key === 'P'
        ) {
          // Allow if it's an input or textarea
          const target = e.target as HTMLElement;
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            return false;
          }
        }
      }
      // Disable F12 (Developer Tools)
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j') {
          e.preventDefault();
          return false;
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
    };

    // Disable text selection via mouse drag
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}









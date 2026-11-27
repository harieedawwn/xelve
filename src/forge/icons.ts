// Xưởng icons: 24 grid, 2px stroke, square caps, stepped corners (DESIGN.md#ui). Stroke colour from CSS.
const s = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`
export const FI = {
  pen: s('<path d="M4 20l1-5L15 5l4 4L9 19z"/><path d="M13 7l4 4"/>'),
  eraser: s('<path d="M3 15l9-9 7 7-6 6H8z"/><path d="M8 19h12"/><path d="M8 10l7 7"/>'),
  fill: s('<path d="M5 11l7-7 7 7-7 7z"/><path d="M5 11h14"/><path d="M20 15v4h-2v-4z"/>'),
  line: s('<path d="M5 19L19 5"/><path d="M3 17h4v4H3zM17 3h4v4h-4z"/>'),
  mirror: s('<path d="M12 3v18"/><path d="M9 7H4v10h5zM15 7h5v10h-5"/>'),
  tidy: s('<path d="M4 4h4v4H4zM10 10h4v4h-4zM16 16h4v4h-4z"/><path d="M16 4l4 4M20 4l-4 4"/>'),
  undo: s('<path d="M9 5L4 10l5 5"/><path d="M4 10h11a5 5 0 0 1 0 10h-3"/>'),
  redo: s('<path d="M15 5l5 5-5 5"/><path d="M20 10H9a5 5 0 0 0 0 10h3"/>'),
  back: s('<path d="M10 5L3 12l7 7"/><path d="M3 12h18"/>'),
  save: s('<path d="M4 4h13l3 3v13H4z"/><path d="M8 4v5h7V4M7 20v-6h10v6"/>'),
  check: s('<path d="M4 12l5 5L20 6"/>'),
  play: s('<path d="M7 4v16l12-8z"/>'),
  lock: s('<path d="M6 11h12v9H6z"/><path d="M9 11V7h6v4"/>'),
  crack: s('<path d="M4 4h16v16H4z"/><path d="M12 4l-2 5 4 3-3 4 1 4"/>'),
  dmg: s('<path d="M4 20L16 8"/><path d="M14 4h6v6"/><path d="M4 16l4 4"/>'),
  speed: s('<path d="M4 6l6 6-6 6"/><path d="M12 6l6 6-6 6"/>'),
  reach: s('<path d="M3 12h18"/><path d="M3 8v8M21 8v8"/><path d="M7 9l-3 3 3 3M17 9l3 3-3 3"/>'),
  sharp: s('<path d="M3 20L20 3v17z"/><path d="M8 15h7"/>'),
  heavy: s('<path d="M5 9h14l2 11H3z"/><path d="M9 9V5h6v4"/>'),
}

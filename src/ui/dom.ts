export const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e }
export const ICON = {
  settings: '<svg viewBox="0 0 24 24"><path d="M3 7h18M3 17h18"/><path fill="currentColor" stroke="none" d="M13 3h5v8h-5zM6 13h5v8H6z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 5v5h5"/><path d="M5.5 10A7 7 0 1 1 7 17"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M8 3h8v18H8z"/><path d="M11 18h2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M6 11h12v9H6z"/><path d="M9 11V7h6v4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l12-8z"/></svg>',
  forge: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M2 5h15c2.5 0 4.5 1.5 5 4h-5v3h-3l-1 2v3h3v3H6v-3h3v-3l-1-2H6V9H2z"/></svg>',
  gym: '<svg viewBox="0 0 24 24"><path d="M3.5 3.5h17v17h-17z"/><path fill="currentColor" stroke="none" d="M8.5 8.5h7v7h-7z"/></svg>',
  endless: '<svg viewBox="0 0 24 24"><path d="M12 12C10 9 8.5 7.5 6 7.5a4.5 4.5 0 0 0 0 9c2.5 0 4-1.5 6-4.5s3.5-4.5 6-4.5a4.5 4.5 0 0 1 0 9c-2.5 0-4-1.5-6-4.5z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M2 5l5-2v17l-5 2zM9.5 3l5 2v17l-5-2zM17 5l5-2v17l-5 2z"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M2 4.5c3.5-1 6.5-.5 9 1.5v15c-2.5-2-5.5-2.5-9-1.5zM13 6c2.5-2 5.5-2.5 9-1.5v15c-3.5-1-6.5-.5-9 1.5z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M10 5L3 12l7 7"/><path d="M3 12h18"/></svg>',
}

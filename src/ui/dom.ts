export const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e }
export const ICON = {
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><path d="M14 4v6h4V4zM6 14v6h4v-6z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 5v5h5"/><path d="M5.5 10A7 7 0 1 1 7 17"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M8 3h8v18H8z"/><path d="M11 18h2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M6 11h12v9H6z"/><path d="M9 11V7h6v4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4v16l12-8z"/></svg>',
  forge: '<svg viewBox="0 0 24 24"><path d="M4 5h12v5H4z"/><path d="M10 10v4H8v6h8v-6h-2v-4"/><path d="M16 7h4"/></svg>',
  gym: '<svg viewBox="0 0 24 24"><path d="M9 4h6v5H9z"/><path d="M12 9v11M6 12h12M8 20h8"/></svg>',
  endless: '<svg viewBox="0 0 24 24"><path d="M3 12l4-5h3l4 10h3l4-5-4-5h-3l-4 10H7z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M3 5l6 2 6-2 6 2v12l-6-2-6 2-6-2z"/><path d="M9 7v12M15 5v12"/></svg>',
  book: '<svg viewBox="0 0 24 24"><path d="M4 4h7v16H4zM13 4h7v16h-7z"/><path d="M6 8h3M15 8h3"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M10 5L3 12l7 7"/><path d="M3 12h18"/></svg>',
}

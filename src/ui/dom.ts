export const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e }
export const ICON = {
  settings: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><path d="M14 4v6h4V4zM6 14v6h4v-6z"/></svg>',
  restart: '<svg viewBox="0 0 24 24"><path d="M5 5v5h5"/><path d="M5.5 10A7 7 0 1 1 7 17"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M8 3h8v18H8z"/><path d="M11 18h2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><path d="M6 11h12v9H6z"/><path d="M9 11V7h6v4"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
}

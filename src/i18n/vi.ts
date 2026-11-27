// ALL player-facing text. Lexicon: docs/DESIGN.md. Keys used via t('key').
export const vi = {
  'title.tap': 'Chạm để bắt đầu',
  'menu.settings': 'Cài đặt',
  'menu.close': 'Đóng',
  'menu.restart': 'Chơi lại',
  'end.title': 'Hết bản chơi thử',
  'settings.graphics': 'Đồ hoạ',
  'settings.sound': 'Âm thanh',
  'settings.music': 'Nhạc',
  'settings.reduceShake': 'Giảm rung camera',
  'settings.language': 'Ngôn ngữ',
  'tier.thap': 'Thấp',
  'tier.tb': 'Trung bình',
  'tier.cao': 'Cao',
  'toggle.on': 'Bật',
  'toggle.off': 'Tắt',
  'lang.vi': 'Tiếng Việt',
  'lang.en': 'English',
  'locked.soon': 'Sắp ra mắt',
  'rotate.hint': 'Xoay ngang điện thoại',
} as const

export type Key = keyof typeof vi

# P21 step 4: Android adaptive + legacy launcher icons, Play 512, favicon/PWA from one rendered concept.
# Usage: node scripts/icons/render.mjs && python3 scripts/icons/export.py 3
import sys
from PIL import Image, ImageDraw
n = sys.argv[1] if len(sys.argv) > 1 else '3'
src = 'scripts/icons/out'
full = Image.open(f'public/icons/c{n}.png').convert('RGBA')
bg = Image.open(f'{src}/c{n}-bg.png').convert('RGBA')
fg = Image.open(f'{src}/c{n}-fg.png').convert('RGBA')
R = 'android/app/src/main/res'
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
S = full.size[0]
k = round(S * 72 / 108); o = (S - k) // 2
crop = full.crop((o, o, o + k, o + k))  # what an adaptive mask shows
def rs(im, s): return im.resize((s, s), Image.LANCZOS)
def rounded(im, s, r):
    im = rs(im, s); m = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=r * 4, fill=255)
    out = Image.new('RGBA', (s, s), (0, 0, 0, 0)); out.paste(im, (0, 0), m.resize((s, s), Image.LANCZOS)); return out
for d, f in DENS.items():
    L, A = round(48 * f), round(108 * f)
    rs(fg, A).save(f'{R}/mipmap-{d}/ic_launcher_foreground.png')
    rs(bg, A).save(f'{R}/mipmap-{d}/ic_launcher_background.png')
    rounded(crop, L, L // 6).save(f'{R}/mipmap-{d}/ic_launcher.png')
    rounded(crop, L, L // 2).save(f'{R}/mipmap-{d}/ic_launcher_round.png')
rs(full, 512).convert('RGB').save('assets/play-icon-512.png')
for s, name in [(16, 'favicon-16.png'), (32, 'favicon-32.png'), (180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    rs(crop, s).convert('RGB').save(f'public/{name}')
rs(full, 512).convert('RGB').save('public/icon-maskable-512.png')
print('icons from concept', n)

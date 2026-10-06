"""Generate derived brand assets from the official عَ الطاير logo.

Reads `logo-original.jpeg` (the untouched official asset) and writes faithful
crops/resizes only — no redrawing, recoloring, or alteration of the artwork.
Run from anywhere:  python3 make_assets.py
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'logo-original.jpeg')


def out(name):
    return os.path.join(HERE, name)


def main():
    src = Image.open(SRC).convert('RGB')

    # Full lockup: bird + Arabic wordmark.
    full = src.crop((489, 164, 1008, 694))
    full.save(out('logo-full.png'))
    full.save(out('logo-full.webp'), quality=90, method=6)
    print('full', full.size)

    # Mark: bird only.
    mark = src.crop((494, 168, 914, 428))
    mark.save(out('logo-mark.png'))
    mark.save(out('logo-mark.webp'), quality=90, method=6)
    print('mark', mark.size)

    # Favicon/app icon: bird centered on a square light-blue gradient canvas
    # sampled from the source background.
    top_bg = src.getpixel((700, 180))
    bot_bg = src.getpixel((700, 420))
    size = 512
    canvas = Image.new('RGB', (size, size))
    px = canvas.load()
    for y in range(size):
        f = y / (size - 1)
        px_row = tuple(
            round(top_bg[i] + (bot_bg[i] - top_bg[i]) * f) for i in range(3)
        )
        for x in range(size):
            px[x, y] = px_row
    target_w = int(size * 0.82)
    bird = mark.resize((target_w, int(mark.height * target_w / mark.width)), Image.LANCZOS)
    canvas.paste(bird, ((size - bird.width) // 2, (size - bird.height) // 2))
    canvas.save(out('icon-512.png'))
    canvas.resize((192, 192), Image.LANCZOS).save(out('icon-192.png'))
    canvas.resize((180, 180), Image.LANCZOS).save(out('icon-180.png'))
    canvas.resize((32, 32), Image.LANCZOS).save(out('favicon-32.png'))
    canvas.save(out('favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('icon created 512/192/180/32 + favicon.ico')


if __name__ == '__main__':
    main()

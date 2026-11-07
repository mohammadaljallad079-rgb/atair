"""Generate derived brand assets from the official عَ الطاير logo.

Reads `logo-original.jpeg` (the untouched official asset) and writes faithful
crops/resizes only — no redrawing, recoloring, or alteration of the artwork.

The supplied artwork sits on a light-blue gradient. The lockup and mark are
emitted with a *transparent* background so they sit cleanly on any surface.
Removal is a per-pixel alpha matte fitted to the actual gradient (not a
chroma-key): the background is modelled as a smooth linear gradient, alpha is
derived from each pixel's distance to that model, and the colour is then
un-premultiplied so anti-aliased edges stay correct.

Run from anywhere:  python3 make_assets.py
"""
import os
from PIL import Image, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'logo-original.jpeg')

# Logo lockup (bird + Arabic wordmark) and bird-only mark, in source pixels.
FULL_BOX = (495, 170, 1025, 717)
MARK_BOX = (495, 170, 1022, 424)


def out(name):
    return os.path.join(HERE, name)


def cut_background(src):
    """Return an RGBA copy of `src` with the gradient background removed."""
    a = np.asarray(src.convert('RGB')).astype(np.float64)
    h, w, _ = a.shape

    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    val = mx / 255.0
    # Background = bright, low-saturation pixels; fit a linear gradient to them.
    bgmask = (val > 0.85) & (sat < 0.22)
    ys, xs = np.nonzero(bgmask)
    design = np.stack([np.ones_like(xs), xs, ys], axis=1).astype(np.float64)
    coefs = [np.linalg.lstsq(design, a[ys, xs, ch], rcond=None)[0] for ch in range(3)]

    yy, xx = np.mgrid[0:h, 0:w]
    alldesign = np.stack([np.ones(h * w), xx.ravel(), yy.ravel()], axis=1).astype(np.float64)
    bg = (alldesign @ np.stack(coefs, axis=1)).reshape(h, w, 3)

    dist = np.abs(a - bg).max(axis=2)
    alpha = np.clip((dist - 8.0) / (40.0 - 8.0), 0, 1)

    # Soften JPEG speckle, then drop sub-threshold noise.
    alpha = np.asarray(
        Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    ).astype(np.float64) / 255.0
    alpha[alpha < 0.12] = 0.0

    al = alpha[..., None]
    # observed = alpha*C + (1-alpha)*bg  ->  C = (observed - (1-alpha)*bg) / alpha
    colour = np.where(al > 0.02, (a - (1 - al) * bg) / np.maximum(al, 1e-3), a)
    colour = np.clip(colour, 0, 255)
    return Image.fromarray(np.dstack([colour, alpha * 255]).astype(np.uint8), 'RGBA')


def main():
    src = Image.open(SRC)
    transparent = cut_background(src)

    # Full lockup: bird + Arabic wordmark.
    full = transparent.crop(FULL_BOX)
    full.save(out('logo-full.png'))
    full.save(out('logo-full.webp'), quality=92, method=6)
    print('full', full.size)

    # Mark: bird only.
    mark = transparent.crop(MARK_BOX)
    mark.save(out('logo-mark.png'))
    mark.save(out('logo-mark.webp'), quality=92, method=6)
    print('mark', mark.size)

    # Favicon/app icon: bird centered on a square light-blue gradient tile
    # sampled from the source background (icons keep a solid tile so they read
    # on any browser chrome).
    rgb = np.asarray(src.convert('RGB'))
    top_bg = tuple(int(v) for v in rgb[180, 700])
    bot_bg = tuple(int(v) for v in rgb[420, 700])
    size = 512
    canvas = Image.new('RGB', (size, size))
    px = canvas.load()
    for y in range(size):
        f = y / (size - 1)
        row = tuple(round(top_bg[i] + (bot_bg[i] - top_bg[i]) * f) for i in range(3))
        for x in range(size):
            px[x, y] = row
    target_w = int(size * 0.82)
    bird = mark.resize((target_w, int(mark.height * target_w / mark.width)), Image.LANCZOS)
    canvas.paste(bird, ((size - bird.width) // 2, (size - bird.height) // 2), bird)
    canvas.save(out('icon-512.png'))
    canvas.resize((192, 192), Image.LANCZOS).save(out('icon-192.png'))
    canvas.resize((180, 180), Image.LANCZOS).save(out('icon-180.png'))
    canvas.resize((32, 32), Image.LANCZOS).save(out('favicon-32.png'))
    canvas.save(out('favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print('icon created 512/192/180/32 + favicon.ico')


if __name__ == '__main__':
    main()

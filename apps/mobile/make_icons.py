#!/usr/bin/env python3
"""Generate Android launcher icons for the three ATAIR apps from the official logo.

Source of truth is the transparent bird mark shipped in `atair_core`
(`assets/brand/logo-mark.png`), itself a faithful crop of the supplied
`public/assets/brand/logo-original.jpeg`. Nothing is redrawn: the bird is only
scaled and centred on the official light-blue gradient tile sampled from the
original artwork.

Emits, for every app and density:
  - legacy  mipmap-*/ic_launcher.png         (full-bleed tile, square)
  - legacy  mipmap-*/ic_launcher_round.png   (circular tile)
  - adaptive mipmap-*/ic_launcher_foreground.png (bird in the 66/108 safe zone)
  - adaptive mipmap-anydpi-v26/ic_launcher{,_round}.xml
  - drawable/ic_launcher_background.xml      (gradient)
  - web     web/icons/Icon-{192,512}.png + maskable + web/favicon.png
  - iOS     ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png (opaque, no alpha)

Run from anywhere:  python3 apps/mobile/make_icons.py
"""
import json
import os
import re
from PIL import Image, ImageDraw
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MARK = os.path.join(HERE, 'atair_core', 'assets', 'brand', 'logo-mark.png')
APPS = ['atair_customer', 'atair_driver', 'atair_merchant']

# Android launcher icon densities.
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
ADAPTIVE = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

# Web app metadata per app (name / short_name / description).
WEB_META = {
    'atair_customer': ('عَ الطاير', 'عَ الطاير', 'تطبيق العملاء لطلب وتتبّع الشحنات'),
    'atair_driver': ('عَ الطاير — السائق', 'عَ الطاير', 'تطبيق السائقين لإدارة التوصيلات'),
    'atair_merchant': ('عَ الطاير — التاجر', 'عَ الطاير', 'بوابة التجار لإدارة الطلبات'),
}

# Gradient endpoints sampled from the official artwork's background.
TOP_BG = (209, 235, 252)
BOT_BG = (196, 225, 243)
SAFE = 0.62  # bird width as a fraction of the adaptive canvas (inside 66/108)


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        f = y / max(size - 1, 1)
        row = tuple(round(TOP_BG[i] + (BOT_BG[i] - TOP_BG[i]) * f) for i in range(3))
        for x in range(size):
            px[x, y] = row
    return img


def fit(img, box_w, box_h):
    w = box_w
    h = max(1, round(img.height * box_w / img.width))
    if h > box_h:
        h = box_h
        w = max(1, round(img.width * box_h / img.height))
    return img.resize((w, h), Image.LANCZOS)


def centered(base, bird):
    canvas = base.copy()
    canvas.paste(bird, ((canvas.width - bird.width) // 2, (canvas.height - bird.height) // 2), bird)
    return canvas


def round_mask(size):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    return mask


def main():
    bird = Image.open(MARK).convert('RGBA')

    for app in APPS:
        res = os.path.join(HERE, app, 'android', 'app', 'src', 'main', 'res')
        if not os.path.isdir(res):
            print('skip (no android res):', app)
            continue

        for density, size in LEGACY.items():
            out_dir = os.path.join(res, f'mipmap-{density}')
            os.makedirs(out_dir, exist_ok=True)
            tile = centered(gradient(size), fit(bird, round(size * 0.8), round(size * 0.8)))
            tile.save(os.path.join(out_dir, 'ic_launcher.png'))

            rnd = tile.copy()
            rnd.putalpha(round_mask(size))
            rnd.save(os.path.join(out_dir, 'ic_launcher_round.png'))

            a_size = ADAPTIVE[density]
            fg = Image.new('RGBA', (a_size, a_size), (0, 0, 0, 0))
            a_bird = fit(bird, round(a_size * SAFE), round(a_size * SAFE))
            fg.paste(a_bird, ((a_size - a_bird.width) // 2, (a_size - a_bird.height) // 2), a_bird)
            fg.save(os.path.join(out_dir, 'ic_launcher_foreground.png'))

        anydpi = os.path.join(res, 'mipmap-anydpi-v26')
        os.makedirs(anydpi, exist_ok=True)
        adaptive = (
            '<?xml version="1.0" encoding="utf-8"?>\n'
            '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@drawable/ic_launcher_background" />\n'
            '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
            '</adaptive-icon>\n'
        )
        for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
            with open(os.path.join(anydpi, name), 'w', encoding='utf-8') as fh:
                fh.write(adaptive)

        drawable = os.path.join(res, 'drawable')
        os.makedirs(drawable, exist_ok=True)
        top = '#%02X%02X%02X' % TOP_BG
        bot = '#%02X%02X%02X' % BOT_BG
        with open(os.path.join(drawable, 'ic_launcher_background.xml'), 'w', encoding='utf-8') as fh:
            fh.write(
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n'
                '    <gradient android:angle="270" android:startColor="%s" android:endColor="%s" />\n'
                '</shape>\n' % (top, bot)
            )
        print('android icons generated:', app)

        write_web_icons(os.path.join(HERE, app), app)
        write_ios_icons(os.path.join(HERE, app), app)


def write_ios_icons(app_dir, app):
    """Generate the iOS AppIcon set from the same official artwork.

    App Store icons must be opaque (no alpha channel), so the bird is composited
    on the official gradient tile and the result is flattened to RGB.
    """
    icon_set = os.path.join(app_dir, 'ios', 'Runner', 'Assets.xcassets', 'AppIcon.appiconset')
    contents_path = os.path.join(icon_set, 'Contents.json')
    if not os.path.isfile(contents_path):
        print('skip (no ios iconset):', app)
        return
    bird = Image.open(MARK).convert('RGBA')
    with open(contents_path, encoding='utf-8') as fh:
        contents = json.load(fh)
    for image in contents.get('images', []):
        filename = image.get('filename')
        size = image.get('size')
        scale = image.get('scale')
        if not filename or not size or not scale:
            continue
        side = round(float(size.split('x')[0]) * float(scale.rstrip('x')))
        tile = centered(gradient(side),
                        fit(bird, round(side * 0.8), round(side * 0.8))).convert('RGB')
        tile.save(os.path.join(icon_set, filename))
    print('ios icons generated:', app)


def write_web_icons(app_dir, app):
    web = os.path.join(app_dir, 'web')
    if not os.path.isdir(web):
        return
    icons = os.path.join(web, 'icons')
    os.makedirs(icons, exist_ok=True)
    bird = Image.open(MARK).convert('RGBA')

    # Standard icons keep the transparent bird so they read on any tab colour.
    for size in (192, 512):
        centered(Image.new('RGBA', (size, size), (0, 0, 0, 0)),
                 fit(bird, round(size * 0.86), round(size * 0.86))).save(
            os.path.join(icons, f'Icon-{size}.png'))
    # Maskable icons need a full-bleed background with the art in the safe zone.
    for size in (192, 512):
        centered(gradient(size).convert('RGBA'),
                 fit(bird, round(size * 0.6), round(size * 0.6))).save(
            os.path.join(icons, f'Icon-maskable-{size}.png'))
    centered(Image.new('RGBA', (64, 64), (0, 0, 0, 0)),
             fit(bird, 56, 56)).save(os.path.join(web, 'favicon.png'))

    name, short, desc = WEB_META[app]
    with open(os.path.join(web, 'manifest.json'), 'w', encoding='utf-8') as fh:
        fh.write(
            '{\n'
            '    "name": "%s",\n'
            '    "short_name": "%s",\n'
            '    "start_url": ".",\n'
            '    "display": "standalone",\n'
            '    "background_color": "#F8FAFC",\n'
            '    "theme_color": "#1D6DB6",\n'
            '    "description": "%s",\n'
            '    "orientation": "portrait-primary",\n'
            '    "prefer_related_applications": false,\n'
            '    "lang": "ar",\n'
            '    "dir": "rtl",\n'
            '    "icons": [\n'
            '        { "src": "icons/Icon-192.png", "sizes": "192x192", "type": "image/png" },\n'
            '        { "src": "icons/Icon-512.png", "sizes": "512x512", "type": "image/png" },\n'
            '        { "src": "icons/Icon-maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },\n'
            '        { "src": "icons/Icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }\n'
            '    ]\n'
            '}\n' % (name, short, desc)
        )

    index = os.path.join(web, 'index.html')
    if os.path.isfile(index):
        html = open(index, encoding='utf-8').read()
        # Replace by pattern, not by exact previous value: the title/apple-title
        # are rewritten every run and the previous value is not stable.
        html = re.sub(r'<meta name="description" content="[^"]*">',
                      '<meta name="description" content="%s">' % desc, html, count=1)
        html = re.sub(r'<meta name="apple-mobile-web-app-title" content="[^"]*">',
                      '<meta name="apple-mobile-web-app-title" content="%s">' % short, html, count=1)
        html = re.sub(r'<title>[^<]*</title>',
                      '<title>%s</title>' % name, html, count=1)
        open(index, 'w', encoding='utf-8').write(html)
    print('web icons generated:', app)


if __name__ == '__main__':
    main()

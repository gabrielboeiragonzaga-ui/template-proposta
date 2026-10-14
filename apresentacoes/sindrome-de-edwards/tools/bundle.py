#!/usr/bin/env python3
"""Empacota a apresentação inteira num único arquivo HTML (funciona offline, sem servidor).

    python3 tools/bundle.py            # sem vídeos de fundo (arquivo leve)
    python3 tools/bundle.py --videos   # inclui os vídeos de assets/video (arquivo bem maior)

Saída: sindrome-de-edwards-offline.html (na raiz desta pasta)
"""
import base64
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIME = {'.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2',
        '.mp4': 'video/mp4', '.webm': 'video/webm'}


def data_uri(path):
    ext = os.path.splitext(path)[1].lower()
    with open(path, 'rb') as fh:
        return f'data:{MIME[ext]};base64,' + base64.b64encode(fh.read()).decode()


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as fh:
        return fh.read()


def main():
    with_videos = '--videos' in sys.argv
    manifest = json.loads(read('assets/manifest.json'))
    if not with_videos:
        for entry in manifest.values():
            entry.pop('video', None)

    assets = {}
    for entry in manifest.values():
        assets['plates/' + entry['plate']] = data_uri(os.path.join(ROOT, 'assets', 'plates', entry['plate']))
        for layer in entry['layers'].values():
            assets['layers/' + layer['file']] = data_uri(os.path.join(ROOT, 'assets', 'layers', layer['file']))
        if entry.get('video'):
            assets['video/' + entry['video']] = data_uri(os.path.join(ROOT, 'assets', 'video', entry['video']))

    fonts = re.sub(r'url\((assets/fonts/[^)]+)\)', lambda m: 'url(' + data_uri(os.path.join(ROOT, m.group(1))) + ')',
                   read('fonts.css'))
    html = read('index.html')
    html = html.replace('<link rel="stylesheet" href="fonts.css">', '<style>\n' + fonts + '</style>')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + read('style.css') + '</style>')
    data_js = ('window.MANIFEST = ' + json.dumps(manifest, separators=(',', ':')) + ';\n'
               'window.ASSET_DATA = ' + json.dumps(assets, separators=(',', ':')) + ';\n')
    html = html.replace('<script src="assets/manifest.js"></script>', '<script>\n' + data_js + '</script>')
    html = html.replace('<script src="app.js"></script>', '<script>\n' + read('app.js') + '</script>')
    assert 'src="app.js"' not in html and 'href="style.css"' not in html

    out = os.path.join(ROOT, 'sindrome-de-edwards-offline.html')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print(out, f'{os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()

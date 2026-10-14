#!/usr/bin/env python3
"""Liga os vídeos de fundo (ex.: loops gerados no Higgsfield) à apresentação.

Coloque os arquivos em assets/video/ com o nome s1.mp4 ... s7.mp4 e rode:
    python3 tools/link_videos.py
Slides sem vídeo continuam usando a imagem fixa animada pelo shader.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man_path = os.path.join(ROOT, 'assets', 'manifest.json')
vid_dir = os.path.join(ROOT, 'assets', 'video')

manifest = json.load(open(man_path))
for n, entry in manifest.items():
    for ext in ('mp4', 'webm'):
        f = f's{n}.{ext}'
        if os.path.exists(os.path.join(vid_dir, f)):
            entry['video'] = f
            break
    else:
        entry.pop('video', None)
    print(f'slide {n}:', entry.get('video', 'imagem fixa'))

with open(man_path, 'w') as fh:
    json.dump(manifest, fh, indent=1, sort_keys=True)
with open(os.path.join(ROOT, 'assets', 'manifest.js'), 'w') as fh:
    fh.write('window.MANIFEST = ' + json.dumps(manifest, separators=(',', ':'), sort_keys=True) + ';\n')

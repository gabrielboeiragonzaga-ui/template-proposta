#!/usr/bin/env python3
"""Converte os quadros gravados por capture.cjs em dois vídeos por slide.

    python3 tools/assemble.py <pasta-dos-quadros> <pasta-saida> [fps=30] [crossfade_s=1.5]

Para cada slide N:
  sN-entrada.mp4  transição vinda do slide anterior + revelação dos elementos
  sN-loop.mp4     fundo vivo do slide já montado; começa exatamente no último quadro da
                  entrada e termina emendando no próprio início (loop sem corte)
"""
import bisect
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image


def main():
    src, out = sys.argv[1], sys.argv[2]
    fps = float(sys.argv[3]) if len(sys.argv) > 3 else 30.0
    xf = float(sys.argv[4]) if len(sys.argv) > 4 else 1.5
    os.makedirs(out, exist_ok=True)
    meta = json.load(open(os.path.join(src, 'frames.json')))
    frames = meta['frames']
    times = [f['t'] for f in frames]
    IN, AMB = meta['IN'], meta['AMB']
    cache = {}

    def at(t):
        i = bisect.bisect_left(times, t)
        if i > 0 and (i == len(times) or abs(times[i - 1] - t) <= abs(times[i] - t)):
            i -= 1
        i = min(max(i, 0), len(times) - 1)
        if i not in cache:
            if len(cache) > 400:
                cache.clear()
            cache[i] = np.asarray(Image.open(os.path.join(src, frames[i]['file'])).convert('RGB'), dtype=np.float32)
        return cache[i]

    def encode(path, gen, n):
        cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1920x1080',
               '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17',
               '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', path]
        p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for k in range(n):
            p.stdin.write(np.clip(gen(k) + 0.5, 0, 255).astype(np.uint8).tobytes())
        p.stdin.close()
        assert p.wait() == 0, path

    for m in meta['marks']:
        s, t_in = m['slide'], m['in']
        x0 = t_in + IN
        n_in = int(round(IN * fps))
        encode(os.path.join(out, f's{s}-entrada.mp4'), lambda k: at(t_in + k / fps), n_in)
        # o último quadro da entrada é o primeiro do loop
        Image.fromarray(at(x0).astype(np.uint8)).save(os.path.join(out, f's{s}-final.jpg'), quality=92)
        Image.fromarray(at(t_in).astype(np.uint8)).save(os.path.join(out, f's{s}-inicio.jpg'), quality=92)
        L = AMB
        n_loop = int(round(L * fps))

        def loop_frame(k, x0=x0, L=L):
            t = k / fps
            a = at(x0 + t)
            if t < L - xf:
                return a
            w = (t - (L - xf)) / xf
            w = w * w * (3 - 2 * w)
            return a * (1 - w) + at(x0 + t - L) * w

        encode(os.path.join(out, f's{s}-loop.mp4'), loop_frame, n_loop)
        print('slide', s, 'ok')


if __name__ == '__main__':
    main()

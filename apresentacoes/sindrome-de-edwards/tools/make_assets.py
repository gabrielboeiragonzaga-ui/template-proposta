#!/usr/bin/env python3
"""Gera os fundos (plates) e as camadas animaveis a partir do PDF original dos slides.

Uso:
    python3 tools/make_assets.py /caminho/SLIDE.pdf

Para cada pagina:
  * remove o texto (inpaint), porque o texto volta como HTML animado;
  * recorta paineis, cards, pilulas, selos e ilustracoes como camadas RGBA (webp);
  * monta o fundo: cromossomos removidos e tudo que vai ser revelado fica
    desfocado (efeito de foco de microscopio quando a camada entra).
Dependencias: numpy, pillow, opencv-python-headless, pdftoppm (poppler).
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from imgutil import (H, W, blend, circle_mask, cv2, dark_text_mask, ellipse_mask, gblur, inpaint,  # noqa: E402
                     light_text_mask, load, lum, np, poly_mask, pushpull_fill, rrect_mask, save, save_layer)
from spec import SPEC  # noqa: E402

ROOT = os.path.dirname(HERE)
OUT_PLATES = os.path.join(ROOT, 'assets', 'plates')
OUT_LAYERS = os.path.join(ROOT, 'assets', 'layers')


def ell(k):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))


def shape_mask(kind, g, grow=0, feather=0.0):
    if kind == 'rr':
        x0, y0, x1, y1, r = g
        return rrect_mask(x0 - grow, y0 - grow, x1 + grow, y1 + grow, max(1, r + grow), feather)
    if kind == 'c':
        cx, cy, r = g
        return circle_mask(cx, cy, r + grow, feather)
    if kind == 'el':
        cx, cy, rx, ry, a = g
        return ellipse_mask(cx, cy, rx + grow, ry + grow, a, feather)
    if kind == 'poly':
        m = poly_mask(g)
        if grow > 0:
            m = cv2.dilate(m, ell(2 * grow + 1))
        if feather > 0:
            m = cv2.GaussianBlur(m, (0, 0), feather)
        return m
    raise ValueError(kind)


def shape_box(kind, g, pad):
    if kind == 'rr':
        x0, y0, x1, y1, _ = g
    elif kind == 'c':
        cx, cy, r = g
        x0, y0, x1, y1 = cx - r, cy - r, cx + r, cy + r
    elif kind == 'el':
        cx, cy, rx, ry, _ = g
        rr = max(rx, ry)
        x0, y0, x1, y1 = cx - rr, cy - rr, cx + rr, cy + rr
    else:
        xs = [p[0] for p in g]
        ys = [p[1] for p in g]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    return (max(0, int(x0 - pad)), max(0, int(y0 - pad)), min(W, int(x1 + pad)), min(H, int(y1 + pad)))


def fill_holes(m):
    m = m.astype(np.uint8)
    h, w = m.shape
    flood = m.copy()
    ff = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(flood, ff, (0, 0), 1)
    return m | (1 - flood)


def chromo_matte(img, box):
    """Matte justo de um cromossomo azul escuro sobre fundo claro."""
    x0, y0, x1, y1 = box
    sub = img[y0:y1, x0:x1]
    L = lum(sub)
    u8 = (np.clip(sub, 0, 1) * 255).astype(np.uint8)
    S = cv2.cvtColor(u8, cv2.COLOR_RGB2HSV)[..., 1].astype(np.float32) / 255.0
    core = ((L < 0.58) | ((S > 0.42) & (L < 0.80))).astype(np.uint8)
    core = cv2.morphologyEx(core, cv2.MORPH_OPEN, ell(3))
    core = cv2.morphologyEx(core, cv2.MORPH_CLOSE, ell(9))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(core, 8)
    keep = np.zeros_like(core)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 4000:
            keep[lab == i] = 1
    filled = fill_holes(keep)
    band = cv2.dilate(filled, ell(9)).astype(np.float32)
    ramp = np.clip((0.92 - L) / (0.92 - 0.62), 0, 1)
    solid = cv2.GaussianBlur(cv2.erode(filled, ell(3)).astype(np.float32), (0, 0), 0.9)
    alpha = np.maximum(solid, ramp * band) * band
    full = np.zeros((H, W), np.float32)
    full[y0:y1, x0:x1] = alpha
    return full


def ring_stroke(cx, cy, r, thick=7):
    m = np.zeros((H, W), np.uint8)
    cv2.circle(m, (cx, cy), r, 1, thick, lineType=cv2.LINE_AA)
    return m


def layer_name(n, name):
    return f's{n}-{name}.webp'


def process(n, img, manifest):
    s = SPEC[n]
    layers = {}

    # ---- mattes dos cromossomos (matte justo)
    mattes = {}
    for name, box in s.get('chromos', []):
        mattes[name] = chromo_matte(img, box)
    chromo_all = np.zeros((H, W), np.float32)
    for m in mattes.values():
        chromo_all = np.maximum(chromo_all, m)
    chromo_dil = cv2.dilate((chromo_all > 0.05).astype(np.uint8), ell(21)).astype(np.float32)

    # ---- regioes de texto
    exclude = chromo_dil.copy()
    for key in ('badges', 'icons', 'pills'):
        for _, kind, g in s.get(key, []):
            exclude = np.maximum(exclude, shape_mask(kind, g, grow=6))
    dark_region = np.zeros((H, W), np.float32)
    for key in ('panels', 'cards'):
        for _, kind, g in s.get(key, []):
            dark_region = np.maximum(dark_region, shape_mask(kind, g, grow=-7))
    dark_region *= (1 - exclude)
    light_region = np.zeros((H, W), np.float32)
    for _, kind, g in s.get('pills', []):
        light_region = np.maximum(light_region, shape_mask(kind, g, grow=-6))
    tm = dark_text_mask(img, dark_region, ksize=45, thr=0.045, dilate=5)
    lm = light_text_mask(img, light_region, ksize=31, thr=0.07, dilate=4)
    allm = np.maximum(tm, lm)
    textfree = inpaint(img, allm, radius=9)
    # o vidro e liso: alisa a area onde havia texto para nao sobrar rastro de letra
    soft = cv2.GaussianBlur(cv2.dilate(allm, ell(15)).astype(np.float32), (0, 0), 5)
    soft *= np.maximum(dark_region, light_region)
    smooth = gblur(textfree, 9)
    textfree = blend(textfree, smooth, np.clip(soft * 1.3, 0, 1))
    for (x0, y0, x1, y1) in s.get('clear', []):
        hole = rrect_mask(x0, y0, x1, y1, 14, feather=3) * (1 - exclude)
        textfree = pushpull_fill(textfree, hole, grain=0.003, seed=n + 11)

    # ---- paineis: vazios (cards/pilulas/selos/cromossomos preenchidos com o vidro do painel)
    sub_keys = ('cards', 'pills', 'badges', 'icons')
    for name, kind, g in s.get('panels', []):
        pmask = shape_mask(kind, g)
        holes = np.zeros((H, W), np.float32)
        for key in sub_keys:
            for _, k2, g2 in s.get(key, []):
                sm = shape_mask(k2, g2, grow=5)
                if (sm * pmask).sum() > 0.5 * sm.sum():
                    holes = np.maximum(holes, sm)
        holes = np.maximum(holes, chromo_dil * pmask)
        pim = pushpull_fill(textfree, cv2.GaussianBlur(holes, (0, 0), 2.0), grain=0.003, seed=n) if holes.max() > 0 else textfree
        alpha = shape_mask(kind, g, grow=8, feather=2.5)
        box = shape_box(kind, g, 18)
        layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), pim, alpha, box)

    for name, kind, g in s.get('cards', []):
        cmask = shape_mask(kind, g)
        holes = np.zeros((H, W), np.float32)
        for key in ('badges', 'icons'):
            for _, k2, g2 in s.get(key, []):
                sm = shape_mask(k2, g2, grow=4)
                if (sm * cmask).sum() > 0.5 * sm.sum():
                    holes = np.maximum(holes, sm)
        cim = pushpull_fill(textfree, cv2.GaussianBlur(holes, (0, 0), 1.5), grain=0.003, seed=n + 7) if holes.max() > 0 else textfree
        alpha = shape_mask(kind, g, grow=5, feather=2.0)
        layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), cim, alpha, shape_box(kind, g, 12))

    for name, kind, g in s.get('pills', []):
        alpha = shape_mask(kind, g, grow=6, feather=2.0)
        layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), textfree, alpha, shape_box(kind, g, 14))

    for key in ('badges', 'icons'):
        for name, kind, g in s.get(key, []):
            alpha = shape_mask(kind, g, grow=3, feather=1.6)
            layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), img, alpha, shape_box(kind, g, 8))

    for name, kind, g in s.get('blobs', []):
        alpha = shape_mask(kind, g, grow=4, feather=5.0)
        layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), img, alpha, shape_box(kind, g, 20))

    for name, m in mattes.items():
        ys, xs = np.where(m > 0.01)
        box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
        layers[name] = save_layer(os.path.join(OUT_LAYERS, layer_name(n, name)), img, m, box)

    # ---- fundo (plate)
    plate = textfree
    if chromo_all.max() > 0:
        plate = pushpull_fill(plate, cv2.GaussianBlur(chromo_dil, (0, 0), 4.0), grain=0.004, seed=n + 3)
        halo = cv2.GaussianBlur(cv2.dilate(chromo_dil.astype(np.uint8), ell(31)).astype(np.float32), (0, 0), 10)
        plate = blend(plate, gblur(plate, 16), halo)
    if 'ring' in s:
        cx, cy, r = s['ring']
        plate = inpaint(plate, ring_stroke(cx, cy, r, 9), radius=6)
    ghost = gblur(plate, 14)
    ghost = ghost + (1 - ghost) * 0.10
    gm = np.zeros((H, W), np.float32)
    for name, kind, g in s.get('panels', []):
        gm = np.maximum(gm, shape_mask(kind, g, grow=10, feather=7))
    for key in ('cards', 'pills', 'badges', 'icons'):
        for name, kind, g in s.get(key, []):
            gm = np.maximum(gm, shape_mask(kind, g, grow=6, feather=5))
    for name, kind, g in s.get('blobs', []):
        gm = np.maximum(gm, shape_mask(kind, g, grow=6, feather=7))
    plate = blend(plate, ghost, gm)
    plate_file = f's{n}.jpg'
    save(os.path.join(OUT_PLATES, plate_file), plate, quality=88)

    for key in ('panels', 'cards', 'pills', 'badges', 'icons', 'blobs'):
        for name, kind, g in s.get(key, []):
            if kind != 'poly':
                layers[name]['shape'] = [kind, list(g)]
    manifest[str(n)] = dict(plate=plate_file, layers={k: dict(file=layer_name(n, k), **v) for k, v in layers.items()})


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    pdf = sys.argv[1]
    os.makedirs(OUT_PLATES, exist_ok=True)
    os.makedirs(OUT_LAYERS, exist_ok=True)
    only = [int(a) for a in sys.argv[2:]] or sorted(SPEC)
    man_path = os.path.join(ROOT, 'assets', 'manifest.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-r', '96', '-png', pdf, os.path.join(tmp, 'p')], check=True)
        pages = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
        for i, f in enumerate(pages, start=1):
            if i not in only:
                continue
            img = load(os.path.join(tmp, f))
            assert img.shape[:2] == (H, W), img.shape
            print('slide', i)
            process(i, img, manifest)
    with open(man_path, 'w') as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
    # versao JS do manifest: permite abrir o index.html sem servidor
    with open(os.path.join(ROOT, 'assets', 'manifest.js'), 'w') as fh:
        fh.write('window.MANIFEST = ' + json.dumps(manifest, separators=(',', ':'), sort_keys=True) + ';\n')


if __name__ == '__main__':
    main()

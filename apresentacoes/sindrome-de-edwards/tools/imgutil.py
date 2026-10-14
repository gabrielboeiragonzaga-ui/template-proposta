import numpy as np, cv2
from PIL import Image

W, H = 1920, 1080

def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255.0

def save(path, arr, quality=90):
    a = np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)
    im = Image.fromarray(a)
    if path.endswith('.jpg'):
        im.save(path, quality=quality, subsampling=0, optimize=True)
    else:
        im.save(path)

def lum(img):
    return img[..., 0] * 0.2126 + img[..., 1] * 0.7152 + img[..., 2] * 0.0722

def rrect_mask(x0, y0, x1, y1, r, feather=0.0, shape=(H, W)):
    """Rounded-rect mask (1 inside). feather = gaussian sigma in px."""
    m = np.zeros(shape, np.float32)
    x0, y0, x1, y1, r = [int(round(v)) for v in (x0, y0, x1, y1, r)]
    cv2.rectangle(m, (x0 + r, y0), (x1 - r, y1), 1, -1)
    cv2.rectangle(m, (x0, y0 + r), (x1, y1 - r), 1, -1)
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        cv2.circle(m, (cx, cy), r, 1, -1, lineType=cv2.LINE_AA)
    if feather > 0:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    return m

def circle_mask(cx, cy, r, feather=0.0, shape=(H, W)):
    m = np.zeros(shape, np.float32)
    cv2.circle(m, (int(round(cx)), int(round(cy))), int(round(r)), 1, -1, lineType=cv2.LINE_AA)
    if feather > 0:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    return m

def ellipse_mask(cx, cy, rx, ry, angle=0, feather=0.0, shape=(H, W)):
    m = np.zeros(shape, np.float32)
    cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), angle, 0, 360, 1, -1, lineType=cv2.LINE_AA)
    if feather > 0:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    return m

def poly_mask(pts, feather=0.0, shape=(H, W)):
    m = np.zeros(shape, np.float32)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1, lineType=cv2.LINE_AA)
    if feather > 0:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    return m

def dark_text_mask(img, region, ksize=41, thr=0.06, dilate=3):
    """Dark strokes on a light background inside region (bool/float mask)."""
    L = lum(img)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    bg = cv2.morphologyEx(L, cv2.MORPH_CLOSE, k)
    bg = cv2.GaussianBlur(bg, (0, 0), 3)
    t = ((bg - L) > thr) & (region > 0.5)
    t = t.astype(np.uint8)
    if dilate:
        t = cv2.dilate(t, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dilate + 1, 2 * dilate + 1)))
    return t

def light_text_mask(img, region, ksize=31, thr=0.08, dilate=3):
    L = lum(img)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    bg = cv2.morphologyEx(L, cv2.MORPH_OPEN, k)
    bg = cv2.GaussianBlur(bg, (0, 0), 3)
    t = ((L - bg) > thr) & (region > 0.5)
    t = t.astype(np.uint8)
    if dilate:
        t = cv2.dilate(t, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * dilate + 1, 2 * dilate + 1)))
    return t

def inpaint(img, mask, radius=6, method=cv2.INPAINT_TELEA):
    u8 = np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)
    bgr = cv2.cvtColor(u8, cv2.COLOR_RGB2BGR)
    out = cv2.inpaint(bgr, (mask > 0).astype(np.uint8) * 255, radius, method)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

def pushpull_fill(img, hole, grain=0.0, seed=0):
    """Smoothly fill hole (float 0..1, 1 = unknown) from surrounding pixels (push-pull)."""
    w = (1.0 - np.clip(hole, 0, 1)).astype(np.float32)
    w = (w > 0.999).astype(np.float32)
    levels = []
    c = img * w[..., None]
    ww = w.copy()
    while True:
        levels.append((c, ww))
        if c.shape[0] <= 2 or c.shape[1] <= 2:
            break
        nh, nw = max(1, c.shape[0] // 2), max(1, c.shape[1] // 2)
        c = cv2.resize(c, (nw, nh), interpolation=cv2.INTER_AREA)
        ww = cv2.resize(ww, (nw, nh), interpolation=cv2.INTER_AREA)
    c, ww = levels[-1]
    tot = ww.sum()
    mean = (c.reshape(-1, 3).sum(0) / max(tot, 1e-6))
    est = np.where(ww[..., None] > 1e-6, c / np.maximum(ww, 1e-6)[..., None], mean)
    for c, ww in reversed(levels[:-1]):
        up = cv2.resize(est, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_CUBIC)
        known = c / np.maximum(ww, 1e-6)[..., None]
        a = np.clip(ww, 0, 1)[..., None]
        est = known * a + up * (1 - a)
    est = cv2.GaussianBlur(est, (0, 0), 2.0)
    if grain > 0:
        rng = np.random.default_rng(seed)
        n = rng.normal(0, 1, est.shape[:2]).astype(np.float32)
        n = cv2.GaussianBlur(n, (0, 0), 0.8)
        est = est + grain * n[..., None]
    m = np.clip(hole, 0, 1)[..., None]
    return img * (1 - m) + est * m

def blend(a, b, m):
    m = np.clip(m, 0, 1)[..., None]
    return a * (1 - m) + b * m

def gblur(img, s):
    return cv2.GaussianBlur(img, (0, 0), s)

def save_layer(path, img, alpha, box, quality=88):
    """Crop img+alpha to box (x0,y0,x1,y1) and save RGBA (webp/png)."""
    x0, y0, x1, y1 = [int(v) for v in box]
    rgb = np.clip(img[y0:y1, x0:x1] * 255 + 0.5, 0, 255).astype(np.uint8)
    a = np.clip(alpha[y0:y1, x0:x1] * 255 + 0.5, 0, 255).astype(np.uint8)
    im = Image.fromarray(np.dstack([rgb, a]), 'RGBA')
    if path.endswith('.webp'):
        im.save(path, quality=quality, method=6, alpha_quality=90)
    else:
        im.save(path, optimize=True)
    return dict(x=x0, y=y0, w=x1 - x0, h=y1 - y0)

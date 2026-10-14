/* ==========================================================================
   Motor da apresentação
   - fundo WebGL vivo: deriva de fluido, luzes que se movem, transição
     "mergulho" entre slides e foco de microscópio na chegada;
   - partículas em profundidade (canvas 2D);
   - revelação coreografada das camadas e textos (Web Animations API).
   ========================================================================== */
(() => {
  'use strict';

  const SW = 1920, SH = 1080;
  const MAN = window.MANIFEST || {};
  const params = new URLSearchParams(location.search);
  const STATIC = params.has('static');
  // captura de vídeo (exportação para PowerPoint): relógio desacelerado e sem interface
  const CAPTURE = params.has('capture');
  const TS = +params.get('ts') || 1;
  const clock = () => performance.now() * TS;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ASSET = 'assets/';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = ms => new Promise(r => setTimeout(r, ms / TS));
  const E = {
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };
  const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const SOFT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  const app = $('#app');
  const stage = $('#stage');
  const slides = $$('.slide', stage);
  const N = slides.length;
  if (STATIC) app.classList.add('static');

  // ------------------------------------------------------------------ tweens
  const tweens = new Set();
  function tween(dur, fn, ease = E.inOutCubic) {
    return new Promise(resolve => {
      const tw = { t0: clock(), dur, fn, ease, resolve };
      tweens.add(tw);
    });
  }
  function runTweens(now) {
    for (const tw of tweens) {
      const k = clamp((now - tw.t0) / tw.dur, 0, 1);
      tw.fn(tw.ease(k), k);
      if (k >= 1) { tweens.delete(tw); tw.resolve(); }
    }
  }

  // ------------------------------------------------------------------ estado visual compartilhado
  const V = {
    p: 0, dir: 1, focus: 1, flash: 0, fade: 0, warp: 0,
    texA: 0, texB: 1,
    mx: 0, my: 0, tmx: 0, tmy: 0,
    fit: { s: 1, x: 0, y: 0 },
    kb: { z: 1, tx: 0, ty: 0 },
  };

  // ------------------------------------------------------------------ assets
  const plateImgs = [];
  const layerImgs = new Map();
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(im));
      im.onerror = () => reject(new Error('Falha ao carregar ' + src.slice(0, 80)));
      im.src = src;
    });
  }
  const resolveAsset = (kind, file) => (window.ASSET_DATA && window.ASSET_DATA[kind + '/' + file]) || ASSET + kind + '/' + file;

  async function loadAll(onProgress) {
    const jobs = [];
    for (let n = 1; n <= N; n++) {
      const m = MAN[n];
      if (!m) continue;
      jobs.push(loadImage(resolveAsset('plates', m.plate)).then(im => { plateImgs[n - 1] = im; }));
      for (const [name, L] of Object.entries(m.layers)) {
        jobs.push(loadImage(resolveAsset('layers', L.file)).then(im => { layerImgs.set(n + ':' + name, im); }));
      }
    }
    const fontJobs = [
      '800 40px "Plus Jakarta Sans"', '500 40px "Plus Jakarta Sans"', '400 40px "Plus Jakarta Sans"',
      '700 40px "Noto Serif Display"', '500 40px "Noto Serif Display"', '400 40px "Noto Serif Display"',
    ].map(f => document.fonts.load(f, 'Síndrome ç ã'));
    const all = [...jobs, ...fontJobs];
    let done = 0;
    await Promise.all(all.map(p => p.then(() => onProgress(++done / all.length))));
    await document.fonts.ready;
  }

  // ------------------------------------------------------------------ montagem do DOM
  function buildLayers() {
    slides.forEach((sl, i) => {
      const n = i + 1;
      const m = MAN[n];
      $$('[data-ly]', sl).forEach(el => {
        const L = m && m.layers[el.dataset.ly];
        if (!L) { el.remove(); return; }
        Object.assign(el.style, { left: L.x + 'px', top: L.y + 'px', width: L.w + 'px', height: L.h + 'px' });
        const inner = document.createElement('div');
        inner.className = 'in';
        const src = layerImgs.get(n + ':' + el.dataset.ly);
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.src = src ? src.src : '';
        inner.appendChild(img);
        el.appendChild(inner);
        // vidro: brilho que percorre a superfície
        if (el.dataset.r === 'panel' && L.shape && L.shape[0] === 'rr') {
          const [x0, y0, x1, y1, r] = L.shape[1];
          const sh = document.createElement('div');
          sh.className = 'sheen';
          Object.assign(sh.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px', borderRadius: r + 'px' });
          sh.style.setProperty('--sd', (6 + Math.random() * 6).toFixed(1) + 's');
          el.after(sh);
          el._sheen = sh;
        }
      });
    });
  }

  function splitText(el, mode) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const text = node.nodeValue.replace(/\s+/g, ' ');
      if (!text.trim()) { node.nodeValue = text; return; }
      const frag = document.createDocumentFragment();
      text.split(/(\s)/).forEach(part => {
        if (part === '') return;
        if (part === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = mode === 'chars' ? 'w c' : 'w m';
        if (mode === 'chars') {
          for (const c of part) {
            const ch = document.createElement('span');
            ch.className = 'ch';
            ch.textContent = c;
            w.appendChild(ch);
          }
        } else {
          const wi = document.createElement('span');
          wi.className = 'wi';
          wi.textContent = part;
          w.appendChild(wi);
        }
        frag.appendChild(w);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ------------------------------------------------------------------ enquadramento + câmera lenta (Ken Burns)
  const C = { x: SW / 2, y: SH / 2 };
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.min(vw / SW, vh / SH);
    V.fit = { s, x: (vw - SW * s) / 2, y: (vh - SH * s) / 2 };
    gl && gl.resize(vw, vh);
    dust.resize(vw, vh);
    // força o navegador a re-rasterizar o texto na nova escala (evita texto borrado após tela cheia)
    stage.style.willChange = 'auto';
    requestAnimationFrame(() => { stage.style.willChange = 'transform'; });
  }
  function updateCamera(t) {
    // movimento quase imperceptível: a cena "respira"
    const k = REDUCED || STATIC ? 0 : 1;
    V.mx += (V.tmx - V.mx) * 0.035;
    V.my += (V.tmy - V.my) * 0.035;
    V.kb.z = 1.012 + 0.010 * Math.sin(t * 0.055) * k;
    V.kb.tx = (7 * Math.sin(t * 0.037) + V.mx * 7) * k;
    V.kb.ty = (5 * Math.cos(t * 0.029) + V.my * 5) * k;
    const { s, x, y } = V.fit;
    const z = V.kb.z;
    const ox = x + s * (C.x * (1 - z) + V.kb.tx);
    const oy = y + s * (C.y * (1 - z) + V.kb.ty);
    stage.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0) scale(${(s * z).toFixed(5)})`;
  }

  // ------------------------------------------------------------------ WebGL
  const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;
  const FRAG = `
precision highp float;
uniform sampler2D uA, uB;
uniform vec2 uRes;      // canvas em px
uniform float uRS;      // px do canvas por px css
uniform vec2 uO;        // offset do palco (css px)
uniform float uS;       // escala do palco
uniform float uZ;       // zoom da câmera
uniform vec2 uT;        // deslocamento da câmera (px do palco)
uniform float uP, uDir, uFocus, uTime, uFlash, uFade, uWarp, uFlow;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
vec2 mirror(vec2 uv){ return 1.0 - abs(1.0 - mod(uv, 2.0)); }
vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

vec3 tap(sampler2D t, vec2 uv){ return texture2D(t, mirror(uv)).rgb; }
vec3 blurTap(sampler2D t, vec2 uv, float r, float zs){
  if (r < 0.0004 && zs < 0.0004) return tap(t, uv);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    float a = fi * 2.39996;
    float rr = sqrt((fi + 0.5) / 16.0) * r;
    vec2 off = vec2(cos(a) * 0.5625, sin(a)) * rr;
    vec2 streak = (uv - 0.5) * zs * (fi / 15.0 - 0.5);
    acc += tap(t, uv + off + streak);
  }
  return acc / 16.0;
}

void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRS;
  vec2 st = vec2(960.0, 540.0) + ((px - uO) / uS - vec2(960.0, 540.0) - uT) / uZ;
  vec2 uv = st / vec2(1920.0, 1080.0);
  float t = uTime;
  vec2 ar = vec2(1.7778, 1.0);

  // deriva de fluido: o fundo "vive" sem chamar atenção
  vec2 q = uv * ar;
  vec2 flow = vec2(fbm(q * 1.7 + vec2(t * 0.021, t * 0.013)), fbm(q * 1.7 + vec2(5.2 - t * 0.017, 1.3 + t * 0.012))) - 0.5;
  vec2 uvL = uv + flow * 0.0085 * uFlow;

  // transição: mergulha no slide atual e emerge no próximo
  float p = uP;
  float e = p * p * (3.0 - 2.0 * p);
  float s = sin(3.14159265 * p);
  float zA = 1.0 + 0.34 * e;
  float zB = 1.0 + 0.34 * (1.0 - e);
  float ang = 0.022 * uDir;
  vec2 c = vec2(0.5);
  vec2 dA = rot((uvL - c) * ar, -ang * e) / zA;
  vec2 dB = rot((uvL - c) * ar, ang * (1.0 - e)) / zB;
  vec2 uvA = dA / ar + c;
  vec2 uvB = dB / ar + c;
  if (p > 0.0001) {
    vec2 liquid = vec2(fbm(uv * 3.1 + t * 0.15), fbm(uv * 3.1 + 11.0 - t * 0.15)) - 0.5;
    uvA += liquid * 0.055 * s;
    uvB -= liquid * 0.055 * s;
  }

  float outside = max(max(-uv.x, uv.x - 1.0), max(-uv.y, uv.y - 1.0));
  float br = 0.011 * uFocus + 0.012 * s + clamp(outside * 0.25, 0.0, 0.022);
  float zs = 0.11 * s;
  vec3 col = blurTap(uA, uvA, br, zs);
  if (p > 0.0001) {
    vec3 b = blurTap(uB, uvB, br, zs);
    float n = fbm(uv * 2.3 + 5.0);
    float m = smoothstep(0.0, 1.0, clamp((p - 0.5) * 2.3 + (n - 0.5) * 1.15 + 0.5, 0.0, 1.0));
    col = mix(col, b, m);
  }

  // iluminação viva: duas luzes suaves, raios de cima e cintilância nas áreas claras
  vec2 L1 = vec2(0.28 + 0.13 * sin(t * 0.071), 0.22 + 0.11 * cos(t * 0.053));
  vec2 L2 = vec2(0.76 + 0.10 * cos(t * 0.061 + 1.3), 0.74 + 0.12 * sin(t * 0.047 + 0.7));
  vec2 d1 = (uv - L1) * ar, d2 = (uv - L2) * ar;
  float l1 = exp(-dot(d1, d1) * 4.5);
  float l2 = exp(-dot(d2, d2) * 5.5);
  vec3 light = vec3(0.80, 0.90, 1.0) * (0.13 * l1 + 0.08 * l2);
  vec2 src = vec2(0.18 + 0.06 * sin(t * 0.043), -0.35);
  vec2 dr = (uv - src) * ar;
  float a = atan(dr.y, dr.x);
  float rays = fbm(vec2(a * 7.0 + t * 0.025, t * 0.04));
  rays = smoothstep(0.48, 0.92, rays) * smoothstep(2.0, 0.3, length(dr));
  light += vec3(0.85, 0.93, 1.0) * rays * 0.10;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float caus = pow(abs(sin(fbm(uv * vec2(9.0, 5.0) + vec2(t * 0.045, -t * 0.03)) * 6.2831)), 9.0);
  light += vec3(0.88, 0.96, 1.0) * caus * 0.05 * smoothstep(0.55, 0.95, lum);
  col = 1.0 - (1.0 - col) * (1.0 - light);
  col *= 1.0 + 0.012 * sin(t * 0.33);

  // clarão da transição
  col += (vec3(0.97, 0.99, 1.0) - col) * uFlash;

  // vinheta suave
  vec2 vv = px / (uRes / uRS) - 0.5;
  col *= 1.0 - 0.16 * dot(vv * 1.25, vv * 1.25);

  col = mix(vec3(0.955, 0.975, 1.0), col, uFade);
  gl_FragColor = vec4(col, 1.0);
}`;

  function createGL(canvas) {
    const g = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!g) return null;
    const sh = (type, src) => {
      const s = g.createShader(type);
      g.shaderSource(s, src);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s));
      return s;
    };
    const prog = g.createProgram();
    g.attachShader(prog, sh(g.VERTEX_SHADER, VERT));
    g.attachShader(prog, sh(g.FRAGMENT_SHADER, FRAG));
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog));
    g.useProgram(prog);
    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const loc = g.getAttribLocation(prog, 'aPos');
    g.enableVertexAttribArray(loc);
    g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
    const U = {};
    ['uA', 'uB', 'uRes', 'uRS', 'uO', 'uS', 'uZ', 'uT', 'uP', 'uDir', 'uFocus', 'uTime', 'uFlash', 'uFade', 'uWarp', 'uFlow']
      .forEach(n => { U[n] = g.getUniformLocation(prog, n); });
    g.uniform1i(U.uA, 0);
    g.uniform1i(U.uB, 1);

    const textures = plateImgs.map(im => {
      const tx = g.createTexture();
      g.bindTexture(g.TEXTURE_2D, tx);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, im);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      return tx;
    });

    // Vídeos de fundo opcionais (ex.: loops gerados no Higgsfield): substituem a imagem fixa quando existem.
    const videos = plateImgs.map((_, i) => {
      const m = MAN[i + 1];
      if (!m || !m.video) return null;
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'auto' });
      v.setAttribute('muted', '');
      v.src = resolveAsset('video', m.video);
      v._ok = false;
      v._t = -1;
      v.addEventListener('loadeddata', () => { v._ok = true; });
      v.addEventListener('error', () => { v._ok = false; });
      return v;
    });
    function syncVideos() {
      videos.forEach((v, i) => {
        if (!v) return;
        const active = i === V.texA || (V.p > 0 && i === V.texB);
        if (active && v.paused) v.play().catch(() => {});
        if (!active && !v.paused) v.pause();
        if (active && v._ok && v.readyState >= 2 && v.currentTime !== v._t) {
          v._t = v.currentTime;
          g.bindTexture(g.TEXTURE_2D, textures[i]);
          g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, v);
        }
      });
    }
    const hasVideo = i => !!(videos[i] && videos[i]._ok);
    window.__deck && (window.__deck.videos = videos);

    let rs = 1, cssW = 1, cssH = 1, quality = 1;
    const api = {
      resize(w, h) {
        cssW = w; cssH = h;
        rs = CAPTURE ? 1 : Math.min(1, 1680 / Math.max(w, 1)) * quality * Math.min(devicePixelRatio || 1, 1.25);
        canvas.width = Math.max(2, Math.round(w * rs));
        canvas.height = Math.max(2, Math.round(h * rs));
        g.viewport(0, 0, canvas.width, canvas.height);
      },
      degrade() {
        if (quality <= 0.55) return false;
        quality *= 0.8;
        api.resize(cssW, cssH);
        return true;
      },
      draw(time) {
        syncVideos();
        const { s, x, y } = V.fit;
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, textures[V.texA]);
        g.activeTexture(g.TEXTURE1);
        g.bindTexture(g.TEXTURE_2D, textures[V.texB]);
        g.uniform2f(U.uRes, canvas.width, canvas.height);
        g.uniform1f(U.uRS, rs);
        g.uniform2f(U.uO, x, y);
        g.uniform1f(U.uS, s);
        g.uniform1f(U.uZ, V.kb.z);
        g.uniform2f(U.uT, V.kb.tx, V.kb.ty);
        g.uniform1f(U.uP, V.p);
        g.uniform1f(U.uDir, V.dir);
        g.uniform1f(U.uFocus, V.focus);
        g.uniform1f(U.uTime, REDUCED ? 0 : time);
        g.uniform1f(U.uFlash, V.flash);
        g.uniform1f(U.uFade, V.fade);
        g.uniform1f(U.uWarp, V.warp);
        g.uniform1f(U.uFlow, hasVideo(V.texA) ? 0.35 : 1.0);
        g.drawArrays(g.TRIANGLES, 0, 3);
      },
    };
    return api;
  }

  // Sem WebGL: as imagens de fundo entram no próprio palco (CSS)
  function createFallback() {
    const holder = document.createElement('div');
    holder.className = 'plate-fallback';
    holder.style.cssText = 'position:absolute;inset:0;';
    plateImgs.forEach(im => {
      const c = im.cloneNode();
      c.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;opacity:0;transform-origin:960px 540px;';
      holder.appendChild(c);
    });
    stage.prepend(holder);
    const imgs = Array.from(holder.children);
    let last = -1;
    return {
      resize() {},
      degrade() { return false; },
      draw() {
        const a = imgs[V.texA], b = imgs[V.texB];
        const e = E.inOutCubic(V.p);
        imgs.forEach(im => { if (im !== a && im !== b) im.style.opacity = 0; });
        a.style.opacity = V.p > 0 ? 1 - e : 1;
        a.style.transform = `scale(${1 + 0.3 * e})`;
        a.style.filter = `blur(${(V.focus * 10 + Math.sin(Math.PI * V.p) * 12).toFixed(1)}px)`;
        if (V.p > 0 && b !== a) {
          b.style.opacity = e;
          b.style.transform = `scale(${1 + 0.3 * (1 - e)})`;
          b.style.filter = a.style.filter;
        }
        if (last !== V.texA) { last = V.texA; }
      },
    };
  }

  // ------------------------------------------------------------------ partículas (bokeh em profundidade)
  const dust = (() => {
    const cv = $('#dust');
    const ctx = cv.getContext('2d');
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d');
    const grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(235,246,255,0.65)');
    grd.addColorStop(1, 'rgba(220,238,255,0)');
    sg.fillStyle = grd;
    sg.fillRect(0, 0, 64, 64);
    const ring = document.createElement('canvas');
    ring.width = ring.height = 64;
    const rg = ring.getContext('2d');
    const g2 = rg.createRadialGradient(32, 32, 18, 32, 32, 31);
    g2.addColorStop(0, 'rgba(255,255,255,0.05)');
    g2.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    rg.fillStyle = g2;
    rg.fillRect(0, 0, 64, 64);

    let W = 1, H = 1, scale = 1;
    const P = [];
    const COUNT = 64;
    for (let i = 0; i < COUNT; i++) {
      const z = Math.pow(Math.random(), 1.6);
      P.push({
        x: Math.random(), y: Math.random(), z,
        r: 2 + z * 30 + Math.random() * 4,
        a: 0.10 + (1 - z) * 0.32,
        vx: (Math.random() - 0.5) * 0.000006,
        vy: -(0.000004 + z * 0.000012),
        ph: Math.random() * 6.283,
        tw: Math.random() < 0.18,
        ring: Math.random() < 0.15 && z > 0.4,
      });
    }
    return {
      resize(w, h) {
        scale = Math.min(devicePixelRatio || 1, 1.5);
        W = w; H = h;
        cv.width = Math.round(w * scale);
        cv.height = Math.round(h * scale);
      },
      draw(t, dt) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        const minDim = Math.min(W, H);
        const warp = V.warp;
        for (const p of P) {
          if (!REDUCED && !STATIC) {
            p.x += (p.vx + Math.sin(t * 0.21 + p.ph) * 0.0000045) * dt;
            p.y += (p.vy + Math.cos(t * 0.17 + p.ph) * 0.0000035) * dt;
            if (warp > 0) {
              const dx = p.x - 0.5, dy = p.y - 0.5;
              p.x += dx * warp * (0.6 + p.z) * dt * 0.0011 * V.dir;
              p.y += dy * warp * (0.6 + p.z) * dt * 0.0011 * V.dir;
            }
            if (p.y < -0.08) { p.y = 1.08; p.x = Math.random(); }
            if (p.y > 1.08) p.y = -0.08;
            if (p.x < -0.08) p.x = 1.08;
            if (p.x > 1.08) p.x = -0.08;
          }
          const size = p.r * (minDim / 1080) * (1 + warp * p.z * 0.6);
          let a = p.a;
          if (p.tw) a *= 0.45 + 0.55 * Math.sin(t * 1.3 + p.ph * 3);
          ctx.globalAlpha = clamp(a, 0, 1);
          const px = p.x * W + V.mx * 14 * p.z, py = p.y * H + V.my * 10 * p.z;
          ctx.drawImage(p.ring ? ring : sprite, px - size, py - size, size * 2, size * 2);
        }
        ctx.globalAlpha = 1;
      },
    };
  })();

  // ------------------------------------------------------------------ revelações
  const R = {};
  const live = new Map(); // slide -> { anims:[], timers:[] }
  function track(sl) {
    if (!live.has(sl)) live.set(sl, { anims: [], timers: [], committed: [] });
    return live.get(sl);
  }
  // Ao terminar, grava a opacidade final e libera a animação: o elemento deixa de ser
  // uma camada da GPU (menos memória de vídeo, sem "buracos" em máquinas fracas).
  function anim(sl, el, frames, opts) {
    const o = Object.assign({ fill: 'both' }, opts);
    const a = el.animate(frames, o);
    const L = track(sl);
    L.anims.push(a);
    if (o.fill !== 'none') {
      a.finished.then(() => {
        if (live.get(sl) !== L) return;
        const last = frames[frames.length - 1];
        if (last.opacity !== undefined) {
          el.style.opacity = String(last.opacity);
          L.committed.push(el);
        }
        a.cancel();
      }, () => {});
    }
    return a;
  }
  function later(sl, ms, fn) {
    track(sl).timers.push(setTimeout(fn, ms / TS));
  }
  const dur = (el, d) => +(el.dataset.dur || d);

  R.panel = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, transform: 'scale(0.965)', filter: 'blur(14px) brightness(1.18)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px) brightness(1)' },
    ], { duration: dur(el, 1150), delay: d, easing: EXPO });
    const sh = el._sheen;
    if (sh) {
      anim(sl, sh, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: d + 200 });
      later(sl, d + 260, () => { sh.classList.remove('loop'); void sh.offsetWidth; sh.classList.add('run'); });
      later(sl, d + 2400, () => { sh.classList.remove('run'); sh.classList.add('loop'); });
    }
  };
  R.focus = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, transform: 'scale(1.07)', filter: 'blur(20px) brightness(1.45) saturate(0.6)' },
      { opacity: 1, offset: 0.35, filter: 'blur(8px) brightness(1.2) saturate(0.85)' },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px) brightness(1) saturate(1)' },
    ], { duration: dur(el, 1350), delay: d, easing: SOFT });
  };
  R.chromo = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, transform: 'translateY(56px) scale(0.9)', filter: 'blur(24px) brightness(2.3)' },
      { opacity: 1, offset: 0.45, filter: 'blur(5px) brightness(1.45)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px) brightness(1)' },
    ], { duration: dur(el, 1900), delay: d, easing: EXPO });
  };
  R.pop = (sl, el, d) => {
    const isSvg = el instanceof SVGElement;
    if (isSvg) { el.style.transformBox = 'fill-box'; el.style.transformOrigin = 'center'; }
    anim(sl, el, [
      { opacity: 0, transform: 'scale(0.4)', filter: isSvg ? 'none' : 'blur(8px)' },
      { opacity: 1, offset: 0.65, transform: 'scale(1.09)', filter: isSvg ? 'none' : 'blur(0px)' },
      { opacity: 1, transform: 'scale(1)', filter: isSvg ? 'none' : 'blur(0px)' },
    ], { duration: dur(el, 820), delay: d, easing: SOFT });
    if (isSvg) return;
    const L = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    const ring = document.createElement('div');
    ring.className = 'pulse';
    const pad = 14;
    Object.assign(ring.style, { left: (L.x + pad) + 'px', top: (L.y + pad) + 'px', width: (L.w - 2 * pad) + 'px', height: (L.h - 2 * pad) + 'px' });
    el.after(ring);
    const a = anim(sl, ring, [
      { opacity: 0, transform: 'scale(0.85)' },
      { opacity: 0.9, offset: 0.25, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.55)' },
    ], { duration: 1300, delay: d + 300, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'none' });
    a.finished.then(() => ring.remove(), () => ring.remove());
  };
  R.words = (sl, el, d) => {
    anim(sl, el, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: d });
    $$('.wi', el).forEach((w, i) => {
      anim(sl, w, [
        { opacity: 0, transform: 'translateY(108%) rotate(3deg)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'translateY(0) rotate(0deg)', filter: 'blur(0px)' },
      ], { duration: dur(el, 1050), delay: d + i * 60, easing: EXPO });
    });
  };
  R.chars = (sl, el, d) => {
    anim(sl, el, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: d });
    $$('.ch', el).forEach((c, i) => {
      anim(sl, c, [
        { opacity: 0, transform: 'translateY(62%) scale(1.04)', filter: 'blur(12px)' },
        { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0px)' },
      ], { duration: dur(el, 1150), delay: d + i * 42, easing: EXPO });
    });
  };
  R.lines = (sl, el, d) => {
    anim(sl, el, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: d });
    $$('.ln', el).forEach((ln, i) => {
      anim(sl, ln, [
        { opacity: 0, transform: 'translateY(18px)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ], { duration: dur(el, 1000), delay: d + i * 95, easing: EXPO });
    });
  };
  R.fade = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, transform: 'translateY(14px)', filter: 'blur(8px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
    ], { duration: dur(el, 1000), delay: d, easing: EXPO });
  };
  R.wipe = (sl, el, d) => {
    el.style.transformOrigin = (el.dataset.o || 'left') + ' center';
    anim(sl, el, [{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }],
      { duration: dur(el, 1000), delay: d, easing: EXPO });
  };
  R.wipeY = (sl, el, d) => {
    el.style.transformOrigin = 'center top';
    anim(sl, el, [{ opacity: 0, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }],
      { duration: dur(el, 1000), delay: d, easing: EXPO });
  };
  R.pill = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, clipPath: 'inset(0% 48% 0% 48% round 60px)', filter: 'brightness(1.6)' },
      { opacity: 1, offset: 0.3, filter: 'brightness(1.3)' },
      { opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 60px)', filter: 'brightness(1)' },
    ], { duration: dur(el, 1100), delay: d, easing: EXPO });
  };
  R.draw = (sl, el, d) => {
    const len = el.getTotalLength ? el.getTotalLength() : 1000;
    el.style.strokeDasharray = len;
    anim(sl, el, [
      { opacity: 0, strokeDashoffset: len },
      { opacity: 1, offset: 0.1 },
      { opacity: 1, strokeDashoffset: 0 },
    ], { duration: dur(el, 1400), delay: d, easing: 'cubic-bezier(.65,0,.35,1)' });
  };
  R.glow = (sl, el, d) => {
    anim(sl, el, [{ opacity: 0, transform: 'scale(0.55)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: dur(el, 2000), delay: d, easing: EXPO });
  };
  R.beam = (sl, el, d) => {
    anim(sl, el, [
      { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)', filter: 'brightness(1.8)' },
      { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', filter: 'brightness(1)' },
    ], { duration: dur(el, 900), delay: d, easing: SOFT });
  };
  R.scan = (sl, el, d) => {
    const y0 = +el.dataset.y0, y1 = +el.dataset.y1;
    anim(sl, el, [
      { opacity: 0, transform: `translateY(${y0}px)` },
      { opacity: 0.9, offset: 0.12 },
      { opacity: 0.9, offset: 0.85 },
      { opacity: 0, transform: `translateY(${y1}px)` },
    ], { duration: dur(el, 1700), delay: d, easing: 'cubic-bezier(.45,.05,.4,1)' });
  };
  R.pulse = (sl, el, d) => {
    const loop = +(el.dataset.loop || 0);
    const once = delay => anim(sl, el, [
      { opacity: 0, transform: 'scale(0.75)' },
      { opacity: 0.85, offset: 0.2, transform: 'scale(0.9)' },
      { opacity: 0, transform: 'scale(1.35)' },
    ], { duration: 1900, delay, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'none' });
    once(d);
    if (loop) {
      const tick = () => { once(0); later(sl, loop, tick); };
      later(sl, d + loop, tick);
    }
  };
  R.list = (sl, el, d) => {
    anim(sl, el, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: d });
    const st = +(el.dataset.stagger || 110);
    $$('.it', el).forEach((it, i) => {
      const dd = d + i * st;
      const dot = $('.dot', it), tx = $('.t', it);
      anim(sl, dot, [
        { opacity: 0, transform: 'scale(0)', boxShadow: '0 0 0 0 rgba(77,134,214,0.6), 0 2px 6px rgba(30,80,160,0.25)' },
        { opacity: 1, offset: 0.6, transform: 'scale(1.25)', boxShadow: '0 0 0 10px rgba(77,134,214,0), 0 2px 6px rgba(30,80,160,0.25)' },
        { opacity: 1, transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(77,134,214,0), 0 2px 6px rgba(30,80,160,0.25)' },
      ], { duration: 700, delay: dd, easing: SOFT });
      anim(sl, tx, [
        { opacity: 0, transform: 'translateX(-16px)', filter: 'blur(7px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' },
      ], { duration: 950, delay: dd + 80, easing: EXPO });
    });
  };
  R.checks = (sl, el, d) => {
    anim(sl, el, [{ opacity: 1 }, { opacity: 1 }], { duration: 1, delay: d });
    const st = +(el.dataset.stagger || 100);
    $$('.it', el).forEach((it, i) => {
      const dd = d + i * st;
      const svg = $('svg', it), path = $('path', it), tx = $('.t', it);
      anim(sl, svg, [
        { opacity: 0, transform: 'scale(0.3) rotate(-30deg)' },
        { opacity: 1, offset: 0.6, transform: 'scale(1.12) rotate(0deg)' },
        { opacity: 1, transform: 'scale(1)' },
      ], { duration: 650, delay: dd, easing: SOFT });
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      anim(sl, path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 450, delay: dd + 260, easing: 'cubic-bezier(.65,0,.35,1)' });
      anim(sl, tx, [
        { opacity: 0, transform: 'translateX(-14px)', filter: 'blur(6px)' },
        { opacity: 1, transform: 'translateX(0)', filter: 'blur(0px)' },
      ], { duration: 900, delay: dd + 120, easing: EXPO });
    });
  };

  function enterSlide(sl, base) {
    sl.classList.add('on');
    const els = $$('[data-r]', sl);
    let last = 0;
    els.forEach(el => {
      const fn = R[el.dataset.r];
      if (!fn) return;
      const d = base + (+el.dataset.d || 0);
      fn(sl, el, d);
      last = Math.max(last, d);
    });
    return last;
  }

  function resetSlide(sl) {
    const L = live.get(sl);
    if (L) {
      live.delete(sl);
      L.timers.forEach(clearTimeout);
      L.anims.forEach(a => a.cancel());
      L.committed.forEach(el => { el.style.opacity = ''; });
    }
    $$('.sheen', sl).forEach(sh => sh.classList.remove('run', 'loop'));
    $$('.pulse', sl).forEach(p => { if (!p.dataset.r) p.remove(); });
    sl.getAnimations().forEach(a => a.cancel());
    sl.classList.remove('on');
  }

  function showStatic(sl) {
    sl.classList.add('on');
    $$('.sheen', sl).forEach(sh => { sh.style.opacity = 0; });
  }

  // ------------------------------------------------------------------ navegação
  let cur = clamp((+params.get('s') || 1) - 1, 0, N - 1);
  let busy = false;
  let queued = null;

  async function go(to) {
    to = clamp(to, 0, N - 1);
    if (busy) { queued = to; return; }
    if (to === cur) return;
    busy = true;
    const from = cur;
    const dir = to > from ? 1 : -1;
    cur = to;
    updateHud();
    hideHint();

    const out = slides[from], inn = slides[to];
    if (STATIC) {
      resetSlide(out); showStatic(inn); V.texA = to; V.p = 0; busy = false; return;
    }

    // 1) o slide atual afunda no fundo
    out.getAnimations().forEach(a => a.cancel());
    out.animate([
      { opacity: 1, transform: 'scale(1) rotate(0deg)', filter: 'blur(0px)' },
      { opacity: 0, transform: `scale(${dir > 0 ? 1.08 : 0.94}) rotate(${0.6 * dir}deg)`, filter: 'blur(10px)' },
    ], { duration: 620, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' });

    // 2) o fundo mergulha e emerge no próximo
    V.texB = to;
    V.dir = dir;
    await sleep(110);
    flare();
    const T = 1250;
    let entered = false;
    await tween(T, (e, k) => {
      V.p = e;
      const s = Math.sin(Math.PI * k);
      V.flash = 0.30 * s * s;
      V.warp = s;
      V.focus = Math.max(V.focus * 0.96, 0);
      if (!entered && k >= 0.58) {
        entered = true;
        resetSlide(out);
        out.style.opacity = '';
        inn.animate([
          { opacity: 0, transform: `scale(${dir > 0 ? 1.06 : 0.95}) rotate(${-0.5 * dir}deg)` },
          { opacity: 1, transform: 'scale(1) rotate(0deg)' },
        ], { duration: 900, easing: EXPO });
        enterSlide(inn, 80);
        // foco de microscópio na chegada
        V.focus = 0.75;
        tween(1300, f => { V.focus = 0.75 * (1 - f); }, E.outCubic);
      }
    }, E.inOutCubic);
    V.texA = to;
    V.p = 0;
    V.flash = 0;
    V.warp = 0;
    busy = false;
    if (queued !== null) {
      const q = queued; queued = null;
      if (q !== cur) go(q);
    }
  }
  const next = () => go((busy && queued !== null ? queued : cur) + 1);
  const prev = () => go((busy && queued !== null ? queued : cur) - 1);

  function flare() {
    const f = $('#flare');
    f.getAnimations().forEach(a => a.cancel());
    const y = (Math.random() * 30 - 15).toFixed(0);
    f.animate([
      { opacity: 0, transform: `translate3d(${-40 * V.dir}%, ${y}vh, 0) scaleY(0.6)` },
      { opacity: 0.85, offset: 0.45 },
      { opacity: 0, transform: `translate3d(${40 * V.dir}%, ${y}vh, 0) scaleY(1.2)` },
    ], { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)' });
  }

  // ------------------------------------------------------------------ HUD
  const seg = $('#seg');
  for (let i = 0; i < N; i++) seg.appendChild(document.createElement('i'));
  function updateHud() {
    Array.from(seg.children).forEach((s, i) => {
      s.className = i === cur ? 'cur' : i < cur ? 'done' : '';
    });
    $('#num').textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
  }
  let idleT = 0;
  function wake() {
    app.classList.add('hud-on');
    app.classList.remove('hide-cursor');
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      app.classList.remove('hud-on');
      app.classList.add('hide-cursor');
    }, 2600);
  }
  let hintT = 0;
  function showHint() {
    const h = $('#hint');
    h.classList.add('on');
    hintT = setTimeout(hideHint, 6500);
  }
  function hideHint() { clearTimeout(hintT); $('#hint').classList.remove('on'); }
  function toggleFs() {
    const el = document.documentElement;
    const r = document.fullscreenElement ? document.exitFullscreen?.() : el.requestFullscreen?.();
    if (r && r.catch) r.catch(() => {});
  }

  function bindInput() {
    addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(N - 1);
      else if (k === 'f' || k === 'F') toggleFs();
    });
    app.addEventListener('click', e => {
      if (e.target.closest('#hud')) return;
      next();
    });
    app.addEventListener('contextmenu', e => { e.preventDefault(); prev(); });
    $('#prev').addEventListener('click', e => { e.stopPropagation(); prev(); });
    $('#next').addEventListener('click', e => { e.stopPropagation(); next(); });
    $('#fs').addEventListener('click', e => { e.stopPropagation(); toggleFs(); });
    addEventListener('mousemove', e => {
      V.tmx = (e.clientX / innerWidth - 0.5) * 2;
      V.tmy = (e.clientY / innerHeight - 0.5) * 2;
      if (!CAPTURE) wake();
    });
    let tx0 = null;
    addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; }, { passive: true });
    addEventListener('touchend', e => {
      if (tx0 === null) return;
      const dx = e.changedTouches[0].clientX - tx0;
      if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      tx0 = null;
    }, { passive: true });
    addEventListener('resize', layout);
  }

  // ------------------------------------------------------------------ loop
  let gl = null;
  let tPrev = clock();
  let frames = 0, slowFrames = 0, fpsT = 0;
  function frame() {
    const now = clock();
    const dt = Math.min(64, now - tPrev);
    tPrev = now;
    const t = now / 1000;
    runTweens(now);
    updateCamera(t);
    gl.draw(t);
    dust.draw(t, dt);
    // qualidade adaptativa: se a máquina sofrer, o fundo renderiza em resolução menor
    frames++;
    if (dt > 24) slowFrames++;
    fpsT += dt;
    if (fpsT > 2500 && !CAPTURE) {
      if (slowFrames / frames > 0.35) gl.degrade();
      frames = slowFrames = 0; fpsT = 0;
    }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ início
  async function start() {
    const fill = $('#loader .fill');
    try {
      await loadAll(p => { fill.style.width = (p * 100).toFixed(0) + '%'; });
    } catch (err) {
      console.error(err);
    }
    buildLayers();
    $$('[data-r="words"]').forEach(el => splitText(el, 'words'));
    $$('[data-r="chars"]').forEach(el => splitText(el, 'chars'));

    const canvas = $('#bg');
    try {
      gl = createGL(canvas);
    } catch (err) {
      console.warn('WebGL indisponível, usando CSS', err);
      gl = null;
    }
    if (!gl) { canvas.style.display = 'none'; gl = createFallback(); }
    // se a placa de vídeo derrubar o contexto, a apresentação segue com o fundo em CSS
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      console.warn('WebGL: contexto perdido, usando CSS');
      canvas.style.display = 'none';
      gl = createFallback();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        const g = createGL(canvas);
        if (!g) return;
        $$('.plate-fallback').forEach(el => el.remove());
        gl = g;
        canvas.style.display = '';
        layout();
      } catch (err) { console.warn(err); }
    });
    V.texA = cur; V.texB = cur;
    layout();
    bindInput();
    updateHud();

    const veil = $('#veil');
    if (STATIC) {
      V.fade = 1; V.focus = 0;
      veil.style.display = 'none';
      $('#loader').classList.add('done');
      slides.forEach(s => s.classList.remove('on'));
      showStatic(slides[cur]);
      $$('.sheen').forEach(s => { s.style.opacity = 0; });
      requestAnimationFrame(frame);
      document.documentElement.dataset.ready = '1';
      return;
    }

    $('#loader').classList.add('done');
    if (CAPTURE) {
      app.classList.add('capture');
      document.documentElement.dataset.loaded = '1';
      await new Promise(r => { window.__deck.begin = r; });
      tPrev = clock();
    }
    requestAnimationFrame(frame);
    // abertura: a luz acende e o microscópio entra em foco
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1600, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    tween(1500, e => { V.fade = e; }, E.inOutSine);
    V.focus = 1;
    tween(2200, e => { V.focus = 1 - e; }, E.outCubic);
    await sleep(500);
    enterSlide(slides[cur], 0);
    document.documentElement.dataset.ready = '1';
    if (!CAPTURE) {
      setTimeout(showHint, 2600);
      wake();
    }
  }

  // ganchos para depuração/captura (?static&s=3)
  window.__deck = { go, next, prev, V, get cur() { return cur; } };
  start();
})();

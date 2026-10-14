// Grava a apresentação quadro a quadro, com o tempo desacelerado, para virar vídeo.
// uso: node tools/capture.cjs <url-do-index.html> <pasta-saida> [ts=0.05] [entrada_s=5.5] [ambiente_s=9] [slides=7]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const [,, base, outDir, tsArg = '0.05', inArg = '5.5', ambArg = '9', nArg = '7'] = process.argv;
  const TS = +tsArg, IN = +inArg, AMB = +ambArg, N = +nArg;
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`${base}?capture&ts=${TS}`);
  await page.waitForFunction(() => document.documentElement.dataset.loaded === '1', null, { timeout: 120000 });
  await page.mouse.move(960, 540);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: TS });

  const frames = [];
  let t0 = null, n = 0;
  cdp.on('Page.screencastFrame', async f => {
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    if (t0 === null) return;
    const v = (f.metadata.timestamp - t0) * TS;
    const file = `f${String(n++).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(outDir, file), Buffer.from(f.data, 'base64'));
    frames.push({ file, t: v });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await page.waitForTimeout(1500);

  const wallNow = () => Date.now() / 1000;
  t0 = wallNow();
  await page.evaluate(() => window.__deck.begin());
  const marks = [{ slide: 1, in: 0 }];
  const waitUntil = async v => { const dt = (t0 + v / TS - wallNow()) * 1000; if (dt > 0) await page.waitForTimeout(dt); };
  let v = 0;
  for (let s = 1; s <= N; s++) {
    v += IN + AMB;
    await waitUntil(v);
    console.log('slide', s, 'done at v=', v.toFixed(1), 'frames', frames.length);
    if (s < N) {
      await page.keyboard.press('ArrowRight');
      marks.push({ slide: s + 1, in: v });
    }
  }
  await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(outDir, 'frames.json'), JSON.stringify({ TS, IN, AMB, marks, frames }, null, 0));
  await browser.close();
})();

(() => {
  'use strict';
  const workerURL = new URL('./ink-field.js?v=20261020-v3', document.currentScript.src);
  const canvas = document.createElement('canvas');
  canvas.id = 'ink-backdrop';
  canvas.hidden = true;
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'background-motion-toggle';
  button.hidden = true;
  (document.querySelector('.directory-nav') || document.querySelector('footer') || document.body).append(button);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ctx = canvas.getContext('2d', { alpha: false });
  let userPaused = false;
  try { userPaused = localStorage.getItem('portfolio-background-paused') === 'true'; } catch (_) {}
  let paused = motion.matches || userPaused;
  let worker, frame = 0, busy = false, dirty = true, lastTick = 0, submitted = 0;
  let elapsed = 24, version = 0, renderWidth = 0, renderHeight = 0, interval = 50;
  let activeVideo = false, zones = [], layoutDirty = false;

  function updateReading() {
    const progression = Math.max(0, Math.min(1, (scrollY - 70) / 420));
    canvas.style.opacity = String(.70 - progression * .62);
  }
  function measureZones() {
    const candidates = [
      ['main h1', .58],
      ['.auction-host img, .income-hero-art', .66],
      ['.goal[open] .detail-copy, .income-intro-copy, .game-copy', .90]
    ];
    const next = [];
    for (const [selector, amount] of candidates) {
      for (const el of document.querySelectorAll(selector)) {
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || r.bottom < 0 || r.top > innerHeight) continue;
        next.push({
          x: (r.left + r.width / 2) / innerWidth,
          y: (r.top + r.height / 2) / innerHeight,
          rx: (r.width / 2 + 24) / innerWidth,
          ry: (r.height / 2 + 24) / innerHeight,
          amount
        });
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(zones)) { zones = next; dirty = true; }
  }
  function measure() {
    const cell = Math.max(2, Math.hypot(innerWidth, innerHeight) / 570);
    renderWidth = Math.max(1, Math.round(innerWidth / cell));
    renderHeight = Math.max(1, Math.round(innerHeight / cell));
    dirty = true;
    version++;
    updateReading();
    measureZones();
  }
  function scheduleLayout() {
    layoutDirty = true;
    if (!frame) kick();
  }
  function requestFrame(now) {
    frame = 0;
    if (document.hidden || !worker) return;
    if (layoutDirty) { layoutDirty = false; updateReading(); measureZones(); }
    const stopped = paused || activeVideo;
    if (!lastTick) lastTick = now;
    if (!stopped) elapsed += Math.min(now - lastTick, 100) / 1000;
    lastTick = now;
    if (!busy && (dirty || (!stopped && now - submitted >= interval))) {
      busy = true;
      dirty = false;
      submitted = now;
      worker.postMessage({ width: renderWidth, height: renderHeight, time: elapsed, version, zones });
    }
    if (!stopped || dirty) frame = requestAnimationFrame(requestFrame);
  }
  function kick() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTick = 0;
    if (worker && !document.hidden) frame = requestAnimationFrame(requestFrame);
  }
  function sync() {
    button.textContent = paused ? '播放背景动效' : '暂停背景动效';
    canvas.dataset.paused = String(paused);
    kick();
  }
  button.addEventListener('click', () => {
    paused = !paused;
    userPaused = paused;
    try { localStorage.setItem('portfolio-background-paused', String(paused)); } catch (_) {}
    sync();
  });
  function fail() {
    if (worker) worker.terminate();
    worker = null;
    busy = false;
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    button.hidden = true;
    document.body.classList.remove('ink-active');
  }
  try {
    if (!ctx) throw new Error('Canvas is unavailable');
    worker = new Worker(workerURL);
    worker.onmessage = ({ data }) => {
      busy = false;
      if (data.version === version) {
        if (canvas.width !== data.width || canvas.height !== data.height) {
          canvas.width = data.width;
          canvas.height = data.height;
        }
        ctx.putImageData(new ImageData(new Uint8ClampedArray(data.bytes), data.width, data.height), 0, 0);
        canvas.hidden = false;
        button.hidden = false;
        document.body.classList.add('ink-active');
        canvas.dataset.time = data.time.toFixed(3);
        canvas.dataset.rendered = 'true';
        interval = Math.max(50, Math.min(100, data.ms * 1.5));
      }
      if (dirty && !frame) kick();
    };
    worker.onerror = fail;
  } catch (_) { fail(); }
  addEventListener('resize', () => { measure(); kick(); }, { passive: true });
  addEventListener('scroll', scheduleLayout, { passive: true });
  document.addEventListener('toggle', scheduleLayout, true);
  document.fonts.ready.then(scheduleLayout);
  document.addEventListener('visibilitychange', () => {
    lastTick = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else scheduleLayout();
  });
  motion.addEventListener('change', e => { paused = e.matches || userPaused; sync(); });
  const videos = [...document.querySelectorAll('video')];
  function checkVideos() { activeVideo = videos.some(v => !v.paused && !v.ended); kick(); }
  for (const video of videos) for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, checkVideos);
  addEventListener('pagehide', e => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTick = 0;
    if (!e.persisted && worker) worker.terminate();
  });
  addEventListener('pageshow', e => { if (e.persisted) { checkVideos(); scheduleLayout(); } });
  measure();
  sync();
})();

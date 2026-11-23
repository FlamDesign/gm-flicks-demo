/* Configurator Flick on a vehicle page.
   Uses the GM configurator renderer (assets/configurator/engine.js, from FlamDesign/flicks-social-apps/gm):
   one grid video per vehicle (3 roads x 4 packages, frame-synced), paint recoloured live in WebGL.
   Markup: <div class="cfg" data-car="sierra" data-color="4" data-env="lake"> with .cfg-stage > canvas and .cfg-panel > [data-groups]. */
(function () {
  const G = window.GM;
  const BASE = (document.currentScript && document.currentScript.src.replace(/js\/configurator\.js.*$/, 'configurator/')) || '../../assets/configurator/';
  const atlas = (car) => BASE + 'atlas_' + car + '.mp4';
  const mask = (car) => BASE + 'mask_' + car + '.mp4';
  const ENV_THUMB = { lake: 'env_lake.jpg', desert: 'env_desert.jpg', coast: 'env_coast.jpg' };

  // Download a whole video into memory, reporting progress (so every switch after that is instant).
  const cache = {};
  function download(url, onProgress) {
    return cache[url] = cache[url] || (async () => {
      try {
        const r = await fetch(url); if (!r.ok) throw new Error(r.status);
        const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), parts = []; let got = 0;
        for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; if (onProgress) onProgress(total ? got / total : 0.5); }
        if (onProgress) onProgress(1);
        return URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
      } catch (e) { console.warn('[configurator] streaming instead of download:', url, e); if (onProgress) onProgress(1); return url; }
    })();
  }

  function mount(root) {
    if (root.__cfg) return; root.__cfg = true;
    const car = G.cars.find((c) => c.id === root.dataset.car);
    const stage = root.querySelector('.cfg-stage'), canvas = stage.querySelector('canvas');
    const bar = stage.querySelector('.cfg-bar b'), groups = root.querySelector('[data-groups]');
    const st = { color: +(root.dataset.color || 0), mod: root.dataset.mod || 'stock', env: root.dataset.env || 'lake' };
    let player = null, src = null, msk = null, started = false, visible = false;

    // ---- panel ----
    const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const group = (label, extra) => { const g = h('div', 'cfg-group'); const l = h('div', 'cfg-label'); l.append(h('span', null, label)); if (extra) l.append(extra); g.append(l); groups.append(g); return g; };
    const colName = h('em', 'cfg-value');
    const gc = group('Exterior color', colName), sw = h('div', 'cfg-swatches'); gc.append(sw);
    const gm = group('Package'), mods = h('div', 'cfg-mods'); gm.append(mods);
    const ge = group('Road'), roads = h('div', 'cfg-roads'); ge.append(roads);
    const summary = root.querySelector('[data-summary]');

    function render() {
      sw.innerHTML = ''; mods.innerHTML = ''; roads.innerHTML = '';
      car.colors.forEach((c, i) => {
        const b = h('button', 'cfg-swatch' + (i === st.color ? ' is-on' : ''));
        b.type = 'button'; b.title = c.name; b.setAttribute('aria-label', c.name); b.setAttribute('aria-pressed', i === st.color);
        b.style.setProperty('--paint', c.hex);
        b.onclick = () => { if (st.color === i) return; st.color = i; render(); apply('car'); };
        sw.append(b);
      });
      car.mods.forEach((m) => {
        const b = h('button', 'cfg-mod' + (m.id === st.mod ? ' is-on' : ''), m.name);
        b.type = 'button'; b.setAttribute('aria-pressed', m.id === st.mod);
        b.onclick = () => { if (st.mod === m.id) return; st.mod = m.id; render(); apply('car'); };
        mods.append(b);
      });
      G.envs.forEach((e) => {
        const b = h('button', 'cfg-road' + (e.id === st.env ? ' is-on' : ''));
        b.type = 'button'; b.setAttribute('aria-pressed', e.id === st.env);
        const im = h('span', 'cfg-road-img'); im.style.backgroundImage = `url(${BASE + ENV_THUMB[e.id]})`;
        b.append(im, h('span', 'cfg-road-name', e.name));
        b.onclick = () => { if (st.env === e.id) return; st.env = e.id; render(); apply('road'); };
        roads.append(b);
      });
      const c = car.colors[st.color], m = car.mods.find((x) => x.id === st.mod), e = G.envs.find((x) => x.id === st.env);
      colName.textContent = c.name;
      if (summary) summary.textContent = [c.name, m.id === 'stock' ? null : m.name, e.name].filter(Boolean).join(' · ');
      root.dataset.selection = [c.name, m.name, e.name].join('|');
    }

    // ---- live view ----
    function apply(mode) {
      if (!player) return;
      const c = car.colors[st.color];
      player.show(src, G.cell(car.id, st.env, st.mod), c.hex, { spec: c.spec ?? 1, animate: mode !== 'none', mode, mask: msk });
    }
    async function start() {
      if (started) return; started = true;
      let pv = 0, pm = 0; const prog = () => { if (bar) bar.style.width = Math.round((pv * 0.95 + pm * 0.05) * 100) + '%'; };
      [src, msk] = await Promise.all([download(atlas(car.id), (p) => { pv = p; prog(); }), download(mask(car.id), (p) => { pm = p; prog(); })]);
      try { player = new PaintPlayer(canvas, { focusY: +(root.dataset.focus || 0.47), grid: [6, 2] }); }
      catch (e) { stage.classList.add('is-failed'); console.warn('[configurator] WebGL unavailable', e); return; }
      player.preload(src); player.preload(msk);
      apply('none');
      const v = player.preload(src);
      await new Promise((r) => { if (v.readyState >= 3) r(); else v.addEventListener('canplay', r, { once: true }); });
      stage.classList.add('is-ready'); root.classList.add('is-ready');
      if (!visible) player.halt();
    }

    // Fetch ahead of time when the visitor is getting close (or soon after the page settles), draw only while on screen.
    new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) start(); }, { rootMargin: '1600px 0px' }).observe(root);
    new IntersectionObserver((es) => {
      visible = es.some((x) => x.isIntersecting);
      if (player) visible ? player.resume() : player.halt();
    }, { threshold: 0.05 }).observe(stage);
    window.addEventListener('load', () => setTimeout(start, 3500));
    render();
    root.cfg = { state: st, start, get player() { return player; } };
  }
  window.Configurator = { mount };
  document.querySelectorAll('.cfg[data-car]').forEach(mount);
})();

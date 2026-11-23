/* Configurator engine.
   Each vehicle is ONE video: a 6x2 grid of 540x960 cells, one per (road, package), all frame-synced.
   Switching road or package moves to another cell of the same playing video, so it is instant.
   Switching vehicle swaps to another (preloaded) video, resynced to the same moment.
   Paint, package and vehicle changes play a glossy ripple across the car body only; road changes play one
   ring that spreads from the car across the scenery. Both bend the image slightly as they pass.
   Paint is recoloured live from the magenta key: diffuse = magenta minus white, reflections kept. */
(function () {
  const VS = `attribute vec2 p; varying vec2 uv; uniform vec4 crop;
  void main(){ uv = crop.xy + (p*0.5+0.5)*crop.zw; uv.y = 1.0-uv.y; gl_Position = vec4(p,0.,1.); }`;
  const FS = `precision mediump float; varying vec2 uv;
  uniform sampler2D tA, tB;            // A = state before the change, B = state after
  uniform sampler2D sA, sB;            // car silhouettes (same grid layout, half size), when loaded
  uniform float hasA, hasB;
  uniform float same;                  // 1 when before and after are the same vehicle video
  uniform vec4 cellA, cellB;           // xy = cell offset, zw = cell size (texture space)
  uniform vec2 pxA, pxB;               // one source pixel in texture space
  uniform float prog, band, mode;      // eased progress 0..1, transition on/off, 0 = car ripple, 1 = road ring
  uniform vec2 ctr;                    // where the road ring starts (the car), in frame uv
  uniform vec4 colA, colB;             // paint before / after (rgb linear, a = gloss)
  const float SRC_ASPECT = 0.5625;
  vec3 lin(vec3 c){ return pow(max(c,0.0), vec3(2.2)); }
  vec3 srgb(vec3 c){ return pow(clamp(c,0.0,1.0), vec3(1.0/2.2)); }
  // strict key: confident magenta paint. Returns (mask, white/spec part, diffuse paint strength).
  vec3 key(vec3 l){
    float spec = min(l.g, min(l.r, l.b));
    float rd = l.r - spec, bd = l.b - spec, mx = max(max(l.r, l.b), 1e-5);
    float sat = (mx - l.g)/mx, ratio = bd/max(rd, 1e-5);
    float m = smoothstep(0.22, 0.45, sat) * smoothstep(0.012, 0.06, ratio) * (1.0 - smoothstep(2.6, 4.0, ratio)) * smoothstep(0.002, 0.008, mx);
    return vec3(m, spec, (rd + bd)/0.85);
  }
  // loose key: pale sky reflections on the paint and anti-aliased edges (only trusted next to confident paint)
  float keyWeak(vec3 l){
    float spec = min(l.g, min(l.r, l.b));
    float rd = l.r - spec, bd = l.b - spec, mx = max(max(l.r, l.b), 1e-5);
    float sat = (mx - l.g)/mx, ratio = bd/max(rd, 1e-5);
    return smoothstep(0.05, 0.16, sat) * smoothstep(0.012, 0.06, ratio) * (1.0 - smoothstep(9.0, 16.0, ratio)) * smoothstep(0.002, 0.006, mx);
  }
  vec2 cq(vec4 cell, vec2 p){ return cell.xy + clamp(p, 0.002, 0.998)*cell.zw; }
  float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  // One tap of the paint key: x = paint mask (strict, or loose when next to paint is decided later), y = loose key, z = diffuse paint strength
  vec3 tapK(sampler2D t, vec2 q, out float Y){ vec3 l = lin(texture2D(t, q).rgb); Y = lum(l); vec3 k = key(l); return vec3(k.x, keyWeak(l), k.z); }
  vec3 shade(sampler2D t, vec4 cell, vec2 px, vec4 col, vec2 p, float sil, float halo){
    vec2 q = cq(cell, p);
    vec3 l = lin(texture2D(t, q).rgb); vec3 k = key(l);
    // Video stores colour at half resolution in small blocks; the key is built from colour, so it would come out blocky.
    // Smooth the key and the paint strength over a 9-tap footprint, then put back the fine shading from brightness (full resolution).
    float Y0 = lum(l), Ya, Yb, Yc, Yd, Ye, Yf, Yg, Yh;
    vec2 h = px*1.5, g = px*2.2;
    vec3 ka = tapK(t, q + vec2( h.x, 0.0), Ya), kb = tapK(t, q - vec2( h.x, 0.0), Yb);
    vec3 kc = tapK(t, q + vec2(0.0,  h.y), Yc), kd = tapK(t, q - vec2(0.0,  h.y), Yd);
    vec3 ke = tapK(t, q + g, Ye), kf = tapK(t, q - g, Yf);
    vec3 kg = tapK(t, q + vec2(g.x, -g.y), Yg), kh = tapK(t, q + vec2(-g.x, g.y), Yh);
    vec3 k0 = vec3(k.x, keyWeak(l), k.z);
    vec3 ks = k0*0.2 + (ka + kb + kc + kd)*0.12 + (ke + kf + kg + kh)*0.08;
    float Ys = Y0*0.2 + (Ya + Yb + Yc + Yd)*0.12 + (Ye + Yf + Yg + Yh)*0.08;
    float detail = clamp(Y0/max(Ys, 1e-4), 0.55, 1.7);               // fine shading from brightness
    float near = sil;   // inside the car's silhouette, pale and lilac sky reflections on the paint count as paint
    float m = smoothstep(0.05, 0.85, max(ks.x, ks.y*near));
    float D = ks.z*detail;
    vec3 o = col.rgb*D + vec3(k.y)*col.a + col.rgb*k.y*(1.0-col.a)*0.6;
    float dz = max(near, halo);                                      // on the car and in a thin halo around it
    float s = max(0.0, min(l.r, l.b) - l.g)*dz;                      // despill: strip leftover magenta (nothing is repainted here)
    vec3 ld = l - vec3(s, 0.0, s);
    ld.b = mix(ld.b, min(ld.b, max(ld.r, ld.g)), dz);                // and the lilac (blue-leaning) part of it
    return mix(ld, o, m);
  }
  // silhouette of the car at p (0..1). Without a silhouette video, fall back to "next to confident paint" (8 taps).
  float haloAt(sampler2D s, float has, vec4 cell, vec2 px, vec2 p){
    if (has < 0.5) return 0.0;
    vec2 o = vec2(px.x*22.0/cell.z, px.y*22.0/cell.w);   // ~22 source px, in frame uv
    float h = max(max(texture2D(s, cq(cell, p + vec2(o.x, 0.0))).r, texture2D(s, cq(cell, p - vec2(o.x, 0.0))).r),
                  max(texture2D(s, cq(cell, p + vec2(0.0, o.y))).r, texture2D(s, cq(cell, p - vec2(0.0, o.y))).r));
    return smoothstep(0.2, 0.7, h);
  }
  float silAt(sampler2D s, float has, sampler2D t, vec4 cell, vec2 px, vec2 p){
    if (has > 0.5) return smoothstep(0.15, 0.6, texture2D(s, cq(cell, p)).r);
    vec2 q = cq(cell, p), r = px*10.0; float n = 0.0;
    n = max(n, key(lin(texture2D(t, q + vec2( r.x, 0.0)).rgb)).x); n = max(n, key(lin(texture2D(t, q - vec2( r.x, 0.0)).rgb)).x);
    n = max(n, key(lin(texture2D(t, q + vec2(0.0,  r.y)).rgb)).x); n = max(n, key(lin(texture2D(t, q - vec2(0.0,  r.y)).rgb)).x);
    n = max(n, key(lin(texture2D(t, q + r*0.7).rgb)).x); n = max(n, key(lin(texture2D(t, q - r*0.7).rgb)).x);
    return smoothstep(0.3, 0.75, max(n, key(lin(texture2D(t, q).rgb)).x));
  }
  float km(sampler2D t, vec4 cell, vec2 p){ vec3 k = key(lin(texture2D(t, cq(cell, p)).rgb)); return smoothstep(0.45, 0.75, k.x)*smoothstep(0.15, 0.28, k.z); }
  // soft body mask of the car before and after (paint key, widened so the ripple flows over whole panels)
  float carMask(vec2 p){
    vec2 r = vec2(0.016, 0.009);
    float a = km(tA, cellA, p) + km(tA, cellA, p + r) + km(tA, cellA, p - r) + km(tA, cellA, p + vec2(r.x, -r.y)) + km(tA, cellA, p + vec2(-r.x, r.y));
    float b = km(tB, cellB, p) + km(tB, cellB, p + r) + km(tB, cellB, p - r) + km(tB, cellB, p + vec2(r.x, -r.y)) + km(tB, cellB, p + vec2(-r.x, r.y));
    return smoothstep(0.4, 2.2, max(a, b));
  }
  // whole-vehicle silhouette (paint key spread wide, so grille, glass, bumpers and tyres are covered too)
  float carShape(vec2 p){
    float m = 0.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i)*0.5236;
      vec2 o = vec2(cos(a)*0.075, sin(a)*0.042);
      m += km(tB, cellB, p + o) + km(tB, cellB, p + o*0.5);
    }
    return smoothstep(1.0, 5.0, m);
  }
  void main(){
    vec3 c;
    if (band < 0.5) { c = shade(tB, cellB, pxB, colB, uv, silAt(sB, hasB, tB, cellB, pxB, uv), haloAt(sB, hasB, cellB, pxB, uv)); gl_FragColor = vec4(srgb(c), 1.0); return; }
    float d, region; vec2 dir;
    if (mode < 0.5) {                                   // ripple across the car: a diagonal light front skimming the paint
      float pos = (uv.x*SRC_ASPECT*0.8 + uv.y*0.6)/1.05;
      d = pos - mix(0.08, 0.98, prog);
      dir = normalize(vec2(SRC_ASPECT*0.8, 0.6));
      region = carMask(uv) * smoothstep(0.26, 0.34, uv.y) * (1.0 - smoothstep(0.9, 0.97, uv.y));   // only where the car can be: never the sky
    } else {                                            // a single ring from the car out across the scenery
      vec2 v = (uv - ctr)*vec2(SRC_ASPECT, 1.0);
      d = length(v) - mix(0.02, 0.86, prog);
      dir = normalize(uv - ctr + 1e-5); region = 1.0 - max(carShape(uv), hasB > 0.5 ? smoothstep(0.1, 0.5, texture2D(sB, cq(cellB, uv)).r) : 0.0);   // whole vehicle incl. grille and tyres
    }
    float near = exp(-d*d/0.0016);
    vec2 su = uv + dir*sin(d*110.0)*near*0.008*region;             // refraction: the surface bends as the ripple passes
    // 1 = still the old state. The hard reveal happens only where the transition belongs (car body for car changes,
    // scenery for road changes); everywhere else the two clips dissolve, so no seam line can show between generations.
    float soft = 1.0 - smoothstep(0.25, 0.75, prog);
    float hard = smoothstep(-0.008, 0.008, d);
    float zone = (mode < 0.5 && same > 0.5) ? max(region, carShape(uv)) : region;   // package changes: racks/trailers reveal behind the front; vehicle swaps: only the paint does
    float t = mix(soft, hard, zone);
    vec3 a0 = shade(tA, cellA, pxA, colA, su, silAt(sA, hasA, tA, cellA, pxA, su), haloAt(sA, hasA, cellA, pxA, su)), b0 = shade(tB, cellB, pxB, colB, su, silAt(sB, hasB, tB, cellB, pxB, su), haloAt(sB, hasB, cellB, pxB, su));
    c = mix(b0, a0, t);
    float core = exp(-pow(d/0.008, 2.0));                           // crisp white highlight line
    float edge = exp(-pow((d + 0.012)/0.008, 2.0));                 // thin-film colour just behind it
    float sheen = exp(-pow((d + 0.03)/0.06, 2.0));                  // broad soft reflection sliding over the surface
    float echo = mode < 0.5 ? 0.45*exp(-pow((d + 0.07)/0.007, 2.0)) + 0.2*exp(-pow((d + 0.13)/0.008, 2.0)) : 0.0;
    vec3 irid = 0.5 + 0.5*cos(6.2831*(d*22.0 + vec3(0.0, 0.33, 0.67)));
    vec3 film = mix(vec3(1.0), irid, 0.45);
    float lum = dot(c, vec3(0.3, 0.6, 0.1));
    vec3 glow = vec3(1.0)*core*1.05 + film*edge*0.3 + vec3(1.0)*echo*0.4;
    if (mode < 0.5) glow += vec3(0.9, 0.95, 1.0)*sheen*(0.04 + 0.22*lum);  // a light sheen that picks up the paint's own brightness
    else glow += vec3(0.85, 0.92, 1.0)*sheen*0.06;
    c += glow*region;
    gl_FragColor = vec4(srgb(c), 1.0);
  }`;
  const hex = (h, spec = 1) => { const n = parseInt(h.slice(1), 16); return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255].map((c) => Math.pow(c, 2.2)).concat([spec]); };
  // grid of cells packed in each vehicle's video (columns, rows); the full configurator uses 6x2, lighter versions fewer
  const cellOf = (i, g) => [ (i % g[0])/g[0], Math.floor(i / g[0])/g[1], 1/g[0], 1/g[1] ];

  class PaintPlayer {
    constructor(canvas, { aspect = 9/16, focusY = 0.45, grid = [6, 2] } = {}) {
      this.c = canvas; this.aspect = aspect; this.focusY = focusY; this.grid = grid;
      const gl = this.gl = canvas.getContext('webgl', { premultipliedAlpha: false });
      if (!gl) throw new Error('WebGL unavailable');
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {}; ['tA','tB','sA','sB','hasA','hasB','same','cellA','cellB','pxA','pxB','prog','band','mode','ctr','colA','colB','crop'].forEach((n) => this.u[n] = gl.getUniformLocation(pr, n));
      gl.uniform1i(this.u.tA, 0); gl.uniform1i(this.u.tB, 1); gl.uniform1i(this.u.sA, 2); gl.uniform1i(this.u.sB, 3);
      this.tex = new Map(); this.pool = new Map();
      this.A = null; this.B = null; this.t = 2; this.mode = 0; this.pending = null;
      this.raf = this.raf.bind(this); requestAnimationFrame(this.raf);
      new ResizeObserver(() => this.fit()).observe(canvas); this.fit();
    }
    fit() { const r = this.c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.c.width = Math.max(2, Math.round(r.width*dpr)); this.c.height = Math.max(2, Math.round(r.height*dpr)); this.view = r.width / Math.max(1, r.height); }
    crop() { const src = this.aspect, dst = this.view || src; let sx = 1, sy = 1;
      if (dst > src) sy = src/dst; else sx = dst/src;
      const ox = (1-sx)/2, oy = Math.min(Math.max(this.focusY - sy/2, 0), 1-sy); return [ox, 1-oy-sy, sx, sy]; }
    preload(url) {                     // a muted looping video kept in the pool
      let v = this.pool.get(url); if (v) return v;
      v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline',''); v.crossOrigin = 'anonymous';
      v.src = url; v.load(); this.pool.set(url, v);
      v.addEventListener('loadeddata', () => { if (!this.B || this.B.v !== v) v.play().then(() => { if (!this.B || this.B.v !== v) v.pause(); }).catch(() => {}); }, { once: true });
      return v;
    }
    texFor(v) { let t = this.tex.get(v); if (t) return t; const gl = this.gl; t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
      [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((p) => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0])); this.tex.set(v, t); return t; }
    /* Show cell `cell` of video `url` in colour `colHex`, with the sweep from whatever is on screen. */
    /* mode 'car' = ripple across the car body (paint, package, vehicle); 'road' = single ring across the scenery. */
    show(url, cell, colHex, { spec = 1, animate = true, mode = 'car', mask = null } = {}) {
      const v = this.preload(url), mv = mask ? this.preload(mask) : null;
      const next = { v, mv, cell: cellOf(cell, this.grid), col: hex(colHex, spec) }, t0 = performance.now();
      const go = () => {
        v.play().catch(() => {}); if (mv) mv.play().catch(() => {});
        (window.__gmVisibleMs = window.__gmVisibleMs || []).push(Math.round(performance.now() - t0));
        if (!this.B || !animate) { this.A = this.B = next; this.t = 2; return; }
        if (this.t < 1) this.A = this.B;        // a ripple was already running: start the new one from its target
        this.B = next; this.t = 0; this.mode = mode === 'road' ? 1 : 0; this.dur = mode === 'road' ? 1.1 : 1.0;
      };
      this.pending = go;
      if (v.readyState >= 3 || (this.B && this.B.v === v && v.readyState >= 2)) go();   // same video already on screen: never wait
      else v.addEventListener('canplay', () => { if (this.pending === go) go(); }, { once: true });
    }
    loaded(url) { const v = this.pool.get(url); return !!v && v.readyState >= 3; }
    play() { if (this.B) { this.B.v.play().catch(() => {}); if (this.B.mv) this.B.mv.play().catch(() => {}); } }
    pause() { for (const v of this.pool.values()) v.pause(); }
    halt() { this.halted = true; this.pause(); }                     // off screen: stop drawing and decoding
    resume() { if (!this.halted) return; this.halted = false; this.last = 0; this.play(); }
    raf(ts) {
      if (this.halted) { requestAnimationFrame(this.raf); return; }
      const gl = this.gl, dt = this.last ? Math.min((ts - this.last)/1000, 0.05) : 0.016; this.last = ts;
      if (typeof window.__gmHold === 'number' && this.t < 1) this.t = window.__gmHold;   // debug: freeze a transition for screenshots
      else if (this.t < 1) { this.t += dt/this.dur; if (this.t >= 1) { this.t = 2; if (this.A && this.A.v !== this.B.v) { this.A.v.pause(); if (this.A.mv) this.A.mv.pause(); } this.A = this.B; } }
      const p = Math.min(this.t, 1), eased = 0.5 - 0.5*Math.cos(Math.PI*p);   // ease in-out (sine): glides over the car
      if (this.B) {
        const up = new Set(), has = [0, 0];
        [[0, this.A], [1, this.B]].forEach(([unit, s]) => {
          gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, this.texFor(s.v));
          if (!up.has(s.v) && s.v.readyState >= 2) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, s.v); up.add(s.v); }
          // the silhouette video follows the colour video's clock (it is soft and widened, so a frame of drift never shows)
          if (s.mv) {
            if (s.mv.readyState >= 2 && Math.abs(s.mv.currentTime - s.v.currentTime) > 0.09 && !s.mv.seeking) s.mv.currentTime = s.v.currentTime;
            if (s.v.paused !== s.mv.paused) (s.v.paused ? s.mv.pause() : s.mv.play().catch(() => {}));
            gl.activeTexture(gl.TEXTURE2 + unit); gl.bindTexture(gl.TEXTURE_2D, this.texFor(s.mv));
            if (!up.has(s.mv) && s.mv.readyState >= 2) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, s.mv); up.add(s.mv); }
            has[unit] = s.mv.readyState >= 2 ? 1 : 0;
          }
        });
        gl.uniform1f(this.u.hasA, has[0]); gl.uniform1f(this.u.hasB, has[1]); gl.uniform1f(this.u.same, this.A.v === this.B.v ? 1 : 0);
        const px = (s) => [1/(s.v.videoWidth || 540*this.grid[0]), 1/(s.v.videoHeight || 960*this.grid[1])];
        gl.uniform4fv(this.u.cellA, this.A.cell); gl.uniform4fv(this.u.cellB, this.B.cell);
        gl.uniform2fv(this.u.pxA, px(this.A)); gl.uniform2fv(this.u.pxB, px(this.B));
        gl.uniform4fv(this.u.colA, this.A.col); gl.uniform4fv(this.u.colB, this.B.col);
        gl.uniform1f(this.u.prog, eased); gl.uniform1f(this.u.band, this.t < 1 ? 1 : 0); gl.uniform1f(this.u.mode, this.mode); gl.uniform2fv(this.u.ctr, [0.5, 0.56]);
        gl.uniform4fv(this.u.crop, this.crop());
        gl.viewport(0, 0, this.c.width, this.c.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      requestAnimationFrame(this.raf);
    }
  }
  window.PaintPlayer = PaintPlayer;
})();

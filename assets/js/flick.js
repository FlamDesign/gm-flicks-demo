/* Flick slot: mounts a Flick from its raw HTML tag inside a sandboxed frame and relays its events.
   Markup: <div class="flick" data-src=".../ad.js" data-exit="https://..." data-zone="x0,y0,x1,y1"></div>
   - data-exit: where the Flick's button takes the visitor (opens in a new tab)
   - data-zone: optional tap area (0..1 of the frame) treated as the button, for Flicks whose button has no click set
   Fires 'flick:ready', 'flick:variant' (detail.variant) and 'flick:exit' (detail.url) on the slot. */
(function () {
  function tag(src) {
    // The Flick's raw tag, unchanged, with the house setup so clicks leave through ExitApi.
    return '<!doctype html>\n<meta charset=utf-8>\n<meta name=ad.orientation content=portrait,landscape>\n'
      + '<script>var ExitApi=window.ExitApi||{exit:function(){}},clickTag="${CLICK_URL_UNESC}";<\/script>\n'
      + '<script>window.AD_CONFIG=window.AD_CONFIG||{};window.AD_CONFIG.dsp="house";window.AD_CONFIG.clickTracker={"mode":"exit","template":""};<\/script>\n'
      + '<script src=' + src + '><\/script>';
  }
  function bridge(zone) {
    return '<script>(function(){function P(m){m.flick=1;parent.postMessage(m,"*")}'
      + 'window.ExitApi={exit:function(n,u){P({t:"exit",url:u||""})}};'
      + 'document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(a&&/^https?:/.test(a.href)){e.preventDefault();e.stopPropagation();P({t:"exit",url:a.href})}},true);'
      + 'var Z=' + JSON.stringify(zone || null) + ';'
      + '(function w(n){var v=document.querySelector("vertex-player");if(!v){if(n<600)setTimeout(function(){w(n+1)},50);return}'
      + 'v.addEventListener("vertex-ready",function(){P({t:"ready"})});'
      + 'v.addEventListener("vertex-error",function(){P({t:"error"})});'
      + 'v.addEventListener("vertex-diff-change",function(e){var d=e.detail||{};P({t:"diff",diff:String(d.diff),initial:!!d.initial})});'
      + 'v.addEventListener("vertex-interaction",function(e){var d=e.detail||{};if(Z&&d.x>=Z[0]&&d.y>=Z[1]&&d.x<=Z[2]&&d.y<=Z[3])P({t:"exit",url:""})})})(0)})();<\/script>';
  }
  function mount(el) {
    if (el.__flick) return; el.__flick = true;
    const zone = el.dataset.zone ? el.dataset.zone.split(',').map(Number) : null;
    const f = document.createElement('iframe');
    f.title = el.dataset.title || 'Interactive video'; f.allow = 'autoplay; fullscreen'; f.setAttribute('scrolling', 'no');
    f.srcdoc = '<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}</style>' + bridge(zone) + tag(el.dataset.src);
    el.appendChild(f);
    let ready = false, last = 0;
    const fail = setTimeout(() => { if (!ready) el.classList.add('is-failed'); }, 15000);
    const ok = () => { if (ready) return; ready = true; clearTimeout(fail); el.classList.remove('is-failed'); el.classList.add('is-ready'); el.dispatchEvent(new CustomEvent('flick:ready', { bubbles: true })); };
    addEventListener('message', (e) => {
      const d = e.data; if (!d || d.flick !== 1 || e.source !== f.contentWindow) return;
      if (d.t === 'ready') ok();
      else if (d.t === 'error') el.classList.add('is-failed');
      else if (d.t === 'diff') { ok(); el.dataset.variant = d.diff; el.dispatchEvent(new CustomEvent('flick:variant', { bubbles: true, detail: { variant: +d.diff, initial: d.initial } })); }
      else if (d.t === 'exit') {
        const now = Date.now(); if (now - last < 1000) return; last = now;
        const url = el.dataset.exit || d.url;
        el.dispatchEvent(new CustomEvent('flick:exit', { bubbles: true, detail: { url } }));
        if (url) window.open(url, '_blank', 'noopener');
      }
    });
  }
  window.Flick = { mount };
  document.querySelectorAll('.flick[data-src]').forEach(mount);
})();

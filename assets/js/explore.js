/* "Explore Flicks": floating control that lists every Flick in this demo and jumps to it. */
(function () {
  const root = document.body.dataset.root || './';
  const ITEMS = [
    { site: 'chevrolet.com', name: 'Silverado 1500', kind: 'Hero Flick · vehicle page', page: 'chevrolet/silverado-1500/', target: 'flick' },
    { site: 'chevrolet.com', name: 'Corvette ZR1', kind: 'Hero Flick · lineup page', page: 'chevrolet/corvette/', target: 'flick' },
    { site: 'chevrolet.com', name: 'Corvette Grand Sport', kind: 'Configurator · paint, package, road', page: 'chevrolet/corvette/', target: 'configurator' },
    { site: 'gmc.com', name: 'Sierra 1500', kind: 'Hero Flick · vehicle page', page: 'gmc/sierra-1500/', target: 'flick' },
    { site: 'gmc.com', name: 'Sierra 1500', kind: 'Configurator · paint, package, road', page: 'gmc/sierra-1500/', target: 'configurator' },
    { site: 'gmc.com', name: 'HUMMER EV SUV', kind: 'Configurator · hero of the vehicle page', page: 'gmc/hummer-ev-suv/', target: 'configurator' },
  ];
  const here = (document.body.dataset.page || '');
  const btn = document.createElement('button');
  btn.className = 'xf-pill'; btn.type = 'button'; btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg><span>Explore Flicks</span>';
  const panel = document.createElement('div');
  panel.className = 'xf-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Explore Flicks');
  let html = '<div class="xf-head"><b>Explore Flicks</b><button type="button" class="xf-x" aria-label="Close">×</button></div>', site = '';
  ITEMS.forEach((it, i) => {
    if (it.site !== site) { site = it.site; html += `<div class="xf-site">${site}</div>`; }
    const on = it.page === here;
    html += `<a class="xf-item${on ? ' is-here' : ''}" data-i="${i}" href="${root + it.page}#${it.target}"><span class="xf-ic xf-${it.target}"></span><span><b>${it.name}</b><small>${it.kind}</small></span></a>`;
  });
  panel.innerHTML = html;
  document.body.append(panel, btn);

  const open = (v) => { panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); };
  btn.onclick = () => open(panel.hidden);
  panel.querySelector('.xf-x').onclick = () => open(false);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') open(false); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false); });

  function focusTarget(id, smooth) {
    const el = document.getElementById(id); if (!el) return;
    const navH = (document.querySelector('[data-sticky]') || { offsetHeight: 0 }).offsetHeight;
    const r = el.getBoundingClientRect(), y = scrollY + r.top - Math.max(navH + 16, (innerHeight - r.height) / 2);
    scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
    const hl = el.querySelector('.flick, .cfg-stage') || el;
    hl.classList.remove('xf-pulse'); void hl.offsetWidth; hl.classList.add('xf-pulse');
    setTimeout(() => hl.classList.remove('xf-pulse'), 2200);
  }
  panel.querySelectorAll('.xf-item').forEach((a) => a.addEventListener('click', (e) => {
    const it = ITEMS[+a.dataset.i];
    if (it.page === here) { e.preventDefault(); open(false); history.replaceState(null, '', '#' + it.target); focusTarget(it.target, true); }
  }));
  if (location.hash.length > 1) addEventListener('load', () => setTimeout(() => focusTarget(location.hash.slice(1), false), 150));

  // keep the control off the Flick's own buttons
  function clear() {
    const b = btn.getBoundingClientRect();
    const hit = [...document.querySelectorAll('.flick')].some((f) => { const r = f.getBoundingClientRect(); return r.right > b.left && r.left < b.right && r.bottom > b.top - 24 && r.top < b.bottom; });
    btn.classList.toggle('is-tucked', hit);
    if (hit) open(false);
  }
  addEventListener('scroll', clear, { passive: true }); addEventListener('resize', clear); clear();
})();

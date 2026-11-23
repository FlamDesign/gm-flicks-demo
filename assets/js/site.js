/* Page behaviours shared by the brand pages: tabs, horizontal carousels, FAQ accordions. */
(function () {
  document.querySelectorAll('img').forEach((im) => im.addEventListener('error', () => im.classList.add('lazy-fail'), { once: true }));
  document.querySelectorAll('[data-tabs]').forEach((box) => {
    const tabs = box.querySelectorAll('[data-tab]'), panels = box.querySelectorAll('[data-panel]');
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => { const on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); });
      panels.forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
    }));
  });
  document.querySelectorAll('[data-carousel]').forEach((c) => {
    const track = c.querySelector('.track'), prev = c.querySelector('[data-prev]'), next = c.querySelector('[data-next]');
    const step = () => (track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 16 : 320);
    const sync = () => { if (prev) prev.disabled = track.scrollLeft < 8; if (next) next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8; };
    if (prev) prev.onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' });
    if (next) next.onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' });
    track.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); sync();
  });
  document.querySelectorAll('.faq-q').forEach((q) => q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true'; q.setAttribute('aria-expanded', String(!open));
    q.nextElementSibling.hidden = open;
  }));
})();

/* =========================================================
   V9 视觉强层 —— kinetic9.js
   依赖：gsap（必需）
   1) 卡片 3D 掀入 + 显影后扫描线
   2) 鼠标跟随巨字残影（跟随卡片类目切换文字）
   3) 跨页幕布（六条横带收/放）
   4) 详情页快门白闪
   ========================================================= */
(function () {
  var w = window, d = document;
  if (!w.gsap || !d.body) return;
  var gsap = w.gsap;
  var body = d.body;
  var page = body.getAttribute('data-page') || '';
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia && w.matchMedia('(hover:hover) and (pointer:fine)').matches;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function cats() { return w.WJR_CATS || {}; }

  /* ---------------- 1. 卡片 3D 掀入 + 扫描线 ---------------- */
  var CARD_SEL = '.work-card, .selected-card, .related-card';
  var io = null;

  function scanOf(card) {
    var media = $('.work-media', card) || $('.selected-visual', card) || $('.thumb', card);
    if (!media) return;
    var box = media.querySelector('.k9-scan');
    if (!box) {
      box = d.createElement('span');
      box.className = 'k9-scan';
      media.appendChild(box);
    }
    box.classList.remove('run');
    void box.offsetWidth;
    box.classList.add('run');
    w.setTimeout(function () { box.classList.remove('run'); }, 1400);
  }

  function liftCard(card) {
    if (card.getAttribute('data-k9') === 'done') return;
    card.setAttribute('data-k9', 'done');
    card.classList.add('k9-lift');
    var delay = (parseInt(card.getAttribute('data-k9-i') || '0', 10) % 3) * 0.07;
    gsap.from(card, {
      y: 46, rotateX: 9, scale: .975, opacity: 0,
      duration: 1.02, delay: delay, ease: 'expo.out',
      transformPerspective: 1100, transformOrigin: '50% 90%',
      clearProps: 'transform,opacity',
      onComplete: function () { scanOf(card); }
    });
  }

  function dressCards() {
    var cards = $$(CARD_SEL);
    cards.forEach(function (c, i) { if (!c.hasAttribute('data-k9-i')) c.setAttribute('data-k9-i', String(i)); });
    if (reduce || !('IntersectionObserver' in w)) {
      cards.forEach(function (c) { c.setAttribute('data-k9', 'done'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          liftCard(en.target);
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: .12 });
    }
    cards.forEach(function (c) {
      if (c.getAttribute('data-k9') === 'done') return;
      io.observe(c);
    });
    // 兜底：3.5 秒后仍未显影的直接放出来，避免空白
    w.setTimeout(function () {
      $$(CARD_SEL).forEach(function (c) {
        if (c.getAttribute('data-k9') === 'done') return;
        var r = c.getBoundingClientRect();
        if (r.top < w.innerHeight + 120 && r.bottom > -120) liftCard(c);
      });
    }, 3500);
  }

  function watchCards() {
    var g = $('#gallery') || $('#relatedGrid') || $('#aboutStrip');
    if (!g || !w.MutationObserver) return;
    var t = 0;
    var mo = new MutationObserver(function () {
      if (t) return;
      t = w.setTimeout(function () { t = 0; dressCards(); }, 80);
    });
    mo.observe(g, { childList: true });
  }

  /* ---------------- 2. 鼠标跟随巨字 ---------------- */
  function initGhost() {
    if (!fine || reduce) return;
    var word = { cover: 'WJR', home: 'WJR', works: 'WORKS', about: 'ABOUT', detail: 'DETAIL' }[page] || 'WJR';
    var el = d.createElement('div');
    el.className = 'k9-ghost';
    el.setAttribute('aria-hidden', 'true');
    el.textContent = word;
    body.appendChild(el);

    gsap.set(el, { xPercent: -50, yPercent: -50 });
    var tx = -999, ty = -999, x = -999, y = -999, on = false, raf = 0, last = 0;

    function loop() {
      raf = 0;
      x += (tx - x) * .16;
      y += (ty - y) * .16;
      var dx = tx - x, dy = ty - y;
      var sp = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 90);
      gsap.set(el, { x: x, y: y, scale: 1 + sp * .14, skewX: Math.max(-9, Math.min(9, dx * .22)) });
      if (Math.abs(dx) + Math.abs(dy) > .4) raf = w.requestAnimationFrame(loop);
    }
    function wake() { if (!raf) raf = w.requestAnimationFrame(loop); }

    d.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; x = tx; y = ty; el.classList.add('is-on'); }
      wake();
    }, { passive: true });

    d.addEventListener('pointerleave', function () {
      el.classList.remove('is-on');
    });

    // 悬停卡片时，巨字换成该类目
    d.addEventListener('pointerover', function (e) {
      var card = e.target.closest ? e.target.closest('.work-card, .related-card, .selected-card') : null;
      if (!card) return;
      var key = card.getAttribute('data-cat') || '';
      var label = cats()[key] || (card.querySelector('.work-title') || {}).textContent || '';
      label = String(label).split('/')[0].split(' ')[0];
      if (!label) return;
      el.textContent = label;
      gsap.fromTo(el, { scale: 1.09, opacity: .06 }, { scale: 1, opacity: .2, duration: .5, ease: 'power3.out' });
    });
    d.addEventListener('pointerout', function (e) {
      var card = e.target.closest ? e.target.closest('.work-card, .related-card, .selected-card') : null;
      if (!card) return;
      var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('.work-card, .related-card, .selected-card') : null;
      if (to) return;
      el.textContent = word;
    });
  }

  /* ---------------- 3. 跨页幕布 ---------------- */
  var BANDS = 6;
  var navLock = false;

  function curtainBox() {
    var box = $('.k9-curtain');
    if (box) return box;
    box = d.createElement('div');
    box.className = 'k9-curtain';
    box.setAttribute('aria-hidden', 'true');
    var html = '';
    for (var i = 0; i < BANDS; i++) html += '<i style="animation-delay:' + (i * 32) + 'ms"></i>';
    box.innerHTML = html;
    body.appendChild(box);
    return box;
  }

  /* 跟随既有 .page-wipe 的转场：幕布盖下时六条横带依次落，进入新页面时依次抽走 */
  function initCurtain() {
    if (reduce) return;
    var wipe = $('.page-wipe');
    if (!wipe) return;
    var box = curtainBox();
    var closeTimer = 0, openTimer = 0;

    function play(closed) {
      w.clearTimeout(closeTimer);
      w.clearTimeout(openTimer);
      if (closed) {
        box.classList.remove('is-open');
        void box.offsetWidth;
        box.classList.add('is-close');
      } else {
        box.classList.remove('is-close');
        void box.offsetWidth;
        box.classList.add('is-open');
        openTimer = w.setTimeout(function () {
          box.classList.remove('is-open');
          $$('i', box).forEach(function (b) { b.style.transform = 'scaleY(0)'; });
        }, BANDS * 32 + 620);
      }
    }

    if (wipe.classList.contains('is-closing')) play(true);

    if (w.MutationObserver) {
      new MutationObserver(function () {
        play(wipe.classList.contains('is-closing'));
      }).observe(wipe, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------------- 4. 详情页快门白闪 ---------------- */
  function initFlash() {
    if (reduce) return;
    var detail = page === 'detail' || !!$('.detail-stage');
    if (!detail) return;
    var fl = d.createElement('div');
    fl.className = 'k9-flash k9-shutter';
    body.appendChild(fl);
    gsap.fromTo(fl, { opacity: 0 }, {
      opacity: .55, duration: .06, delay: .18, ease: 'none',
      onComplete: function () {
        gsap.to(fl, { opacity: 0, duration: .62, ease: 'power2.in' });
      }
    });
    // 切换上/下一件时再闪一次（点击当帧，导航前可感知）
    ['#prevWork', '#nextWork'].forEach(function (id) {
      var a = $(id);
      if (!a) return;
      a.addEventListener('pointerdown', function () {
        gsap.fromTo(fl, { opacity: .7 }, { opacity: 0, duration: .5, ease: 'power2.in' });
      });
    });
  }

  function init() {
    dressCards();
    watchCards();
    initGhost();
    initCurtain();
    initFlash();
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();




/* =========================================================
   V8 全站动效层 —— kinetic8.js
   依赖：gsap（必需）、ScrollTrigger（可选）
   原则：只加自己的 k8-* 类，不动既有 class / 结构语义
   ========================================================= */
(function () {
  var w = window, d = document;
  if (!w.gsap || !d.body) return;
  var gsap = w.gsap;
  var ST = w.ScrollTrigger || null;
  var body = d.body;
  var page = body.getAttribute('data-page') || '';
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia && w.matchMedia('(pointer: fine)').matches;

  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function qwork(file) {
    var list = w.WJR_WORKS || [];
    for (var i = 0; i < list.length; i++) if (list[i].file === file) return list[i];
    return null;
  }

  /* ---------------- 1. 字符拆分 ---------------- */
  function splitChars(el) {
    if (!el) return [];
    if (el.getAttribute('data-k8-split') === 'done') return $$('.k8-char', el);
    if (el.closest && el.closest('[data-lines], .kinetic')) return [];
    var out = [];
    var nodes = Array.prototype.slice.call(el.childNodes);
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      if (node.nodeType !== 3) continue;
      var txt = node.nodeValue;
      if (!txt || !txt.replace(/\s/g, '')) continue;
      var frag = d.createDocumentFragment();
      for (var i = 0; i < txt.length; i++) {
        var ch = txt.charAt(i);
        if (/\s/.test(ch)) { frag.appendChild(d.createTextNode(ch)); continue; }
        var sp = d.createElement('span');
        sp.className = 'k8-char';
        sp.textContent = ch;
        frag.appendChild(sp);
        out.push(sp);
      }
      node.parentNode.replaceChild(frag, node);
    }
    el.setAttribute('data-k8-split', 'done');
    return out;
  }

  /* ---------------- 2. 全站进度线 ---------------- */
  function initProgress() {
    if (page === 'cover' || $('#scrollProgress')) return;
    var bar = d.createElement('div');
    bar.className = 'k8-progress';
    body.appendChild(bar);
    var raf = 0;
    function tick() {
      raf = 0;
      var h = d.documentElement.scrollHeight - w.innerHeight;
      var p = h > 2 ? Math.min(1, Math.max(0, w.scrollY / h)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    function onScroll() { if (!raf) raf = w.requestAnimationFrame(tick); }
    w.addEventListener('scroll', onScroll, { passive: true });
    w.addEventListener('resize', onScroll);
    tick();
  }

  /* ---------------- 3. 页头 / 页脚：字符入场 + 悬停上浮 ---------------- */
  var SPLIT_HEAD = '.head-nav a, .wordmark span, .text-button, .footer-links a, .footer-links button, .page-label, .eyebrow, .hero-scroll, .marquee-hint span';
  var SPLIT_ANY = '.count-facts div, .cover-facts div, .about-stat span, .selected-copy h3 a';

  function initChars() {
    var heads = $$(SPLIT_HEAD);
    var any = $$(SPLIT_ANY);
    var headChars = [];
    heads.forEach(function (el) { headChars = headChars.concat(splitChars(el)); });
    any.forEach(function (el) { splitChars(el); });

    if (reduce) return;

    // 入场：页头先落，页脚随后
    var header = $('.site-head'), foot = $('.footer-links');
    var hc = header ? $$('.k8-char', header) : [];
    var fc = foot ? $$('.k8-char', foot) : [];
    if (hc.length) {
      gsap.from(hc, { y: 16, opacity: 0, duration: .78, ease: 'expo.out', stagger: .02, delay: .08 });
    }
    if (fc.length) {
      gsap.from(fc, { y: 12, opacity: 0, duration: .7, ease: 'expo.out', stagger: .02,
        scrollTrigger: ST ? { trigger: '.footer', start: 'top 92%', once: true } : undefined });
    }

    if (!fine) return;
    // 悬停：整串字符依次上浮
    var groups = $$('.head-nav a, .footer-links a, .footer-links button, .text-button, .selected-copy h3 a');
    groups.forEach(function (el) {
      var chars = $$('.k8-char', el);
      if (!chars.length) return;
      el.addEventListener('pointerenter', function () {
        gsap.to(chars, { y: -3.5, duration: .34, ease: 'power3.out', stagger: .02, overwrite: 'auto' });
      });
      el.addEventListener('pointerleave', function () {
        gsap.to(chars, { y: 0, duration: .48, ease: 'power3.out', stagger: .014, overwrite: 'auto' });
      });
    });
  }

  /* ---------------- 4. 区块显影扫线 ---------------- */
    var SWEEP_HOSTS = '.hero-copy, .hero-foot, .page-head, .about-hero-copy, .about-hero-scene, .about-block, .work-caption, .detail-info, .related-grid, .works-band, .selected-rail, .marquee-head, .footer-top, .about-strip';

  function initSweeps() {
    if (reduce) return;
    $$(SWEEP_HOSTS).forEach(function (host) {
      if (host.querySelector('.k8-sweep')) return;
      host.classList.add('k8-host');
      var box = d.createElement('span');
      box.className = 'k8-sweep';
      box.innerHTML = '<i></i>';
      host.appendChild(box);
    });
    var hosts = $$('.k8-host');
    if (!hosts.length) return;
    if (!('IntersectionObserver' in w)) {
      hosts.forEach(function (h) { h.classList.add('k8-swept'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('k8-swept');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    hosts.forEach(function (h) { io.observe(h); });
  }

  /* ---------------- 5. 卡片：四角 / 漂移 / 标题字符 ---------------- */
  function dressCard(card, selectorMedia, selectorTitle) {
    var media = $(selectorMedia, card);
    if (media && !media.querySelector('.k8-corners')) {
      var box = d.createElement('span');
      box.className = 'k8-corners';
      box.innerHTML = '<i></i><i></i><i></i><i></i>';
      media.appendChild(box);
    }
    var title = selectorTitle ? $(selectorTitle, card) : null;
    if (!title) return;
    var chars = splitChars(title);
    if (!chars.length || !fine || reduce) return;
    if (title.getAttribute('data-k8-hover') === 'done') return;
    title.setAttribute('data-k8-hover', 'done');
    card.addEventListener('pointerenter', function () {
      gsap.to(chars, { y: -2.5, duration: .34, ease: 'power3.out', stagger: .016, overwrite: 'auto' });
    });
    card.addEventListener('pointerleave', function () {
      gsap.to(chars, { y: 0, duration: .46, ease: 'power3.out', stagger: .012, overwrite: 'auto' });
    });
  }

  function initCards() {
    $$('.work-card').forEach(function (c) { dressCard(c, '.work-media', '.work-title'); });
    $$('.selected-card').forEach(function (c) { dressCard(c, '.selected-visual', '.selected-copy h3'); });
  }

  function watchGallery() {
    var g = $('#gallery') || $('#relatedGrid') || $('#aboutStrip');
    if (!g || !w.MutationObserver) return;
    var t = 0;
    var mo = new MutationObserver(function () {
      if (t) return;
      t = w.setTimeout(function () { t = 0; initCards(); }, 60);
    });
    mo.observe(g, { childList: true });
  }

  /* ---------------- 6. 详情页：大图揭幕 / 标题逐字 / 上下件预览 ---------------- */
  function initStage() {
    var stage = $('.detail-stage'), link = $('.stage-link');
    if (!stage || !link) return;
    if (!reduce) {
      link.classList.remove('k8-open');
      // 触发重排后再上动画，保证每次进入都真的重播
      void link.offsetWidth;
      link.classList.add('k8-open');
    }
    // 标题切换：监听文本变化后重新逐字落位
    var title = $('#workTitle');
    if (!title || !w.MutationObserver || reduce) return;
    var mo = new MutationObserver(function () {
      var chips = $$('.k8-char', title);
      if (!chips.length) chips = splitChars(title);
      if (!chips.length) return;
      gsap.fromTo(chips, { y: 22, opacity: 0 }, {
        y: 0, opacity: 1, duration: .72, ease: 'expo.out', stagger: .018, overwrite: 'auto'
      });
    });
    mo.observe(title, { childList: true, characterData: true, subtree: true });
  }

  function initPeek() {
    if (!fine || reduce) return;
    var nav = $('.detail-nav');
    if (!nav) return;
    if (body.querySelector('.k8-peek')) return;
    var box = d.createElement('div');
    box.className = 'k8-peek';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<span class="k8-peek-img"></span><span class="k8-peek-tag"></span>';
    body.appendChild(box);
    var img = $('.k8-peek-img', box), tag = $('.k8-peek-tag', box);
    var timer = 0;

    function bind(a, label) {
      if (!a) return;
      a.addEventListener('pointerenter', function () {
        var href = a.getAttribute('href') || '';
        var file = '';
        try { file = new URL(href, w.location.href).searchParams.get('work') || ''; } catch (e) { file = ''; }
        var item = file ? qwork(file) : null;
        if (!item) { box.classList.remove('is-on'); return; }
        img.style.backgroundImage = 'url("' + item.src + '")';
        tag.textContent = label + ' · ' + (item.title || '');
        w.clearTimeout(timer);
        timer = w.setTimeout(function () { box.classList.add('is-on'); }, 60);
      });
      a.addEventListener('pointerleave', function () {
        w.clearTimeout(timer);
        box.classList.remove('is-on');
      });
    }
    bind($('#prevWork'), 'PREVIOUS');
    bind($('#nextWork'), 'NEXT');
  }

  /* ---------------- 7. 关于页：数字滚动 / 场景视差 ---------------- */
  function initAbout() {
    if (page !== 'about') return;
    if (!reduce) {
      $$('.about-stat strong').forEach(function (el) {
        var raw = (el.textContent || '').trim();
        if (!/^\d{1,3}$/.test(raw)) return;
        var target = parseInt(raw, 10);
        var pad2 = raw.length > 1;
        var obj = { v: 0 };
        el.textContent = pad2 ? '00' : '0';
        el.classList.add('k8-rolling');
        var play = function () {
          gsap.to(obj, {
            v: target, duration: 1.35, ease: 'power2.out',
            onUpdate: function () {
              var n = Math.round(obj.v);
              el.textContent = pad2 && n < 10 ? '0' + n : String(n);
            },
            onComplete: function () { el.textContent = raw; el.classList.remove('k8-rolling'); }
          });
        };
        if (ST) {
          gsap.to(el, { scrollTrigger: { trigger: el, start: 'top 88%', once: true, onEnter: play } });
        } else { play(); }
      });
    }
    if (ST && !reduce) {
      var scene = $('.about-hero-scene img');
      if (scene) {
        gsap.to(scene, {
          yPercent: -9, ease: 'none',
          scrollTrigger: { trigger: '.about-hero-scene', start: 'top bottom', end: 'bottom top', scrub: 0.8 }
        });
      }
    }
  }

  /* ---------------- 8. 封面：字母 3D 跟随指针 ---------------- */
  function initCover8() {
    if (page !== 'cover' || !fine || reduce) return;
    var cover = $('#cover');
    var letters = $$('.cover-title span');
    if (!cover || !letters.length) return;
    var raf = 0, tx = 0, ty = 0;
    function apply() {
      raf = 0;
      gsap.to(letters, {
        rotateX: ty * 9, rotateY: tx * 14,
        x: tx * 6, y: ty * 4,
        duration: .9, ease: 'power3.out', overwrite: 'auto',
        transformPerspective: 900, transformOrigin: '50% 60%'
      });
    }
    cover.addEventListener('pointermove', function (e) {
      tx = (e.clientX / w.innerWidth - .5) * 2;
      ty = (e.clientY / w.innerHeight - .5) * 2;
      if (!raf) raf = w.requestAnimationFrame(apply);
    }, { passive: true });
    cover.addEventListener('pointerleave', function () {
      tx = 0; ty = 0;
      gsap.to(letters, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 1.1, ease: 'power3.out' });
    });
  }

  /* ---------------- 9. 点击涟漪 ---------------- */
  function initBlip() {
    if (reduce) return;
    d.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (!t.closest('a, button')) return;
      var b = d.createElement('span');
      b.className = 'k8-blip';
      b.style.left = e.clientX + 'px';
      b.style.top = e.clientY + 'px';
      body.appendChild(b);
      w.setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 760);
    }, { passive: true });
  }

  /* ---------------- 10. 页脚大字：字符抬起响应 ---------------- */
  function initFooterBrand() {
    var brand = $('.footer-brand');
    if (!brand || !fine || reduce) return;
    var chars = splitChars(brand);
    if (!chars.length) return;
    brand.addEventListener('pointerenter', function () {
      gsap.to(chars, { y: -8, duration: .5, ease: 'power3.out', stagger: .03, overwrite: 'auto' });
    });
    brand.addEventListener('pointerleave', function () {
      gsap.to(chars, { y: 0, duration: .6, ease: 'power3.out', stagger: .02, overwrite: 'auto' });
    });
  }

  function init() {
    initProgress();
    initChars();
    initSweeps();
    initCards();
    watchGallery();
    initStage();
    initPeek();
    initAbout();
    initCover8();
    initFooterBrand();
    initBlip();
    if (ST) w.setTimeout(function () { ST.refresh(); }, 700);
  }

  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

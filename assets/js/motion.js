/* =========================================================
   WJR Portfolio — motion & interaction system
   GSAP + ScrollTrigger + Lenis. All effects degrade to
   the existing static / reduced-motion experience.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var page = body.getAttribute('data-page') || '';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var gsap = window.gsap;
  var hasST = !!window.ScrollTrigger;

  if (!gsap) {
    root.classList.add('no-motion');
    return;
  }
  if (hasST) gsap.registerPlugin(window.ScrollTrigger);
  root.classList.add('has-motion');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var pad = function (n) { return n < 10 ? '0' + n : String(n); };
  var hasSTReady = hasST && !reduce;

  /* -------------------------------------------------------
     Smooth inertial scroll (desktop fine pointers only)
     ------------------------------------------------------- */
  var lenis = null;
  if (!reduce && fine && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.45,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    window.__lenis = lenis;
    if (hasSTReady) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.ScrollTrigger.config({ ignoreMobileResize: true });
    }
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* -------------------------------------------------------
     Custom cursor + contextual label
     ------------------------------------------------------- */
  var cursor = null;
  function initCursor() {
    if (!fine || reduce) return;
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<span class="cursor-label"></span>';
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.body.classList.add('has-cursor');
    cursor = { ring: ring, dot: dot, label: $('.cursor-label', ring), x: -100, y: -100, tx: -100, ty: -100 };

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    var ringX = gsap.quickTo(ring, 'x', { duration: 0.34, ease: 'power3.out' });
    var ringY = gsap.quickTo(ring, 'y', { duration: 0.34, ease: 'power3.out' });
    var dotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power2.out' });
    var dotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power2.out' });

    window.addEventListener('pointermove', function (e) {
      cursor.tx = e.clientX;
      cursor.ty = e.clientY;
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
      // Future movement after first paint.
      if (ring.style.opacity !== '1') {
        ring.style.opacity = '1';
        dot.style.opacity = '1';
      }
    }, { passive: true });

    ring.style.opacity = '0';
    dot.style.opacity = '0';

    function setState(el) {
      if (!cursor) return;
      var labelled = el && el.getAttribute && el.getAttribute('data-cursor');
      var isField = el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]');
      var isInteractive = el && el.closest && el.closest('a, button, [role="button"], .work-open, .filter, .rail-arrow');
      if (isField) {
        cursor.ring.classList.remove('is-hot', 'is-label');
        cursor.ring.classList.add('is-field');
        cursor.label.textContent = '';
        return;
      }
      cursor.ring.classList.remove('is-field');
      if (labelled) {
        var text = el.getAttribute('data-cursor-label') || labelled.toUpperCase();
        cursor.label.textContent = text;
        cursor.ring.classList.add('is-label');
        cursor.ring.classList.remove('is-hot');
      } else if (isInteractive) {
        cursor.label.textContent = '';
        cursor.ring.classList.remove('is-label');
        cursor.ring.classList.add('is-hot');
      } else {
        cursor.label.textContent = '';
        cursor.ring.classList.remove('is-label', 'is-hot');
      }
    }

    document.addEventListener('pointerover', function (e) {
      setState(e.target);
    }, { passive: true });
    document.addEventListener('pointerout', function (e) {
      if (!e.relatedTarget) setState(null);
    }, { passive: true });
    document.addEventListener('pointerdown', function () { cursor.ring.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.ring.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () {
      ring.style.opacity = '0';
      dot.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      ring.style.opacity = '1';
      dot.style.opacity = '1';
    });
  }

  /* -------------------------------------------------------
     Magnetic elements
     ------------------------------------------------------- */
  function initMagnets() {
    if (!fine || reduce) return;
    $$('.enter-button, .primary-link, .rail-arrow, [data-magnetic]').forEach(function (el) {
      if (el.dataset.magnetReady) return;
      el.dataset.magnetReady = '1';
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        xTo(clamp(dx, -1, 1) * 9);
        yTo(clamp(dy, -1, 1) * 6);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  /* -------------------------------------------------------
     Character-level kinetic type
     ------------------------------------------------------- */
  function splitChars(el) {
    if (!el || el.dataset.kineticReady) return $$('.k-char', el);
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    }
    var nodes = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      var n = walker.currentNode;
      // 标题开窗的那一小段不能被拆成字符，否则字形内的图片会失去裁剪依据
      if (n.parentNode && n.parentNode.closest && n.parentNode.closest('.win')) continue;
      if (n.nodeValue.trim()) nodes.push(n);
    }
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch === ' ' || ch === '\n' || ch === '\t') {
          frag.appendChild(document.createTextNode(' '));
          continue;
        }
        var outer = document.createElement('span');
        outer.className = 'k-char';
        outer.setAttribute('aria-hidden', 'true');
        var inner = document.createElement('span');
        inner.className = 'k-char-inner';
        inner.textContent = ch;
        outer.appendChild(inner);
        frag.appendChild(outer);
      }
      node.parentNode.replaceChild(frag, node);
    });
    el.dataset.kineticReady = '1';
    el.classList.add('kinetic');
    if ($('.line-mask', el)) el.classList.add('kinetic-line');
    el.classList.add('is-in');
    return $$('.k-char', el);
  }

  function animateChars(el, opts) {
    opts = opts || {};
    var chars = splitChars(el);
    if (!chars.length) return;
    var duration = opts.duration || 1.02;
    var each = opts.each || 0.027;
    var delay = opts.delay || 0;
    var ease = opts.ease || 'expo.out';
    gsap.set(chars, {
      yPercent: opts.fromY || 116,
      rotate: function () { return gsap.utils.random(-9, 9); },
      opacity: 0,
      transformOrigin: '50% 100%'
    });
    gsap.to(chars, {
      yPercent: 0,
      rotate: 0,
      opacity: 1,
      duration: duration,
      ease: ease,
      stagger: { each: each, from: 'start' },
      delay: delay,
      overwrite: true
    });
  }

  function whenVisible(el, fn) {
    if (!el) return;
    if (reduce) { fn(); return; }
    if (hasSTReady && window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: fn
      });
      return;
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.disconnect();
          fn();
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      io.observe(el);
      return;
    }
    fn();
  }

  function initKinetic() {
    if (reduce) return;
    if (page === 'cover') return;

    var heroTitle = null;
    if (page === 'home') {
      heroTitle = $('.hero h1');
      animateChars(heroTitle, { delay: 0.38, each: 0.032, duration: 1.15, ease: 'expo.out' });
    }
    if (page === 'works') {
      animateChars($('.page-head h1'), { delay: 0.34, each: 0.04, duration: 1.2 });
    }
    if (page === 'about') {
      animateChars($('.page-about h1'), { delay: 0.36, each: 0.03, duration: 1.18 });
    }
    if (page === 'detail') {
      var h = $('#workTitle');
      if (h && !reduce) {
        // 详情标题不做逐字拆分：会拆掉拉丁词，切换作品时也会反复重建
        h.classList.add('is-in');
        h.style.transition = 'none';
        gsap.fromTo(h, { y: 26, opacity: 0 }, {
          y: 0, opacity: 1, duration: 1.05, ease: 'expo.out', delay: .22,
          onComplete: function () { h.style.transition = ''; }
        });
      }
    }

    $$('.selected .section-head h2, .about-quote').forEach(function (el) {
      whenVisible(el, function () { animateChars(el, { each: 0.03, duration: 1.08 }); });
    });
    $$('.related-head h2').forEach(function (el) {
      whenVisible(el, function () {
        el.classList.add('is-in');
        el.style.opacity = '1';
        animateChars(el, { each: 0.03, duration: 1 });
      });
    });
  }

  /* -------------------------------------------------------
     Cover cinematic sequence
     ------------------------------------------------------- */
  function initCover() {
    var cover = $('#cover');
    if (!cover) return;
    var title = $$('.cover-title span');
    var count = $('#coverCount');
    var leaving = false;

    gsap.set('.cover-bg', { opacity: 0, scale: 1.14 });
    gsap.set(title, { yPercent: 122, rotate: function () { return gsap.utils.random(-12, 12); }, opacity: 0 });
    gsap.set('.cover-meta, .cover-name, .cover-sub, .cover-actions, .cover-foot', { opacity: 0, y: 22 });
    gsap.set('.cover-progress i', { scaleX: 0 });
    gsap.set('.cover-frame', { opacity: 0, scale: 0.985 });

    var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.cover-bg', { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' }, 0)
      .to('.cover-frame', { opacity: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 0.1)
      .to('.cover-meta', { opacity: 1, y: 0, duration: 0.9 }, 0.28)
      .to(title, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.3, ease: 'back.out(1.55)', stagger: 0.09 }, 0.38)
      .to('.cover-name', { opacity: 1, y: 0, duration: 0.85 }, 0.92)
      .to('.cover-sub', { opacity: 1, y: 0, duration: 0.9 }, 1.04)
      .to('.cover-actions', { opacity: 1, y: 0, duration: 0.9 }, 1.22)
      .to('.cover-foot', { opacity: 1, y: 0, duration: 0.8 }, 1.34)
      .to('.cover-progress i', { scaleX: 1, duration: 2.3, ease: 'power2.inOut' }, 0.25);

    if (count) {
      var c = { v: 0 };
      gsap.to(c, {
        v: 100,
        duration: 1.65,
        ease: 'power2.inOut',
        delay: 0.35,
        onUpdate: function () {
          count.textContent = pad(Math.round(c.v));
        }
      });
    }

    if (fine && !reduce) {
      cover.addEventListener('pointermove', function (e) {
        var nx = (e.clientX / window.innerWidth - 0.5);
        var ny = (e.clientY / window.innerHeight - 0.5);
        gsap.to('.cover-bg img', { x: nx * 12, y: ny * 7, duration: 0.85, ease: 'power3.out', overwrite: 'auto' });
        gsap.to('.cover-frame', { x: nx * -4, y: ny * -3, duration: 1.1, ease: 'power3.out', overwrite: 'auto' });
      }, { passive: true });
      cover.addEventListener('pointerleave', function () {
        gsap.to('.cover-bg img', { x: 0, y: 0, duration: 1.2, ease: 'power3.out' });
        gsap.to('.cover-frame', { x: 0, y: 0, duration: 1.2, ease: 'power3.out' });
      });
    }

    window.addEventListener('wjr:cover-leave', function () {
      if (leaving) return;
      leaving = true;
      tl.kill();
      var leave = gsap.timeline();
      leave.to(title, {
        yPercent: -118,
        rotate: function () { return gsap.utils.random(-14, -5); },
        opacity: 0,
        duration: 0.52,
        ease: 'power3.in',
        stagger: 0.055
      }, 0)
        .to('.cover-meta, .cover-name, .cover-sub, .cover-actions, .cover-foot, .cover-progress', {
          opacity: 0,
          y: -14,
          duration: 0.4,
          ease: 'power2.in'
        }, 0.06)
        .to('.cover-bg', { scale: 1.07, opacity: 0.58, duration: 0.78, ease: 'power2.inOut' }, 0)
        .to('.cover-frame', { opacity: 0, duration: 0.35 }, 0);
    });
  }

  /* -------------------------------------------------------
     Home hero depth + selected horizontal rail
     ------------------------------------------------------- */
  /* -------------------------------------------------------
     Title window: 一个词成为整张图的取景窗
     （字形内取同一张 hero 图的对应位置，随滚动轻微漂移）
     ------------------------------------------------------- */
  function initTypeWindow(el, img) {
    var live = false;
    // 取景的目标区域（相对图片，0~1）：落在小怪兽的脸和绒面上
    var TARGET_X = 0.665;
    var TARGET_Y = 0.47;
    var SCALE = 1.85;
    function paint() {
      if (!img.naturalWidth) return;
      var vh = window.innerHeight;
      if (window.scrollY > vh * 1.8) return;
      var r = el.getBoundingClientRect();
      var ir = img.getBoundingClientRect();
      if (!r.width || !r.height || !ir.width) return;
      if (!live) {
        el.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
        el.classList.add('is-live');
        live = true;
      }
      var bw = ir.width * SCALE;
      var bh = ir.height * SCALE;
      // 滚动时窗口在图上缓慢横移，像镜头在绒面上滑过
      var drift = -34 * clamp(window.scrollY / vh, 0, 1);
      var px = TARGET_X * bw;
      var py = TARGET_Y * bh;
      el.style.backgroundSize = Math.round(bw) + 'px ' + Math.round(bh) + 'px';
      el.style.backgroundPosition = Math.round(r.width / 2 + drift - px) + 'px '
        + Math.round(r.height / 2 - py) + 'px';
    }
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    if (img.complete) paint();
    else img.addEventListener('load', paint, { once: true });
    setTimeout(paint, 240);
  }

  function initHomeMotion() {
    var band = $('.works-band');
    if (band) {
      whenVisible(band, function () { band.classList.add('is-in'); });
      if (band.getBoundingClientRect().top < window.innerHeight * 0.92) band.classList.add('is-in');
    }
    if (!reduce && hasSTReady && !filmActive) {
      gsap.to('.hero-bg img', {
        scale: 1.09,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });
      gsap.to('.hero-copy', {
        yPercent: -13,
        opacity: 0.42,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });
      gsap.to('.hero-foot', {
        opacity: 0,
        y: 18,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: '60% top', end: 'bottom top', scrub: 1 }
      });
    }
    if (!reduce && hasSTReady) {
      gsap.fromTo('.works-band img', { yPercent: -5 }, {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: { trigger: '.works-band', start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    }

    var winEl = $('.hero h1 .win');
    var heroImg = $('#heroBg img');
    if (winEl && heroImg && !reduce) initTypeWindow(winEl, heroImg);

    var rail = $('#selectedRows');
    if (!rail) return;
    var cards = $$('.selected-card', rail);
    if (!cards.length) return;
    var progress = $('#railProgress');
    var indexEl = $('#railIndex');
    var prevBtn = $('#railPrev');
    var nextBtn = $('#railNext');
    var current = 0;
    var drag = { active: false, startX: 0, startLeft: 0, moved: false, id: null };
    var snapBack = null;

    rail.setAttribute('tabindex', '0');
    rail.setAttribute('aria-label', '精选作品横向长廊，可拖拽或使用左右按钮浏览');

    function cardLeft(card) {
      return card.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    }

    function railPad() {
      return parseFloat(getComputedStyle(rail).paddingLeft) || 0;
    }

    function nearestIndex() {
      var target = rail.scrollLeft + railPad() + 24;
      var best = 0;
      var dist = Infinity;
      cards.forEach(function (card, i) {
        var d = Math.abs(cardLeft(card) - target);
        if (d < dist) { dist = d; best = i; }
      });
      return best;
    }

    function updateRail() {
      var max = Math.max(1, rail.scrollWidth - rail.clientWidth);
      var p = clamp(rail.scrollLeft / max, 0, 1);
      if (progress) progress.style.transform = 'scaleX(' + (0.05 + p * 0.95) + ')';
      current = nearestIndex();
      if (indexEl) indexEl.textContent = pad(current + 1);
      if (prevBtn) prevBtn.disabled = current <= 0;
      if (nextBtn) nextBtn.disabled = current >= cards.length - 1;
    }

    function goTo(i) {
      i = clamp(i, 0, cards.length - 1);
      var left = cardLeft(cards[i]) - railPad();
      var max = Math.max(1, rail.scrollWidth - rail.clientWidth);
      rail.scrollTo({ left: clamp(left, 0, max), behavior: reduce ? 'auto' : 'smooth' });
    }

    rail.addEventListener('scroll', function () {
      window.requestAnimationFrame(updateRail);
    }, { passive: true });

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(current + (e.key === 'ArrowRight' ? 1 : -1));
      }
    });

    if (fine && !reduce) {
      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        if (e.target.closest('.rail-arrow')) return;
        e.preventDefault();
        drag.active = true;
        drag.moved = false;
        drag.startX = e.clientX;
        drag.startLeft = rail.scrollLeft;
        drag.id = e.pointerId;
        rail.classList.add('is-dragging');
        rail.style.scrollSnapType = 'none';
        try {
          if (rail.setPointerCapture) rail.setPointerCapture(e.pointerId);
        } catch (err) {}
      });
      rail.addEventListener('pointermove', function (e) {
        if (!drag.active) return;
        var dx = e.clientX - drag.startX;
        if (Math.abs(dx) > 7) drag.moved = true;
        rail.scrollLeft = drag.startLeft - dx;
      });
      function endDrag() {
        if (!drag.active) return;
        drag.active = false;
        rail.classList.remove('is-dragging');
        rail.style.scrollSnapType = '';
        if (drag.id !== null && rail.releasePointerCapture) {
          try { rail.releasePointerCapture(drag.id); } catch (err) {}
        }
        var i = nearestIndex();
        goTo(i);
      }
      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
      rail.addEventListener('pointerleave', function () { if (drag.active) endDrag(); });
      rail.addEventListener('click', function (e) {
        if (drag.moved) {
          e.preventDefault();
          e.stopPropagation();
          drag.moved = false;
        }
      }, true);
    }

    window.addEventListener('resize', function () { window.requestAnimationFrame(updateRail); }, { passive: true });
    updateRail();
    // Reveal rail cards as they enter the horizontal viewport.
    if ('IntersectionObserver' in window && !reduce) {
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('is-in');
            rio.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 8% 0px 8%', threshold: 0.08 });
      cards.forEach(function (card) { rio.observe(card); });
    }
  }

  /* -------------------------------------------------------
     Work detail: category tint, 3D tilt, fullscreen zoom
     ------------------------------------------------------- */
  function initDetailMotion() {
    var stage = $('.detail-stage');
    var stageLink = $('#workOpen');
    var image = $('#workImage');
    if (!stage || !stageLink || !image) return;

    function fitStageImage() {
      if (!image.naturalWidth || !image.naturalHeight) return;
      var cs = getComputedStyle(stage);
      var availW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var availH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var fit = Math.min(availW / image.naturalWidth, availH / image.naturalHeight, 1.9);
      if (!isFinite(fit) || fit <= 0) return;
      image.style.width = Math.round(image.naturalWidth * fit) + 'px';
      image.style.height = Math.round(image.naturalHeight * fit) + 'px';
    }
    image.addEventListener('load', fitStageImage);
    if (image.complete) fitStageImage();

    /* ---------- 三色版错位：像刚上机开印、套准的那一下 ---------- */
    var pressDone = false;
    function maybePress() {
      if (pressDone || reduce || window.innerWidth < 900) return;
      if (window.__WJR_FLIP) return;           // FLIP 已经占满注意力，不叠第二段
      if (!image.naturalWidth) return;
      pressDone = true;
      pressReveal(stageLink, image);
    }
    if (image.complete && image.naturalWidth) setTimeout(maybePress, 430);
    else image.addEventListener('load', function () { setTimeout(maybePress, 430); }, { once: true });

    function onResize() { requestAnimationFrame(fitStageImage); }
    window.addEventListener('resize', onResize);

    /* ---------- FLIP：从目录卡片的位置落回原位 ---------- */
    if (window.__WJR_FLIP && !reduce && window.innerWidth >= 900) {
      var flip = window.__WJR_FLIP;
      var flipDone = false;
      var settle = function () {
        if (flipDone) return;
        flipDone = true;
        window.__WJR_FLIP_USED = true;
        window.__WJR_FLIP = null;
        image.style.opacity = '';
        body.classList.remove('is-flip-in');
        setTimeout(function () { stage.classList.remove('is-flipping'); }, 140);
      };
      var runFlip = function () {
        if (flipDone || !window.__WJR_FLIP) { settle(); return; }
        requestAnimationFrame(function () {
          fitStageImage();
          var target = image.getBoundingClientRect();
          if (!target.width || !target.height) { settle(); return; }
          var dx = flip.x - target.left;
          var dy = flip.y - target.top;
          var sc = flip.w / target.width;
          var chrome = [$('.site-head'), $('.detail-top'), $('.detail-info'), $('.related'), $('.footer')].filter(Boolean);
          stage.classList.add('is-flipping');
          gsap.set(image, { x: dx, y: dy, scaleX: sc, scaleY: sc, opacity: 1, transformOrigin: '0 0' });
          gsap.to(chrome, { opacity: 1, duration: .5, ease: 'power2.out', delay: .16, clearProps: 'opacity' });
          gsap.to(image, {
            x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .95, ease: 'expo.inOut',
            onComplete: function () {
              gsap.set(image, { clearProps: 'transform,transformOrigin,opacity' });
              gsap.set(chrome, { clearProps: 'opacity' });
              settle();
            }
          });
        });
      };
      if (image.complete && image.naturalWidth) runFlip();
      else {
        image.addEventListener('load', runFlip, { once: true });
        setTimeout(function () { if (!flipDone && !image.naturalWidth) settle(); }, 1500);
      }
    }

    if (fine && !reduce) {
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        gsap.to(stageLink, {
          rotationX: (0.5 - y) * 7,
          rotationY: (x - 0.5) * 8,
          x: (x - 0.5) * 10,
          y: (y - 0.5) * 6,
          transformPerspective: 1000,
          duration: 0.65,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      }, { passive: true });
      stage.addEventListener('pointerleave', function () {
        gsap.to(stageLink, { rotationX: 0, rotationY: 0, x: 0, y: 0, duration: 0.85, ease: 'power3.out' });
      });
    }

    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.id = 'lightbox';
    lb.setAttribute('aria-hidden', 'true');
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '作品大图预览');
    lb.innerHTML = '<div class="lightbox-bar">'
      + '<span class="lightbox-count" id="lightboxCount"></span>'
      + '<div class="lightbox-tools">'
      + '<button class="lightbox-tool" data-lb="out" type="button" aria-label="缩小">−</button>'
      + '<button class="lightbox-tool" data-lb="reset" type="button" aria-label="还原">1:1</button>'
      + '<button class="lightbox-tool" data-lb="in" type="button" aria-label="放大">+</button>'
      + '<button class="lightbox-close" data-lb="close" type="button">关闭 ×</button>'
      + '</div></div>'
      + '<div class="lightbox-stage"><img id="lightboxImage" alt="" draggable="false"></div>'
      + '<p class="lightbox-hint">滚轮缩放 · 拖拽移动 · ESC 关闭</p>';
    document.body.appendChild(lb);

    var lbImg = $('#lightboxImage', lb);
    var lbStage = $('.lightbox-stage', lb);
    var lbCount = $('#lightboxCount', lb);
    var open = false;
    var scale = 1;
    var tx = 0;
    var ty = 0;
    var pan = { active: false, x: 0, y: 0, tx: 0, ty: 0, id: null };
    var lastFocus = null;

    function applyTransform() {
      gsap.set(lbImg, { x: tx, y: ty, scale: scale });
    }

    function resetTransform(animate) {
      scale = 1; tx = 0; ty = 0;
      if (animate) gsap.to(lbImg, { x: 0, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
      else applyTransform();
    }

    function fitLightboxImage() {
      if (!lbImg.naturalWidth || !lbImg.naturalHeight) return;
      var maxW = window.innerWidth * 0.9;
      var maxH = window.innerHeight * 0.78;
      var fit = Math.min(maxW / lbImg.naturalWidth, maxH / lbImg.naturalHeight, 2.2);
      lbImg.style.width = Math.round(lbImg.naturalWidth * fit) + 'px';
      lbImg.style.height = Math.round(lbImg.naturalHeight * fit) + 'px';
    }
    lbImg.addEventListener('load', fitLightboxImage);

    function openLightbox() {
      if (open) return;
      open = true;
      lastFocus = document.activeElement;
      resetTransform(false);
      lbImg.src = image.currentSrc || image.src;
      lbImg.alt = image.alt || '';
      if (lbImg.complete) fitLightboxImage();
      lbCount.textContent = (document.getElementById('workIndex') || {}).textContent || '';
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      body.classList.add('lightbox-open');
      stage.classList.add('has-opened');
      if (lenis) lenis.stop();
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.32, ease: 'power2.out' });
      gsap.fromTo(lbImg, { scale: 0.86, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.78, ease: 'expo.out', delay: 0.05
      });
      var closeBtn = $('.lightbox-close', lb);
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    }

    function closeLightbox() {
      if (!open) return;
      open = false;
      gsap.to(lbImg, { scale: 0.9, opacity: 0, duration: 0.25, ease: 'power2.in' });
      gsap.to(lb, {
        opacity: 0, duration: 0.32, ease: 'power2.in', delay: 0.06,
        onComplete: function () {
          lb.classList.remove('is-open');
          lb.setAttribute('aria-hidden', 'true');
          body.classList.remove('lightbox-open');
          if (lenis) lenis.start();
          if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        }
      });
    }

    if (stageLink) {
      stageLink.addEventListener('click', function (e) {
        e.preventDefault();
        openLightbox();
      });
    }

    lb.addEventListener('click', function (e) {
      var tool = e.target.closest('[data-lb]');
      if (tool) {
        var action = tool.getAttribute('data-lb');
        if (action === 'close') closeLightbox();
        if (action === 'in') { scale = clamp(scale + 0.45, 1, 4); gsap.to(lbImg, { scale: scale, x: tx, y: ty, duration: 0.35, ease: 'power3.out' }); }
        if (action === 'out') { scale = clamp(scale - 0.45, 1, 4); if (scale === 1) { tx = 0; ty = 0; } gsap.to(lbImg, { scale: scale, x: tx, y: ty, duration: 0.35, ease: 'power3.out' }); }
        if (action === 'reset') resetTransform(true);
        return;
      }
      if (e.target === lb || e.target === lbStage) closeLightbox();
    });

    lbStage.addEventListener('wheel', function (e) {
      e.preventDefault();
      var next = clamp(scale - e.deltaY * 0.0016, 1, 4);
      if (next === scale) return;
      scale = next;
      if (scale === 1) { tx = 0; ty = 0; }
      gsap.to(lbImg, { scale: scale, x: tx, y: ty, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
    }, { passive: false });

    lbImg.addEventListener('dblclick', function () {
      if (scale > 1.05) resetTransform(true);
      else { scale = 2; gsap.to(lbImg, { scale: 2, duration: 0.45, ease: 'power3.out' }); }
    });

    lbStage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pan.active = true;
      pan.x = e.clientX; pan.y = e.clientY; pan.tx = tx; pan.ty = ty; pan.id = e.pointerId;
      lbStage.setPointerCapture && lbStage.setPointerCapture(e.pointerId);
      lbStage.classList.add('is-panning');
    });
    lbStage.addEventListener('pointermove', function (e) {
      if (!pan.active) return;
      tx = pan.tx + (e.clientX - pan.x);
      ty = pan.ty + (e.clientY - pan.y);
      var limitX = lbImg.clientWidth * scale * 0.6;
      var limitY = lbImg.clientHeight * scale * 0.6;
      tx = clamp(tx, -limitX, limitX);
      ty = clamp(ty, -limitY, limitY);
      applyTransform();
    });
    function endPan() {
      pan.active = false;
      lbStage.classList.remove('is-panning');
      if (pan.id !== null && lbStage.releasePointerCapture) {
        try { lbStage.releasePointerCapture(pan.id); } catch (err) {}
      }
    }
    lbStage.addEventListener('pointerup', endPan);
    lbStage.addEventListener('pointercancel', endPan);

    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopImmediatePropagation();
      if (e.key === '+' || e.key === '=') { scale = clamp(scale + 0.4, 1, 4); gsap.to(lbImg, { scale: scale, duration: 0.3 }); }
      if (e.key === '-') { scale = clamp(scale - 0.4, 1, 4); gsap.to(lbImg, { scale: scale, duration: 0.3 }); }
    }, true);
  }

  /* -------------------------------------------------------
     About: number roll + strip micro-interactions
     ------------------------------------------------------- */
  function initAboutMotion() {
    var stats = $$('.about-stat strong');
    var run = function () {
      stats.forEach(function (el) {
        var text = el.textContent.trim();
        if (!/^\d{1,2}$/.test(text)) return;
        var target = parseInt(text, 10);
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.1,
          ease: 'power2.out',
          onUpdate: function () { el.textContent = pad(Math.round(obj.v)); },
          onComplete: function () { el.textContent = pad(target); }
        });
      });
    };
    if (stats.length) whenVisible($('.about-stats'), run);

    if (fine && !reduce) {
      $$('.about-strip a').forEach(function (el) {
        var img = $('img', el);
        if (!img) return;
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(img, { x: x * 8, y: y * 8, scale: 1.06, duration: 0.65, ease: 'power3.out' });
        }, { passive: true });
        el.addEventListener('pointerleave', function () {
          gsap.to(img, { x: 0, y: 0, scale: 1, duration: 0.7, ease: 'power3.out' });
        });
      });
    }
  }

  /* -------------------------------------------------------
     Scroll-velocity skew (images only, very small)
     ------------------------------------------------------- */
  function initScrollSkew() {
    if (!lenis || reduce) return;
    var targets = $$('.work-open, .selected-visual, .about-strip a');
    if (!targets.length) return;
    var visible = [];
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var i = visible.indexOf(en.target);
          if (en.isIntersecting) {
            if (i === -1) visible.push(en.target);
          } else if (i > -1) {
            visible.splice(i, 1);
          }
          applied = 9;
        });
      }, { rootMargin: '10% 0px' });
      targets.forEach(function (t) { io.observe(t); });
    } else {
      visible = targets;
    }

    var cur = 0;
    var applied = 9;
    gsap.ticker.add(function () {
      var v = (window.__lenis && window.__lenis.velocity) || 0;
      var target = clamp(v * 0.22, -1.4, 1.4);
      cur += (target - cur) * 0.18;
      if (Math.abs(cur) < 0.02) cur = 0;
      if (Math.abs(cur - applied) < 0.03) return;
      applied = cur;
      for (var i = 0; i < visible.length; i++) {
        visible[i].style.setProperty('--sk', cur.toFixed(2) + 'deg');
      }
    });
  }

  /* -------------------------------------------------------
     Film grain (wide screens only, static, no repaint cost)
     ------------------------------------------------------- */
  function initGrain() {
    if (reduce || window.innerWidth < 1024) return;
    if (page === 'cover') return; // 封面本身已有颗粒层
    var g = document.createElement('div');
    g.className = 'grain';
    g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
  }

  /* -------------------------------------------------------
     Footer marquee
     ------------------------------------------------------- */
  function initFooterMarquee() {
    var footer = $('.footer');
    if (!footer) return;
    var bottom = $('.footer-bottom', footer);
    if (!bottom) return;
    var marquee = document.createElement('div');
    marquee.className = 'footer-marquee';
    marquee.setAttribute('aria-hidden', 'true');
    var chunk = '<span class="footer-marquee-chunk">WJR · 视觉设计 · VISUAL DESIGN · 2024—2026 · 作品档案 ·&nbsp;</span>';
    marquee.innerHTML = '<div class="footer-marquee-track">' + chunk + chunk + '</div>';
    bottom.parentNode.insertBefore(marquee, bottom);

    // 改成滚动驱动：字带跟着页面走，向上滚时反向
    if (hasSTReady) {
      var track = $('.footer-marquee-track', marquee);
      if (track) {
        gsap.fromTo(track, { xPercent: 0 }, {
          xPercent: -27,
          ease: 'none',
          scrollTrigger: {
            trigger: footer,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.7,
            invalidateOnRefresh: true
          }
        });
      }
    }
  }

  /* -------------------------------------------------------
     Press reveal: R/G/B 三块印版先错位、再套准
     三版同层 multiply，套准后正好还原成原图，所以收尾无跳变
     ------------------------------------------------------- */
  function pressReveal(stageLink, image) {
    var src = image.currentSrc || image.src;
    if (!src) return;
    var box = document.createElement('div');
    box.className = 'press';
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<div class="press-paper"></div>'
      + '<div class="press-plate is-r"></div>'
      + '<div class="press-plate is-g"></div>'
      + '<div class="press-plate is-b"></div>';
    var plates = $$('.press-plate', box);
    plates.forEach(function (p) { p.style.backgroundImage = 'url("' + src + '")'; });
    stageLink.appendChild(box);
    var off = [[-9, 5], [7, -6], [4, 8]];
    plates.forEach(function (p, i) { gsap.set(p, { x: off[i][0], y: off[i][1] }); });
    gsap.timeline({
      onComplete: function () { if (box.parentNode) box.parentNode.removeChild(box); }
    })
      .to(plates, { x: 0, y: 0, duration: .85, ease: 'expo.out', stagger: .03 })
      .to(box, { opacity: 0, duration: .34, ease: 'power2.inOut' }, '+=.18');
  }

  /* -------------------------------------------------------
     Loupe: 目录里的暗房取景框
     ------------------------------------------------------- */
  function initLoupe() {
    if (!fine || reduce) return;
    if (window.innerWidth < 900) return;
    if (page !== 'works' && page !== 'home') return;
    var loupe = document.createElement('div');
    loupe.className = 'loupe';
    loupe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(loupe);
    var size = loupe.offsetWidth || 168;
    var r2 = size / 2;
    var zoom = 2.3;
    var on = false;
    var curImg = null;
    var curRect = null;
    var lx = gsap.quickTo(loupe, 'left', { duration: .2, ease: 'power2.out' });
    var ly = gsap.quickTo(loupe, 'top', { duration: .2, ease: 'power2.out' });

    function hide() {
      if (!on) return;
      on = false;
      curImg = null;
      loupe.classList.remove('is-on');
    }
    function show(img, e) {
      if (!img || !img.naturalWidth) { hide(); return; }
      if (!on || curImg !== img) {
        curImg = img;
        curRect = img.getBoundingClientRect();
        loupe.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
        loupe.style.backgroundSize = Math.round(curRect.width * zoom) + 'px '
          + Math.round(curRect.height * zoom) + 'px';
        on = true;
        loupe.classList.add('is-on');
      }
      if (!curRect) curRect = img.getBoundingClientRect();
      var cx = e.clientX - curRect.left;
      var cy = e.clientY - curRect.top;
      loupe.style.backgroundPosition = Math.round(r2 - cx * zoom) + 'px '
        + Math.round(r2 - cy * zoom) + 'px';
      lx(e.clientX);
      ly(e.clientY);
    }
    document.addEventListener('pointermove', function (e) {
      var host = e.target.closest && e.target.closest('.work-media, .selected-visual');
      if (!host) { hide(); return; }
      show(host.tagName === 'IMG' ? host : host.querySelector('img'), e);
    }, { passive: true });
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    window.addEventListener('scroll', function () {
      if (on && curImg) curRect = curImg.getBoundingClientRect();
    }, { passive: true });
  }

  /* -------------------------------------------------------
     Init
     ------------------------------------------------------- */
  /* -------------------------------------------------------
     V6 一镜到底：首页被 pin 住的一段镜头
     滚动条即播放头。分镜：文案退场 → 标题开窗被推近
     → 画面从字的位置开满全屏 → 光带/网点扫过一次
     → 交棒给作品带。参考 V5 的字窗与三色版语言。
     ------------------------------------------------------- */
  var heroDepth = null;
  var bgDepth = null;
  var filmActive = false;
  var detailDepth = null;

  function initFilmSequence() {
    var hero = $('.hero');
    if (!hero) return;
    if (reduce || !hasSTReady || window.innerWidth < 760) return;

    var plate = $('#filmPlate');
    var frame = $('#filmFrame');
    var scan = $('#filmScan');
    var vig = $('#filmVignette');
    var glow = $('#filmGlow');
    var win = $('.hero h1 .win');
    var still = $('.film-still', frame || hero);
    if (!plate || !frame || !win || !still) return;

    hero.classList.add('is-film');
    filmActive = true;

    // 实时画面层（无 WebGL 时仍显示静态大图，功能不丢）
    var U = { liquid: 0, ca: 0, tone: 0, sweep: -1, vig: 0, grain: 0.012, shutter: 0 };
    if (window.__WJR_DBG) window.__filmU = U;
    function push() { if (heroDepth) heroDepth.set(U); }
    if (window.WJR_DEPTH && window.WJR_DEPTH.available && fine) {
      heroDepth = window.WJR_DEPTH.mount(still, frame, { cover: true, align: 'right', maxWidth: 1500 });
      if (heroDepth) push();
      // 首屏静态图也挂一层极轻的实时画面：页面停住的时候画面也是「活」的
      var bg = $('#heroBg');
      var bgImg = bg ? $('img', bg) : null;
      if (bg && bgImg) {
        bgDepth = window.WJR_DEPTH.mount(bgImg, bg, { cover: true, align: 'right', maxWidth: 1100 });
        if (bgDepth) bgDepth.set({ liquid: 0.16, grain: 0.032, tone: 0.05, vig: 0.1, ca: 0.06 });
      }
    }

    // 光圈在怪兽那只单眼上睁开，并以眼睛为变焦原点
    function eyePoint() {
      var hr = hero.getBoundingClientRect();
      var nw = still.naturalWidth || 1;
      var nh = still.naturalHeight || 1;
      var k = Math.max(hr.width / nw, hr.height / nh);
      var dw = nw * k;
      var dh = nh * k;
      // 站点用 object-position:center right，横向贴右
      return {
        x: (hr.width - dw) + 0.665 * dw,
        y: 0.285 * dh
      };
    }

    function iris(at) {
      var e = eyePoint();
      return 'circle(' + at + ' at ' + Math.round(e.x) + 'px ' + Math.round(e.y) + 'px)';
    }

    var START_S = 1.95;
    var zoom = { s: START_S, px: 0, py: 0 };
    // 把眼睛钉在原地：transform-origin 固定 0 0，用 translate(anchor*(1-s)) scale(s)
    function applyZoom() {
      var e = eyePoint();
      var s = zoom.s;
      frame.style.transform = 'translate(' + (e.x * (1 - s) + zoom.px).toFixed(2) + 'px,' +
        (e.y * (1 - s) + zoom.py).toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    }
    applyZoom();

    gsap.set(plate, { clipPath: iris('0%') });

    function placeGlow() {
      if (!glow) return;
      var e = eyePoint();
      glow.style.left = Math.round(e.x) + 'px';
      glow.style.top = Math.round(e.y) + 'px';
    }
    placeGlow();

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=210%',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.9,
        invalidateOnRefresh: true,
        onRefreshInit: function () {
          if (tl && tl.progress() < 0.03) {
            gsap.set(plate, { clipPath: iris('0%') });
            zoom.s = START_S; zoom.px = 0; zoom.py = 0;
            applyZoom();
            placeGlow();
          }
        }
      }
    });

    var caption = $('#filmCaption');
    var capA = caption ? $('.cap-a', caption) : null;
    var capB = caption ? $('.cap-b', caption) : null;

    // 1) 文案退场，但「好看」被镜头咬住推近 —— 第一像素就开始动
    tl.to('.hero-kicker', { opacity: 0, y: -14, duration: 0.5 }, 0);
    tl.to('.hero-bottom', { opacity: 0, y: -18, duration: 0.5 }, 0.04);
    tl.to('.hero-foot', { opacity: 0, y: -12, duration: 0.44 }, 0.02);
    var lines = $$('.hero h1 .line-mask');
    if (lines.length >= 3) {
      tl.to([lines[0], lines[2]], { opacity: 0, y: -30, duration: 0.55 }, 0.06);
    }
    tl.to(win, { scale: 1.55, duration: 1.2, ease: 'none' }, 0);

    // 2) 光圈从那只单眼里睁开，画面推上去、字被撑掉
    tl.to('.hero h1', { opacity: 0, duration: 0.9, ease: 'power1.in' }, 0.5);
    tl.to(plate, { clipPath: iris('150%'), duration: 1.45, ease: 'none' }, 0.5);
    tl.to(zoom, { s: 1, duration: 1.5, ease: 'power2.out', onUpdate: applyZoom }, 0.5);
    if (glow) {
      tl.to(glow, { opacity: 0.38, duration: 0.5, ease: 'power1.out' }, 0.5);
      tl.to(glow, { opacity: 0, duration: 1.0, ease: 'power1.in' }, 1.1);
    }

    // 3) 画面开始「活」：液态位移 + 网点 + 颗粒
    tl.to(U, { liquid: 0.62, duration: 1.1, onUpdate: push }, 1.0);
    tl.to(U, { grain: 0.05, duration: 1.1, onUpdate: push }, 1.0);
    tl.to(U, { tone: 0.24, duration: 1.1, onUpdate: push }, 1.0);
    tl.to(U, { tone: 0.07, duration: 0.6, onUpdate: push }, 2.0);

    // 4) 光带横扫 + 一次明显色散 + 白闪：这一下最像镜头
    if (scan) {
      tl.fromTo(scan, { xPercent: -130, opacity: 0 }, { opacity: 1, duration: 0.18 }, 2.2);
      tl.to(scan, { xPercent: 130, duration: 0.7, ease: 'power1.inOut' }, 2.2);
      tl.to(scan, { opacity: 0, duration: 0.22 }, 2.72);
    }
    tl.to(U, { ca: 0.95, duration: 0.24, onUpdate: push }, 2.2);
    tl.to(U, { ca: 0, duration: 0.42, onUpdate: push }, 2.52);
    tl.to(U, { sweep: 1.6, duration: 0.7, onUpdate: push }, 2.2);
    tl.to(U, { sweep: -1, duration: 0.4, onUpdate: push }, 2.9);
    tl.to(U, { shutter: 0.24, duration: 0.1, onUpdate: push }, 2.28);
    tl.to(U, { shutter: 0, duration: 0.26, onUpdate: push }, 2.42);

    // 5) 一段不停的长镜头：缓推 + 横向慢移，说明字同时进场
    tl.to(zoom, { s: 1.2, px: -64, py: 0, duration: 3.7, ease: 'none', onUpdate: applyZoom }, 2.3);
    tl.to(U, { vig: 0.62, duration: 3.6, onUpdate: push }, 2.4);
    if (vig) tl.to(vig, { opacity: 0.62, duration: 3.6 }, 2.4);
    if (capA && capB) {
      tl.fromTo(capA, { y: 48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, 3.0);
      tl.fromTo(capB, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power2.out' }, 3.14);
    }

    window.addEventListener('resize', function () {
      if (!heroDepth) return;
      window.setTimeout(function () { heroDepth.layout(); }, 220);
    });
  }

  /* -------------------------------------------------------
     详情页大图上的实时画面层：悬停即对焦
     ------------------------------------------------------- */
  function initDetailDepth() {
    if (!window.WJR_DEPTH || !window.WJR_DEPTH.available || !fine || reduce) return;
    if (window.innerWidth < 760) return;
    var link = $('.stage-link');
    var img = $('#workImage');
    if (!link || !img) return;

    var wrap = document.createElement('div');
    wrap.className = 'depth-frame';
    link.appendChild(wrap);
    var h = null;
    var U = { liquid: 0, ca: 0, tone: 0, sweep: -1, grain: 0.016, vig: 0.16, shutter: 0 };
    function push() { if (h) h.set(U); }

    function place() {
      if (!img.naturalWidth || !img.getBoundingClientRect().width) return;
      var ir = img.getBoundingClientRect();
      var sr = link.getBoundingClientRect();
      var k = Math.min(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
      var w = img.naturalWidth * k;
      var hh = img.naturalHeight * k;
      wrap.style.width = w.toFixed(1) + 'px';
      wrap.style.height = hh.toFixed(1) + 'px';
      wrap.style.left = (ir.left - sr.left + (ir.width - w) / 2).toFixed(1) + 'px';
      wrap.style.top = (ir.top - sr.top + (ir.height - hh) / 2).toFixed(1) + 'px';
      if (h) h.layout();
    }

    function mountNow() {
      place();
      if (h) { h.destroy(); h = null; }
      h = window.WJR_DEPTH.mount(img, wrap, { cover: false, maxWidth: 1400 });
      if (h) push();
      place();
    }

    function enter() {
      if (h) { h.pause(false); h.el.classList.add('is-on'); }
      gsap.to(U, { liquid: 0.4, ca: 0.16, tone: 0.08, grain: 0.026, duration: 0.5, ease: 'power2.out', onUpdate: push });
    }
    function leave() {
      if (h) {
        h.el.classList.remove('is-on');
        var hh = h;
        window.setTimeout(function () { hh.pause(true); }, 900);
      }
      gsap.to(U, { liquid: 0, ca: 0, tone: 0, grain: 0.016, duration: 0.7, onUpdate: push });
    }

    link.addEventListener('pointerenter', enter);
    link.addEventListener('pointerleave', leave);
    link.addEventListener('pointermove', function (e) {
      var r = wrap.getBoundingClientRect();
      if (!r.width || !h) return;
      h.set({ mouse: [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] });
    });
    link.addEventListener('pointerdown', function () {
      U.shutter = 0.22;
      push();
      window.setTimeout(function () { U.shutter = 0; push(); }, 160);
    });

    if (img.complete && img.naturalWidth) mountNow();
    else img.addEventListener('load', mountNow, { once: true });
    img.addEventListener('load', mountNow);
    window.addEventListener('resize', function () { place(); });

    detailDepth = { place: place, mount: mountNow };
  }

  function init() {
    initCursor();
    initMagnets();
    initKinetic();
    initFooterMarquee();
    initGrain();
    initScrollSkew();
    initLoupe();

    if (page === 'cover') initCover();
    if (page === 'home') { initFilmSequence(); initHomeMotion(); }
    if (page === 'detail') {
      // The masked stage can report zero intersection because of its own
      // clip-path, so reveal it once here instead of waiting forever.
      var detailStage = $('.detail-stage');
      if (detailStage && !reduce) {
        setTimeout(function () { detailStage.classList.add('is-in'); }, 120);
      }
      initDetailMotion();
      initDetailDepth();
    }
    if (page === 'about') initAboutMotion();

    // Page wipe should always finish above the new page.
    if (hasSTReady) {
      window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
      setTimeout(function () { window.ScrollTrigger.refresh(); }, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

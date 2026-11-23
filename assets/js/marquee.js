/* =========================================================
   WJR Portfolio — 精选作品横带（可拖动 / 惯性 / 无缝循环）
   源自 obsidianui draggable-marquee 的行为约定：
   持续漂移、拖动带惯性、循环无接缝、聚焦后用 ← → 键移动。
   本站没有构建工具，所以写成独立脚本 + CSS，不引入新依赖。
   ========================================================= */
(function () {
  var root = document.getElementById('stripMarquee');
  if (!root) return;
  var track = root.querySelector('.strip-track');
  var works = window.WJR_WORKS || [];
  if (!track || !works.length) return;

  /* 与首页 .selected 的六件同组、同序：01 06 09 12 17 24 */
  var FEATURED = [1, 6, 9, 12, 17, 24];

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var auto = 62;            // 自动漂移速度 px/s
  var MAX_V = 1600;         // 甩动速度上限 px/s
  var FRICTION = 0.94;

  var items = FEATURED.map(function (id) {
    for (var i = 0; i < works.length; i++) if (works[i].id === id) return works[i];
    return null;
  }).filter(Boolean);
  if (!items.length) return;

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function itemHTML(w, copy) {
    return '<a class="strip-item" data-cat="' + w.cat + '"'
      + ' href="work.html?work=' + encodeURIComponent(w.file) + '"'
      + ' data-cursor="drag" data-cursor-label="Drag"'
      + (copy ? ' aria-hidden="true" tabindex="-1"' : '') + '>'
      + '<span class="strip-frame"><img src="' + w.src + '" alt="' + esc(w.title) + '"'
      + ' width="' + w.w + '" height="' + w.h + '" loading="' + (copy ? 'lazy' : 'eager') + '" decoding="async" draggable="false"></span>'
      + '<span class="strip-cap">'
      + '<span class="strip-num">' + pad(w.id) + '</span>'
      + '<span class="strip-title">' + esc(w.title) + '</span>'
      + '<span class="strip-cat">' + esc(w.catLabel) + '</span>'
      + '</span></a>';
  }

  var oneSet = items.map(function (w) { return itemHTML(w, false); }).join('');
  track.innerHTML = oneSet;

  var staticMode = reduce.matches;
  var x = 0;              // 位移，循环区间 [-setWidth, 0)
  var setWidth = 0;
  var copies = 1;
  var velocity = 0;
  var visible = true;
  var raf = 0;
  var lastFrame = 0;
  var measured = 0;

  function norm(v) {
    if (!setWidth) return 0;
    var raw = (v + setWidth) % setWidth;
    if (raw < 0) raw += setWidth;
    return raw - setWidth;
  }

  function render() {
    track.style.transform = 'translate3d(' + (Math.round(x * 100) / 100) + 'px,0,0)';
  }

  function fill(count) {
    copies = Math.max(1, count);
    var target = items.length * copies;
    while (track.children.length > target) track.removeChild(track.lastElementChild);
    if (track.children.length < target) {
      var html = '';
      for (var s = Math.floor(track.children.length / items.length); s < copies; s++) {
        html += items.map(function (w) { return itemHTML(w, true); }).join('');
      }
      track.insertAdjacentHTML('beforeend', html);
    }
    root.setAttribute('data-copies', String(copies));
  }

  function measure() {
    var n = items.length;
    if (track.children.length < n) fill(1);
    var gap = parseFloat(getComputedStyle(track).columnGap) ||
      parseFloat(getComputedStyle(track).gap) || 0;
    var sum = 0;
    for (var i = 0; i < n; i++) sum += track.children[i].getBoundingClientRect().width;
    /* 周期 = 一组内容 + n 个间隙（含末件与下一组之间的那个），否则接缝会多出一个 gap */
    var w = Math.floor(sum + gap * n);
    if (w < 8) return;
    setWidth = w;
    root.setAttribute('data-set-w', String(setWidth));
    if (staticMode) {
      if (copies !== 1) fill(1);
    } else {
      var need = Math.ceil((root.clientWidth || window.innerWidth) / setWidth) + 2;
      need = Math.min(6, Math.max(2, need));
      if (need !== copies) fill(need);
    }
    x = norm(x);
    measured = Date.now();
    if (!staticMode) render();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = lastFrame ? Math.min(50, now - lastFrame) : 16;
    lastFrame = now;
    if (drag.locked || !visible || document.hidden) { lastFrame = now; return; }
    if (Math.abs(velocity) > 8) {
      x += velocity * dt / 1000;
      velocity *= Math.pow(FRICTION, dt / 16.67);
      if (Math.abs(velocity) <= 8) velocity = 0;
    } else {
      x -= auto * dt / 1000;
    }
    x = norm(x);
    render();
  }

  /* ---------------- pointer drag ---------------- */
  var drag = { active: false, locked: false, id: null, startX: 0, startY: 0, applied: 0, lastX: 0, lastT: 0, vx: 0, moved: false };

  function endDrag() {
    if (!drag.active) return;
    drag.active = false;
    drag.locked = false;
    root.classList.remove('is-dragging');
    if (drag.id !== null && root.releasePointerCapture) {
      try { root.releasePointerCapture(drag.id); } catch (e) {}
    }
    drag.id = null;
    if (drag.moved) setTimeout(function () { drag.moved = false; }, 160);
  }

  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.active = true;
    drag.locked = false;
    drag.id = e.pointerId;
    drag.startX = drag.lastX = drag.applied = e.clientX;
    drag.startY = e.clientY;
    drag.lastT = performance.now();
    drag.vx = 0;
    drag.moved = false;
    velocity = 0;
  }

  function onMove(e) {
    if (!drag.active || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.startX;
    var dy = e.clientY - drag.startY;

    if (!drag.locked) {
      /* 纵向手势让给页面滚动，横带不抢触摸 */
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { endDrag(); return; }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        drag.locked = true;
        drag.applied = e.clientX;
        root.classList.add('is-dragging');
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      } else {
        return;
      }
    }

    e.preventDefault();
    var now = performance.now();
    var dt = now - drag.lastT;
    if (dt > 0) drag.vx = (e.clientX - drag.lastX) / dt * 1000;
    drag.lastX = e.clientX;
    drag.lastT = now;

    var step = e.clientX - drag.applied;
    drag.applied = e.clientX;
    if (Math.abs(e.clientX - drag.startX) > 6) drag.moved = true;
    x = norm(x + step);
    velocity = 0;
    render();
  }

  function onUp(e) {
    if (!drag.active || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
    if (drag.locked) {
      velocity = Math.max(-MAX_V, Math.min(MAX_V, drag.vx));
    }
    endDrag();
  }

  if (!staticMode) {
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove, { passive: false });
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    root.addEventListener('lostpointercapture', onUp);

    root.addEventListener('click', function (e) {
      if (!drag.moved) return;
      e.preventDefault();
      e.stopPropagation();
      drag.moved = false;
    }, true);

    root.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      velocity = 0;
      x = norm(x - e.deltaX);
      render();
    }, { passive: false });
  }

  root.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (staticMode) return;   /* 降级态交给浏览器原生横向滚动 */
    e.preventDefault();
    var step = (root.clientWidth || 0) * 0.35;
    x = norm(x + (e.key === 'ArrowLeft' ? step : -step));
    velocity = 0;
    render();
  });


  /* ---------------- resize ---------------- */
  function schedule() {
    if (rafMeasure) return;
    rafMeasure = requestAnimationFrame(function () { rafMeasure = 0; measure(); });
  }
  var rafMeasure = 0;
  var ro = null;

  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(schedule);
    ro.observe(root);
  }
  var firstImg = track.querySelector('img');
  if (firstImg && !firstImg.complete) firstImg.addEventListener('load', schedule);
  window.addEventListener('resize', schedule, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible = en.isIntersecting; });
    }, { rootMargin: '120px 0px' }).observe(root);
  }

  function start() {
    measure();
    if (staticMode) {
      root.setAttribute('data-static', '1');
      return;
    }
    x = 0;
    render();
    raf = requestAnimationFrame(frame);
  }

  start();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule).catch(function () {});
  }

  /* 主题切换后重新量一次（浅色下图片底色变化会改尺寸） */
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', function () { setTimeout(measure, 60); });
})();

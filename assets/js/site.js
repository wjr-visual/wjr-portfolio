/* =========================================================
   WJR Portfolio — shared runtime
   ========================================================= */
(function () {
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var works = window.WJR_WORKS || [];
  var cats = window.WJR_CATS || {};
  /* 详情页链接前缀：doubao.link 上走 /work?work=，Netlify 上保留 work.html */
  var PRETTY = /\.doubao\.link$/i.test(location.hostname);
  var WORKQ = PRETTY ? 'work?work=' : 'work.html?work=';
  var wipe = document.querySelector('.page-wipe');
  var toastEl = document.getElementById('toast');
  var toastTimer = 0;

  /* ---------- FLIP 接力：目录卡片 → 详情大图 ---------- */
  window.__WJR_FLIP = null;
  var flipRaw = null;
  try {
    flipRaw = sessionStorage.getItem('wjr:flip');
    sessionStorage.removeItem('wjr:flip');
  } catch (e) {}
  if (flipRaw && body.classList.contains('page-detail')) {
    try {
      var flipData = JSON.parse(flipRaw);
      var flipPage = new URLSearchParams(location.search).get('work');
      if (flipData && flipData.file === flipPage && Date.now() - flipData.t < 12000) {
        window.__WJR_FLIP = flipData;
        body.classList.add('is-flip-in');
        if (wipe) wipe.style.display = 'none';
        // 图片迟迟不到就撤销，避免整页空白
        setTimeout(function () {
          if (window.__WJR_FLIP && !window.__WJR_FLIP_USED) {
            window.__WJR_FLIP = null;
            body.classList.remove('is-flip-in');
            if (wipe) wipe.style.display = '';
          }
        }, 1400);
      }
    } catch (e) {}
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ---------- theme ---------- */
  try {
    var saved = localStorage.getItem('wjr-theme');
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch (e) {}
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    var syncTheme = function () {
      var light = document.documentElement.dataset.theme === 'light';
      var label = themeBtn.querySelector('.theme-label');
      if (label) label.textContent = light ? '深色' : '浅色';
      else themeBtn.textContent = light ? '深色' : '浅色';
      themeBtn.setAttribute('aria-label', light ? '切换深色模式' : '切换浅色模式');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = light ? '#eee8dc' : '#111216';
    };
    syncTheme();
    themeBtn.addEventListener('click', function () {
      var light = document.documentElement.dataset.theme === 'light';
      document.documentElement.dataset.theme = light ? 'dark' : 'light';
      try { localStorage.setItem('wjr-theme', document.documentElement.dataset.theme); } catch (e) {}
      syncTheme();
    });
  }

  /* ---------- page wipe: reveal on entry ---------- */
  function revealPage() {
    if (!wipe) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wipe.classList.remove('is-closing'); });
    });
  }
  document.addEventListener('DOMContentLoaded', revealPage);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) revealPage();
  });

  /* ---------- internal link transition ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute('href');
    if (a.hasAttribute('data-no-transition')) return;
    if (!href || href.charAt(0) === '#' || /^(mailto|tel):/.test(href)) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (!/\.html?$/.test(url.pathname)) return;
    e.preventDefault();
    var noWipe = window.__WJR_FLIPPING === true;
    window.__WJR_FLIPPING = false;
    if (wipe && !noWipe) wipe.classList.add('is-closing');
    setTimeout(function () { location.href = a.href; }, noWipe ? 0 : 620);
  });

  /* ---------- header / scroll ---------- */
  var head = $('.site-head');
  var progress = document.getElementById('scrollProgress');
  var coverPage = body.classList.contains('page-cover');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (head && !coverPage) head.classList.toggle('is-solid', y > 24);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal ---------- */
  var revealables = $all('[data-reveal],[data-lines],.hero,.works-band,.about-scene');
  function markIn(el) {
    var delay = el.getAttribute('data-d');
    if (delay && !reduce) {
      el.style.transitionDelay = delay + 'ms';
    }
    el.classList.add('is-in');
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          markIn(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(markIn);
  }

  /* ---------- random ---------- */
  function randomWork(e) {
    if (e) e.preventDefault();
    if (!works.length) return;
    var w = works[Math.floor(Math.random() * works.length)];
    location.href = WORKQ + encodeURIComponent(w.file);
  }
  $all('#randomButton,#footerRandom').forEach(function (b) { b.addEventListener('click', randomWork); });

  /* ---------- copy site ---------- */
  $all('#copySite').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = location.origin + '/';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('网站链接已复制'); }, function () { toast(url); });
      } else {
        toast(url);
      }
    });
  });

  /* =========================================================
     COVER
     ========================================================= */
  if (coverPage) {
    var cover = $('.cover');
    var enter = document.getElementById('enterButton');
    var leaving = false;
    function enterSite(e) {
      if (e) e.preventDefault();
      if (leaving) return;
      leaving = true;
      window.dispatchEvent(new CustomEvent('wjr:cover-leave'));
      if (cover) cover.classList.add('is-leaving');
      if (wipe) wipe.classList.add('is-closing');
      setTimeout(function () { location.href = 'home.html'; }, 760);
    }
    if (enter) enter.addEventListener('click', enterSite);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && /BUTTON|A/.test(document.activeElement.tagName)) return;
        e.preventDefault(); enterSite();
      }
    });
    // preserve old shared links: index.html?work=xxx -> detail
    var legacy = new URLSearchParams(location.search).get('work');
    if (legacy) location.replace(WORKQ + encodeURIComponent(legacy));
  }

  /* =========================================================
     HOME
     ========================================================= */
  if (body.classList.contains('page-home')) {
    var factNums = $all('[data-count]');
    if (factNums.length && !reduce) {
      var counted = false;
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting || counted) return;
          counted = true;
          factNums.forEach(function (el) {
            var target = parseInt(el.getAttribute('data-count'), 10) || 0;
            var start = performance.now();
            function tick(now) {
              var p = Math.min(1, (now - start) / 900);
              var v = Math.floor(target * (1 - Math.pow(1 - p, 3)));
              el.textContent = v < 10 ? pad(v) : String(v);
              if (p < 1) requestAnimationFrame(tick);
              else el.textContent = target < 10 ? pad(target) : String(target);
            }
            requestAnimationFrame(tick);
          });
          countIO.disconnect();
        });
      }, { threshold: 0.4 });
      countIO.observe($('.hero-facts') || document.body);
    }

    var selectedIds = [1, 6, 9, 12, 17, 24];
    var rows = document.getElementById('selectedRows');
    if (rows) {
      rows.innerHTML = selectedIds.map(function (id, i) {
        var w = works.filter(function (x) { return x.id === id; })[0];
        if (!w) return '';
        var href = WORKQ + encodeURIComponent(w.file);
        return '<article class="selected-card" data-cat="' + w.cat + '" data-reveal="fade" data-d="' + (i % 3) * 80 + '">'
          + '<a class="selected-visual" href="' + href + '" aria-label="查看作品：' + esc(w.title) + '" data-cursor="view" data-cursor-label="View">'
          + '<img src="' + w.src + '" alt="' + esc(w.title) + '" loading="lazy" decoding="async">'
          + '</a>'
          + '<div class="selected-copy">'
          + '<p class="selected-index"><span class="num">' + pad(w.id) + '</span><span class="dash"></span><span>' + esc(w.catLabel) + '</span></p>'
          + '<h3><a href="' + href + '">' + esc(w.title) + '</a></h3>'
          + '<p>' + esc(w.desc) + '。</p>'
          + '<a class="selected-link" href="' + href + '">查看这件作品 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></a>'
          + '</div></article>';
      }).join('');
      $all('[data-reveal]', rows).forEach(function (el) {
        if (!reduce) {
          var d = parseInt(el.getAttribute('data-d') || '0', 10);
          el.style.transitionDelay = d + 'ms';
        }
      });
      if ('IntersectionObserver' in window && !reduce) {
        var rio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); }
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
        $all('[data-reveal]', rows).forEach(function (el) { rio.observe(el); });
      } else {
        $all('[data-reveal]', rows).forEach(function (el) { el.classList.add('is-in'); });
      }
    }

    // gentle pointer parallax on hero image
    var heroBg = document.getElementById('heroBg');
    if (heroBg && !reduce && window.matchMedia('(pointer:fine)').matches) {
      var hero = $('.hero');
      hero.addEventListener('mousemove', function (e) {
        var nx = (e.clientX / window.innerWidth - .5) * 12;
        var ny = (e.clientY / window.innerHeight - .5) * 8;
        heroBg.style.transform = 'translate3d(' + nx + 'px,' + ny + 'px,0)';
      });
      hero.addEventListener('mouseleave', function () { heroBg.style.transform = 'none'; });
    }
  }

  /* =========================================================
     WORKS INDEX
     ========================================================= */
  if (body.classList.contains('page-works')) {
    var gallery = document.getElementById('gallery');
    var countEl = document.getElementById('resultsCount');
    var emptyEl = document.getElementById('emptyState');
    var searchEl = document.getElementById('searchInput');
    var clearEl = document.getElementById('searchClear');
    var filterEls = $all('.filter');
    var state = { cat: 'all', q: '' };

    function cardHTML(w, i) {
      var d = (i % 3) * 70;
      return '<article class="work-card" data-cat="' + w.cat + '" data-file="' + esc(w.file) + '" data-w="' + w.w + '" data-h="' + w.h + '">'
        + '<a class="work-open" data-cursor="view" data-cursor-label="View" href="' + WORKQ + encodeURIComponent(w.file) + '">'
        + '<div class="work-media" data-reveal="clip" data-d="' + d + '"><img src="' + w.src + '" alt="' + esc(w.title) + '" loading="lazy" decoding="async" style="aspect-ratio:' + w.w + '/' + w.h + ';height:auto"><span class="work-tint"></span><span class="work-badge">查看作品 ↗</span></div>'
        + '<div class="work-caption" data-reveal data-d="' + (d + 60) + '"><div><div class="work-title">' + esc(w.title) + '</div><div class="work-desc">' + esc(w.desc) + '</div></div>'
        + '<div class="work-meta"><span class="work-number">' + pad(w.id) + '</span>' + esc(w.catLabel) + '</div></div>'
        + '</a></article>';
    }

    function apply(animate) {
      animate = animate !== false;
      var q = state.q.trim().toLowerCase();
      var shown = 0;
      var before = {};
      hidePeek();
      if (animate && !reduce) {
        $all('.work-card', gallery).forEach(function (card) {
          if (!card.hidden) before[card.getAttribute('data-file')] = card.getBoundingClientRect();
        });
      }
      $all('.work-card', gallery).forEach(function (card) {
        var okCat = state.cat === 'all' || card.getAttribute('data-cat') === state.cat;
        var okQ = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
        var ok = okCat && okQ;
        card.hidden = !ok;
        if (ok) {
          shown++;
          if (animate) {
            card.classList.add('is-in');
            $all('[data-reveal]', card).forEach(function (el) { el.classList.add('is-in'); });
          }
        }
      });
      if (animate && !reduce) {
        requestAnimationFrame(function () {
          $all('.work-card', gallery).forEach(function (card) {
            if (card.hidden) return;
            var key = card.getAttribute('data-file');
            var old = before[key];
            if (old) {
              var now = card.getBoundingClientRect();
              var dx = old.left - now.left;
              var dy = old.top - now.top;
              if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                card.animate([
                  { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
                  { transform: 'translate(0,0)' }
                ], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' });
              }
            } else {
              card.animate([
                { opacity: 0, transform: 'translateY(18px) scale(.98)' },
                { opacity: 1, transform: 'none' }
              ], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
            }
          });
        });
      }
      if (countEl) countEl.textContent = '显示 ' + shown + ' 件作品';
      if (emptyEl) emptyEl.hidden = shown !== 0;
      if (clearEl) clearEl.hidden = !state.q;
      filterEls.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-filter') === state.cat ? 'true' : 'false');
      });
      var qs = [];
      if (state.cat !== 'all') qs.push('cat=' + encodeURIComponent(state.cat));
      if (q) qs.push('q=' + encodeURIComponent(q));
      history.replaceState(null, '', qs.length ? '?' + qs.join('&') : location.pathname);
    }

    var filterBar = document.getElementById('filterShell');
    function keepFilterInView() {
      if (!filterBar) return;
      var top = filterBar.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);
      if ((window.scrollY || 0) > top) {
        if (window.__lenis) window.__lenis.scrollTo(top - 76, { duration: 1.1 });
        else window.scrollTo({ top: top - 76, behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    if (gallery) {
      gallery.innerHTML = works.map(cardHTML).join('');
      // stagger reveal observer for cards
      if ('IntersectionObserver' in window && !reduce) {
        var gio = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-in'); gio.unobserve(en.target); }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
        $all('[data-reveal]', gallery).forEach(function (c) {
          var d = parseInt(c.getAttribute('data-d') || '0', 10);
          c.style.transitionDelay = d + 'ms';
          gio.observe(c);
        });
      } else {
        $all('[data-reveal]', gallery).forEach(function (c) { c.classList.add('is-in'); });
      }
    }

    /* ---------- 视图切换：网格 / 列表 ---------- */
    var viewBtns = $all('.view-btn');
    var view = 'grid';
    try { view = localStorage.getItem('wjr-view') === 'list' ? 'list' : 'grid'; } catch (e) {}
    var peek = null;
    var peekImg = null;
    var peekX = null;
    var peekY = null;
    var finePointer = window.matchMedia('(pointer:fine)').matches;

    function hidePeek() {
      if (peek) peek.classList.remove('is-on');
    }

    function setView(v) {
      view = v === 'list' ? 'list' : 'grid';
      if (gallery) gallery.classList.toggle('is-list', view === 'list');
      viewBtns.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-view') === view ? 'true' : 'false');
      });
      try { localStorage.setItem('wjr-view', view); } catch (e) {}
      hidePeek();
      if (window.ScrollTrigger && !reduce) window.ScrollTrigger.refresh();
    }
    viewBtns.forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
    });

    /* ---------- 光标跟随的作品预览（仅列表视图） ---------- */
    function ensurePeek() {
      if (peek) return;
      peek = document.createElement('div');
      peek.className = 'peek';
      peek.setAttribute('aria-hidden', 'true');
      peekImg = document.createElement('img');
      peekImg.alt = '';
      peek.appendChild(peekImg);
      document.body.appendChild(peek);
      if (window.gsap) {
        peekX = gsap.quickTo(peek, 'x', { duration: .45, ease: 'power3.out' });
        peekY = gsap.quickTo(peek, 'y', { duration: .45, ease: 'power3.out' });
      }
    }

    function movePeek(x, y) {
      if (!peek) return;
      var w = peek.offsetWidth || 320;
      var h = peek.offsetHeight || 400;
      var px = x + 36;
      if (px + w > window.innerWidth - 20) px = x - w - 36;
      var py = Math.max(16, Math.min(window.innerHeight - h - 16, y - h * 0.5));
      px = Math.max(16, px);
      if (peekX) { peekX(px); peekY(py); }
      else peek.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
    }

    function showPeek(card, x, y) {
      if (view !== 'list' || !finePointer || reduce) return;
      var pic = card.querySelector('img');
      if (!pic) return;
      ensurePeek();
      peekImg.style.aspectRatio = (card.getAttribute('data-w') || 4) + ' / ' + (card.getAttribute('data-h') || 3);
      if (peekImg.getAttribute('src') !== pic.getAttribute('src')) peekImg.src = pic.getAttribute('src');
      peek.classList.add('is-on');
      movePeek(x, y);
    }

    if (gallery && finePointer && !reduce) {
      gallery.addEventListener('pointerover', function (e) {
        if (e.pointerType !== 'mouse') return;
        var card = e.target.closest ? e.target.closest('.work-card') : null;
        if (!card || card.hidden) return;
        showPeek(card, e.clientX, e.clientY);
      });
      gallery.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !peek || !peek.classList.contains('is-on')) return;
        movePeek(e.clientX, e.clientY);
      });
      gallery.addEventListener('pointerout', function (e) {
        var card = e.target.closest ? e.target.closest('.work-card') : null;
        if (!card) return;
        if (e.relatedTarget && card.contains(e.relatedTarget)) return;
        hidePeek();
      });
    }

    /* ---------- 点击卡片：记下矩形，供详情页接力 ---------- */
    if (gallery) {
      gallery.addEventListener('click', function (e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var open = e.target.closest ? e.target.closest('.work-open') : null;
        if (!open) return;
        var card = open.closest('.work-card');
        var media = open.querySelector('.work-media');
        var pic = open.querySelector('img');
        if (!card || !media || !pic || view === 'list') return;
        if (window.innerWidth < 900) return;
        var r = media.getBoundingClientRect();
        if (r.width < 40 || r.height < 40) return;
        try {
          sessionStorage.setItem('wjr:flip', JSON.stringify({
            file: card.getAttribute('data-file'),
            x: Math.round(r.left), y: Math.round(r.top),
            w: Math.round(r.width), h: Math.round(r.height),
            t: Date.now()
          }));
          window.__WJR_FLIPPING = true;
        } catch (err) {}
      }, true);
    }

    filterEls.forEach(function (b) {
      b.addEventListener('click', function () {
        state.cat = b.getAttribute('data-filter');
        apply();
        keepFilterInView();
      });
    });
    var searchTimer = 0;
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        clearTimeout(searchTimer);
        state.q = searchEl.value;
        searchTimer = setTimeout(function () {
          apply();
          keepFilterInView();
        }, 150);
      });
    }
    if (clearEl) {
      clearEl.addEventListener('click', function () {
        state.q = '';
        if (searchEl) { searchEl.value = ''; searchEl.focus(); }
        apply();
        keepFilterInView();
      });
    }
    var reset = document.getElementById('resetFilters');
    if (reset) reset.addEventListener('click', function () {
      state.cat = 'all'; state.q = '';
      if (searchEl) searchEl.value = '';
      apply();
    });

    var params = new URLSearchParams(location.search);
    if (params.get('cat')) state.cat = params.get('cat');
    if (params.get('q')) { state.q = params.get('q'); if (searchEl) searchEl.value = state.q; }
    apply(false);
    setView(view);

    // sticky shadow follows the real header offset
    var fs = document.querySelector('.filter-shell');
    if (fs) {
      var fsTick = function () {
        var top = fs.getBoundingClientRect().top;
        fs.classList.toggle('is-stuck', top <= 78 && top > -fs.offsetHeight);
      };
      window.addEventListener('scroll', fsTick, { passive: true });
      window.addEventListener('resize', fsTick);
      fsTick();
    }
  }

  /* =========================================================
     WORK DETAIL
     ========================================================= */
  if (body.classList.contains('page-detail')) {
    var file = new URLSearchParams(location.search).get('work');
    var index = -1;
    works.forEach(function (w, i) { if (w.file === file) index = i; });
    if (index < 0) { location.replace('works.html'); return; }

    var current = index;
    var swapping = false;
    var img = document.getElementById('workImage');
    var link = document.getElementById('workOpen');
    var original = document.getElementById('openOriginal');
    var infoCol = document.getElementById('workInfo');
    var setText = function (id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
    var preloaded = {};

    function preload(src) {
      if (!src || preloaded[src]) return;
      preloaded[src] = true;
      var im = new Image();
      im.src = src;
    }

    function render(w, i) {
      if (img) { img.src = w.src; img.alt = w.title + '｜' + w.desc; }
      if (link) link.href = w.src;
      if (original) original.href = w.src;
      setText('workIndex', pad(w.id) + ' / ' + pad(works.length));
      setText('workCat', w.catLabel + ' / ' + (w.cat.toUpperCase()));
      setText('workTitle', w.title);
      setText('crumbTitle', w.title);
      setText('workDesc', w.desc + '。');
      setText('metricDir', w.catLabel);
      setText('metricRatio', w.w + ' : ' + w.h);
      setText('metricNo', 'W-' + pad(w.id));
      setText('workBody', '这张图按原始比例完整显示，海报与页面里的文字、栅格和细节都保留下来。可点击“查看原图”在新窗口放大核对，或继续浏览同方向的其他作品。');
      document.title = w.title + '｜WJR 王家瑞作品集';
      body.dataset.cat = w.cat;

      var prev = works[(i - 1 + works.length) % works.length];
      var next = works[(i + 1) % works.length];
      var prevLink = document.getElementById('prevWork');
      var nextLink = document.getElementById('nextWork');
      if (prevLink) {
        prevLink.href = WORKQ + encodeURIComponent(prev.file);
        var s = prevLink.querySelector('span'); if (s) s.textContent = prev.title;
      }
      if (nextLink) {
        nextLink.href = WORKQ + encodeURIComponent(next.file);
        var s2 = nextLink.querySelector('span'); if (s2) s2.textContent = next.title;
      }

      var rel = document.getElementById('relatedGrid');
      if (rel) {
        var same = works.filter(function (x) { return x.cat === w.cat && x.file !== w.file; });
        if (same.length < 3) {
          works.forEach(function (x) { if (x.file !== w.file && same.indexOf(x) === -1) same.push(x); });
        }
        rel.innerHTML = same.slice(0, 3).map(function (x) {
          return '<a class="related-card" data-cursor="view" data-cursor-label="View" href="' + WORKQ + encodeURIComponent(x.file) + '">'
            + '<div class="thumb"><img src="' + x.src + '" alt="' + esc(x.title) + '" loading="lazy" decoding="async"></div>'
            + '<span>' + pad(x.id) + ' / ' + esc(x.catLabel) + '</span><h3>' + esc(x.title) + '</h3></a>';
        }).join('');
      }
      preload(prev.src);
      preload(next.src);
    }

    $all('[data-detail-d]').forEach(function (el) {
      el.style.transitionDelay = el.getAttribute('data-detail-d') + 'ms';
    });
    render(works[index], index);

    /* 不整页刷新，直接在详情页内切换上下件 */
    function goTo(i, dir) {
      i = (i + works.length) % works.length;
      if (swapping || i === current) return;
      var target = works[i];
      current = i;
      history.pushState({ i: i }, '', WORKQ + encodeURIComponent(target.file));
      if (reduce || !window.gsap) { render(target, i); return; }
      var dx = dir > 0 ? 48 : -48;
      swapping = true;
      gsap.killTweensOf([img, infoCol]);
      gsap.to(img, { x: -dx, opacity: .3, duration: .22, ease: 'power2.in' });
      if (infoCol) gsap.to(infoCol, { opacity: .25, duration: .18, ease: 'power2.in' });
      setTimeout(function () {
        render(target, i);
        gsap.set(img, { x: dx });
        gsap.to(img, {
          x: 0, opacity: 1, duration: .55, ease: 'power3.out',
          onComplete: function () { if (img) img.style.transform = ''; swapping = false; }
        });
        if (infoCol) gsap.to(infoCol, {
          opacity: 1, duration: .4, ease: 'power2.out',
          onComplete: function () { infoCol.style.opacity = ''; }
        });
      }, 180);
    }

    var copyBtn = document.getElementById('copyWork');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var url = location.origin + location.pathname + '?work=' + encodeURIComponent(works[current].file);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { toast('作品链接已复制'); }, function () { toast(url); });
      } else toast(url);
    });
    var randomBtn = document.getElementById('detailRandom');
    if (randomBtn) randomBtn.addEventListener('click', randomWork);

    [[document.getElementById('prevWork'), -1], [document.getElementById('nextWork'), 1]].forEach(function (pair) {
      var el = pair[0];
      if (!el) return;
      el.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        goTo(current + pair[1], pair[1]);
      });
    });

    document.addEventListener('keydown', function (e) {
      if (body.classList.contains('lightbox-open')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1, 1); }
    });

    window.addEventListener('popstate', function () {
      var f = new URLSearchParams(location.search).get('work');
      var i = -1;
      works.forEach(function (x, n) { if (x.file === f) i = n; });
      if (i < 0) return;
      current = i;
      render(works[i], i);
    });
  }

  /* =========================================================
     ABOUT
     ========================================================= */
  if (body.classList.contains('page-about')) {
    var strip = document.getElementById('aboutStrip');
    if (strip) {
      var stripIds = [1, 4, 6, 9, 12, 17, 24, 26];
      strip.innerHTML = stripIds.map(function (id) {
        var x = works.filter(function (w) { return w.id === id; })[0];
        if (!x) return '';
        return '<a href="' + WORKQ + encodeURIComponent(x.file) + '" data-cursor="view" data-cursor-label="View" aria-label="' + esc(x.title) + '">'
          + '<img src="' + x.src + '" alt="' + esc(x.title) + '" loading="lazy" decoding="async">'
          + '<span class="strip-num">' + pad(x.id) + '</span></a>';
      }).join('');
    }
  }
})();


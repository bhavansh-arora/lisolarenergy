/* Lithium — site motion and interactions. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var CFG = window.LITHIUM_CONFIG || {};
  var lenis = null;
  var introDone = false;
  var heroQueue = [];

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
  }

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- Smooth scroll ---------- */
  function initLenis() {
    if (reduce || !window.Lenis || !hasGsap) return;
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: typeof target === 'number' ? 0 : -90, duration: 1.4 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- Intro: first-visit preloader, curtain on later pages ---------- */
  function intro() {
    var pre = $('.preloader');
    var curtain = $('.curtain');
    var returning = root.classList.contains('is-returning');
    try { sessionStorage.setItem('li-visited', '1'); } catch (e) {}

    if (!hasGsap) {
      if (pre) pre.remove();
      if (curtain) curtain.style.visibility = 'hidden';
      ready();
      return;
    }

    if (returning || reduce || !pre) {
      if (pre) pre.remove();
      var slats = $$('i', curtain);
      gsap.set(curtain, { visibility: 'visible' });
      gsap.set(slats, { scaleY: 1, transformOrigin: '50% 0%' });
      gsap.to(slats, { scaleY: 0, duration: reduce ? 0 : 0.75, ease: 'expo.inOut', stagger: reduce ? 0 : 0.045, delay: 0.05, onComplete: function () { gsap.set(curtain, { visibility: 'hidden' }); } });
      setTimeout(ready, reduce ? 0 : 380);
      return;
    }

    gsap.set(curtain, { visibility: 'hidden' });
    gsap.set($$('i', curtain), { scaleY: 0 });
    if (lenis) lenis.stop();
    sunrise(pre);
  }

  /* First visit: a sunrise that lands exactly where the live hero sun sits, then dissolves into it. */
  function sunrise(pre) {
    var W = window.innerWidth, H = window.innerHeight;
    var heroSun = $('.hero canvas[data-sun="hero"]');
    var mobile = W < 760 || H > W * 1.1;
    // Same geometry as the WebGL hero preset in sun.js (fractions of the screen height).
    var g = heroSun
      ? (mobile ? { x: 0.5, hz: 0.22, sy: -0.05, r: 0.17 } : { x: 0.66, hz: 0.27, sy: 0, r: 0.26 })
      : { x: 0.5, hz: 0.3, sy: 0.02, r: mobile ? 0.15 : 0.2 };
    var horizon = Math.round(H * (1 - g.hz));
    var cx = W * g.x, cy = H * (1 - (g.hz + g.sy)), D = 2 * g.r * H;
    pre.style.setProperty('--hz', horizon + 'px');
    pre.style.setProperty('--sx', cx + 'px');
    pre.style.setProperty('--sy', cy + 'px');
    pre.style.setProperty('--d', D + 'px');

    // Perspective field of panels below the horizon, converging on the sun.
    var svg = $('.pre__grid', pre), gh = H - horizon, lines = '';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + gh);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (var k = -18; k <= 18; k++) {
      var bx = cx + k * W * 0.085;
      lines += '<path d="M' + (cx + k * 3).toFixed(1) + ' 0L' + bx.toFixed(1) + ' ' + gh + '"/>';
    }
    for (var n = 1; n <= 9; n++) {
      var y = gh * (1 - 1 / (1 + n * n * 0.09));
      lines += '<path d="M0 ' + y.toFixed(1) + 'H' + W + '"/>';
    }
    svg.innerHTML = lines;
    var paths = $$('path', svg);
    paths.forEach(function (pth) { var L = pth.getTotalLength(); pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L; });

    var count = $('[data-preload-count]', pre);
    var status = $('[data-pre-status]', pre);
    var o = { v: 0 };
    var phases = [[0, 'Before dawn'], [22, 'First light'], [55, 'Sunrise · Yucaipa'], [92, 'Full power']];
    var tl = gsap.timeline({ onComplete: function () { pre.remove(); if (lenis) lenis.start(); } });
    tl.fromTo($('.pre__horizon', pre), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.out' }, 0.1)
      .fromTo($$('.pre__top, .pre__bottom', pre), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08 }, 0.2)
      .fromTo($('.pre__count', pre), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.25)
      .to(o, { v: 100, duration: 2.3, ease: 'power2.inOut', onUpdate: function () {
        var v = Math.round(o.v);
        count.textContent = String(v).padStart(3, '0');
        for (var i = phases.length - 1; i >= 0; i--) if (v >= phases[i][0]) { if (status.textContent !== phases[i][1]) status.textContent = phases[i][1]; break; }
      } }, 0.3)
      .to($('.pre__bar i', pre), { scaleX: 1, duration: 2.3, ease: 'power2.inOut' }, 0.3)
      .fromTo($('.pre__sun', pre), { y: D * 0.95 }, { y: 0, duration: 2.4, ease: 'power3.out' }, 0.45)
      .fromTo($('.pre__sky', pre), { opacity: 0 }, { opacity: 1, duration: 2.2, ease: 'power1.inOut' }, 0.45)
      .fromTo($('.pre__haze', pre), { opacity: 0, scaleX: 0.4 }, { opacity: 1, scaleX: 1, duration: 2, ease: 'power2.out' }, 0.6)
      .fromTo($('.pre__refl', pre), { opacity: 0, scaleY: 0.2 }, { opacity: 1, scaleY: 1, duration: 1.8, ease: 'power2.out' }, 0.9)
      .to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: { each: 0.025, from: 'center' } }, 0.5)
      .fromTo($('.pre__stars', pre), { opacity: 0.9 }, { opacity: 0.1, duration: 2.4, ease: 'power1.in' }, 0.3)
      .to($$('.pre__count, .pre__top, .pre__bottom', pre), { opacity: 0, y: -14, duration: 0.45, ease: 'power2.in', stagger: 0.04 }, 2.65);
    if (heroSun) {
      // Hand-off: the live WebGL sun is already drawn underneath in the same place.
      tl.to(pre, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 2.9).add(ready, 3.0);
    } else {
      tl.to($('.pre__sun', pre), { scale: 3.2, duration: 0.9, ease: 'expo.in' }, 2.75)
        .to(pre, { opacity: 0, duration: 0.6, ease: 'power2.inOut' }, 3.35).add(ready, 3.3);
    }
  }

  function ready() {
    if (introDone) return;
    introDone = true;
    heroQueue.forEach(function (fn) { fn(); });
    heroQueue = [];
    root.classList.add('is-ready');
  }

  function onReady(fn) { if (introDone) fn(); else heroQueue.push(fn); }

  /* ---------- Page transitions ---------- */
  function initTransitions() {
    var curtain = $('.curtain');
    if (!hasGsap || reduce || !curtain) return;
    doc.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download') || /^(mailto:|tel:|sms:|#|javascript:)/.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      closeMenu();
      gsap.set(curtain, { visibility: 'visible' });
      gsap.fromTo($$('i', curtain), { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: 0.6, ease: 'expo.inOut', stagger: 0.045, onComplete: function () { location.href = url.href; } });
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) { gsap.set($$('i', curtain), { scaleY: 0 }); gsap.set(curtain, { visibility: 'hidden' }); } });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var header = $('[data-header]');
    var dock = $('[data-dock]');
    if (!header) return;
    var last = 0;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle('is-solid', y > 40);
      var hide = y > last && y > 320 && !root.classList.contains('menu-open');
      header.classList.toggle('is-hidden', hide);
      if (dock) dock.classList.toggle('is-visible', y > window.innerHeight * 0.55);
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    $$('[data-to-top]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); scrollTo(0); }); });
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (id.length < 2 || a.hasAttribute('data-to-top')) return;
      a.addEventListener('click', function (e) { var t = $(id); if (t) { e.preventDefault(); scrollTo(t); } });
    });
  }

  /* ---------- Mobile menu ---------- */
  var menuTl = null;
  function initMenu() {
    var btn = $('[data-menu-toggle]');
    var menu = $('[data-menu]');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () { root.classList.contains('menu-open') ? closeMenu() : openMenu(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }
  function openMenu() {
    var menu = $('[data-menu]'), btn = $('[data-menu-toggle]');
    root.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    if (!hasGsap) { menu.style.visibility = 'visible'; menu.style.clipPath = 'none'; return; }
    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline()
      .set(menu, { visibility: 'visible' })
      .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
      .fromTo($$('.menu__nav a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.05, ease: 'expo.out' }, 0.35)
      .fromTo($('.menu__foot', menu), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, 0.6);
  }
  function closeMenu() {
    var menu = $('[data-menu]'), btn = $('[data-menu-toggle]');
    if (!menu || !root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    if (!hasGsap) { menu.style.visibility = 'hidden'; return; }
    if (menuTl) menuTl.kill();
    menuTl = gsap.timeline()
      .to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' })
      .set(menu, { visibility: 'hidden' });
  }

  /* ---------- Cursor ---------- */
  function initCursor() {
    if (!fine || reduce || !hasGsap) return;
    var c = $('.cursor');
    if (!c) return;
    root.classList.add('has-cursor');
    var dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), label = $('.cursor__label', c);
    var dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    var shown = false;
    window.addEventListener('pointermove', function (e) {
      if (!shown) { shown = true; gsap.set([dot, ring], { x: e.clientX, y: e.clientY }); gsap.to(c, { opacity: 1, duration: 0.4 }); }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    }, { passive: true });
    doc.addEventListener('pointerover', function (e) {
      var t = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button, label, input[type="range"], select');
      c.classList.toggle('is-label', !!t);
      c.classList.toggle('is-hover', !t && !!link);
      label.textContent = t ? t.getAttribute('data-cursor') : '';
    });
    doc.addEventListener('pointerleave', function () { gsap.to(c, { opacity: 0, duration: 0.3 }); });
    doc.addEventListener('pointerenter', function () { gsap.to(c, { opacity: 1, duration: 0.3 }); });
  }

  /* ---------- Magnetic ---------- */
  function initMagnetic() {
    if (!fine || reduce || !hasGsap) return;
    $$('[data-magnetic]').forEach(function (el) {
      var x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      var y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.28);
        y((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('pointerleave', function () { x(0); y(0); });
    });
  }

  /* ---------- Split-line headings ---------- */
  function initSplit() {
    var els = $$('[data-split]');
    if (!hasGsap || !window.SplitText || reduce) { els.forEach(function (el) { el.classList.add('is-split'); }); return; }
    els.forEach(function (el) {
      var isHero = el.getAttribute('data-split') === 'hero';
      var played = false;
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: function (self) {
          el.classList.add('is-split');
          if (played) return;
          var anim = gsap.from(self.lines, {
            yPercent: 135,
            rotate: 2.5,
            transformOrigin: '0% 100%',
            duration: 1.35,
            ease: 'expo.out',
            stagger: 0.1,
            paused: true,
            onComplete: function () { played = true; }
          });
          if (isHero) onReady(function () { anim.play(); });
          else ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { anim.play(); } });
          return anim;
        }
      });
    });
  }

  /* ---------- Reveals ---------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseFloat(el.getAttribute('data-delay') || 0);
        if (delay) el.style.transitionDelay = delay + 's';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) {
      // Above-the-fold intro content waits for the preloader, then reveals together.
      if (el.closest('.hero, .page-hero, .funnel')) {
        onReady(function () {
          var delay = parseFloat(el.getAttribute('data-delay') || 0);
          if (delay) el.style.transitionDelay = delay + 's';
          el.classList.add('is-in');
        });
      } else io.observe(el);
    });
  }

  function initClip() {
    if (!hasGsap || reduce) return;
    $$('[data-clip]').forEach(function (el) {
      gsap.to(el, { clipPath: 'inset(0% 0% 0% 0% round ' + getComputedStyle(el).borderRadius + ')', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
  }

  function initParallax() {
    if (!hasGsap || reduce) return;
    $$('[data-parallax]').forEach(function (el) {
      var img = el.tagName === 'IMG' ? el : $('img', el);
      var amt = parseFloat(el.getAttribute('data-parallax')) || 8;
      gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      if (!hasGsap || reduce) { el.textContent = fmt(end); return; }
      el.textContent = fmt(0);
      var o = { v: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', onUpdate: function () { el.textContent = fmt(o.v); } });
      } });
    });
  }

  /* ---------- Scroll-scrubbed words ---------- */
  function wrapWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var frag = doc.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
          var s = doc.createElement('span');
          s.className = 'scrub-word';
          s.textContent = part;
          frag.appendChild(s);
        });
        child.parentNode.replaceChild(frag, child);
      } else if (child.nodeType === 1) wrapWords(child);
    });
  }
  function initScrub() {
    $$('[data-scrub]').forEach(function (el) {
      wrapWords(el);
      var words = $$('.scrub-word', el);
      if (!hasGsap || reduce) { words.forEach(function (w) { w.style.opacity = 1; }); return; }
      gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: 0.6 } });
    });
  }

  /* ---------- Horizontal process ---------- */
  function initHScroll() {
    if (!hasGsap) return;
    $$('[data-hscroll]').forEach(function (sec) {
      var track = $('.hscroll__track', sec);
      var bar = $('.hscroll__progress i', sec);
      var mm = gsap.matchMedia();
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', function () {
        sec.classList.add('is-pinned');
        root.classList.add('has-hscroll');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        var tw = gsap.to(track, {
          x: function () { return -dist(); },
          ease: 'none',
          scrollTrigger: {
            trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (self) { if (bar) bar.style.transform = 'scaleX(' + self.progress + ')'; }
          }
        });
        return function () { tw.kill(); gsap.set(track, { x: 0 }); sec.classList.remove('is-pinned'); root.classList.remove('has-hscroll'); };
      });
    });
  }

  /* ---------- Process timeline ---------- */
  function initTimeline() {
    var tl = $('[data-timeline]');
    if (!tl || !hasGsap) return;
    var rail = $('.timeline__rail i', tl);
    if (!reduce) gsap.to(rail, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 60%', end: 'bottom 60%', scrub: true } });
    else rail.style.transform = 'none';
    $$('.tl-step', tl).forEach(function (step) {
      ScrollTrigger.create({ trigger: step, start: 'top 60%', end: 'bottom 60%', toggleClass: 'is-active' });
    });
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    if (!hasGsap) return;
    $$('[data-marquee]').forEach(function (m) {
      var track = $('.marquee__track', m);
      var group = $('.marquee__group', track);
      if (!group) return;
      track.appendChild(group.cloneNode(true)).setAttribute('aria-hidden', 'true');
      if (reduce) return;
      var dir = m.getAttribute('data-marquee') === 'right' ? 1 : -1;
      var tw = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: parseFloat(m.getAttribute('data-speed')) || 34, ease: 'none', repeat: -1 });
      if (lenis) {
        lenis.on('scroll', function (e) {
          var boost = 1 + Math.min(Math.abs(e.velocity) / 6, 5);
          gsap.to(tw, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: function () { gsap.to(tw, { timeScale: 1, duration: 1.2 }); } });
        });
      }
    });
  }

  /* ---------- Accordion ---------- */
  function initAccordion() {
    $$('.acc').forEach(function (acc) {
      var btn = $('.acc__btn', acc), panel = $('.acc__panel', acc);
      btn.addEventListener('click', function () {
        var open = !acc.classList.contains('is-open');
        acc.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
        if (hasGsap && !reduce) gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.7, ease: 'expo.out', onComplete: function () { ScrollTrigger.refresh(); } });
        else panel.style.height = open ? 'auto' : '0px';
      });
    });
  }

  /* ---------- Hover image preview ---------- */
  function initPreview() {
    var list = $('[data-preview-list]');
    var box = $('.preview');
    if (!list || !box || !fine || !hasGsap) return;
    var imgs = $$('img', box);
    var x = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' }), y = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
    list.addEventListener('pointermove', function (e) { x(e.clientX + 30); y(e.clientY - 190); });
    $$('[data-preview]', list).forEach(function (row) {
      row.addEventListener('pointerenter', function () {
        var i = +row.getAttribute('data-preview');
        imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
        gsap.to(box, { opacity: 1, scale: 1, rotate: (i % 2 ? 4 : -4), duration: 0.6, ease: 'expo.out' });
      });
    });
    list.addEventListener('pointerleave', function () { gsap.to(box, { opacity: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' }); });
  }

  /* ---------- Testimonials ---------- */
  function initQuotes() {
    $$('[data-quotes]').forEach(function (wrap) {
      var items = $$('.quote', wrap);
      var count = $('.quotes__count', wrap);
      var i = 0, timer;
      function show(n, instant) {
        i = (n + items.length) % items.length;
        if (count) count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
        // Every quote is driven on every change, so a rapid click can never leave two visible.
        items.forEach(function (q, k) {
          var on = k === i;
          q.classList.toggle('is-active', on);
          q.setAttribute('aria-hidden', String(!on));
          if (!hasGsap || reduce || instant) { if (hasGsap) gsap.killTweensOf(q); q.style.opacity = on ? 1 : 0; q.style.transform = 'none'; return; }
          gsap.killTweensOf(q);
          if (on) gsap.fromTo(q, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.32, ease: 'expo.out' });
          else gsap.to(q, { opacity: 0, y: -18, duration: 0.3, ease: 'power2.in' });
        });
      }
      function auto() { clearInterval(timer); timer = setInterval(function () { show(i + 1); }, 7000); }
      var p = $('[data-prev]', wrap), n = $('[data-next]', wrap);
      if (p) p.addEventListener('click', function () { show(i - 1); auto(); });
      if (n) n.addEventListener('click', function () { show(i + 1); auto(); });
      show(0, true);
      if (!reduce) auto();
    });
  }

  /* ---------- Sun clock (Yucaipa sunrise / sunset, computed live) ---------- */
  function sunTimes(date, lat, lng) {
    var rad = Math.PI / 180;
    var J = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12) / 86400000 + 2440587.5;
    var n = Math.round(J - 2451545.0 + 0.0008);
    var Js = n - lng / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
    var cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    var w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
    var toDate = function (j) { return new Date((j - 2440587.5) * 86400000); };
    return { rise: toDate(Jt - w / 360), set: toDate(Jt + w / 360) };
  }
  function initSunclock() {
    var els = $$('[data-sunclock]');
    if (!els.length) return;
    var tz = CFG.timezone || 'America/Los_Angeles';
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch (e) { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }); }
    function tick() {
      var now = new Date();
      var t = sunTimes(now, CFG.lat || 34.0336, CFG.lng || -117.0431);
      var up = now > t.rise && now < t.set;
      var mins = Math.round((t.set - t.rise) / 60000);
      els.forEach(function (el) {
        var kind = el.getAttribute('data-sunclock');
        if (kind === 'footer') el.textContent = 'Yucaipa, CA · ' + fmt.format(now) + ' PT';
        else if (kind === 'status') {
          el.innerHTML = '<span class="pulse-dot" style="background:' + (up ? '#3ddc84' : '#f2b236') + '"></span>' + (up ? 'Sun is up in Yucaipa · panels producing' : 'Sun is down in Yucaipa · batteries on duty');
        } else {
          el.innerHTML = 'Sunrise <b>' + fmt.format(t.rise) + '</b> · Sunset <b>' + fmt.format(t.set) + '</b> · <b>' + Math.floor(mins / 60) + 'h ' + (mins % 60) + 'm</b> of sun today';
        }
      });
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Instant estimator ---------- */
  function animateNumber(el, to, formatter) {
    var from = parseFloat(el.getAttribute('data-v') || '0');
    el.setAttribute('data-v', to);
    if (!hasGsap || reduce) { el.textContent = formatter(to); return; }
    var o = { v: from };
    gsap.to(o, { v: to, duration: 0.8, ease: 'expo.out', overwrite: true, onUpdate: function () { el.textContent = formatter(o.v); } });
  }
  function setRangeFill(r) {
    var p = ((r.value - r.min) / (r.max - r.min)) * 100;
    r.style.setProperty('--p', p + '%');
  }
  function initEstimator() {
    $$('[data-estimator]').forEach(function (box) {
      var range = $('input[type="range"]', box);
      var billEl = $('[data-bill]', box);
      var go = $('[data-estimate-go]', box);
      if (!range || !window.LithiumCalc) return;
      function update() {
        setRangeFill(range);
        var bill = +range.value;
        var r = LithiumCalc.estimate(bill);
        billEl.textContent = '$' + bill.toLocaleString('en-US');
        var m = LithiumCalc.money;
        $$('[data-out]', box).forEach(function (el) {
          var k = el.getAttribute('data-out');
          if (k === 'systemKw') animateNumber(el, r.systemKw, function (v) { return v.toFixed(1) + ' kW'; });
          if (k === 'panels') animateNumber(el, r.panels, function (v) { return Math.round(v) + ''; });
          if (k === 'year1') animateNumber(el, r.year1, function (v) { return m(v); });
          if (k === 'net') animateNumber(el, r.net, function (v) { return m(v); });
          if (k === 'payback') animateNumber(el, r.payback || 0, function (v) { return v.toFixed(1) + ' yrs'; });
        });
      }
      range.addEventListener('input', update);
      update();
      if (go) go.addEventListener('click', function () {
        try {
          var s = JSON.parse(localStorage.getItem('li-quote') || '{}');
          s.bill = +range.value;
          localStorage.setItem('li-quote', JSON.stringify(s));
        } catch (e) {}
      });
    });
    $$('input[type="range"].range').forEach(function (r) { setRangeFill(r); r.addEventListener('input', function () { setRangeFill(r); }); });
  }


  /* ---------- Variable-width headline (hero) ---------- */
  function initVariableType() {
    $$('[data-vt]').forEach(function (root) {
      var chars = [];
      // Wrap each letter (except inside <em>, which stays a serif word) in its own span.
      $$('.vt-line', root).forEach(function (line) {
        Array.prototype.slice.call(line.childNodes).forEach(function (node) {
          if (node.nodeType !== 3) return;
          var frag = doc.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span');
            w.className = 'vt-word';
            part.split('').forEach(function (ch) {
              var c = doc.createElement('span');
              c.className = 'vt-ch';
              c.textContent = ch;
              w.appendChild(c);
              chars.push(c);
            });
            frag.appendChild(w);
          });
          line.replaceChild(frag, node);
        });
      });
      var ems = $$('em', root);
      if (!hasGsap || reduce) return;
      // Intro: letters unfold from condensed/thin to expanded/heavy.
      gsap.set(chars, { '--w': 62, '--g': 120, opacity: 0, yPercent: 40 });
      gsap.set(ems, { opacity: 0, yPercent: 30 });
      onReady(function () {
        gsap.to(chars, { '--w': 125, '--g': 800, opacity: 1, yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.035 });
        gsap.to(ems, { opacity: 1, yPercent: 0, duration: 1.4, ease: 'expo.out', delay: 0.45 });
      });
      if (!fine) return;
      // Cursor proximity: nearby letters squeeze thin, far letters stay heavy.
      var cur = chars.map(function () { return { w: 125, g: 800 }; });
      var active = false, raf = 0, mx = -9999, my = -9999, armed = false;
      onReady(function () { setTimeout(function () { armed = true; }, 1900); });
      var hero = root.closest('.hero') || root;
      hero.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; active = true; if (armed && !raf) raf = requestAnimationFrame(tick); });
      hero.addEventListener('pointerleave', function () { mx = -9999; my = -9999; if (armed && !raf) raf = requestAnimationFrame(tick); });
      function tick() {
        raf = 0;
        var moving = false;
        chars.forEach(function (c, i) {
          var r = c.getBoundingClientRect();
          var d = Math.hypot(mx - (r.left + r.width / 2), my - (r.top + r.height / 2));
          var t = Math.exp(-(d * d) / (2 * 150 * 150));
          var tw = 125 - 63 * t, tg = 800 - 560 * t;
          cur[i].w += (tw - cur[i].w) * 0.16;
          cur[i].g += (tg - cur[i].g) * 0.16;
          if (Math.abs(tw - cur[i].w) > 0.2) moving = true;
          c.style.setProperty('--w', cur[i].w.toFixed(1));
          c.style.setProperty('--g', cur[i].g.toFixed(0));
        });
        if (moving || active) { active = false; raf = requestAnimationFrame(tick); }
      }
    });
  }

  /* ---------- Hero dive: content lifts away, the sun fills the screen ---------- */
  function initDive() {
    var wrap = $('[data-dive]');
    if (!wrap || reduce) return;
    var parts = $$('[data-dive-content]', wrap);
    var flash = $('.hero__flash', wrap);
    var raf = 0;
    function update() {
      raf = 0;
      var r = wrap.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      if (total < 20) return;
      var p = Math.max(0, Math.min(1, -r.top / total));
      var lift = Math.min(1, p / 0.55);
      parts.forEach(function (el, i) {
        el.style.transform = lift > 0.001 ? 'translate3d(0,' + (-lift * (18 + i * 10)).toFixed(2) + 'vh,0) scale(' + (1 - lift * 0.06).toFixed(4) + ')' : '';
        el.style.opacity = lift > 0.001 ? Math.max(0, 1 - lift * 1.25).toFixed(3) : '';
        el.style.filter = lift > 0.01 ? 'blur(' + (lift * 6).toFixed(1) + 'px)' : '';
      });
      if (flash) flash.style.opacity = Math.max(0, Math.min(1, (p - 0.78) / 0.2)).toFixed(3);
    }
    function req() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    update();
  }

  /* ---------- Band that grows from a framed card to full bleed ---------- */
  function initExpand() {
    if (reduce) return;
    $$('[data-expand]').forEach(function (sec) {
      var raf = 0;
      function update() {
        raf = 0;
        var r = sec.getBoundingClientRect(), vh = window.innerHeight;
        var p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.95)));
        var e = 1 - Math.pow(1 - p, 3);
        sec.style.setProperty('--ci', ((1 - e) * 12).toFixed(2) + '%');
        sec.style.setProperty('--cx', ((1 - e) * (window.innerWidth < 760 ? 5 : 14)).toFixed(2) + '%');
        sec.style.setProperty('--cr', ((1 - e) * 28).toFixed(1) + 'px');
        sec.style.setProperty('--cs', (1 + (1 - e) * 0.18).toFixed(4));
      }
      function req() { if (!raf) raf = requestAnimationFrame(update); }
      window.addEventListener('scroll', req, { passive: true });
      window.addEventListener('resize', req, { passive: true });
      update();
    });
  }


  /* ---------- Sticky image stack: the photo follows the service you are reading ---------- */
  function initStack() {
    $$('[data-stack]').forEach(function (stack) {
      var imgs = $$('[data-stack-img]', stack);
      var count = $('[data-stack-count]', stack);
      var items = $$('[data-stack-item]', stack);
      if (!imgs.length || !('IntersectionObserver' in window)) return;
      function show(i) {
        imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); im.classList.toggle('is-past', k < i); });
        if (count) count.textContent = String(i + 1).padStart(2, '0');
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) show(+en.target.getAttribute('data-stack-item')); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      items.forEach(function (it) { io.observe(it); });
    });
  }


  /* ---------- Footer: the sign-off letters unfold as you reach the end ---------- */
  function initFooter() {
    var foot = $('[data-footer]');
    var mega = $('[data-footer-mega]');
    if (!foot || !mega) return;
    var chars = [];
    $$('span', mega).forEach(function (word) {
      var t = word.textContent; word.textContent = '';
      t.split('').forEach(function (ch) { var c = doc.createElement('span'); c.className = 'vt-ch'; c.textContent = ch; word.appendChild(c); chars.push(c); });
    });
    if (reduce || !hasGsap) return;
    var mx = -9999, my = -9999, raf = 0, cur = chars.map(function () { return { w: 62, g: 200 }; });
    function frame() {
      raf = 0;
      var r = foot.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh - r.top) / Math.max(1, Math.min(r.height, vh))));
      foot.style.setProperty('--fp', p.toFixed(3));
      var moving = false;
      chars.forEach(function (c, k) {
        var local = Math.max(0, Math.min(1, p * 1.7 - (k / chars.length) * 0.7));
        var e = 1 - Math.pow(1 - local, 3);
        var tw = 62 + 63 * e, tg = 200 + 600 * e;
        if (fine && mx > -9000) {
          var b = c.getBoundingClientRect();
          var d = Math.hypot(mx - (b.left + b.width / 2), my - (b.top + b.height / 2));
          var t = Math.exp(-(d * d) / (2 * 140 * 140));
          tw -= 60 * t * e; tg -= 520 * t * e;
        }
        cur[k].w += (tw - cur[k].w) * 0.18; cur[k].g += (tg - cur[k].g) * 0.18;
        if (Math.abs(tw - cur[k].w) > 0.2) moving = true;
        c.style.setProperty('--w', cur[k].w.toFixed(1));
        c.style.setProperty('--g', cur[k].g.toFixed(0));
      });
      if (moving) raf = requestAnimationFrame(frame);
    }
    function req() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    mega.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; req(); });
    mega.addEventListener('pointerleave', function () { mx = -9999; my = -9999; req(); });
    frame();
  }

  /* ---------- Boot ---------- */
  function boot() {
    initLenis();
    initHeader();
    initMenu();
    initCursor();
    initMagnetic();
    initTransitions();
    initReveal();
    initClip();
    initParallax();
    initCounters();
    initScrub();
    initHScroll();
    initTimeline();
    initMarquee();
    initAccordion();
    initQuotes();
    initSunclock();
    initEstimator();
    initVariableType();
    initDive();
    initExpand();
    initStack();
    initFooter();
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    fontsReady.then(function () { initSplit(); intro(); if (hasGsap) ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
    window.Lithium = { scrollTo: scrollTo, onReady: onReady, lenis: function () { return lenis; }, animateNumber: animateNumber, setRangeFill: setRangeFill };
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* Lithium — site interactions. Light, dependency-free. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CFG = window.LITHIUM_CONFIG || {};
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  /* ---------- Small helpers shared with page scripts ---------- */
  function scrollTo(target) {
    var y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  function animateNumber(el, to, fmt) {
    var from = parseFloat(el.getAttribute('data-v') || '0');
    el.setAttribute('data-v', to);
    if (reduce || !isFinite(from)) { el.textContent = fmt(to); return; }
    var start = performance.now(), dur = 700;
    if (el.__raf) cancelAnimationFrame(el.__raf);
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(2, -10 * t);
      el.textContent = fmt(from + (to - from) * (t === 1 ? 1 : e));
      if (t < 1) el.__raf = requestAnimationFrame(step);
    })(start);
  }
  function setRangeFill(r) { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); }

  /* ---------- Header + dock ---------- */
  function initHeader() {
    var header = $('[data-header]'), dock = $('[data-dock]');
    var lastY = 0;
    function onScroll() {
      var y = window.scrollY;
      if (header) {
        header.classList.toggle('is-solid', y > 24);
        header.classList.toggle('is-hidden', y > lastY && y > 400 && !root.classList.contains('menu-open'));
      }
      lastY = y;
      if (dock) dock.classList.toggle('is-visible', y > window.innerHeight * 0.6);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    var btn = $('[data-menu-toggle]'), menu = $('[data-menu]');
    if (!btn || !menu) return;
    function set(open) {
      root.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      doc.body.style.overflow = open ? 'hidden' : '';
    }
    btn.addEventListener('click', function () { set(!root.classList.contains('menu-open')); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    $$('[data-stagger]').forEach(function (group) {
      $$(':scope > *', group).forEach(function (el, i) {
        if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
        el.style.setProperty('--d', (i * 0.07).toFixed(2) + 's');
      });
    });
    var els = $$('[data-reveal]');
    els.forEach(function (el) { var d = el.getAttribute('data-delay'); if (d) el.style.setProperty('--d', d + 's'); });
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    var els = $$('[data-count]');
    var fmt = function (el) { var dec = +(el.getAttribute('data-decimals') || 0); return function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }; };
    if (!('IntersectionObserver' in window) || reduce) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = parseFloat(el.getAttribute('data-count'));
        el.setAttribute('data-v', 0);
        animateNumber(el, to, fmt(el));
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { el.textContent = '0'; io.observe(el); });
  }

  /* ---------- Accordion ---------- */
  function initAccordion() {
    $$('.acc').forEach(function (acc) {
      var btn = $('.acc__btn', acc);
      btn.addEventListener('click', function () {
        var open = !acc.classList.contains('is-open');
        acc.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------- Sticky image services ---------- */
  function initStack() {
    $$('[data-stack]').forEach(function (stack) {
      var imgs = $$('[data-stack-img]', stack), count = $('[data-stack-count]', stack);
      if (!imgs.length || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = +en.target.getAttribute('data-stack-item');
          imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === i); });
          if (count) count.textContent = String(i + 1).padStart(2, '0');
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      $$('[data-stack-item]', stack).forEach(function (it) { io.observe(it); });
    });
  }

  /* ---------- Sunrise / sunset in Yucaipa ---------- */
  function sunTimes(date, lat, lng) {
    var rad = Math.PI / 180;
    var J = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12) / 86400000 + 2440587.5;
    var n = Math.round(J - 2451545.0 + 0.0008), Js = n - lng / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.44 * rad));
    var cosW = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    var w = Math.acos(Math.max(-1, Math.min(1, cosW))) / rad;
    var d = function (j) { return new Date((j - 2440587.5) * 86400000); };
    return { rise: d(Jt - w / 360), set: d(Jt + w / 360) };
  }
  function ptHour(now) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: CFG.timezone || 'America/Los_Angeles' }).formatToParts(now);
      var h = +parts.find(function (p) { return p.type === 'hour'; }).value, m = +parts.find(function (p) { return p.type === 'minute'; }).value;
      return h + m / 60;
    } catch (e) { return now.getHours() + now.getMinutes() / 60; }
  }
  function initSunclock() {
    var els = $$('[data-sunclock]');
    if (!els.length) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: CFG.timezone || 'America/Los_Angeles' }); } catch (e) { fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }); }
    function tick() {
      var now = new Date(), t = sunTimes(now, CFG.lat || 34.0336, CFG.lng || -117.0431);
      els.forEach(function (el) {
        var kind = el.getAttribute('data-sunclock');
        if (kind === 'footer') el.textContent = 'Yucaipa, CA · ' + fmt.format(now) + ' PT';
        else el.textContent = 'Sunrise ' + fmt.format(t.rise) + ' · Sunset ' + fmt.format(t.set);
      });
    }
    tick(); setInterval(tick, 30000);
  }

  /* ---------- Hero live widgets: an example Lithium home, right now in Yucaipa ---------- */
  function initLive() {
    var box = $('[data-live]');
    if (!box || !window.LithiumHouse) return;
    var spark = $('[data-live-spark]', box);
    if (spark) {
      var pts = [], W = 200, H = 34;
      for (var h = 5; h <= 20; h += 0.25) { var s = window.LithiumHouse.state(h, false).solar / 8.2; pts.push([((h - 5) / 15) * W, H - 2 - s * (H - 6)]); }
      var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
      spark.innerHTML = '<defs><linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f59e0b" stop-opacity=".35"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></linearGradient></defs><path class="area" d="' + line + 'L' + W + ' ' + H + 'L0 ' + H + 'Z"/><path d="' + line + '"/><circle r="3.5" fill="#e8930c" stroke="#fff" stroke-width="1.5" data-live-dot/>';
      spark.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    }
    function set(k, v) { $$('[data-live="' + k + '"]', box).forEach(function (el) { el.textContent = v; }); }
    function tick() {
      var h = ptHour(new Date()), hh = h < 5.5 ? 5.5 : Math.min(24, h); // the model day runs 5:30 AM to midnight
      var s = window.LithiumHouse.state(hh, false);
      set('solar', s.solar.toFixed(1));
      set('batt', Math.round(s.soc * 100));
      set('battstate', s.toBatt > 0.1 ? 'Charging' : s.fromBatt > 0.1 ? 'Powering home' : s.soc > 0.97 ? 'Full' : 'Standby');
      set('saved', '$' + s.saved.toFixed(2));
      set('solarstate', s.solar > 0.1 ? 'Producing' : 'Sun is down');
      var bb = $('[data-live-bar]', box); if (bb) bb.style.transform = 'scaleX(' + s.soc.toFixed(3) + ')';
      var dot = $('[data-live-dot]', box);
      if (dot) { var x = Math.max(0, Math.min(15, hh - 5)) / 15 * 200, sv = window.LithiumHouse.state(hh, false).solar / 8.2; dot.setAttribute('cx', x.toFixed(1)); dot.setAttribute('cy', (32 - sv * 28).toFixed(1)); }
    }
    tick(); setInterval(tick, 30000);
  }

  /* ---------- Instant estimator ---------- */
  function initEstimator() {
    $$('[data-estimator]').forEach(function (box) {
      var range = $('input[type="range"]', box), billEl = $('[data-bill]', box), go = $('[data-estimate-go]', box);
      if (!range || !window.LithiumCalc) return;
      var C = window.LithiumCalc;
      function update() {
        setRangeFill(range);
        var bill = +range.value, r = C.estimate(bill);
        if (billEl) billEl.textContent = '$' + bill.toLocaleString('en-US');
        $$('[data-out]', box).forEach(function (el) {
          var k = el.getAttribute('data-out');
          if (k === 'systemKw') animateNumber(el, r.systemKw, function (v) { return v.toFixed(1) + ' kW'; });
          if (k === 'panels') animateNumber(el, r.panels, function (v) { return String(Math.round(v)); });
          if (k === 'year1') animateNumber(el, r.year1, function (v) { return C.money(v); });
          if (k === 'net') animateNumber(el, r.net, function (v) { return C.money(v); });
          if (k === 'payback') animateNumber(el, r.payback || 0, function (v) { return v.toFixed(1) + ' yrs'; });
        });
      }
      range.addEventListener('input', update);
      update();
      if (go) go.addEventListener('click', function () {
        try { var s = JSON.parse(localStorage.getItem('li-quote') || '{}'); s.bill = +range.value; localStorage.setItem('li-quote', JSON.stringify(s)); } catch (e) {}
      });
    });
    $$('input[type="range"].range').forEach(function (r) { setRangeFill(r); r.addEventListener('input', function () { setRangeFill(r); }); });
  }


  /* ---------- Statements light up word by word as you scroll ---------- */
  function initWords() {
    $$('[data-words]').forEach(function (el) {
      (function split(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
              var w = doc.createElement('span'); w.className = 'w'; w.textContent = part; frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) split(n);
        });
      })(el);
      el.classList.add('statement');
      var words = $$('.w', el);
      if (reduce) { words.forEach(function (w) { w.style.opacity = 1; }); return; }
      var raf = 0;
      function update() {
        raf = 0;
        var r = el.getBoundingClientRect(), vh = window.innerHeight;
        var p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        var lit = p * words.length;
        words.forEach(function (w, i) { w.style.opacity = Math.max(0.18, Math.min(1, lit - i + 1)).toFixed(2); });
      }
      window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      update();
    });
  }

  /* ---------- Gentle image parallax ---------- */
  function initParallax() {
    var els = $$('[data-parallax]');
    if (!els.length || reduce) return;
    var raf = 0;
    function update() {
      raf = 0;
      var vh = window.innerHeight;
      els.forEach(function (img) {
        var box = img.parentElement.getBoundingClientRect();
        if (box.bottom < -100 || box.top > vh + 100) return;
        var p = (box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2);
        img.style.transform = 'translate3d(0,' + (p * -5).toFixed(2) + '%,0)';
      });
    }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ---------- Testimonial tabs (only one quote is ever shown) ---------- */
  function initVoices() {
    $$('[data-voices]').forEach(function (box) {
      var tabs = $$('[role="tab"]', box);
      function select(t) {
        tabs.forEach(function (o) {
          var on = o === t;
          o.setAttribute('aria-selected', String(on));
          o.tabIndex = on ? 0 : -1;
          var panel = doc.getElementById(o.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!k) return;
          var n = tabs[(i + k + tabs.length) % tabs.length]; select(n); n.focus();
        });
      });
    });
  }

  /* ---------- Cost of waiting: utility vs solar ---------- */
  function initWait() {
    var box = $('[data-wait]');
    if (!box || !window.LithiumCalc) return;
    var C = window.LithiumCalc, r = C.estimate(250), s = r.series;
    var card = $('.wait__card', box), list = $('[data-wait-list]', box), title = $('[data-wait-title]', box);
    var DATA = {
      utility: { title: 'If you keep paying the utility…', rows: [
        ['$', 'Next 10 years of electric bills', C.money(s[10].utility)],
        ['$', 'Next 25 years of electric bills', C.money(s[25].utility)],
        ['↑', 'Typical yearly rate increase', '~3%'],
        ['⌂', 'What you own at the end', 'Nothing']
      ] },
      solar: { title: 'If you go solar with Lithium…', rows: [
        ['☀', 'System pays for itself in about', (r.payback || 0).toFixed(1) + ' years'],
        ['$', 'Estimated 25-year net savings', C.money(r.net)],
        ['⚡', 'Power during outages', 'With battery'],
        ['⌂', 'What you own at the end', 'Your power plant']
      ] }
    };
    function show(mode) {
      var d = DATA[mode];
      card.setAttribute('data-mode', mode);
      title.textContent = d.title;
      list.innerHTML = d.rows.map(function (row) { return '<li><i aria-hidden="true">' + row[0] + '</i><span>' + row[1] + '</span><b>' + row[2] + '</b></li>'; }).join('');
      $$('[data-wait-mode]', box).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-wait-mode') === mode)); });
      if (!reduce) { card.style.opacity = 0; card.style.transform = 'translateY(8px)'; requestAnimationFrame(function () { card.style.transition = 'opacity .5s var(--ease), transform .5s var(--ease)'; card.style.opacity = 1; card.style.transform = 'none'; }); }
    }
    $$('[data-wait-mode]', box).forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-wait-mode')); }); });
    show('utility');
  }

  /* ---------- Boot ---------- */
  function boot() {
    initHeader(); initMenu(); initReveal(); initCounters(); initAccordion(); initStack(); initSunclock(); initEstimator(); initWords(); initParallax(); initVoices(); initWait();
    window.Lithium = { scrollTo: scrollTo, onReady: function (fn) { fn(); }, lenis: function () { return null; }, animateNumber: animateNumber, setRangeFill: setRangeFill };
    window.addEventListener('load', function () { root.classList.add('is-ready'); initLive(); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();

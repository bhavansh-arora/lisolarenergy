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
        else if (kind === 'live') el.textContent = 'Live · Yucaipa ' + fmt.format(now);
        else if (kind === 'next') {
          if (now < t.rise) el.textContent = 'Sunrise at ' + fmt.format(t.rise);
          else if (now < t.set) el.textContent = 'Sun is up · sets ' + fmt.format(t.set);
          else el.textContent = 'Sun is down · batteries on duty';
        }
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


  /* ---------- Ticker hides once you scroll; Solar dropdown works by tap and keyboard ---------- */
  function initChrome() {
    function onScroll() { root.classList.toggle('past-ticker', window.scrollY > 34); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    $$('[data-drop]').forEach(function (d) {
      var b = $('button', d);
      b.addEventListener('click', function () { var o = !d.classList.contains('is-open'); d.classList.toggle('is-open', o); b.setAttribute('aria-expanded', String(o)); });
      doc.addEventListener('click', function (e) { if (!d.contains(e.target)) { d.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); } });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { d.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); b.focus(); } });
    });
    // Quick start: pass the chosen need into the quote form
    $$('.qstart').forEach(function (f) {
      f.addEventListener('submit', function () {
        var opt = f.querySelector('select').selectedOptions[0];
        var g = opt && opt.getAttribute('data-goal');
        var h = f.querySelector('input[name="goal"]');
        if (g) { if (!h) { h = doc.createElement('input'); h.type = 'hidden'; h.name = 'goal'; f.appendChild(h); } h.value = g; }
        else if (h) h.remove();
      });
    });
    // Card spotlight follows the pointer
    $$('.feature').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
  }

  /* ---------- Headlines: words rise in from a mask ---------- */
  function initRise() {
    $$('[data-rise]').forEach(function (el) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(' ')); return; }
              var w = doc.createElement('span'); w.className = 'rise-w';
              var inner = doc.createElement('span'); inner.textContent = part; inner.style.setProperty('--d', (i++ * 0.06).toFixed(2) + 's');
              w.appendChild(inner); frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName === 'EM') {
            // Keep the gold italic phrase as one unit so its gradient stays intact.
            var w = doc.createElement('span'); w.className = 'rise-w';
            var inner = doc.createElement('span'); inner.style.setProperty('--d', (i++ * 0.06).toFixed(2) + 's');
            n.parentNode.replaceChild(w, n); inner.appendChild(n); w.appendChild(inner);
          } else if (n.nodeType === 1 && !n.classList.contains('sr-only')) walk(n);
        });
      })(el);
      if (reduce || !('IntersectionObserver' in window)) { el.classList.add('is-risen'); return; }
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { el.classList.add('is-risen'); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px' });
      io.observe(el);
    });
  }

  /* ---------- Big word band: always drifting, faster while you scroll ---------- */
  function initMega() {
    $$('[data-mega] .mega__row').forEach(function (row) {
      if (reduce) return;
      var x = 0, v = 0, lastY = window.scrollY, half = 0;
      function measure() { half = row.scrollWidth / 2; }
      measure(); window.addEventListener('resize', measure);
      (function tick() {
        var y = window.scrollY, dy = Math.abs(y - lastY); lastY = y;
        v += (Math.min(dy, 120) * 0.08 - v) * 0.1;
        x -= 0.6 + v;
        if (half && -x >= half) x += half;
        row.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
        requestAnimationFrame(tick);
      })();
    });
  }

  /* ---------- Horizontal reasons: pinned on desktop, swipe on mobile ---------- */
  function initHScroll() {
    $$('[data-hscroll]').forEach(function (sec) {
      var track = $('.hscroll__track', sec), inner = $('.hscroll__inner', sec);
      var mq = window.matchMedia('(min-width: 1024px)'), raf = 0;
      // The track only moves while the panel is stuck to the top of the screen.
      // A short hold before and after lets the vertical scroll settle first.
      var hold = 0;
      function layout() {
        if (!mq.matches || reduce) { sec.classList.remove('is-pinned'); sec.style.height = ''; sec.style.removeProperty('--pin-h'); track.style.transform = ''; return; }
        sec.classList.add('is-pinned');
        var vh = window.innerHeight;
        sec.style.setProperty('--pin-h', vh + 'px');
        var dist = Math.max(0, track.scrollWidth - window.innerWidth);
        hold = Math.round(vh * 0.12);
        sec.style.height = (vh + dist + hold * 2) + 'px';
        update();
      }
      function update() {
        raf = 0;
        if (!sec.classList.contains('is-pinned')) return;
        var r = sec.getBoundingClientRect(), dist = Math.max(0, track.scrollWidth - window.innerWidth);
        var p = dist ? Math.max(0, Math.min(1, (-r.top - hold) / dist)) : 0;
        track.style.transform = 'translate3d(' + (-p * dist).toFixed(1) + 'px,0,0)';
      }
      window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
      window.addEventListener('resize', layout);
      if (mq.addEventListener) mq.addEventListener('change', layout);
      window.addEventListener('load', layout);
      layout();
    });
  }

  /* ---------- Home savings calculator ---------- */
  function initCalcx() {
    var box = $('[data-calcx]');
    if (!box || !window.LithiumCalc) return;
    var C = window.LithiumCalc, range = $('#cx-bill', box), go = $('[data-cx-go]', box), presets = $('[data-cx-presets]', box);
    var RANGES = { home: { min: 50, max: 1000, step: 10, def: 250, chips: [150, 250, 400, 600] }, business: { min: 200, max: 15000, step: 50, def: 2500, chips: [1000, 2500, 5000, 10000] } };
    var type = 'home';
    function set(k, v) { var el = $('[data-cx="' + k + '"]', box); if (el) animateNumber(el, v.n, v.f); }
    function setType(t) {
      type = t; var r = RANGES[t];
      range.min = r.min; range.max = r.max; range.step = r.step; range.value = r.def;
      $('[data-cx-min]', box).textContent = C.money(r.min); $('[data-cx-max]', box).textContent = C.money(r.max) + '+';
      $$('[data-cx-type]', box).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cx-type') === t)); });
      presets.innerHTML = r.chips.map(function (c) { return '<button type="button" data-v="' + c + '" aria-pressed="false">' + C.money(c) + '/mo</button>'; }).join('');
      $$('button', presets).forEach(function (b) { b.addEventListener('click', function () { range.value = b.getAttribute('data-v'); update(); }); });
      update();
    }
    function update() {
      setRangeFill(range);
      var bill = +range.value, r = C.estimate(bill), s = r.series, U = s[25].utility, S = s[25].solar;
      var cost = r.cost, rest = Math.max(0, S - cost), keep = Math.max(0, U - S);
      $('[data-cx-bill]', box).textContent = C.money(bill);
      $$('button', presets).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-v') === bill)); });
      set('net', { n: r.net, f: function (v) { return C.money(v); } });
      set('payback', { n: r.payback || 0, f: function (v) { return r.payback ? v.toFixed(1) + ' yrs' : '25+ yrs'; } });
      set('cost', { n: cost, f: function (v) { return C.money(v); } });
      set('rest', { n: rest, f: function (v) { return C.money(v); } });
      set('keep', { n: keep, f: function (v) { return C.money(v); } });
      set('kw', { n: r.systemKw, f: function (v) { return v.toFixed(1) + ' kW'; } });
      $('[data-cx="panels"]', box).textContent = r.panels;
      $('[data-cx="year1"]', box).textContent = C.money(r.year1);
      var tot = cost + rest + keep || 1;
      [['cost', cost], ['rest', rest], ['keep', keep]].forEach(function (p) { $('[data-cx-seg="' + p[0] + '"]', box).style.flexBasis = (p[1] / tot * 100).toFixed(2) + '%'; });
      if (go) go.href = 'quote.html?type=' + type + '&bill=' + bill;
    }
    range.addEventListener('input', update);
    $$('[data-cx-type]', box).forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-cx-type')); }); });
    setType('home');
  }

  /* ---------- Payback timeline + yearly bars ---------- */
  function initRoi() {
    var box = $('[data-roi]');
    if (!box || !window.LithiumCalc) return;
    var C = window.LithiumCalc, r = C.estimate(250), s = r.series;
    var pos = s.map(function (p) { return p.utility - p.solar; }); // cumulative net position by year
    var payYr = Math.ceil(r.payback || 25);
    var set = function (k, v) { $$('[data-roi="' + k + '"]', box).forEach(function (el) { el.textContent = v; }); };
    var saved3 = s[3].utility - (s[3].solar - r.cost);
    set('y1', C.money(r.year1)); set('y3pct', Math.min(100, Math.round(saved3 / r.cost * 100)) + '%');
    set('paylabel', 'Year ' + payYr); set('payyrs', payYr); set('y25', C.money(r.net)); set('total', C.money(pos[25], true));
    var plot = $('[data-roi-bars]', box), vals = pos.slice(1), max = Math.max.apply(null, vals), min = Math.min.apply(null, vals.concat(0));
    var span = max - min || 1, zero = (max / span) * 100;
    plot.style.setProperty('--zero', zero.toFixed(2) + '%');
    plot.innerHTML = vals.map(function (v, i) {
      var h = Math.abs(v) / span * 100, neg = v < 0;
      var style = neg ? 'top:' + zero.toFixed(2) + '%;height:' + h.toFixed(2) + '%' : 'bottom:' + (100 - zero).toFixed(2) + '%;height:' + h.toFixed(2) + '%';
      return '<span class="bar' + (neg ? ' is-neg' : '') + '" tabindex="0" data-tip="Year ' + (i + 1) + ': ' + (neg ? '−' : '+') + C.money(Math.abs(v)) + '" aria-label="Year ' + (i + 1) + ', ' + (neg ? 'still paying off, ' : 'ahead by ') + C.money(Math.abs(v)) + '"><i style="' + style + '"></i></span>';
    }).join('');
    var line = $('[data-roi-line]', box), bars = $$('.bar i', plot);
    if (reduce || !('IntersectionObserver' in window)) return;
    if (line) line.style.setProperty('--p', 0);
    bars.forEach(function (b) { b.style.transform = 'scaleY(0)'; });
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      if (line) line.style.setProperty('--p', 1);
      bars.forEach(function (b, i) { b.style.transitionDelay = (i * 0.03) + 's'; b.style.transform = 'scaleY(1)'; });
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(box);
  }

  /* ---------- Footer wordmark: letters rise in and lift near the pointer ---------- */
  function initWord() {
    var w = $('[data-word]');
    if (!w) return;
    var letters = $$('span', w);
    if (reduce || !('IntersectionObserver' in window)) return;
    letters.forEach(function (l, i) { l.style.transform = 'translateY(60%)'; l.style.opacity = 0; l.style.transition = 'transform 1.2s var(--ease) ' + (i * 0.06) + 's, opacity 1s ease ' + (i * 0.06) + 's'; });
    new IntersectionObserver(function (en, io) {
      if (!en[0].isIntersecting) return;
      letters.forEach(function (l) { l.style.transform = 'none'; l.style.opacity = 1; });
      io.disconnect();
      setTimeout(function () {
        letters.forEach(function (l) { l.style.transition = 'transform .6s var(--ease)'; });
        w.addEventListener('pointermove', function (e) { letters.forEach(function (l) { var r = l.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); l.style.transform = 'translateY(' + (-Math.max(0, 1 - d / 220) * 8).toFixed(1) + '%)'; }); });
        w.addEventListener('pointerleave', function () { letters.forEach(function (l) { l.style.transform = 'none'; }); });
      }, 1600);
    }, { threshold: 0.3 }).observe(w);
  }

  /* ---------- Process journey: rail cells fill as each step scrolls past ---------- */
  function initJourney() {
    var j = $('[data-journey]');
    if (!j) return;
    var steps = $$('[data-j-step]', j), imgs = $$('[data-j-img]', j), cells = $$('[data-j-cell]', j);
    var num = $('[data-j-num]', j), name = $('[data-j-name]', j), time = $('[data-j-time]', j), idxEl = $('[data-j-idx]', j);
    var cur = 0, raf = 0;
    // Each step tints the ambient light around the journey.
    var tones = ['#f5b544', '#4c95ff', '#ff8a3d', '#3fd1a8', '#9b7bff', '#f5b544'];
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function update() {
      raf = 0;
      var mid = window.innerHeight * 0.5, idx = 0;
      steps.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        var f = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
        if (cells[i]) cells[i].style.setProperty('--f', f.toFixed(3));
        if (r.top <= mid) idx = i;
      });
      var jr = j.getBoundingClientRect();
      j.classList.toggle('is-in', jr.top < window.innerHeight * 0.6 && jr.bottom > window.innerHeight * 0.4);
      if (idx === cur) return;
      cur = idx;
      j.style.setProperty('--tone', tones[idx] || tones[0]);
      imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === idx); });
      cells.forEach(function (c, k) { c.classList.toggle('is-now', k === idx); });
      steps.forEach(function (s, k) { s.classList.toggle('is-now', k === idx); });
      name.textContent = steps[idx].getAttribute('data-name');
      time.textContent = steps[idx].getAttribute('data-time');
      idxEl.textContent = pad(idx + 1);
      num.classList.add('is-swap'); num.textContent = pad(idx + 1);
      requestAnimationFrame(function () { requestAnimationFrame(function () { num.classList.remove('is-swap'); }); });
    }
    cells.forEach(function (c, i) {
      $('button', c).addEventListener('click', function () { steps[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
    });
    j.classList.add('is-live');
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- First-visit loader: battery charges with real page progress ---------- */
  function initLoader() {
    var el = $('[data-loader]');
    if (!el) return;
    if (!root.classList.contains('is-loading')) { el.parentNode.removeChild(el); return; }
    var num = $('[data-loader-num]', el), t0 = performance.now(), MIN = 1400, MAX = 4500, p = 0, done = false, loaded = false, fonts = false;
    var imgs = Array.prototype.filter.call(doc.images, function (i) { return i.loading !== 'lazy' && !el.contains(i); });
    window.addEventListener('load', function () { loaded = true; });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fonts = true; }); else fonts = true;
    function frac() {
      if (loaded) return 1;
      var n = imgs.filter(function (i) { return i.complete; }).length + (fonts ? 1 : 0);
      return n / (imgs.length + 1);
    }
    function finish() {
      if (done) return; done = true;
      p = 1; num.textContent = '100'; el.style.setProperty('--p', 1);
      el.classList.add('is-charged');
      var lab = $('.loader__meta .label', el); if (lab) lab.textContent = 'Fully charged · Power for life';
      try { sessionStorage.setItem('li-boot', '1'); } catch (e) {}
      setTimeout(function () {
        el.classList.add('is-done');
        // Start page entrances as the curtain begins to lift.
        setTimeout(function () { root.classList.remove('is-loading'); }, 380);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1700);
      }, 460);
    }
    (function tick(now) {
      if (done) return;
      var t = (now || performance.now()) - t0;
      var target = Math.min(t / MIN, 0.12 + 0.88 * frac());
      p += (target - p) * 0.14;
      if (target >= 1 && p > 0.96) p = 1;
      el.style.setProperty('--p', p.toFixed(4));
      num.textContent = Math.round(p * 100);
      if ((p >= 1 && t >= MIN) || t >= MAX) return finish();
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Boot ---------- */
  function boot() {
    initLoader(); initHeader(); initMenu(); initReveal(); initCounters(); initAccordion(); initStack(); initSunclock(); initEstimator(); initWords(); initParallax(); initVoices(); initChrome(); initRise(); initMega(); initHScroll(); initJourney(); initCalcx(); initRoi(); initWord();
    window.Lithium = { scrollTo: scrollTo, onReady: function (fn) { fn(); }, lenis: function () { return null; }, animateNumber: animateNumber, setRangeFill: setRangeFill };
    window.addEventListener('load', function () { root.classList.add('is-ready'); initLive(); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();

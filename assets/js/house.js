/* Lithium energy house: an illustrative day for a typical 8.2 kW home system with a 13.5 kWh battery.
   - LithiumHouse.state(hour, outage) returns production, load, battery and grid flows for that time.
   - [data-day] sections become a scroll-driven "day on your roof" story.
   - [data-house-loop] stages play a gentle looping day (residential hero). */
(function () {
  'use strict';

  var PEAK_KW = 8.2, CAP = 13.5, START = 5.5, END = 24, STEP = 1 / 60;
  var RATE_OFF = 0.32, RATE_PEAK = 0.55, EXPORT = 0.05;

  function solar(h) { return h <= 6 || h >= 18 ? 0 : PEAK_KW * Math.pow(Math.sin(Math.PI * (h - 6) / 12), 1.25); }
  function ev(h) { return h >= 11 && h < 14 ? 3.2 : 0; }
  function load(h) {
    var l = 0.55;
    if (h >= 6.5 && h < 9) l += 1.3;
    if (h >= 17 && h < 22) l += 1.55;
    if (h >= 22) l += 0.15;
    return l + ev(h);
  }
  function peak(h) { return h >= 16 && h < 21; }

  // Precompute a minute-by-minute day for both grid-up and outage cases.
  function simulate(outage) {
    var rows = [], soc = 0.22 * CAP, saved = 0;
    for (var h = START; h <= END + 1e-9; h += STEP) {
      var s = solar(h), l = load(h), toBatt = 0, fromBatt = 0, imp = 0, exp = 0, shed = 0;
      var used = Math.min(s, l), surplus = s - l;
      if (surplus > 0) {
        toBatt = Math.min(surplus, 5, (CAP - soc) / STEP);
        exp = outage ? 0 : surplus - toBatt;
      } else {
        var need = -surplus;
        var useBatt = outage || peak(h) || h >= 21 || (h < 6.5 && soc > 0.15 * CAP);
        if (useBatt) fromBatt = Math.min(need, 5, Math.max(0, (soc - 0.08 * CAP) / STEP));
        var rest = need - fromBatt;
        if (outage) shed = rest; else imp = rest;
      }
      soc = Math.max(0, Math.min(CAP, soc + (toBatt - fromBatt) * STEP));
      var rate = peak(h) ? RATE_PEAK : RATE_OFF;
      saved += ((l - imp - shed) * rate + exp * EXPORT) * STEP;
      rows.push({ h: h, solar: s, load: l, used: used, toBatt: toBatt, fromBatt: fromBatt, imp: imp, exp: exp, soc: soc / CAP, ev: ev(h) > 0 && s > 0.5, saved: saved, shed: shed });
    }
    return rows;
  }
  var DAY = { up: simulate(false), down: simulate(true) };

  function state(h, outage) {
    var rows = outage ? DAY.down : DAY.up;
    var i = Math.max(0, Math.min(rows.length - 1, Math.round((h - START) / STEP)));
    return rows[i];
  }

  /* ---------- Sky ---------- */
  var SKY = [
    [5.5, '#040a17', '#141b36'], [6.3, '#18264d', '#e07a45'], [7.4, '#2a5594', '#f3b47c'], [9, '#2b68b5', '#9ccaf0'],
    [12.5, '#1c62c2', '#8ec4f1'], [16, '#2a5a9e', '#f2b27a'], [17.6, '#24285a', '#e0663f'], [18.6, '#0d1430', '#4a2a4a'],
    [20, '#050b1b', '#141c3a'], [24, '#030812', '#0b1428']
  ];
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')'; }
  function sky(h) {
    for (var i = 0; i < SKY.length - 1; i++) {
      if (h <= SKY[i + 1][0]) {
        var t = (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
        return [mix(SKY[i][1], SKY[i + 1][1], t), mix(SKY[i][2], SKY[i + 1][2], t)];
      }
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }

  function clock(h) {
    var m = Math.round(h * 60) % (24 * 60), hh = Math.floor(m / 60), mm = m % 60;
    var ap = hh >= 12 ? 'PM' : 'AM', h12 = hh % 12 || 12;
    return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap;
  }

  /* ---------- Render a stage ---------- */
  function render(stage, h, outage) {
    var s = state(h, outage);
    var day = h <= 6 || h >= 18 ? 0 : Math.min(1, Math.sin(Math.PI * (h - 6) / 12) * 1.6);
    var lit = h < 6.6 || h > 17.2 ? 1 : (h < 7.4 ? (7.4 - h) / 0.8 : (h > 16.4 ? (h - 16.4) / 0.8 : 0));
    var st = stage.style;
    st.setProperty('--day', day.toFixed(3));
    st.setProperty('--prod', (s.solar / PEAK_KW).toFixed(3));
    st.setProperty('--lit', (outage && s.shed > 0.05 ? 0.15 : lit).toFixed(3));
    st.setProperty('--batt', s.soc.toFixed(3));
    st.setProperty('--ev', s.ev ? 1 : 0);
    st.setProperty('--night', (1 - Math.min(1, day * 2.2)).toFixed(3));
    var c = sky(h);
    st.setProperty('--sky-top', c[0]);
    st.setProperty('--sky-bot', c[1]);
    // sun on an arc from 6:00 to 18:00
    var t = (h - 6) / 12;
    st.setProperty('--sun-x', (8 + 84 * t).toFixed(2) + '%');
    st.setProperty('--sun-y', (88 - Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * 70).toFixed(2) + '%');
    st.setProperty('--sun-o', t > -0.04 && t < 1.04 ? 1 : 0);
    stage.classList.toggle('is-outage', !!outage);

    function flow(name, on, kw, rev) {
      stage.querySelectorAll('[data-flow="' + name + '"]').forEach(function (p) {
        p.classList.toggle('is-on', on);
        p.classList.toggle('is-rev', !!rev);
        if (on) p.style.setProperty('--spd', Math.max(0.35, 1.4 - kw * 0.13).toFixed(2) + 's');
      });
    }
    flow('solar', s.solar > 0.15, s.solar);
    flow('home', s.used > 0.15, s.used);
    flow('charge', s.toBatt > 0.1, s.toBatt);
    flow('discharge', s.fromBatt > 0.1, s.fromBatt);
    flow('ev', s.ev, 3.2);
    flow('grid', !outage && (s.imp > 0.1 || s.exp > 0.1), Math.max(s.imp, s.exp), s.exp > 0.1);
    var txt = stage.querySelector('.h-batt-text');
    if (txt) txt.textContent = Math.round(s.soc * 100) + '%';

    var set = function (k, v) { stage.querySelectorAll('[data-hud="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
    set('clock', clock(h));
    set('solar', s.solar.toFixed(1));
    set('load', s.load.toFixed(1));
    set('batt', Math.round(s.soc * 100));
    set('saved', '$' + s.saved.toFixed(2));
    var grid = outage ? 'Down' : s.exp > 0.1 ? 'Sending ' + s.exp.toFixed(1) + ' kW' : s.imp > 0.1 ? 'Using ' + s.imp.toFixed(1) + ' kW' : 'Idle';
    set('grid', grid);
    var battState = s.toBatt > 0.1 ? 'Charging' : s.fromBatt > 0.1 ? 'Powering home' : s.soc > 0.97 ? 'Full' : 'Standby';
    set('battstate', battState);
    stage.querySelectorAll('[data-hud-bar]').forEach(function (b) {
      var k = b.getAttribute('data-hud-bar');
      var v = k === 'solar' ? s.solar / PEAK_KW : k === 'load' ? Math.min(1, s.load / 6) : s.soc;
      b.style.transform = 'scaleX(' + v.toFixed(3) + ')';
    });
    return s;
  }

  /* ---------- Scroll story ---------- */
  var CHAPTERS = [
    { until: 8, kicker: 'Sunrise', title: 'The panels wake up.', text: 'First light hits the roof. Production climbs while the house starts its morning.' },
    { until: 11, kicker: 'Morning', title: 'Your home runs on sunshine.', text: 'By mid-morning the panels cover everything the house needs, and the extra starts filling the battery.' },
    { until: 16.6, kicker: 'Midday · peak sun', title: 'Power the home. Bank the rest.', text: 'Surplus charges the battery and the car. What’s left flows back to the grid.' },
    { until: 21, kicker: '4–9 PM · peak rates', title: 'The battery takes the expensive shift.', text: 'As the sun sets and utility prices peak, your stored solar runs the house instead of the grid.' },
    { until: 25, kicker: 'Night', title: 'Lights on. Bill flat.', text: 'The battery covers the evening. Tomorrow, the sun refills it.' }
  ];
  var OUTAGE = { kicker: 'Grid outage', title: 'The grid is down. Your power isn’t.', text: 'Your battery separates the home from the grid and keeps the essentials running on stored sunshine.' };

  function initDay(sec) {
    var stage = sec.querySelector('.rday__stage');
    var cap = { kicker: sec.querySelector('[data-cap="kicker"]'), title: sec.querySelector('[data-cap="title"]'), text: sec.querySelector('[data-cap="text"]') };
    var prog = sec.querySelector('[data-day-progress]');
    var btn = sec.querySelector('[data-outage]');
    var outage = false, lastCap = null, h = START, raf = 0;

    function chapter(hh) {
      if (outage) return OUTAGE;
      for (var i = 0; i < CHAPTERS.length; i++) if (hh < CHAPTERS[i].until) return CHAPTERS[i];
      return CHAPTERS[CHAPTERS.length - 1];
    }
    function setCaption(c) {
      if (c === lastCap) return;
      lastCap = c;
      var apply = function () { cap.kicker.textContent = c.kicker; cap.title.textContent = c.title; cap.text.textContent = c.text; };
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.to([cap.title, cap.text], { opacity: 0, y: -10, duration: 0.18, ease: 'power2.in', onComplete: function () { apply(); gsap.fromTo([cap.title, cap.text], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'expo.out' }); } });
      } else apply();
    }
    function update() {
      raf = 0;
      var r = sec.getBoundingClientRect();
      var total = Math.max(1, r.height - window.innerHeight);
      var p = Math.max(0, Math.min(1, -r.top / total));
      h = START + p * (END - START);
      render(stage, h, outage);
      if (prog) prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      setCaption(chapter(h));
    }
    function req() { if (!raf) raf = requestAnimationFrame(update); }
    window.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req, { passive: true });
    if (btn) btn.addEventListener('click', function () {
      outage = !outage;
      btn.setAttribute('aria-pressed', String(outage));
      btn.querySelector('span').textContent = outage ? 'Restore the grid' : 'Simulate an outage';
      lastCap = null;
      update();
    });
    update();
    // Tuck the mobile Call / Quote bar away while the story fills the screen.
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { document.documentElement.classList.toggle('in-day', e[0].isIntersecting); }, { threshold: 0.02 }).observe(stage);
  }

  /* ---------- Looping hero ---------- */
  function initLoop(stage) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var start = performance.now(), visible = true, DUR = 22000;
    var from = +(stage.getAttribute('data-from') || 6), to = +(stage.getAttribute('data-to') || 23.5);
    if (reduce) { render(stage, +(stage.getAttribute('data-still') || 13), false); return; }
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(stage);
    function tick(now) {
      if (!visible) return;
      var t = ((now - start) % DUR) / DUR;
      // ease in/out so midday and dusk linger a little
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      render(stage, from + (to - from) * e, false);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Hotspots ---------- */
  function initSpots(root) {
    var spots = root.querySelectorAll('[data-spot-btn]');
    var card = root.querySelector('[data-spot-card]');
    if (!spots.length || !card) return;
    function open(b) {
      spots.forEach(function (o) { o.setAttribute('aria-expanded', String(o === b)); });
      card.querySelector('[data-spot-title]').textContent = b.getAttribute('data-title');
      card.querySelector('[data-spot-text]').textContent = b.getAttribute('data-text');
      card.querySelector('[data-spot-num]').textContent = b.getAttribute('data-num');
      card.classList.add('is-open');
      if (window.gsap) gsap.fromTo(card, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
    }
    spots.forEach(function (b) {
      b.addEventListener('click', function () { open(b); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') open(b); });
    });
    open(spots[0]);
  }

  /* ---------- Card player: play / pause, time slider, outage toggle ---------- */
  function initPlayer(card) {
    var range = card.querySelector('[data-day-range]');
    var play = card.querySelector('[data-day-play]');
    var btn = card.querySelector('[data-outage]');
    var cap = { kicker: card.querySelector('[data-cap="kicker"]'), title: card.querySelector('[data-cap="title"]'), text: card.querySelector('[data-cap="text"]') };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var outage = false, playing = false, h = +(range ? range.value : 12), last = 0, raf = 0, lastCap = null, started = false;

    function chapter(hh) {
      if (outage) return OUTAGE;
      for (var i = 0; i < CHAPTERS.length; i++) if (hh < CHAPTERS[i].until) return CHAPTERS[i];
      return CHAPTERS[CHAPTERS.length - 1];
    }
    function draw() {
      render(card, h, outage);
      if (range) {
        range.value = h;
        range.style.setProperty('--p', ((h - range.min) / (range.max - range.min)) * 100 + '%');
      }
      var c = chapter(h);
      if (c !== lastCap && cap.title) { lastCap = c; cap.kicker.textContent = c.kicker; cap.title.textContent = c.title; cap.text.textContent = c.text; }
    }
    function setPlaying(on) {
      playing = on;
      if (play) { play.setAttribute('aria-pressed', String(on)); play.setAttribute('aria-label', on ? 'Pause the day' : 'Play the day'); }
      if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }
    function loop(now) {
      raf = 0;
      if (!playing) return;
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      h += dt * 1.15;
      if (h > 24) h = 6;
      draw();
      raf = requestAnimationFrame(loop);
    }
    if (range) range.addEventListener('input', function () { setPlaying(false); h = +range.value; draw(); });
    if (play) play.addEventListener('click', function () { setPlaying(!playing); });
    if (btn) btn.addEventListener('click', function () {
      outage = !outage;
      btn.setAttribute('aria-pressed', String(outage));
      btn.querySelector('span').textContent = outage ? 'Restore the grid' : 'Simulate an outage';
      lastCap = null; draw();
    });
    draw();
    // Start the day automatically the first time the card is on screen.
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (e[0].isIntersecting && !started) { started = true; setPlaying(true); }
        if (!e[0].isIntersecting && playing) setPlaying(false), started = false;
      }, { threshold: 0.35 }).observe(card);
    }
  }

  function init() {
    document.querySelectorAll('[data-day]').forEach(initDay);
    document.querySelectorAll('[data-house-player]').forEach(initPlayer);
    document.querySelectorAll('[data-house-loop]').forEach(initLoop);
    document.querySelectorAll('[data-spots]').forEach(initSpots);
  }
  window.LithiumHouse = { state: state, render: render, clock: clock };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

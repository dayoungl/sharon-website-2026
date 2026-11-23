// Shared by every page: footer year + theme slider.

var yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------- Theme slider ----------
(function () {
  var NAMES = ['ink', 'slate', 'glacier']; // bottom (dark) to top (light); must match style.css
  var LABELS = ['Ink', 'Graphite', 'Mist'];
  var STEPS = NAMES.length;
  var root = document.documentElement;
  var box = document.getElementById('theme');
  if (!box) { root.classList.remove('no-anim'); return; }
  var track = box.querySelector('.theme-track');
  var thumb = box.querySelector('.theme-thumb');
  var ticks = box.querySelector('.theme-ticks');
  var value = Math.max(0, NAMES.indexOf(root.dataset.theme));
  var drag = null;

  for (var k = 0; k < STEPS; k++) ticks.appendChild(document.createElement('span'));

  function setTheme(n, save) {
    value = Math.max(0, Math.min(STEPS - 1, n));
    root.dataset.theme = NAMES[value];
    box.style.setProperty('--pos', value / (STEPS - 1));
    track.setAttribute('aria-valuenow', value);
    track.setAttribute('aria-valuetext', LABELS[value]);
    if (save) { try { localStorage.setItem('theme', NAMES[value]); } catch (e) {} }
  }
  function setOpen(open) { box.classList.toggle('open', open); }
  function fromY(y) {
    var r = track.getBoundingClientRect();
    var t = 1 - (y - r.top - 20) / (r.height - 40);
    setTheme(Math.round(t * (STEPS - 1)), true);
  }

  track.addEventListener('pointerdown', function (e) {
    if (!box.classList.contains('open')) { setOpen(true); return; }
    track.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, onThumb: thumb.contains(e.target), moved: false };
    if (!drag.onThumb) fromY(e.clientY);
  });
  track.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
    if (drag.moved || !drag.onThumb) fromY(e.clientY);
  });
  track.addEventListener('pointerup', function () {
    if (drag && drag.onThumb && !drag.moved) setOpen(false); // tap the sun again to close
    drag = null;
  });
  track.addEventListener('keydown', function (e) {
    var map = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    if (e.key in map) { setOpen(true); setTheme(value + map[e.key], true); e.preventDefault(); }
    else if (e.key === 'Home') { setTheme(0, true); e.preventDefault(); }
    else if (e.key === 'End') { setTheme(STEPS - 1, true); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { setOpen(!box.classList.contains('open')); e.preventDefault(); }
    else if (e.key === 'Escape') setOpen(false);
  });
  document.addEventListener('pointerdown', function (e) {
    if (!box.contains(e.target)) setOpen(false);
  });

  setTheme(value, false);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.remove('no-anim'); });
  });
})();

// ---------- Nav: on the homepage, move the dot to About while that section is on screen ----------
(function () {
  var about = document.getElementById('about');
  var work = document.querySelector('.nav a[href="#top"]');
  var aboutLink = document.querySelector('.nav a[href="#about"]');
  if (!about || !work || !aboutLink || !('IntersectionObserver' in window)) return;
  function set(onAbout) {
    work.classList.toggle('active', !onAbout);
    aboutLink.classList.toggle('active', onAbout);
    if (onAbout) { aboutLink.setAttribute('aria-current', 'location'); work.removeAttribute('aria-current'); }
    else { work.setAttribute('aria-current', 'page'); aboutLink.removeAttribute('aria-current'); }
  }
  new IntersectionObserver(function (entries) {
    set(entries[0].isIntersecting);
  }, { rootMargin: '0px 0px -40% 0px' }).observe(about);
})();

// ---------- Opening a project: name the clicked card so it expands into the page ----------
(function () {
  var NAME = 'case-card';
  function clearNames() {
    var named = document.querySelectorAll('[data-vt]');
    for (var i = 0; i < named.length; i++) { named[i].style.viewTransitionName = ''; named[i].removeAttribute('data-vt'); }
    var bg = document.querySelector('.case-bg');
    if (bg) bg.style.viewTransitionName = '';
  }
  function name(el) {
    clearNames();
    var bg = document.querySelector('.case-bg');
    if (bg) bg.style.viewTransitionName = 'none'; // only one element may carry the name
    el.style.viewTransitionName = NAME;
    el.setAttribute('data-vt', '');
  }
  function sameDoc(a, b) {
    return a && b && new URL(a, location.href).pathname === new URL(b, location.href).pathname;
  }

  // Forward: homepage card or "Next project" card
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a.card.project, a.next');
    if (!a || a.target === '_blank' || a.origin !== location.origin) return;
    name(a);
  });

  // Back to the homepage: shrink the page into the card it came from
  window.addEventListener('pagereveal', function (e) {
    if (!e.viewTransition || !window.navigation || !navigation.activation || !navigation.activation.from) return;
    var from = navigation.activation.from.url;
    var cards = document.querySelectorAll('a.card.project');
    for (var i = 0; i < cards.length; i++) {
      if (sameDoc(cards[i].href, from)) {
        name(cards[i]);
        e.viewTransition.finished.finally(clearNames);
        return;
      }
    }
  });

  // Coming back via the back/forward cache: drop any leftover name
  window.addEventListener('pageshow', function (e) { if (e.persisted) clearNames(); });
})();

// ---------- Respect reduced motion: don't autoplay looping videos ----------
if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
  var vids = document.querySelectorAll('video[autoplay]');
  for (var v = 0; v < vids.length; v++) { vids[v].removeAttribute('autoplay'); vids[v].pause(); }
}

// ---------- Card videos: play only while the card is hovered or focused ----------
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var vids = document.querySelectorAll('video[data-hover-play]');
  for (var i = 0; i < vids.length; i++) {
    (function (v) {
      var card = v.closest('.card') || v;
      function play() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      function stop() { v.pause(); v.currentTime = 0; } // back to the first frame (the poster)
      card.addEventListener('mouseenter', play);
      card.addEventListener('mouseleave', stop);
      card.addEventListener('focusin', play);
      card.addEventListener('focusout', stop);
    })(vids[i]);
  }
})();

// ---------- Contact: copy email to the clipboard and show a toast ----------
(function () {
  var toast = document.getElementById('toast');
  // Stays up until the visitor closes it with the x
  function show(html) {
    if (!toast) return;
    toast.innerHTML = '<span class="toast-msg">' + html + '</span>' +
      '<button type="button" class="toast-close" aria-label="Dismiss">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    toast.classList.add('show');
  }
  if (toast) toast.addEventListener('click', function (e) {
    if (e.target.closest('.toast-close')) toast.classList.remove('show');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-copy-email]');
    if (!a || !navigator.clipboard) return; // no clipboard: fall back to the mailto link
    // Phones and tablets: let the mailto link open the visitor's mail app (Gmail, Mail…) with the address filled in
    if (window.matchMedia && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 720px)').matches)) return;
    e.preventDefault();
    var email = a.getAttribute('data-copy-email');
    navigator.clipboard.writeText(email).then(function () {
      show('Email copied <span class="muted">' + email + '</span>');
    }, function () {
      location.href = a.href; // copy refused: open the mail app instead
    });
  });
})();

// ---------- Typewriter name: types, holds, deletes, then types the next word, looping ----------
(function () {
  var el = document.querySelector('.tw[data-words]');
  if (!el) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var words = el.getAttribute('data-words').split('|');
  var TYPE = 85, DELETE = 45, HOLD = 2600, GAP = 400;
  var w = 0, chars = Array.from(words[0]), n = chars.length;
  function tick() {
    // hold the full word, then start deleting
    el.classList.remove('typing');
    setTimeout(del, HOLD);
  }
  function del() {
    el.classList.add('typing');
    if (n > 0) { n--; el.textContent = chars.slice(0, n).join(''); setTimeout(del, DELETE); return; }
    w = (w + 1) % words.length; chars = Array.from(words[w]);
    el.classList.remove('typing');
    setTimeout(type, GAP);
  }
  function type() {
    el.classList.add('typing');
    if (n < chars.length) { n++; el.textContent = chars.slice(0, n).join(''); setTimeout(type, TYPE); return; }
    tick();
  }
  tick();
})();

// ---------- Mascot: eyes follow the cursor, blinks now and then ----------
(function () {
  var m = document.querySelector('.mascot');
  if (!m) return;
  var face = m.querySelector('.mascot-face');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      var r = m.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
      // face shifts up to ~3px (in a 48px drawing) toward the pointer
      face.setAttribute('transform', 'translate(' + (dx / d * 3 * k).toFixed(2) + ' ' + (dy / d * 2.4 * k).toFixed(2) + ')');
    });
  }
  function blink() {
    m.classList.add('blink');
    setTimeout(function () { m.classList.remove('blink'); }, 140);
    setTimeout(blink, 2500 + Math.random() * 3500);
  }
  if (!reduce) setTimeout(blink, 1800);
})();

// ---------- Mascot: drag it around; it bonks off cards like glass, then springs home. Tap = squish ----------
(function () {
  var m = document.querySelector('.mascot');
  if (!m) return;
  var body = m.querySelector('.mascot-body');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var s = null;          // drag state
  var phoneMQ = window.matchMedia ? matchMedia('(max-width: 720px)') : null;
  function phone() { return !!(phoneMQ && phoneMQ.matches); }

  // Glass "cling": a few inharmonic bell partials with a fast attack and short ring-out (Web Audio, no files)
  var actx = null;
  function audio() {
    if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function cling(strength) {
    var ac = actx;
    if (!ac) return;
    var t = ac.currentTime, vol = 0.05 + 0.1 * Math.min(1, strength);
    var base = 2100 * (0.94 + Math.random() * 0.12);          // slight pitch variation per hit
    var out = ac.createGain(); out.gain.value = vol; out.connect(ac.destination);
    [[1, 1, 0.9], [2.76, 0.5, 0.55], [5.4, 0.25, 0.3], [8.93, 0.12, 0.18]].forEach(function (p) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = base * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p[1], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + p[2] + 0.02);
    });
  }
  var raf = 0;

  function pop() {
    m.classList.remove('pop'); void m.offsetWidth;
    m.classList.add('pop');
    setTimeout(function () { m.classList.remove('pop'); }, 500);
  }

  // Squash against the surface it hit, and make the card shiver like glass
  function bonk(card, nx, ny, speed) {
    cling(speed || 0.5);
    if (body.animate) {
      var sx = nx ? 0.72 : 1.18, sy = ny ? 0.72 : 1.18;
      body.animate(
        [{ transform: 'scale(1.08)' }, { transform: 'scale(' + sx + ',' + sy + ')' }, { transform: 'scale(1.08)' }],
        { duration: 280, easing: 'cubic-bezier(.3,1.4,.5,1)' }
      );
    }
    if (card.animate && !reduce) {
      card.animate(
        [{ transform: 'translate(0,0)' },
         { transform: 'translate(' + (-nx * 3) + 'px,' + (-ny * 3) + 'px)' },
         { transform: 'translate(' + (nx * 1.5) + 'px,' + (ny * 1.5) + 'px)' },
         { transform: 'translate(0,0)' }],
        { duration: 260, easing: 'ease-out' }
      );
      card.animate(
        [{ boxShadow: 'inset 0 0 0 1px var(--stroke)' },
         { boxShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--text) 45%, transparent)' },
         { boxShadow: 'inset 0 0 0 1px var(--stroke)' }],
        { duration: 320, easing: 'ease-out' }
      );
    }
    // rebound: kick the mascot back off the surface
    s.vbx += nx * 7; s.vby += ny * 7;
  }

  function frame() {
    raf = 0;
    if (!s) return;
    var x = s.tx, y = s.ty, b = s.base, hitCard = null, nx = 0, ny = 0;
    for (var i = 0; i < s.cards.length; i++) {
      var c = s.cards[i].r;
      var l = b.left + x, t = b.top + y, r = b.right + x, bt = b.bottom + y;
      if (r <= c.left || l >= c.right || bt <= c.top || t >= c.bottom) continue;
      // push back out the side it came in from (based on last frame's position)
      var pl = b.left + s.px, pr = b.right + s.px, ptop = b.top + s.py, pbot = b.bottom + s.py;
      if (pr <= c.left)        { x = c.left - b.right; nx = -1; ny = 0; }
      else if (pl >= c.right)  { x = c.right - b.left; nx = 1;  ny = 0; }
      else if (pbot <= c.top)  { y = c.top - b.bottom; nx = 0; ny = -1; }
      else if (ptop >= c.bottom) { y = c.bottom - b.top; nx = 0; ny = 1; }
      else {                   // already inside: use the shallowest side
        var dl = r - c.left, dr = c.right - l, dt = bt - c.top, db = c.bottom - t, mn = Math.min(dl, dr, dt, db);
        if (mn === dl) { x -= dl; nx = -1; ny = 0; } else if (mn === dr) { x += dr; nx = 1; ny = 0; }
        else if (mn === dt) { y -= dt; nx = 0; ny = -1; } else { y += db; nx = 0; ny = 1; }
      }
      hitCard = s.cards[i].el;
    }
    s.px = x; s.py = y;
    if (hitCard && hitCard !== s.touching) bonk(hitCard, nx, ny, Math.hypot(s.tx - s.lx, s.ty - s.ly) / 40);
    s.lx = s.tx; s.ly = s.ty;
    s.touching = hitCard;
    // spring the rebound offset back to zero
    s.vbx += -0.18 * s.bx; s.vby += -0.18 * s.by;
    s.vbx *= 0.72; s.vby *= 0.72;
    s.bx += s.vbx; s.by += s.vby;
    m.style.transform = 'translate(' + (x + s.bx).toFixed(1) + 'px,' + (y + s.by).toFixed(1) + 'px) rotate(' + s.tilt.toFixed(1) + 'deg)';
    s.tilt *= 0.85;
    if (s.dragging || Math.abs(s.bx) + Math.abs(s.by) + Math.abs(s.vbx) + Math.abs(s.vby) > 0.05) raf = requestAnimationFrame(frame);
  }

  m.addEventListener('pointerdown', function (e) {
    if (phone()) {          // phones: no dragging
      if (!m.closest('.sidebar')) {   // e.g. on the password screen: just a happy hop
        m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump');
        setTimeout(function () { m.classList.remove('jump'); }, 560);
        pop();
      }
      return;               // in the sidebar it's the menu button (handled below)
    }
    audio();   // browsers only allow sound after a user gesture
    m.setPointerCapture(e.pointerId);
    m.classList.remove('returning');
    m.style.transform = '';
    var cards = Array.prototype.map.call(document.querySelectorAll('.card'), function (el) {
      return { el: el, r: el.getBoundingClientRect() };
    });
    s = { sx: e.clientX, sy: e.clientY, lastX: e.clientX, base: m.getBoundingClientRect(), cards: cards,
          tx: 0, ty: 0, lx: 0, ly: 0, px: 0, py: 0, bx: 0, by: 0, vbx: 0, vby: 0, tilt: 0, moved: false, dragging: true, touching: null };
  });
  m.addEventListener('pointermove', function (e) {
    if (!s || !s.dragging) return;
    s.tx = e.clientX - s.sx; s.ty = e.clientY - s.sy;
    if (!s.moved && Math.hypot(s.tx, s.ty) > 4) { s.moved = true; m.classList.add('dragging'); }
    if (!s.moved) return;
    s.tilt = Math.max(-20, Math.min(20, s.tilt + (e.clientX - s.lastX) * 0.8));
    s.lastX = e.clientX;
    if (!raf) raf = requestAnimationFrame(frame);
  });
  function end() {
    if (!s || !s.dragging) return;
    var moved = s.moved;
    s.dragging = false; s = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (moved) {
      m.classList.remove('dragging');
      m.classList.add('returning');
      m.style.transform = '';   // spring home (CSS transition)
    } else {
      // plain tap: hop up a little
      m.classList.remove('jump'); void m.offsetWidth;
      m.classList.add('jump');
      setTimeout(function () { m.classList.remove('jump'); }, 560);
    }
    pop();
  }
  m.addEventListener('pointerup', end);
  m.addEventListener('pointercancel', end);
  m.addEventListener('lostpointercapture', end);
  window.addEventListener('pointerup', end);
  window.addEventListener('mouseup', end);
  window.addEventListener('blur', end);
  m.addEventListener('transitionend', function (e) { if (e.target === m) m.classList.remove('returning'); });
})();

// ---------- Cards: measure the text block so the screenshot fills the space above it ----------
(function () {
  var cards = document.querySelectorAll('.card.project');
  if (!cards.length || !('ResizeObserver' in window)) return;
  function measure(card) {
    var body = card.querySelector('.card-body');
    if (!body) return;
    card.style.setProperty('--stack', (card.clientHeight - body.offsetTop) + 'px');
  }
  var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { measure(e.target); }); });
  for (var i = 0; i < cards.length; i++) { measure(cards[i]); ro.observe(cards[i]); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { for (var j = 0; j < cards.length; j++) measure(cards[j]); });
})();

// ---------- Password-locked project pages: decrypt <main> in the browser ----------
// Pages are encrypted by tools/lock.mjs. The password is remembered in this browser,
// so after unlocking once, the other locked pages open straight away.
(function () {
  var main = document.querySelector('main.locked[data-ct]');
  if (!main) return;
  var KEY = 'portfolio-unlock';
  var form = main.querySelector('.lock-form');
  var err = main.querySelector('.lock-error');
  if (!window.crypto || !crypto.subtle) { if (err) { err.textContent = 'This browser can’t unlock the page. Try opening it over https.'; err.hidden = false; } return; }
  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function unlock(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: bytes(main.dataset.salt), iterations: +main.dataset.iter, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(main.dataset.iv) }, key, bytes(main.dataset.ct)); })
      .then(function (plain) {
        main.innerHTML = new TextDecoder().decode(plain);
        main.classList.remove('locked');
        ['ct', 'iv', 'salt', 'iter'].forEach(function (k) { delete main.dataset[k]; });
        try { localStorage.setItem(KEY, pw); } catch (e) {}
        var v = main.querySelector('video[autoplay]'); if (v && v.play) v.play().catch(function () {});
        return true;
      });
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved) unlock(saved).catch(function () { try { localStorage.removeItem(KEY); } catch (e) {} });
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input');
    var btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Unlocking…';
    unlock(input.value).catch(function () {
      if (err) err.hidden = false;
      input.select();
      btn.disabled = false; btn.textContent = 'Unlock';
    });
  });
})();

// ---------- Phone: the mascot opens and closes the nav overlay ----------
(function () {
  var m = document.querySelector('.sidebar .mascot');
  var nav = document.getElementById('site-nav');
  if (!m || !nav || !window.matchMedia) return;
  var mq = matchMedia('(max-width: 720px)');
  function setup() {
    if (mq.matches) {
      m.setAttribute('role', 'button'); m.setAttribute('tabindex', '0');
      m.setAttribute('aria-label', 'Menu'); m.setAttribute('aria-controls', 'site-nav');
      m.removeAttribute('aria-hidden');
      m.setAttribute('aria-expanded', document.body.classList.contains('nav-open') ? 'true' : 'false');
    } else {
      document.body.classList.remove('nav-open');
      ['role', 'tabindex', 'aria-label', 'aria-controls', 'aria-expanded'].forEach(function (a) { m.removeAttribute(a); });
      m.setAttribute('aria-hidden', 'true');
    }
  }
  function toggle(open) {
    var o = open === undefined ? !document.body.classList.contains('nav-open') : open;
    document.body.classList.toggle('nav-open', o);
    m.setAttribute('aria-expanded', o ? 'true' : 'false');
    // little hop as feedback
    m.classList.remove('jump'); void m.offsetWidth; m.classList.add('jump');
    setTimeout(function () { m.classList.remove('jump'); }, 560);
  }
  m.addEventListener('click', function () { if (mq.matches) toggle(); });
  m.addEventListener('keydown', function (e) { if (mq.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
  nav.addEventListener('click', function (e) { if (mq.matches && e.target.closest('a')) toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggle(false); });
  if (mq.addEventListener) mq.addEventListener('change', setup); else if (mq.addListener) mq.addListener(setup);
  setup();
})();

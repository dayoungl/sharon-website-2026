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
  // No saved choice yet: keep following the device if it switches light/dark (e.g. at sunset)
  if (window.matchMedia) {
    var dark = matchMedia('(prefers-color-scheme: dark)');
    var follow = function () {
      var saved = null; try { saved = localStorage.getItem('theme'); } catch (e) {}
      if (NAMES.indexOf(saved) < 0) setTheme(dark.matches ? 0 : NAMES.indexOf('glacier'), false);
    };
    if (dark.addEventListener) dark.addEventListener('change', follow); else if (dark.addListener) dark.addListener(follow);
  }
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

  // Forward: homepage card
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // only homepage cards expand into the page; Next project just fades to the next page
    var a = e.target.closest && e.target.closest('a.card.project');
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
        if (window.__mochiDrop) window.__mochiDrop(m);
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
      if (window.__mochiDrop) window.__mochiDrop(m);
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

// ---------- Password-locked content: decrypt in the browser ----------
// Encrypted by tools/lock.mjs: either a whole page (main.locked) or single sections
// (section.lock-section, e.g. Impact numbers). The password is remembered in this browser,
// so after unlocking once, every locked page and section opens straight away.
(function () {
  var boxes = [].slice.call(document.querySelectorAll('main.locked[data-ct], section.lock-section[data-ct]'));
  if (!boxes.length) return;
  var KEY = 'portfolio-unlock';
  function bytes(b64) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function unlock(box, pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: bytes(box.dataset.salt), iterations: +box.dataset.iter, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(box.dataset.iv) }, key, bytes(box.dataset.ct)); })
      .then(function (plain) {
        box.innerHTML = new TextDecoder().decode(plain);
        box.classList.remove('locked', 'lock-section');
        ['ct', 'iv', 'salt', 'iter'].forEach(function (k) { delete box.dataset[k]; });
        try { localStorage.setItem(KEY, pw); } catch (e) {}
        var v = box.querySelector('video[autoplay]'); if (v && v.play) v.play().catch(function () {});
        return true;
      });
  }
  // one right password opens every locked box on the page
  function unlockAll(pw) {
    var left = boxes.filter(function (b) { return b.dataset.ct; });
    return Promise.all(left.map(function (b) { return unlock(b, pw); }));
  }
  boxes.forEach(function (box) {
    var form = box.querySelector('.lock-form');
    var err = box.querySelector('.lock-error');
    if (!window.crypto || !crypto.subtle) { if (err) { err.textContent = 'This browser can’t unlock the page. Try opening it over https.'; err.hidden = false; } return; }
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input');
      var btn = form.querySelector('button');
      btn.disabled = true; btn.textContent = 'Unlocking…';
      unlockAll(input.value).catch(function () {
        if (err) err.hidden = false;
        input.select();
        btn.disabled = false; btn.textContent = 'Unlock';
      });
    });
  });
  if (!window.crypto || !crypto.subtle) return;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved) unlockAll(saved).catch(function () { try { localStorage.removeItem(KEY); } catch (e) {} });
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

// ---------- Locked pages: tap the mascot to drop copies that pile up with gravity (max 50) ----------
(function () {
  var src = document.querySelector('.lock-mascot');
  if (!src) return;
  var MAX = 50, SIZE = 72, R = SIZE / 2, G = 2200, BOUNCE = 0.35, FRICTION = 0.995;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var layer = document.createElement('div');
  layer.className = 'mochi-pile';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  var bodies = [], last = 0, running = false, grab = null;
  // Gravity direction in screen space (x, y), magnitude 0..1. Default: straight down.
  var grav = { x: 0, y: 1 }, tilt = false;

  // Phones: tilt the phone and gravity follows (DeviceMotion). iOS needs permission from a tap.
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function onMotion(e) {
    var g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    // Device axes → screen axes. iOS reports gravity along -y when upright; Android the opposite.
    var gx = isIOS ? g.x : -g.x, gy = isIOS ? -g.y : g.y;
    // Account for landscape: rotate by the screen orientation angle
    var ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    var rad = -ang * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
    var sx = gx * c - gy * s, sy = gx * s + gy * c;
    grav.x = Math.max(-1, Math.min(1, sx / 9.81));
    grav.y = Math.max(-1, Math.min(1, sy / 9.81));
    tilt = true;
    if (bodies.length && !running) { running = true; last = performance.now(); requestAnimationFrame(step); }
  }
  var asked = false, listening = false;
  function note(msg) {   // small status message in the corner toast
    var t = document.getElementById('toast');
    if (!t) return;
    t.innerHTML = '<span class="toast-msg">' + msg + '</span>';
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function listen() {
    if (listening) return;
    listening = true;
    window.addEventListener('devicemotion', onMotion);
  }
  function enableTilt() {
    if (asked || !('DeviceMotionEvent' in window)) return;
    if (!(window.matchMedia && matchMedia('(pointer: coarse)').matches)) return;   // phones/tablets only
    asked = true;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      var p;
      try { p = DeviceMotionEvent.requestPermission(); } catch (e) { p = Promise.reject(e); }
      p.then(function (s) {
        if (s === 'granted') listen();
        else note('Motion access is off, so tilting won’t work in this browser.');
      }).catch(function () {
        asked = false;   // try again on the next tap
        note('This browser didn’t allow motion access. Try Safari.');
      });
    } else {
      listen();
    }
  }

  function spawn() {
    if (bodies.length >= MAX) { layer.classList.remove('full'); void layer.offsetWidth; layer.classList.add('full'); return; }
    var r = src.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'mochi';
    el.innerHTML = src.querySelector('svg').outerHTML;
    layer.appendChild(el);
    var b = { el: el, x: r.left + r.width / 2, y: r.top + r.height / 2,
              vx: (Math.random() - 0.5) * 520, vy: -380 - Math.random() * 240,
              a: 0, va: (Math.random() - 0.5) * 360 };
    bodies.push(b);
    attachDrag(b);
    draw(b);
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); }
  }

  function draw(b) { b.el.style.transform = 'translate(' + (b.x - R) + 'px,' + (b.y - R) + 'px) rotate(' + b.a + 'deg)'; }

  function step(t) {
    var dt = Math.min(0.033, (t - last) / 1000); last = t;
    var W = window.innerWidth, H = window.innerHeight, moving = false;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b === (grab && grab.b)) continue;
      b.vx += G * grav.x * dt; b.vy += G * grav.y * dt; b.vx *= FRICTION;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.a += b.va * dt; b.va *= 0.985;
      // all four screen edges (gravity can point any way when the phone tilts)
      if (b.y > H - R) { b.y = H - R; b.vy = -Math.abs(b.vy) * BOUNCE; b.vx *= 0.9; b.va = b.vx * 1.2; if (Math.abs(b.vy) < 30) b.vy = 0; }
      if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * BOUNCE; b.vx *= 0.9; }
      if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * BOUNCE; b.vy *= 0.9; b.va = -b.vy * 1.2; }
      if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * BOUNCE; b.vy *= 0.9; b.va = b.vy * 1.2; }
    }
    // body–body collisions (a few passes so piles settle)
    for (var pass = 0; pass < 3; pass++) {
      for (var p = 0; p < bodies.length; p++) for (var q = p + 1; q < bodies.length; q++) {
        var A = bodies[p], B = bodies[q];
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01, overlap = SIZE * 0.92 - d;
        if (overlap <= 0) continue;
        var nx = dx / d, ny = dy / d;
        var aHeld = grab && grab.b === A, bHeld = grab && grab.b === B;
        var wa = aHeld ? 0 : bHeld ? 1 : 0.5, wb = bHeld ? 0 : aHeld ? 1 : 0.5;
        A.x -= nx * overlap * wa; A.y -= ny * overlap * wa;
        B.x += nx * overlap * wb; B.y += ny * overlap * wb;
        var rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (rv < 0) {
          var j = -(1 + BOUNCE) * rv / 2;
          if (!aHeld) { A.vx -= j * nx; A.vy -= j * ny; }
          if (!bHeld) { B.vx += j * nx; B.vy += j * ny; }
        }
      }
    }
    for (var k = 0; k < bodies.length; k++) {
      var c = bodies[k];
      c.y = Math.max(R, Math.min(window.innerHeight - R, c.y));
      c.x = Math.max(R, Math.min(window.innerWidth - R, c.x));
      draw(c);
      if (Math.abs(c.vx) + Math.abs(c.vy) > 8) moving = true;
    }
    if (moving || grab || tilt) requestAnimationFrame(step); else running = false;   // keep simulating while the phone can tilt
  }

  function attachDrag(b) {
    b.el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { b.el.setPointerCapture(e.pointerId); } catch (err) {}
      grab = { b: b, px: e.clientX, py: e.clientY, t: performance.now(), vx: 0, vy: 0 };
      b.el.classList.add('held');
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); }
    });
    b.el.addEventListener('pointermove', function (e) {
      if (!grab || grab.b !== b) return;
      var now = performance.now(), dt = Math.max(0.008, (now - grab.t) / 1000);
      grab.vx = (e.clientX - grab.px) / dt; grab.vy = (e.clientY - grab.py) / dt;
      b.x += e.clientX - grab.px; b.y += e.clientY - grab.py;
      grab.px = e.clientX; grab.py = e.clientY; grab.t = now;
    });
    function release() {
      if (!grab || grab.b !== b) return;
      b.vx = Math.max(-2500, Math.min(2500, grab.vx)); b.vy = Math.max(-2500, Math.min(2500, grab.vy));
      b.va = b.vx * 0.6;
      b.el.classList.remove('held');
      grab = null;
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); }
    }
    b.el.addEventListener('pointerup', release);
    b.el.addEventListener('pointercancel', release);
    b.el.addEventListener('lostpointercapture', release);
  }

  // iOS only shows the motion-permission prompt from a 'click'/'touchend' gesture
  // (not pointerdown), so ask from the mascot's click event.
  src.addEventListener('click', enableTilt);
  src.addEventListener('touchend', enableTilt);
  // called by the mascot code on a tap (desktop click or phone tap)
  window.__mochiDrop = function (m) { if (m === src && !reduce) spawn(); };
  // the pile goes away once the page is unlocked
  var main = document.querySelector('main.locked');
  if (main && window.MutationObserver) new MutationObserver(function () {
    if (!main.classList.contains('locked')) { layer.remove(); }
  }).observe(main, { attributes: true, attributeFilter: ['class'] });
})();


// ---------- Growth banner: coins fall in from the top with gravity, bounce and pile up ----------
// The banner sits inside a locked page, so wait until it exists (after unlocking), then start once.
(function () {
  function start(banner) {
    if (banner.dataset.coinsOn) return;
    banner.dataset.coinsOn = '1';
    var src = banner.dataset.coin, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = banner.clientWidth, H = banner.clientHeight;
    var phone = W < 720, D = phone ? 34 : 84, R = D * 0.49, N = 30;
    banner.style.setProperty('--coin', D + 'px');
    var coins = [], grab = null, running = false, last = 0, settleBy = performance.now() + 4500;
    for (var i = 0; i < N; i++) {
      var el = document.createElement('img');
      var list = src.split(','); el.src = list[Math.floor(Math.random() * list.length)].trim(); el.alt = ''; el.className = 'coin'; el.draggable = false;
      banner.appendChild(el);
      var c = { el: el, x: R + Math.random() * (W - 2 * R), y: -R - Math.random() * H * 0.6 - i * 18,
                vx: (Math.random() - 0.5) * 120, vy: 0, a: Math.random() * 60 - 30, delay: i * 0.05 };
      if (reduce) { c.y = H - R - (i % 2) * R * 1.6; c.x = R + (i / N) * (W - 2 * R); c.delay = 0; }
      coins.push(c); place(c);
    }
    function place(c) { c.el.style.transform = 'translate(' + (c.x - D / 2) + 'px,' + (c.y - D / 2) + 'px) rotate(' + c.a + 'deg)'; }
    function step(t) {
      var dt = Math.min(0.032, (t - last) / 1000); last = t;
      W = banner.clientWidth; H = banner.clientHeight;
      var moving = false;
      for (var k = 0; k < coins.length; k++) {
        var c = coins[k];
        if (c.delay > 0) { c.delay -= dt; moving = true; continue; }
        if (c === grab) continue;
        c.vy += 2600 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.y > H - R) { c.y = H - R; c.vy *= -0.32; c.vx *= 0.9; if (Math.abs(c.vy) < 40) c.vy = 0; }
        if (c.x < R) { c.x = R; c.vx = Math.abs(c.vx) * 0.5; }
        if (c.x > W - R) { c.x = W - R; c.vx = -Math.abs(c.vx) * 0.5; }
        if (c.y >= H - R - 0.5) c.vx *= 0.96;   // floor friction
        c.a += c.vx * dt / R * 57.3;   // roll as it slides
      }
      // coin-to-coin collisions: push apart and trade velocity along the contact
      for (var it = 0; it < 3; it++) for (var p = 0; p < coins.length; p++) for (var q = p + 1; q < coins.length; q++) {
        var A = coins[p], B = coins[q]; if (A.delay > 0 || B.delay > 0) continue;
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01, min = R * 2;
        if (d >= min) continue;
        var nx = dx / d, ny = dy / d, over = (min - d) / 2;
        if (A !== grab) { A.x -= nx * over; A.y -= ny * over; }
        if (B !== grab) { B.x += nx * over; B.y += ny * over; }
        var rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
        if (rv < 0) { var j = -1.3 * rv / 2; A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny; }
      }
      for (var m = 0; m < coins.length; m++) {
        var o = coins[m]; place(o);
        if (o.delay <= 0 && (Math.abs(o.vx) > 4 || Math.abs(o.vy) > 4 || o.y < H - R * 2.2 && o.vy !== 0)) moving = true;
      }
      // the pile comes to rest: stop simulating a few seconds after the last drop or fling
      if (grab || (moving && t < settleBy)) requestAnimationFrame(step); else running = false;
    }
    function run() { settleBy = Math.max(settleBy, performance.now() + 2500); if (!running) { running = true; last = performance.now(); requestAnimationFrame(step); } }
    // drag a coin and fling it
    banner.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.coin'); if (!el) return;
      e.preventDefault();
      grab = coins.filter(function (c) { return c.el === el; })[0];
      var box = banner.getBoundingClientRect(), px = e.clientX, py = e.clientY, pt = performance.now();
      el.classList.add('grabbed'); try { el.setPointerCapture(e.pointerId); } catch (err) {}
      function move(ev) {
        var now = performance.now(), ddt = Math.max(0.016, (now - pt) / 1000);
        grab.vx = (ev.clientX - px) / ddt; grab.vy = (ev.clientY - py) / ddt;
        px = ev.clientX; py = ev.clientY; pt = now;
        grab.x = ev.clientX - box.left; grab.y = ev.clientY - box.top; place(grab); run();
      }
      function up() {
        el.classList.remove('grabbed'); grab = null;
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        run();
      }
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    if (!reduce) run();
  }
  function check() { var b = document.querySelector('.growth-banner[data-coin]'); if (b) { start(b); return true; } }
  if (!check() && window.MutationObserver) {
    var mo = new MutationObserver(function () { if (check()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
})();

// ---------- Halftone ambient: slow-drifting dot field behind a word cover ----------
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initHalftone(box) {
    if (box.dataset.htOn) return; box.dataset.htOn = '1';
    var cv = document.createElement('canvas'); cv.className = 'halftone'; cv.setAttribute('aria-hidden', 'true');
    box.insertBefore(cv, box.firstChild);
    var ctx = cv.getContext('2d'), w = 0, h = 0, dpr = 1, visible = true, raf = 0, hover = false, t = 0, last = 0;
    var CELL = 6;
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = box.clientWidth; h = box.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // three soft blobs drifting on slow orbits, plus a gentle wave, make the "ambient" field
    function field(x, y, t) {
      var nx = x / w, ny = y / h, v = 0;
      var b = [[0.25 + 0.18 * Math.sin(t * 0.21), 0.45 + 0.25 * Math.cos(t * 0.17), 0.33],
               [0.72 + 0.16 * Math.cos(t * 0.15), 0.40 + 0.28 * Math.sin(t * 0.23), 0.30],
               [0.50 + 0.30 * Math.sin(t * 0.11 + 2), 0.75 + 0.15 * Math.cos(t * 0.19 + 1), 0.26]];
      for (var i = 0; i < 3; i++) {
        var dx = (nx - b[i][0]) * (w / h), dy = ny - b[i][1];
        v += Math.exp(-(dx * dx + dy * dy) / (b[i][2] * b[i][2]));
      }
      v += 0.18 * Math.sin(nx * 9 + t * 0.5) * Math.cos(ny * 7 - t * 0.4);
      return Math.max(0, Math.min(1, v * 0.75));
    }
    function draw(now) {
      if (raf && last) t += Math.min(0.05, (now - last) / 1000);   // time only advances while animating
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath();
      for (var y = CELL / 2; y < h; y += CELL) {
        for (var x = CELL / 2; x < w; x += CELL) {
          var r = field(x, y, t) * CELL * 0.46;
          if (r < 0.35) continue;
          ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
        }
      }
      ctx.fill();
      if (!reduce && visible && hover) raf = requestAnimationFrame(draw); else { raf = 0; last = 0; }
    }
    size(); draw(performance.now());
    new ResizeObserver(function () { size(); if (!raf) draw(performance.now()); }).observe(box);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && hover && !raf && !reduce) raf = requestAnimationFrame(draw);
    }).observe(box);
    // only animate while the card is hovered or focused; otherwise hold the current frame
    var card = box.closest('a, .card') || box;
    function on() { hover = true; if (!raf && !reduce && visible) raf = requestAnimationFrame(draw); }
    function off() { hover = false; }
    card.addEventListener('pointerenter', on); card.addEventListener('pointerleave', off);
    card.addEventListener('focus', on); card.addEventListener('blur', off);
  }
  // run now, and again when a locked page reveals its content
  function scan() { document.querySelectorAll('[data-halftone]').forEach(initHalftone); }
  scan();
  if (window.MutationObserver) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();

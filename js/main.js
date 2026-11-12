/* HALCYON — interactions. Vanilla JS, no dependencies. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionQuery.matches;
  const pad = (n) => String(n).padStart(2, '0');

  /* ------------------------------------------------------------------
     One rAF-throttled scroll / resize loop for everything scroll-linked
     ------------------------------------------------------------------ */
  const frameTasks = [];
  let framePending = false;
  const runFrame = () => {
    framePending = false;
    for (const task of frameTasks) task();
  };
  const requestFrame = () => {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(runFrame);
    }
  };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });

  /* ------------------------------------------------------------------
     Header: solid on scroll, current section in the nav
     ------------------------------------------------------------------ */
  const header = $('#site-header');
  frameTasks.push(() => header.classList.toggle('is-solid', window.scrollY > 24));

  const navLinks = $$('.site-nav a');
  const navTargets = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && navTargets.length) {
    const spy = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of navLinks) {
          if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    navTargets.forEach((el) => spy.observe(el));
    // Clear the marker above the first section (hero) and below the last one.
    const first = navTargets[0];
    frameTasks.push(() => {
      if (first.getBoundingClientRect().top > window.innerHeight * 0.55) {
        navLinks.forEach((l) => l.removeAttribute('aria-current'));
      }
    });
  }

  /* ------------------------------------------------------------------
     Mobile menu (native <dialog>: focus trap, Esc and inert come free)
     ------------------------------------------------------------------ */
  const menu = $('#menu');
  const menuOpen = $('#menu-open');
  const menuClose = $('#menu-close');
  if (menu && menuOpen && typeof menu.showModal === 'function') {
    const setOpen = (open) => {
      menuOpen.setAttribute('aria-expanded', String(open));
      document.documentElement.style.overflow = open ? 'hidden' : '';
    };
    menuOpen.addEventListener('click', () => {
      menu.showModal();
      setOpen(true);
    });
    menuClose.addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => setOpen(false));
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) menu.close();
    });
    window.matchMedia('(min-width: 68.75rem)').addEventListener('change', (e) => {
      if (e.matches && menu.open) menu.close();
    });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  const revealEls = $$('.reveal, .reveal-title, .media-reveal');
  if ('IntersectionObserver' in window) {
    const revealer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    revealEls.forEach((el) => revealer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     Film: lazy, muted, pausable video over a still
     ------------------------------------------------------------------ */
  const AV1 = 'video/mp4; codecs="av01.0.08M.10"';

  async function pickSource(video) {
    const { av1, h264, h264Small } = video.dataset;
    if (h264Small && window.matchMedia('(max-width: 47.5rem)').matches) return h264Small;
    if (av1 && video.canPlayType(AV1) && navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo) {
      try {
        const info = await navigator.mediaCapabilities.decodingInfo({
          type: 'file',
          video: { contentType: AV1, width: video.width || 1920, height: video.height || 1080, bitrate: 600000, framerate: 24 },
        });
        // Only take AV1 where it is hardware decoded; H.264 is the safe path.
        if (info.supported && info.smooth && info.powerEfficient) return av1;
      } catch (err) { /* fall through to H.264 */ }
    }
    return h264;
  }

  /**
   * @param {HTMLElement} host   element that gets .is-playing
   * @param {HTMLVideoElement} video
   * @param {HTMLButtonElement|null} toggle
   * @param {{mode: 'once'|'loop', labels: {pause: string, play: string, replay: string}, startRatio?: number, onEnded?: Function, onFail?: Function}} opts
   */
  function setupFilm(host, video, toggle, opts) {
    const label = toggle ? $('.film-toggle__label', toggle) : null;
    let loading = null;
    let userPaused = false;
    let visible = false;
    let ended = false;
    let started = false;

    const setToggle = (state) => {
      if (!toggle) return;
      toggle.hidden = false;
      toggle.classList.toggle('is-paused', state !== 'playing');
      const text = state === 'playing' ? opts.labels.pause : state === 'ended' ? opts.labels.replay : opts.labels.play;
      if (label) label.textContent = text;
    };

    const load = () => {
      if (loading) return loading;
      // The poster is the still already on screen, so it costs nothing extra.
      const still = $('img', video.parentElement);
      if (!video.poster) video.poster = (still && still.currentSrc) || video.dataset.poster || '';
      loading = pickSource(video).then((src) => new Promise((resolve, reject) => {
        let triedFallback = src === video.dataset.h264;
        video.addEventListener('canplay', () => resolve(), { once: true });
        video.addEventListener('error', () => {
          if (!triedFallback && video.dataset.h264) {
            triedFallback = true;
            video.src = video.dataset.h264;
            video.load();
          } else {
            reject(new Error('video failed'));
          }
        });
        video.src = src;
        video.load();
      }));
      loading.catch(() => {
        if (toggle) toggle.hidden = true;
        if (opts.onFail) opts.onFail();
      });
      return loading;
    };

    const play = () => load().then(() => {
      if (ended) { video.currentTime = 0; ended = false; }
      return video.play();
    }).then(() => { started = true; }).catch(() => {
      if (!started && opts.onFail) opts.onFail();
      setToggle('paused');
    });

    video.addEventListener('playing', () => { host.classList.add('is-playing'); setToggle('playing'); });
    video.addEventListener('pause', () => { if (!video.ended) setToggle('paused'); });
    video.addEventListener('ended', () => {
      ended = true;
      setToggle('ended');
      if (opts.onEnded) opts.onEnded();
    });

    if (toggle) {
      toggle.addEventListener('click', () => {
        if (!video.paused && !video.ended) { userPaused = true; video.pause(); }
        else { userPaused = false; play(); }
      });
    }

    if (reduced()) {
      // No autoplay. The still stays; the guest may start the film by hand.
      setToggle('paused');
      return;
    }

    if (!('IntersectionObserver' in window)) { play(); return; }

    // Fetch a little before it is needed, play when it is really on screen.
    const loader = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { load(); obs.disconnect(); }
    }, { rootMargin: '60% 0px' });
    loader.observe(host);

    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting && entry.intersectionRatio >= (opts.startRatio || 0.25);
        if (visible && !userPaused && !ended && video.paused) play();
        else if (!visible && !video.paused) video.pause();
      }
    }, { threshold: [0, opts.startRatio || 0.25, 0.6] });
    watcher.observe(host);
  }

  /* ------------------------------------------------------------------
     Hero: sunrise film, scroll fade, pointer depth
     ------------------------------------------------------------------ */
  const hero = $('.hero');
  const heroStage = $('#hero-stage');
  const heroVideo = $('#hero-video');

  const showHeroStill = () => {
    // If the film cannot play, dissolve from first light to the risen sun instead.
    if (!heroStage || $('.hero__still', heroStage)) return;
    const img = new Image();
    img.className = 'hero__still';
    img.alt = '';
    img.decoding = 'async';
    img.sizes = '(min-aspect-ratio: 53/50) 100vw, 106vh';
    img.srcset = [960, 1440, 1920, 2560].map((w) => `assets/img/hero-still-${w}.webp ${w}w`).join(', ');
    img.src = 'assets/img/hero-still-1920.jpg';
    const reveal = () => requestAnimationFrame(() => hero.classList.add('is-still', 'is-risen'));
    img.addEventListener('load', reveal, { once: true });
    heroStage.insertBefore(img, heroVideo);
  };

  if (hero && heroVideo) {
    const startHeroFilm = () => setupFilm(hero, heroVideo, $('#hero-toggle'), {
      mode: 'once',
      startRatio: 0.2,
      labels: { pause: 'Pause sunrise', play: 'Play sunrise', replay: 'Replay sunrise' },
      onEnded: () => hero.classList.add('is-risen'),
      onFail: showHeroStill,
    });
    // Never compete with first paint: wait for load, then for an idle moment.
    const afterLoad = () => (window.requestIdleCallback ? requestIdleCallback(startHeroFilm, { timeout: 600 }) : setTimeout(startHeroFilm, 120));
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });

    heroVideo.addEventListener('play', () => hero.classList.remove('is-risen'));

    // Scroll: the film sinks, the copy lifts and fades.
    frameTasks.push(() => {
      if (reduced()) return;
      const h = hero.offsetHeight || 1;
      if (window.scrollY > h) return;
      hero.style.setProperty('--scroll', clamp(window.scrollY / (h * 0.9)).toFixed(4));
    });

    // Pointer: a few pixels of depth, on devices with a real pointer.
    if (!reduced() && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      const step = () => {
        x += (tx - x) * 0.06;
        y += (ty - y) * 0.06;
        heroStage.style.setProperty('--px', `${x.toFixed(2)}px`);
        heroStage.style.setProperty('--py', `${y.toFixed(2)}px`);
        raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.05 ? requestAnimationFrame(step) : 0;
      };
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
        ty = ((e.clientY - r.top) / r.height - 0.5) * -12;
        if (!raf) raf = requestAnimationFrame(step);
      });
      hero.addEventListener('pointerleave', () => {
        tx = 0; ty = 0;
        if (!raf) raf = requestAnimationFrame(step);
      });
    }
  }

  /* Other films */
  $$('[data-film]').forEach((host) => {
    const video = $('video', host);
    if (!video) return;
    const mode = host.dataset.filmMode === 'loop' ? 'loop' : 'once';
    setupFilm(host, video, $('[data-film-toggle]', host), {
      mode,
      startRatio: mode === 'once' ? 0.5 : 0.2,
      labels: { pause: 'Pause film', play: 'Play film', replay: 'Replay film' },
    });
  });

  /* ------------------------------------------------------------------
     The View: scroll-driven orbital sunrise (WebGL, loaded on approach)
     ------------------------------------------------------------------ */
  const orbit = $('#orbit');
  if (orbit) {
    const canvas = $('#orbit-canvas');
    const clock = $('#orbit-clock');
    const bar = $('#orbit-bar');
    const steps = $$('.orbit__step', orbit);
    let scene = null;
    let progress = 0;

    const measure = () => {
      const rect = orbit.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      progress = travel > 0 ? clamp(-rect.top / travel) : 0;
      orbit.classList.toggle('is-done', rect.bottom < window.innerHeight - 2);
      if (bar) bar.style.setProperty('--p', progress.toFixed(4));
      if (clock) {
        const seconds = Math.round(38 * 60 + progress * 10 * 60);
        clock.textContent = `T+ 00:${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
      }
      if (scene) scene.setProgress(progress);
    };
    frameTasks.push(measure);

    if ('IntersectionObserver' in window) {
      const stepWatcher = new IntersectionObserver((entries) => {
        for (const entry of entries) entry.target.classList.toggle('is-active', entry.isIntersecting);
      }, { rootMargin: window.innerHeight > window.innerWidth ? '-28% 0px -71% 0px' : '-36% 0px -63% 0px' });
      steps.forEach((s) => stepWatcher.observe(s));

      const boot = new IntersectionObserver((entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        import('./sunrise.js').then((mod) => {
          scene = mod.createSunrise(canvas, { reducedMotion: reduced() });
          if (!scene) return;
          orbit.classList.add('is-live');
          measure();
          const active = new IntersectionObserver((list) => {
            for (const e of list) scene.setActive(e.isIntersecting);
          }, { rootMargin: '10% 0px' });
          active.observe(orbit);
        }).catch(() => { /* the CSS dawn stays in place */ });
      }, { rootMargin: '120% 0px' });
      boot.observe(orbit);
    } else {
      steps.forEach((s) => s.classList.add('is-active'));
    }
  }

  /* ------------------------------------------------------------------
     The Journey: tabs + flight profile
     ------------------------------------------------------------------ */
  const flight = $('#flight');
  if (flight) {
    const tabs = $$('[role="tab"]', flight);
    const panels = tabs.map((t) => $(`#${t.getAttribute('aria-controls')}`));
    const path = $('#flight-path');
    const progressPath = $('#flight-progress');
    const marker = $('#flight-marker');
    const stops = $$('.flight__stops circle', flight);
    const total = path.getTotalLength();

    // Find where each stop sits along the path.
    const stopLengths = stops.map((c) => {
      const cx = +c.getAttribute('cx');
      const cy = +c.getAttribute('cy');
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i <= 600; i++) {
        const l = (i / 600) * total;
        const p = path.getPointAtLength(l);
        const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
        if (d < bestD) { bestD = d; best = l; }
      }
      return best;
    });
    stopLengths[0] = 0;
    stopLengths[stopLengths.length - 1] = total;

    let current = 0;
    let length = 0;
    let anim = 0;

    const draw = (l) => {
      length = l;
      progressPath.style.strokeDasharray = `${total}`;
      progressPath.style.strokeDashoffset = `${total - l}`;
      const p = path.getPointAtLength(l);
      marker.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      stops.forEach((c, i) => c.classList.toggle('is-done', stopLengths[i] <= l + 0.5));
    };

    const travelTo = (index) => {
      cancelAnimationFrame(anim);
      const from = length;
      const to = stopLengths[index];
      if (reduced() || from === to) { draw(to); return; }
      const duration = 700 + Math.abs(to - from) * 1.1;
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const tick = (now) => {
        const t = clamp((now - t0) / duration);
        draw(from + (to - from) * ease(t));
        if (t < 1) anim = requestAnimationFrame(tick);
      };
      anim = requestAnimationFrame(tick);
    };

    const select = (index, focus) => {
      current = index;
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
        panels[i].classList.toggle('is-active', on);
      });
      if (focus) tabs[index].focus();
      travelTo(index);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i, false));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (current - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next, true);
      });
    });
    stops.forEach((c, i) => {
      c.style.cursor = 'pointer';
      c.addEventListener('click', () => select(i, false));
    });
    draw(0);
  }

  /* ------------------------------------------------------------------
     Life on board: the live orbit clock
     ------------------------------------------------------------------ */
  const live = $('#live');
  if (live) {
    const PERIOD = 90 * 60;            // one orbit, in seconds
    const DAY_SHARE = 55 / 90;         // share of each orbit spent in sunlight
    const stateEl = $('#live-state');
    const nextEl = $('#live-next');
    const countEl = $('#live-count');
    const hand = $('#live-hand');
    const night = $('#live-night');

    // Night arc on the dial (the dial's top is sunrise, clockwise).
    const polar = (share, r = 48) => {
      const a = share * Math.PI * 2 - Math.PI / 2;
      return `${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`;
    };
    night.setAttribute('d', `M${polar(DAY_SHARE)} A48 48 0 0 1 ${polar(0.9999)}`);

    const tick = () => {
      const now = Date.now() / 1000;
      const phase = (now % PERIOD) / PERIOD;
      const untilSunrise = Math.ceil((1 - phase) * PERIOD);
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const count = Math.floor(now / PERIOD) - Math.floor(midnight.getTime() / 1000 / PERIOD);
      stateEl.textContent = phase < DAY_SHARE ? 'in daylight' : 'in Earth’s shadow';
      nextEl.textContent = `${pad(Math.floor(untilSunrise / 60))}:${pad(untilSunrise % 60)}`;
      countEl.textContent = String(clamp(count, 0, 16));
      hand.setAttribute('transform', `rotate(${(phase * 360).toFixed(2)} 60 60)`);
    };
    tick();
    let timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!document.hidden) { tick(); timer = setInterval(tick, 1000); }
    });
  }

  /* ------------------------------------------------------------------
     Safety: counters
     ------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduced()) {
    const run = (el) => {
      const target = Number(el.dataset.count);
      const duration = 1100 + Math.min(900, target * 6);
      const t0 = performance.now();
      const tick = (now) => {
        const t = clamp((now - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      };
      el.textContent = '0';
      requestAnimationFrame(tick);
    };
    const counterWatcher = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target);
        obs.unobserve(entry.target);
      }
    }, { threshold: 0.6 });
    counters.forEach((el) => counterWatcher.observe(el));
  }

  /* ------------------------------------------------------------------
     Pricing: the ring of 32 seats
     ------------------------------------------------------------------ */
  const seatsSvg = $('#seats-svg');
  if (seatsSvg) {
    const NS = 'http://www.w3.org/2000/svg';
    const TOTAL = 32;
    const FREE = [2, 6, 11, 15, 20, 24, 29];
    const make = (name, attrs) => {
      const el = document.createElementNS(NS, name);
      for (const key in attrs) el.setAttribute(key, attrs[key]);
      return el;
    };
    seatsSvg.appendChild(make('circle', { class: 'seats__track', cx: 120, cy: 120, r: 92 }));
    for (let i = 0; i < TOTAL; i++) {
      const a = (i / TOTAL) * Math.PI * 2 - Math.PI / 2;
      const cx = (120 + 108 * Math.cos(a)).toFixed(2);
      const cy = (120 + 108 * Math.sin(a)).toFixed(2);
      const free = FREE.includes(i);
      if (free) {
        const halo = make('circle', { class: 'seat-halo', cx, cy, r: 9 });
        halo.style.setProperty('--i', String(FREE.indexOf(i)));
        seatsSvg.appendChild(halo);
      }
      seatsSvg.appendChild(make('circle', { class: free ? 'seat seat--free' : 'seat', cx, cy, r: free ? 4.2 : 3.6 }));
    }
  }

  /* ------------------------------------------------------------------
     FAQ: accordion
     ------------------------------------------------------------------ */
  $$('.accordion__btn').forEach((btn) => {
    const panel = $(`#${btn.getAttribute('aria-controls')}`);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    });
  });

  /* ------------------------------------------------------------------
     Parallax on marked images
     ------------------------------------------------------------------ */
  const parallaxEls = $$('[data-parallax]');
  if (parallaxEls.length && !reduced()) {
    frameTasks.push(() => {
      const vh = window.innerHeight;
      for (const el of parallaxEls) {
        const frame = el.closest('.campus__media') || el.parentElement;
        const r = frame.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const t = clamp((vh - r.top) / (vh + r.height)) - 0.5;
        el.style.transform = `translate3d(0, ${(t * 9).toFixed(2)}%, 0) scale(1.12)`;
      }
    });
  }

  /* ------------------------------------------------------------------
     Consultation form
     ------------------------------------------------------------------ */
  const form = $('#consult-form');
  const success = $('#consult-success');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const setError = (input, message) => {
    const field = input.closest('.field') || input.closest('.newsletter');
    const ids = (input.getAttribute('aria-describedby') || '').split(' ');
    const errorEl = document.getElementById(ids.find((id) => id.endsWith('-err')));
    if (errorEl) errorEl.textContent = message || '';
    if (field) field.classList.toggle('is-invalid', Boolean(message));
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  };

  if (form && success) {
    const nameInput = form.elements.namedItem('name');
    const emailInput = form.elements.namedItem('email');
    const windowInput = form.elements.namedItem('window');
    const messageInput = form.elements.namedItem('message');
    const submitLabel = $('.form__submit-label', form);
    const submitBtn = $('.form__submit', form);
    const intents = $$('input[name="intent"]', form);
    const intent = () => (intents.find((r) => r.checked) || {}).value || 'consultation';

    const checks = {
      name: () => {
        const v = nameInput.value.trim();
        if (!v) return 'Please tell us your name.';
        if (v.length < 2) return 'That looks a little short. Your full name, please.';
        return '';
      },
      email: () => {
        const v = emailInput.value.trim();
        if (!v) return 'We will need an email address to reply to you.';
        if (!EMAIL.test(v)) return 'That address does not look complete. Something like name@example.com.';
        return '';
      },
      window: () => (windowInput.value ? '' : 'Please choose a launch window. “Not sure yet” is a fine answer.'),
      message: () => (messageInput.value.length > 1200 ? 'A little shorter, please: 1,200 characters at most.' : ''),
    };
    const inputs = { name: nameInput, email: emailInput, window: windowInput, message: messageInput };
    const validate = (key) => setError(inputs[key], checks[key]());

    Object.keys(inputs).forEach((key) => {
      const input = inputs[key];
      input.addEventListener('blur', () => { if (input.value || input.getAttribute('aria-invalid')) validate(key); });
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (input.getAttribute('aria-invalid')) validate(key);
      });
    });

    const applyIntent = (value) => {
      intents.forEach((r) => { r.checked = r.value === value; });
      const waitlist = value === 'waitlist';
      submitLabel.textContent = waitlist ? 'Join the 2029 waitlist' : 'Request a private consultation';
      if (waitlist) { windowInput.value = '2029'; setError(windowInput, ''); }
      else if (windowInput.value === '2029') windowInput.value = '';
    };
    intents.forEach((r) => r.addEventListener('change', () => applyIntent(intent())));
    windowInput.addEventListener('change', () => {
      if (windowInput.value === '2029' && intent() !== 'waitlist') applyIntent('waitlist');
    });

    // Any "consultation / waitlist / enquire" link on the page prepares the form.
    $$('a[data-intent]').forEach((link) => {
      link.addEventListener('click', () => {
        if (!success.hidden) resetForm();
        applyIntent(link.dataset.intent);
        if (link.dataset.about && !messageInput.value.trim()) {
          messageInput.value = `I would like to know more about ${link.dataset.about}.`;
        }
        window.setTimeout(() => nameInput.focus({ preventScroll: true }), reduced() ? 0 : 900);
      });
    });

    const resetForm = () => {
      form.reset();
      Object.keys(inputs).forEach((key) => setError(inputs[key], ''));
      applyIntent('consultation');
      success.hidden = true;
      form.hidden = false;
    };
    $('#consult-reset').addEventListener('click', () => {
      resetForm();
      nameInput.focus();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (form.classList.contains('is-sending')) return;
      const invalid = Object.keys(inputs).filter((key) => !validate(key));
      if (invalid.length) {
        inputs[invalid[0]].focus();
        return;
      }
      const waitlist = intent() === 'waitlist';
      const firstName = nameInput.value.trim().split(/\s+/)[0];
      form.classList.add('is-sending');
      submitBtn.setAttribute('aria-disabled', 'true');
      submitLabel.textContent = 'Sending';

      // There is no backend: this is where the request would be posted.
      window.setTimeout(() => {
        form.classList.remove('is-sending');
        submitBtn.removeAttribute('aria-disabled');
        $('#consult-success-title').textContent = `Thank you, ${firstName}.`;
        $('#consult-success-text').textContent = waitlist
          ? 'You are on the 2029 waitlist. We will write to you when those flights open, and not before.'
          : 'Your request is with our guest directors. One of them will write to you personally within two working days.';
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }, 1300);
    });
  }

  /* ------------------------------------------------------------------
     Newsletter
     ------------------------------------------------------------------ */
  const newsletter = $('#newsletter');
  if (newsletter) {
    const input = $('#n-email');
    const check = () => {
      const v = input.value.trim();
      if (!v) return setError(input, 'Please add an email address first.');
      if (!EMAIL.test(v)) return setError(input, 'That address does not look complete.');
      return setError(input, '');
    };
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid')) check(); });
    newsletter.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!check()) { input.focus(); return; }
      $('.newsletter__row', newsletter).hidden = true;
      $('#newsletter-done').hidden = false;
    });
  }

  requestFrame();
})();

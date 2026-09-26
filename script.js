/* ==========================================================
   Portfolio — script.js
   Small, optional enhancements. The site works without it.
   ========================================================== */

(function () {
  // Mark that JS is running so CSS can enable the reveal effect
  document.documentElement.classList.add("js");

  const sections = document.querySelectorAll(".section");
  const navLinks = document.querySelectorAll(".nav__link");

  /* ---------- 1. Active navigation state ----------
     Highlights the sidebar link for the section currently in view. */
  function setActive(id) {
    navLinks.forEach(function (link) {
      const isMatch = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isMatch);
      if (isMatch) {
        link.setAttribute("aria-current", "true");
        // On mobile, keep the active link visible in the scrolling bar
        if (window.innerWidth <= 720) {
          link.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if ("IntersectionObserver" in window) {
    const activeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      // A thin band near the upper third of the screen decides the "current" section
      { rootMargin: "-30% 0px -65% 0px" }
    );
    sections.forEach(function (s) { activeObserver.observe(s); });

    /* ---------- 2. Quiet reveal ----------
       Sections fade in once, very subtly, as they enter the screen. */
    const revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    sections.forEach(function (s) { revealObserver.observe(s); });
  } else {
    // Older browsers: just show everything
    sections.forEach(function (s) { s.classList.add("is-visible"); });
  }

  /* ---------- 3. Footer year ---------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Helpers for saving settings ----------
     Wrapped in try/catch because some browsers block storage. */
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  // Update a setting button's pressed state and its On/Off label
  function setButton(button, isOn, label) {
    button.setAttribute("aria-pressed", String(isOn));
    button.setAttribute("aria-label", label + ": " + (isOn ? "on" : "off"));
    const value = button.querySelector("[data-value]");
    if (value) value.textContent = isOn ? "On" : "Off";
  }

  /* ---------- 4. Dark mode ----------
     The initial theme is set by the small script in <head>. */
  const root = document.documentElement;
  const themeToggle = document.getElementById("theme-toggle");

  if (themeToggle) {
    setButton(themeToggle, root.getAttribute("data-theme") === "dark", "Dark mode");

    themeToggle.addEventListener("click", function () {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      save("theme", next);
      setButton(themeToggle, next === "dark", "Dark mode");
    });
  }

  /* ---------- 5. Click sound ----------
     A tiny "tick" made with the Web Audio API — no audio file needed.
     To change the sound, adjust the frequency, volume or length below. */
  const soundToggle = document.getElementById("sound-toggle");
  let soundOn = load("sound") !== "off"; // on by default
  let audioCtx = null;

  function playClick() {
    if (!soundOn) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, now);                       // pitch
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.004);     // volume
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);    // length

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  if (soundToggle) {
    setButton(soundToggle, soundOn, "Click sound");

    soundToggle.addEventListener("click", function () {
      soundOn = !soundOn;
      save("sound", soundOn ? "on" : "off");
      setButton(soundToggle, soundOn, "Click sound");
      playClick(); // plays only when turning it back on, as a preview
    });
  }

  // Play the tick for every link and button (the sound toggle handles itself)
  document.addEventListener("click", function (event) {
    const target = event.target.closest("a, button");
    if (!target || target === soundToggle) return;
    playClick();
  });
})();

/* ==========================================================
   Catch the Dot — catch-the-dot.js
   The game sits in a hidden pop-up (#ctd-modal) and only opens
   when the sidebar launcher (#ctd-open) is clicked.
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Settings (edit these) ---------- */
  var CONFIG = {
    myBest: 8750,       // YOUR high score — visitors try to beat it
    rounds: 10,
    minDelay: 350,      // random wait (ms) before each dot appears…
    maxDelay: 1000,     // …somewhere between these two values
    edgePadding: 12,    // keeps the dot away from the rounded corners
    storageKey: "ctd-best"
  };

  var modal = document.getElementById("ctd-modal");
  var launcher = document.getElementById("ctd-open");
  var game = document.getElementById("ctd");
  if (!modal || !game) return;

  function q(selector) { return game.querySelector(selector); }

  var arena = q(".ctd__arena");
  var dot = q(".ctd__dot");
  var ripple = q(".ctd__ripple");
  var ready = q(".ctd__ready");
  var countEl = q(".ctd__count");
  var progress = q(".ctd__progress");
  var live = q(".ctd__live");
  var hud = {
    round: q('[data-hud="round"]'),
    total: q('[data-hud="total"]'),
    last: q('[data-hud="last"]')
  };
  var result = {
    avg: q('[data-result="avg"]'),
    fastest: q('[data-result="fastest"]'),
    score: q('[data-result="score"]'),
    verdict: q('[data-result="verdict"]'),
    note: q('[data-result="note"]')
  };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var state = {
    phase: "intro",   // intro | countdown | waiting | active | done
    round: 0,
    times: [],
    score: 0,
    shownAt: 0,
    lastPos: null,
    pendingShow: false,
    timers: []
  };

  /* ---------- Helpers ---------- */
  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    state.timers.push(id);
    return id;
  }

  function clearTimers() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
  }

  // Unpredictable random number in [0, 1) — uses the crypto API when available
  function random() {
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] / 4294967296;
    }
    return Math.random();
  }

  function formatNumber(n) { return Math.round(n).toLocaleString("en-US"); }

  function restartAnimation(el) {
    el.classList.remove("is-anim");
    void el.offsetWidth; // forces the browser to restart the CSS animation
    el.classList.add("is-anim");
  }

  function announce(text) { live.textContent = text; }

  function load() {
    try { return parseInt(localStorage.getItem(CONFIG.storageKey), 10) || 0; } catch (e) { return 0; }
  }
  function save(value) {
    try { localStorage.setItem(CONFIG.storageKey, String(value)); } catch (e) {}
  }

  function showScreen(name) { game.setAttribute("data-screen", name); }

  /* ---------- Scoring ----------
     Each catch is worth 100–1000 points; faster = more.
       0.25s → 988   0.40s → 890   0.60s → 760   1.00s → 500 */
  function pointsFor(seconds) {
    var points = Math.round(1150 - 650 * seconds);
    return Math.max(100, Math.min(1000, points));
  }

  function tierFor(seconds) {
    if (seconds < 0.3) return "Very fast";
    if (seconds < 0.5) return "Fast";
    if (seconds <= 0.8) return "Average";
    return "Slow";
  }

  /* ---------- Setup ---------- */
  game.tabIndex = -1;
  hud.total.textContent = CONFIG.rounds;
  game.querySelectorAll("[data-my-best]").forEach(function (el) {
    el.textContent = formatNumber(CONFIG.myBest);
  });
  for (var i = 0; i < CONFIG.rounds; i++) progress.appendChild(document.createElement("span"));
  var segments = progress.querySelectorAll("span");

  /* ---------- The dot ---------- */
  function placeDot() {
    var size = dot.offsetWidth;
    var pad = CONFIG.edgePadding;
    var maxX = Math.max(0, arena.clientWidth - size - pad * 2);
    var maxY = Math.max(0, arena.clientHeight - size - pad * 2);
    // Each new spot is at least ~35% of the arena away from the last one
    var minDistance = Math.min(maxX, maxY) * 0.35;
    var x, y, tries = 0;

    do {
      x = pad + random() * maxX;
      y = pad + random() * maxY;
      tries++;
    } while (
      state.lastPos &&
      Math.hypot(x - state.lastPos.x, y - state.lastPos.y) < minDistance &&
      tries < 30
    );

    state.lastPos = { x: x, y: y };
    dot.style.left = x + "px";
    dot.style.top = y + "px";
  }

  // If the window is resized mid-game, pull the dot back inside the area
  function keepDotInside() {
    if (!state.lastPos) return;
    var size = dot.offsetWidth;
    var pad = CONFIG.edgePadding;
    var x = Math.min(state.lastPos.x, Math.max(pad, arena.clientWidth - size - pad));
    var y = Math.min(state.lastPos.y, Math.max(pad, arena.clientHeight - size - pad));
    state.lastPos = { x: x, y: y };
    dot.style.left = x + "px";
    dot.style.top = y + "px";
  }

  function showDot() {
    if (document.hidden) { state.pendingShow = true; return; }
    placeDot();
    ready.classList.remove("is-visible");
    dot.classList.add("is-visible");
    dot.setAttribute("aria-label", "Catch the dot, round " + state.round);
    state.shownAt = performance.now();
    state.phase = "active";
  }

  function hideDot() {
    dot.classList.remove("is-visible");
  }

  function showRipple() {
    ripple.style.left = dot.style.left;
    ripple.style.top = dot.style.top;
    restartAnimation(ripple);
  }

  /* ---------- Game flow ---------- */
  function start() {
    clearTimers();
    state.round = 0;
    state.times = [];
    state.score = 0;
    state.lastPos = null;
    state.pendingShow = false;
    state.phase = "countdown";

    hideDot();
    ready.classList.remove("is-visible");
    hud.round.textContent = "0";
    hud.last.textContent = "—";
    segments.forEach(function (s) { s.classList.remove("is-done"); });
    dot.tabIndex = 0;

    // Move focus off the (now hidden) button but keep it inside the pop-up
    game.focus({ preventScroll: true });

    showScreen("countdown");
    var steps = ["3", "2", "1", "GO!"];
    var stepTime = 650;

    steps.forEach(function (label, index) {
      later(function () {
        countEl.textContent = label;
        restartAnimation(countEl);
        if (index === steps.length - 1) announce("Go!");
      }, index * stepTime);
    });

    later(function () {
      showScreen("playing");
      nextRound();
    }, steps.length * stepTime);
  }

  function nextRound() {
    state.round++;
    state.phase = "waiting";
    hud.round.textContent = state.round;
    ready.classList.add("is-visible");

    var delay = CONFIG.minDelay + random() * (CONFIG.maxDelay - CONFIG.minDelay);
    later(showDot, delay);
  }

  function onHit(event) {
    // Only counts while a dot is actually on screen — blocks double-clicks
    if (state.phase !== "active") return;
    if (event.type === "pointerdown" && (!event.isPrimary || event.button > 0)) return;

    var seconds = (performance.now() - state.shownAt) / 1000;
    state.phase = "waiting";
    state.times.push(seconds);
    state.score += pointsFor(seconds);

    showRipple();
    hideDot();

    hud.last.innerHTML = seconds.toFixed(2) + "s<span class=\"ctd__tier\"> · " + tierFor(seconds) + "</span>";
    restartAnimation(hud.last);
    segments[state.round - 1].classList.add("is-done");

    if (state.round >= CONFIG.rounds) {
      later(finish, 500);
    } else {
      nextRound();
    }
  }

  function finish() {
    state.phase = "done";
    ready.classList.remove("is-visible");
    dot.tabIndex = -1;

    var total = state.times.reduce(function (a, b) { return a + b; }, 0);
    var average = total / state.times.length;
    var fastest = Math.min.apply(null, state.times);
    var score = state.score;

    result.avg.textContent = average.toFixed(3) + "s";
    result.fastest.textContent = fastest.toFixed(3) + "s";

    // Verdict against YOUR score
    if (score > CONFIG.myBest) {
      result.verdict.textContent = "You beat me! 😭";
    } else if (score === CONFIG.myBest) {
      result.verdict.textContent = "A perfect tie. Rematch?";
    } else {
      result.verdict.textContent = "Not bad. Think you can beat me next time?";
    }

    // The visitor's own best, saved in their browser
    var previousBest = load();
    if (score > previousBest) {
      save(score);
      result.note.textContent = previousBest ? "New personal best" : "";
    } else {
      result.note.textContent = "Your best: " + formatNumber(previousBest);
    }

    showScreen("results");
    countUp(result.score, score);
    announce(
      "Finished. Average " + average.toFixed(3) + " seconds, fastest " +
      fastest.toFixed(3) + " seconds, score " + formatNumber(score) + ". " +
      result.verdict.textContent
    );

    var again = q(".ctd__screen--results .ctd__btn");
    if (again) later(function () { again.focus({ preventScroll: true }); }, 300);
  }

  // Score counts up quickly on the results screen
  function countUp(el, target) {
    if (reduceMotion) { el.textContent = formatNumber(target); return; }
    var duration = 700;
    var begin = performance.now();

    function frame(now) {
      var t = Math.min(1, (now - begin) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatNumber(target * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Opening and closing the pop-up ---------- */
  // Stops everything and puts the game back on its intro screen
  function reset() {
    clearTimers();
    state.phase = "intro";
    state.round = 0;
    state.pendingShow = false;
    hideDot();
    ready.classList.remove("is-visible");
    dot.tabIndex = -1;
    hud.round.textContent = "0";
    hud.last.textContent = "—";
    segments.forEach(function (s) { s.classList.remove("is-done"); });
    showScreen("intro");
  }

  var closeTimer = null;

  function openGame() {
    if (modal.open) return;
    clearTimeout(closeTimer);
    modal.classList.remove("is-closing");
    reset();
    document.documentElement.classList.add("ctd-lock");
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
    var startBtn = q(".ctd__screen--intro .ctd__btn");
    if (startBtn) startBtn.focus({ preventScroll: true });
  }

  function closeGame() {
    if (!modal.open || modal.classList.contains("is-closing")) return;
    reset();
    modal.classList.add("is-closing");
    closeTimer = setTimeout(function () {
      modal.classList.remove("is-closing");
      if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open");
      document.documentElement.classList.remove("ctd-lock");
      if (launcher) launcher.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 170);
  }

  if (launcher) launcher.addEventListener("click", openGame);

  game.querySelectorAll('[data-action="close"]').forEach(function (button) {
    button.addEventListener("click", closeGame);
  });

  // Esc key: use the same smooth close
  modal.addEventListener("cancel", function (event) {
    event.preventDefault();
    closeGame();
  });

  // Clicking the dimmed area outside the window closes it
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeGame();
  });

  /* ---------- Events ---------- */
  // pointerdown = instant response for mouse, touch and pen
  dot.addEventListener("pointerdown", onHit);
  // click = keyboard (Enter/Space); ignored if pointerdown already counted it
  dot.addEventListener("click", onHit);

  game.querySelectorAll('[data-action="start"]').forEach(function (button) {
    button.addEventListener("click", start);
  });

  // Don't count time spent in another tab
  document.addEventListener("visibilitychange", function () {
    if (!modal.open) return;
    if (document.hidden && state.phase === "active") {
      hideDot();
      state.phase = "waiting";
      state.pendingShow = true;
    } else if (!document.hidden && state.pendingShow) {
      state.pendingShow = false;
      ready.classList.add("is-visible");
      later(showDot, 700);
    }
  });

  window.addEventListener("resize", keepDotInside);
})();
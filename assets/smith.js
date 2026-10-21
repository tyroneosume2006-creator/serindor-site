/*
  The little smith. An original pixel-art blacksmith drawn live on a 64×46 canvas.
  He forges a bar until it's used up, scratches his head, then borrows the "—"
  from the heading beside him and forges that. Poses step at 12fps for a sprite feel.
*/
(function () {
  const cv = document.querySelector("canvas.smith");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = 64, H = 46, OY = 6;
  cv.width = W; cv.height = H;
  const reduced = !document.documentElement.classList.contains("motion");

  const C = {
    K: "#05070A", h: "#3A3027", s: "#B9805F", S: "#8E5A40", b: "#4A515C", B: "#6B7380",
    T: "#3A414A", t: "#4A525C", A: "#1F3A5F", a: "#3D7BD9", E: "#05070A",
    M: "#AEB5BE", m: "#6B7380", w: "#7A5236", N: "#2E343E", n: "#8E96A1",
    W: "#5A3E2B", V: "#3E2A1E", v: "#7A5A40", H: "#FFFFFF", P: "#A9C6F0", Z: "#3D7BD9", g: "#8E96A1"
  };
  const px = (x, y, c) => { ctx.fillStyle = C[c] || c; ctx.fillRect(Math.round(x), Math.round(y) + OY, 1, 1); };

  /* ---------- static sprites (body, anvil, stump) ---------- */
  const BODY = [
    "......KKKKK......",
    ".....KhhhhhK.....",
    "....KhhhhhhhK....",
    "....KhsssssSK....",
    "....KsssssssK....",
    "....KssssssSK....",
    "....KbbsSsbbK....",
    "....KbbbbbbbK....",
    ".....KbBbbbK.....",
    "..KKKKKbbbKKKKK..",
    ".KTTTTTKbKTTTTTK.",
    ".KTTTaAAAAAaTTTK.",
    ".KTTTaAAAAAaTTTK.",
    ".KTTTAAAAAAATTTK.",
    ".KTTTAAAAAAATTTK.",
    ".KTTTAAAAAAATTTK.",
    ".KTTTAAAaAAATTTK.",
    ".KTTTAAAAAAATTTK.",
    ".KTTTAAAAAAATTTK."
  ];
  const BX = 24, BY = 3;
  const drawMap = (map, ox, oy) => map.forEach((row, y) => [...row].forEach((c, x) => { if (c !== ".") px(ox + x, oy + y, c); }));

  // anvil and stump as pixel sets, outlined by dilation
  const shape = (fill) => { const set = new Map(); fill((x, y, c) => set.set(x + "," + y, c)); return set; };
  const anvil = shape(put => {
    for (let x = 20; x <= 44; x++) put(x, 24, "n");
    for (let x = 45; x <= 48; x++) put(x, 24, "n");
    for (let x = 20; x <= 44; x++) put(x, 25, "N");
    for (let x = 45; x <= 46; x++) put(x, 25, "N");
    for (let x = 22; x <= 42; x++) put(x, 26, "N");
    for (let y = 27; y <= 28; y++) for (let x = 28; x <= 36; x++) put(x, y, "N");
    for (let x = 26; x <= 38; x++) put(x, 29, "N");
    for (let x = 24; x <= 40; x++) put(x, 30, "N");
    put(21, 25, "t"); put(23, 26, "t");
  });
  const stump = shape(put => {
    for (let x = 26; x <= 38; x++) put(x, 31, "v");
    for (let y = 32; y <= 39; y++) for (let x = 26; x <= 38; x++) put(x, y, (x === 29 || x === 34) && y > 33 ? "V" : "W");
    put(25, 39, "W"); put(39, 39, "W"); put(24, 39, "V"); put(40, 39, "V");
  });
  const outline = set => {
    set.forEach((_, k) => { const [x, y] = k.split(",").map(Number);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (!set.has((x + dx) + "," + (y + dy))) px(x + dx, y + dy, "K"); });
    set.forEach((c, k) => { const [x, y] = k.split(",").map(Number); px(x, y, c); });
  };

  /* ---------- pixel lines for arms and tools ---------- */
  const line = (x0, y0, x1, y1, c, r = 0) => {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) px(x0 + i, y0 + j, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  };
  const arm = (sx, sy, ex, ey, hx, hy, sleeve) => {
    line(sx, sy, ex, ey, "K", 1); line(ex, ey, hx, hy, "K", 1);
    line(sx, sy, ex, ey, sleeve, 0); line(sx + 0.5, sy, ex + 0.5, ey, sleeve, 0);
    line(ex, ey, hx, hy, "s", 0); line(ex + 0.5, ey + 0.5, hx + 0.5, hy + 0.5, "S", 0);
    for (let i = -1; i <= 2; i++) for (let j = -1; j <= 2; j++) px(hx + i - 0.5, hy + j - 0.5, "K");
    px(hx, hy, "s"); px(hx + 1, hy, "s"); px(hx, hy + 1, "S"); px(hx + 1, hy + 1, "s");
  };
  const hammer = (hx, hy, dx, dy) => {
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const ex = hx + dx * 6, ey = hy + dy * 6;
    line(hx, hy, ex, ey, "w", 0);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) px(ex + i, ey + j, "K");
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) px(ex + i, ey + j, j === -1 ? "M" : "m");
    return [Math.round(ex), Math.round(ey)];
  };

  /* ---------- the bar on the anvil ---------- */
  let bar = 8, heat = 0;
  const drawBar = (x, y, len, hot) => {
    if (len <= 0) return;
    for (let i = 0; i < len; i++) {
      const edge = i === 0 || i === len - 1;
      px(x + i, y, hot > 0.6 ? (edge ? "P" : "H") : hot > 0.2 ? (edge ? "Z" : "P") : (edge ? "m" : "g"));
    }
  };

  /* ---------- poses and the script ---------- */
  // pose: L = tongs arm [ex,ey,hx,hy], R = hammer arm [ex,ey,hx,hy], d = hammer direction, eye = look offset
  const P = {
    rest:    { L: [22, 19, 26, 22], R: [42, 15, 43, 19], d: [-0.55, -0.85], eye: 0 },
    up:      { L: [22, 19, 26, 22], R: [45, 9, 41, 3], d: [-0.25, -1], eye: 0 },
    strike:  { L: [22, 19, 26, 22], R: [43, 17, 42, 20], d: [-1, 0.1], eye: 0 },
    scratch: { L: [21, 10, 28, 5], R: [42, 15, 43, 19], d: [-0.55, -0.85], eye: 0 },
    scratch2:{ L: [21, 10, 29, 4], R: [42, 15, 43, 19], d: [-0.55, -0.85], eye: 0 },
    putdown: { L: [22, 19, 26, 22], R: [44, 18, 46, 22], d: [-1, 0], eye: 0 },
    look:    { L: [22, 19, 26, 22], R: [44, 18, 46, 22], d: [-1, 0], eye: 1 },
    reach:   { L: [22, 19, 26, 22], R: [51, 13, 62, 11], d: [-1, 0], eye: 1 },
    place:   { L: [22, 19, 26, 22], R: [44, 17, 38, 22], d: [-1, 0], eye: 0 }
  };
  const steps = [];
  const k = (pose, dur, opts = {}) => steps.push({ pose, dur, ...opts });
  for (let i = 0; i < 4; i++) {
    k("up", 0.32, { ease: "inout" }); k("up", 0.1);
    k("strike", 0.07, { ease: "in", ev: "strike" }); k("strike", 0.16); k("rest", 0.26, { ease: "out" });
  }
  k("rest", 0.6, { eye: 0 });
  k("scratch", 0.3, { ease: "out" }); k("scratch2", 0.1); k("scratch", 0.1); k("scratch2", 0.1); k("scratch", 0.1); k("scratch2", 0.1);
  k("rest", 0.3, { ease: "inout" });
  k("putdown", 0.25, { ease: "inout" });
  k("look", 0.15, { ev: "drop" }); k("look", 0.45);
  k("reach", 0.4, { ease: "out", ev: "grab" }); k("reach", 0.8);
  k("place", 0.5, { ease: "inout" }); k("place", 0.3, { ev: "place" });
  k("putdown", 0.2, { ease: "inout" }); k("rest", 0.3, { ease: "out", ev: "pick" });

  const total = steps.reduce((s, x) => s + x.dur, 0);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ez = { in: t => t * t * t, out: t => 1 - Math.pow(1 - t, 3), inout: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 };
  const mix = (a, b, t) => ({
    L: a.L.map((v, i) => lerp(v, b.L[i], t)), R: a.R.map((v, i) => lerp(v, b.R[i], t)),
    d: [lerp(a.d[0], b.d[0], t), lerp(a.d[1], b.d[1], t)], eye: t < 0.5 ? a.eye : b.eye
  });

  /* ---------- state ---------- */
  let inHand = true, carrying = false, streak = 0, blink = 0;
  const sparks = [];
  const dash = document.querySelector(".plate.last .dash");

  const events = {
    strike() {
      heat = 1; streak = 2;
      bar = Math.max(0, bar - 2);
      const n = bar === 0 ? 14 : 8;
      for (let i = 0; i < n; i++) sparks.push({ x: 36, y: 22, vx: (Math.random() - 0.5) * 4, vy: -1 - Math.random() * 2.6, life: 4 + Math.random() * 5 });
    },
    drop() { inHand = false; },
    grab() {
      if (!dash) { carrying = true; return; }
      const from = dash.getBoundingClientRect(), r = cv.getBoundingClientRect(), s = r.width / W;
      const tx = r.left + 62 * s, ty = r.top + (11 + OY) * s;
      const fly = dash.cloneNode(true);
      fly.className = "dash-fly";
      Object.assign(fly.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", font: getComputedStyle(dash).font, color: getComputedStyle(dash).color });
      document.body.append(fly);
      dash.style.opacity = "0";
      const dx = tx - (from.left + from.width / 2), dy = ty - (from.top + from.height / 2);
      fly.animate([
        { transform: "translate(0,0) rotate(0)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) rotate(-200deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) rotate(-360deg) scale(.6)`, opacity: 0 }
      ], { duration: 650, easing: "cubic-bezier(.3,.7,.4,1)", fill: "forwards" }).finished.then(() => { fly.remove(); carrying = true; });
      // a new dash is quietly forged back into the heading
      setTimeout(() => dash.animate([{ opacity: 0, transform: "scaleX(0)" }, { opacity: 1, transform: "scaleX(1)" }], { duration: 700, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" }).finished.then(() => { dash.style.opacity = ""; }), 2600);
    },
    place() { carrying = false; bar = 8; heat = 0.15; },
    pick() { inHand = true; }
  };

  const render = (pose) => {
    ctx.clearRect(0, 0, W, H);
    drawMap(BODY, BX, BY);
    // eyes, with the odd blink and a glance toward the heading
    if (blink <= 0) { px(BX + 6 + pose.eye, BY + 4, "E"); px(BX + 10 + pose.eye, BY + 4, "E"); }
    else { px(BX + 6, BY + 4, "S"); px(BX + 10, BY + 4, "S"); }
    outline(stump); outline(anvil);
    drawBar(30, 23, bar, heat);
    if (!inHand) hammer(47, 22, -1, 0);
    // tongs arm
    const L = pose.L;
    if (L[3] > 20) line(L[2] + 1, L[3] + 1, 30, 23, "B", 0);
    arm(BX + 2, BY + 11, L[0], L[1], L[2], L[3], "T");
    // hammer arm
    const R = pose.R;
    arm(BX + 14, BY + 11, R[0], R[1], R[2], R[3], "T");
    if (inHand) {
      const [ex, ey] = hammer(R[2], R[3], pose.d[0], pose.d[1]);
      if (streak > 0) for (let i = 2; i < 9; i++) px(ex, ey - i, i < 4 ? "H" : "P");
    }
    if (carrying) drawBar(R[2] - 4, R[3] - 1, 8, 0);
    sparks.forEach(s => px(s.x, s.y, s.life > 6 ? "H" : s.life > 3 ? "P" : "Z"));
  };

  if (reduced) { render(P.rest); return; }

  let clock = 0, idx = 0, inStep = 0, last = 0, acc = 0, running = false;
  const FRAME = 1 / 12;
  const tick = (now) => {
    if (!running) return;
    const dt = Math.min((now - (last || now)) / 1000, 0.1); last = now;
    acc += dt;
    if (acc >= FRAME) {
      const step = acc - (acc % FRAME); acc %= FRAME;
      clock += step; inStep += step;
      while (inStep >= steps[idx].dur) {
        inStep -= steps[idx].dur;
        idx = (idx + 1) % steps.length;
        const ev = steps[idx].ev;
        if (ev && events[ev]) events[ev]();
      }
      // sprite-time effects
      heat = Math.max(0, heat - step * 0.9);
      if (streak > 0) streak--;
      if (blink > 0) blink--; else if (Math.random() < 0.02) blink = 2;
      for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.45; s.life--; if (s.life <= 0 || s.y > 40) sparks.splice(i, 1); }
      const cur = steps[idx], prev = steps[(idx - 1 + steps.length) % steps.length];
      const t = cur.dur ? Math.min(inStep / cur.dur, 1) : 1;
      render(mix(P[prev.pose], P[cur.pose], (ez[cur.ease] || (x => x))(t)));
    }
    requestAnimationFrame(tick);
  };
  render(P.rest);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(tick); }
    else if (!e.isIntersecting) running = false;
  }).observe(cv);
})();

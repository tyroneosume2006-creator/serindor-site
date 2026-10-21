/*
  The sword cursor, alive: follows the mouse exactly, leaves a trail of pixel sparks,
  catches a glint now and then, swings when you click and glows over anything clickable.
  Mouse only. Without this script (or with reduced motion) the plain CSS sword cursor is used.
*/
(function () {
  if (!matchMedia("(pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;

  const sword = document.createElement("div");
  sword.className = "sword";
  sword.setAttribute("aria-hidden", "true");
  sword.innerHTML = '<span class="sw"><i class="blade"></i><i class="glint"></i></span>';
  document.body.append(sword);

  const cv = document.createElement("canvas");
  cv.className = "sword-trail";
  cv.setAttribute("aria-hidden", "true");
  document.body.append(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; };
  size(); addEventListener("resize", size);

  root.classList.add("has-sword");

  let x = -100, y = -100, lx = null, ly = null, shown = false, queued = false;
  const parts = [];
  const COLORS = ["#FFFFFF", "#A9C6F0", "#6A9BE6", "#3D7BD9"];
  const spawn = (px, py, n, burst) => {
    for (let i = 0; i < n; i++) {
      const a = burst ? Math.random() * Math.PI * 2 : Math.PI * 0.75 + (Math.random() - 0.5) * 1.2;
      const v = burst ? 1.5 + Math.random() * 3.5 : 0.3 + Math.random() * 0.9;
      parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (burst ? 1 : 0), life: 0, max: burst ? 26 + Math.random() * 14 : 18 + Math.random() * 14, s: Math.random() < 0.3 ? 3 : 2, c: COLORS[(Math.random() * 2) | 0] });
    }
    if (parts.length > 260) parts.splice(0, parts.length - 260);
    kick();
  };

  const place = () => { queued = false; sword.style.transform = `translate3d(${x - 2}px, ${y - 2}px, 0)`; };
  addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse") return;
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; sword.classList.add("on"); lx = x; ly = y; }
    if (!queued) { queued = true; requestAnimationFrame(place); }
    // drop sparks along the path, about one every 7px of travel
    const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy);
    if (d > 7) {
      const steps = Math.min(Math.floor(d / 7), 6);
      for (let i = 1; i <= steps; i++) spawn(lx + dx * i / steps + 3, ly + dy * i / steps + 3, 1, false);
      lx = x; ly = y;
    }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { shown = false; sword.classList.remove("on"); });
  addEventListener("blur", () => { shown = false; sword.classList.remove("on"); });

  // swing on click, with a burst from the tip
  addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse") return;
    sword.classList.remove("swing"); void sword.offsetWidth; sword.classList.add("swing");
    spawn(e.clientX + 2, e.clientY + 2, 16, true);
  });

  // glow over anything clickable
  const hot = el => el && el.closest && el.closest("a, button, [role='button'], label, summary");
  document.addEventListener("pointerover", e => sword.classList.toggle("hot", !!hot(e.target)));

  // an occasional glint along the blade
  setInterval(() => { if (shown) { sword.classList.remove("glinting"); void sword.offsetWidth; sword.classList.add("glinting"); } }, 2800);

  // trail renderer: runs only while there are sparks to draw
  let running = false;
  const frame = () => {
    ctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life++; if (p.life > p.max) { parts.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.vx *= 0.96; p.vy *= 0.96;
      const t = p.life / p.max;
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = t < 0.25 ? p.c : t < 0.6 ? "#6A9BE6" : "#3D7BD9";
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
    ctx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(frame); else { running = false; ctx.clearRect(0, 0, W, H); }
  };
  function kick() { if (!running) { running = true; requestAnimationFrame(frame); } }
})();

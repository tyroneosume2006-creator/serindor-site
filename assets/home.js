/* Serindor homepage motion. Everything here is progressive: without it the page is complete and still. */
(function () {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* Copy buttons work regardless of motion. */
  $$(".copy").forEach(btn => btn.addEventListener("click", async () => {
    const el = document.getElementById(btn.dataset.copy);
    try { await navigator.clipboard.writeText(el.textContent); btn.textContent = "Copied"; }
    catch { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); btn.textContent = "Selected"; }
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  }));

  const motion = root.classList.contains("motion");
  if (!motion || !window.gsap || !window.ScrollTrigger || !window.Lenis) {
    root.classList.remove("motion");
    root.classList.add("ready");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("ready");

  /* ---------- smooth scroll ---------- */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    const target = $(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -72, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4) });
  }));

  /* ---------- header: frosted once scrolled, tucks away going down ---------- */
  const bar = $(".bar");
  let lastY = 0;
  lenis.on("scroll", ({ scroll }) => {
    bar.classList.toggle("scrolled", scroll > 24);
    bar.classList.toggle("hide", scroll > 320 && scroll > lastY);
    lastY = scroll;
  });

  /* ---------- split the statement into words ---------- */
  $$(".split").forEach(p => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.append(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(p);
  });

  /* ---------- intro, then the hero ---------- */
  const ease = "expo.out";
  const hero = () => {
    const tl = gsap.timeline({ defaults: { ease } });
    tl.to(".hero h1 .line > span", { y: 0, duration: 1.5, stagger: 0.12 })
      .to(".hero .rv", { opacity: 1, y: 0, duration: 1.2, stagger: 0.08 }, "-=1.15")
      .from(".bar .wrap", { y: -24, opacity: 0, duration: 1 }, "-=1.1")
      .from(".hero .ghost", { opacity: 0, x: 80, duration: 2.2 }, 0);
  };

  if (root.classList.contains("no-intro")) {
    hero();
  } else {
    lenis.stop();
    const tl = gsap.timeline({
      defaults: { ease },
      onComplete: () => { $(".intro").remove(); lenis.start(); try { sessionStorage.setItem("srd-intro", "1"); } catch (e) {} }
    });
    tl.to(".intro .word span", { y: 0, duration: 1.1, stagger: 0.045 })
      .to(".intro .rule", { scaleX: 1, duration: 1.1, ease: "power3.inOut" }, "-=0.8")
      .to(".intro .word span", { y: "-110%", duration: 0.8, stagger: 0.025, ease: "power3.in" }, "+=0.15")
      .to(".intro .rule", { scaleX: 0, transformOrigin: "100% 50%", duration: 0.6, ease: "power3.in" }, "<0.1")
      .to(".intro", { clipPath: "inset(0 0 100% 0)", duration: 1, ease: "expo.inOut" }, "-=0.25")
      .add(hero, "-=0.55");
  }

  /* ---------- hero: cursor light and parallax ---------- */
  const heroEl = $(".hero"), spot = $(".hero .spot");
  const sx = gsap.quickTo(spot, "x", { duration: 0.9, ease: "power3" });
  const sy = gsap.quickTo(spot, "y", { duration: 0.9, ease: "power3" });
  heroEl.addEventListener("pointermove", e => { const r = heroEl.getBoundingClientRect(); sx(e.clientX - r.left); sy(e.clientY - r.top); });
  gsap.to(".hero .ghost", { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  gsap.to(".hero .wrap", { y: -60, opacity: 0.25, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });

  /* ---------- marquee that leans into your scroll speed ---------- */
  const track = $(".marquee .track");
  let x = 0, boost = 0;
  lenis.on("scroll", ({ velocity }) => { boost = Math.min(Math.abs(velocity) * 0.35, 9); });
  gsap.ticker.add(() => {
    const half = track.scrollWidth / 2;
    x -= 0.55 + boost; boost *= 0.92;
    if (-x >= half) x += half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });

  /* ---------- reveals ---------- */
  ScrollTrigger.batch(".rv:not(.hero .rv)", {
    start: "top 88%",
    once: true,
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.2, ease, stagger: 0.09 })
  });
  $$(".line > span").forEach(s => {
    if (s.closest(".hero")) return;
    gsap.to(s, { y: 0, duration: 1.4, ease, scrollTrigger: { trigger: s.parentElement, start: "top 90%", once: true } });
  });

  /* statement: words light up as you read */
  gsap.to(".statement .w", {
    opacity: 1, stagger: 0.08, ease: "none",
    scrollTrigger: { trigger: ".statement p", start: "top 78%", end: "bottom 42%", scrub: 0.6 }
  });

  /* ---------- project plates stack over each other ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 861px)", () => {
    const plates = $$(".plate:not(.last)");
    plates.forEach((p, i) => {
      const next = plates[i + 1];
      if (!next) return;
      gsap.to(p, {
        scale: 0.93, "--dim": 0.55, ease: "none",
        scrollTrigger: { trigger: next, start: "top bottom", end: "top 30%", scrub: true }
      });
    });
  });

  /* Cryptic Seconds: the clue solves itself as it arrives */
  const tiles = $$("#cs .tiles span"), ring = $("#cs .ring"), t = $("#cs .t");
  const solve = gsap.timeline({ paused: true });
  const clock = { s: 60 };
  solve.to(clock, { s: 42, duration: 2.6, ease: "none", onUpdate: () => { t.textContent = "0:" + String(Math.round(clock.s)).padStart(2, "0"); } }, 0)
       .to(ring, { strokeDashoffset: 119.4 * (18 / 60), duration: 2.6, ease: "none" }, 0);
  tiles.forEach((el, i) => solve.add(() => el.classList.add("on"), 0.5 + i * 0.32));
  ScrollTrigger.create({ trigger: "#cs .clue", start: "top 75%", once: true, onEnter: () => solve.play() });

  /* Serinote: links draw from the page to each part of the lesson */
  const links = $$("#sn .link");
  links.forEach(l => { const len = l.getTotalLength(); l.style.strokeDasharray = len; l.style.strokeDashoffset = len; });
  const draw = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
  draw.from("#sn .hl", { scaleX: 0, transformOrigin: "0 50%", duration: 0.7, stagger: 0.15 })
      .to(links, { strokeDashoffset: 0, duration: 1.1, stagger: 0.18 }, "-=0.3")
      .from("#sn .node", { opacity: 0, x: -12, duration: 0.7, stagger: 0.18 }, "-=1.1");
  ScrollTrigger.create({ trigger: "#sn .map", start: "top 75%", once: true, onEnter: () => draw.play() });

  /* footer wordmark rises into place */
  gsap.from("footer .giant", { yPercent: 45, ease: "none", scrollTrigger: { trigger: "footer", start: "top bottom", end: "bottom bottom", scrub: true } });

  /* ---------- cursor + magnetic buttons (mouse only) ---------- */
  if (matchMedia("(pointer: fine)").matches) {
    const cur = $(".cursor"), dot = $(".cursor .dot"), ringEl = $(".cursor .ring");
    const dx = gsap.quickTo(dot, "x", { duration: 0.12 }), dy = gsap.quickTo(dot, "y", { duration: 0.12 });
    const rx = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "power3" }), ry = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "power3" });
    gsap.set(cur, { opacity: 0 });
    addEventListener("pointermove", e => { gsap.to(cur, { opacity: 1, duration: 0.3, overwrite: "auto" }); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    document.addEventListener("pointerleave", () => gsap.to(cur, { opacity: 0, duration: 0.3 }));
    $$("a, button").forEach(el => {
      el.addEventListener("pointerenter", () => cur.classList.add("hover"));
      el.addEventListener("pointerleave", () => cur.classList.remove("hover"));
    });

    $$(".magnetic").forEach(el => {
      const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" }), my = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("pointermove", e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.28); my((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener("pointerleave", () => { gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.4)" }); });
    });
  }

  addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();

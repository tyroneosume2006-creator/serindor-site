/*
  The living forge: a WebGL shader of slow molten-steel light behind the hero.
  It heats up around the cursor, rings out where you click, and throws sparks.
  Progressive: no WebGL, or reduced motion, and the hero keeps its still gradient / a single frame.
*/
(function () {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  const gl_c = document.createElement("canvas");
  gl_c.className = "forge";
  gl_c.setAttribute("aria-hidden", "true");
  const gl = gl_c.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return;

  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform float u_heat; uniform vec3 u_pulse;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res.y;
  float asp=u_res.x/u_res.y;
  vec2 m=u_mouse/u_res.y;
  float t=u_time;
  vec2 p=uv*(asp>1.?1.6:2.6)+vec2(asp>1.?0.:3.1,0.);
  // the cursor bends the flow toward itself, like heat drawing the metal
  vec2 dm=uv-m; float dd=dot(dm,dm);
  float near=exp(-dd*9.)*u_heat;
  p-=dm*near*.55;
  vec2 q=vec2(fbm(p+vec2(0.,t*.035)),fbm(p+vec2(5.2,1.3)-t*.025));
  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*.05),fbm(p+3.*q+vec2(8.3,2.8)-t*.04));
  float f=fbm(p+3.2*r);
  vec3 sable=vec3(.043,.051,.067), steel=vec3(.105,.122,.152), azure=vec3(.239,.482,.851), pale=vec3(.663,.776,.941);
  float ridge=smoothstep(.47,.9,f);
  vec3 col=mix(sable,steel,clamp(f*f*1.8,0.,1.));
  col+=azure*pow(ridge,2.)*(.55+.45*r.x)*1.05;
  col+=pale*pow(smoothstep(.78,1.,f),3.)*.35;
  // heat around the cursor: the ridges glow pale, almost white
  col+=pale*near*pow(ridge,1.4)*1.1+azure*near*.10;
  // a ring of light where you strike
  vec2 pp=u_pulse.xy/u_res.y; float age=t-u_pulse.z;
  if(age>0.&&age<2.){float pd=length(uv-pp);
    float ring=exp(-pow((pd-age*.75)*16.,2.))*exp(-age*2.2);
    col+=pale*ring*(.35+ridge)*.9+azure*exp(-pd*pd*40.)*exp(-age*5.)*.6;}
  // keep the reading side calm and the edges dark
  float x=uv.x/asp;
  // landscape: calm the left, where the words sit. portrait: calm the lower half instead.
  float calm=asp>1.?smoothstep(.05,.75,x)*mix(.55,1.,smoothstep(0.,.55,uv.y)):smoothstep(.3,.95,uv.y);
  col*=mix(.4,1.,calm);
  col*=1.-.35*smoothstep(.55,1.25,length(vec2(x-.6,uv.y-.55)));
  col+=(hash(gl_FragCoord.xy+t)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uRes = U("u_res"), uTime = U("u_time"), uMouse = U("u_mouse"), uHeat = U("u_heat"), uPulse = U("u_pulse");

  hero.prepend(gl_c);
  hero.classList.add("has-forge");

  /* sparks live on their own 2D canvas, at full sharpness */
  const sp = document.createElement("canvas");
  sp.className = "sparks-layer"; sp.setAttribute("aria-hidden", "true");
  hero.prepend(sp);
  const ctx = sp.getContext("2d");

  let scale = coarse ? 0.4 : 0.5;          // the shader is soft, so it renders small and scales up
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    gl_c.width = Math.max(1, Math.round(W * scale)); gl_c.height = Math.max(1, Math.round(H * scale));
    gl.viewport(0, 0, gl_c.width, gl_c.height);
    sp.width = Math.round(W * dpr); sp.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  new ResizeObserver(resize).observe(hero);

  /* pointer state, eased so the heat follows like something heavy */
  const target = { x: W * (W > H ? 0.72 : 0.6), y: H * (W > H ? 0.4 : 0.22) }, mouse = { x: target.x, y: target.y };
  let heat = 0, heatTarget = 0.55, lastTouch = -10;
  let pulse = [0, 0, -10];
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;

  hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    target.x = e.clientX - r.left; target.y = e.clientY - r.top; heatTarget = 1; lastTouch = now();
  });
  hero.addEventListener("pointerleave", () => { heatTarget = 0.55; lastTouch = -10; });

  const sparks = [];
  const embers = [];
  const strike = (x, y) => {
    pulse = [x, y, now()];
    for (let i = 0; i < (coarse ? 30 : 44); i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const v = 240 + Math.random() * 520;
      sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.5 + Math.random() * 0.7, w: Math.random() < 0.3 ? 2.4 : 1.4 });
    }
  };
  if (!reduced) {
    hero.addEventListener("pointerdown", e => {
      if (e.target.closest("a, button")) return;
      const r = hero.getBoundingClientRect();
      strike(e.clientX - r.left, e.clientY - r.top);
    });
  }

  const draw = t => {
    gl.uniform2f(uRes, gl_c.width, gl_c.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouse.x * scale, (H - mouse.y) * scale);
    gl.uniform1f(uHeat, heat);
    gl.uniform3f(uPulse, pulse[0] * scale, (H - pulse[1]) * scale, pulse[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  if (reduced) { heat = 0.35; draw(14); return; }

  /* only run while the hero is on screen and the tab is visible */
  let visible = true, raf = 0, last = performance.now(), slow = 0;
  const loop = () => {
    raf = 0;
    if (!visible || document.hidden) return;
    const n = performance.now(), dt = Math.min((n - last) / 1000, 0.05); last = n;

    // adaptive quality: if frames run long, render the shader smaller
    if (dt > 0.024) { if (++slow > 40 && scale > 0.3) { scale = Math.max(0.3, scale - 0.1); resize(); slow = 0; } } else slow = Math.max(0, slow - 1);

    // with no pointer about (phones, or the mouse elsewhere) the heat wanders on its own
    const tt = now();
    if (tt - lastTouch > 2.5) {
      heatTarget = 0.55;
      target.x = W * (W > H ? 0.7 : 0.55) + Math.sin(tt * 0.23) * W * (W > H ? 0.16 : 0.3);
      target.y = H * (W > H ? 0.42 : 0.24) + Math.sin(tt * 0.31 + 1.3) * H * 0.14;
    }
    const k = 1 - Math.exp(-dt * (tt - lastTouch > 2.5 ? 1.2 : 4.5));
    mouse.x += (target.x - mouse.x) * k; mouse.y += (target.y - mouse.y) * k;
    heat += (heatTarget - heat) * (1 - Math.exp(-dt * 2.5));
    draw(tt);

    // sparks: streaks with gravity and drag, white-hot cooling to azure
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life += dt;
      if (s.life > s.max) { sparks.splice(i, 1); continue; }
      s.px = s.x; s.py = s.y;
      s.vx *= 1 - dt * 1.6; s.vy = s.vy * (1 - dt * 1.6) + 980 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const a = 1 - s.life / s.max, hot = a > 0.6;
      ctx.strokeStyle = hot ? `rgba(255,255,255,${a})` : `rgba(169,198,240,${a})`;
      ctx.lineWidth = s.w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    // a few embers drift up from the forge, always
    if (embers.length < (coarse ? 8 : 16) && Math.random() < dt * 6) {
      embers.push({ x: W * (0.45 + Math.random() * 0.55), y: H + 10, v: 18 + Math.random() * 30, life: 0, max: 5 + Math.random() * 5, r: 0.6 + Math.random() * 1.2, ph: Math.random() * 6 });
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.life += dt;
      if (e.life > e.max) { embers.splice(i, 1); continue; }
      e.y -= e.v * dt; e.x += Math.sin(e.life * 1.3 + e.ph) * 12 * dt;
      const a = Math.sin(Math.PI * e.life / e.max) * 0.7;
      ctx.fillStyle = `rgba(169,198,240,${a})`;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(loop);
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); }, { threshold: 0 }).observe(hero);
  document.addEventListener("visibilitychange", start);
  start();
  // fade the shader in so it never pops
  gl_c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1800, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" });
})();

// Home hero: property photos revealed inside the Capitol outline by a fluid trail
// that follows the pointer and drifts by itself when nobody is touching it.
(function () {
  var stage = document.querySelector('.capitol-stage');
  var canvas = document.querySelector('.cap-fluid');
  if (!stage || !canvas) return;

  var photos = JSON.parse(stage.getAttribute('data-photos'));
  var labels = JSON.parse(stage.getAttribute('data-labels'));
  var label = document.getElementById('cap-label');
  var dots = Array.prototype.slice.call(document.querySelectorAll('#cap-dots button'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gl = !reduce && (canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }));
  if (!gl) { stage.classList.add('no-fluid'); return; }

  var VERT = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';

  // Simulation step: carry the dye along a slow swirling flow, soften it, fade it, add new splats.
  var SIM = [
    'precision highp float;',
    'varying vec2 uv; uniform sampler2D dye; uniform vec2 px; uniform float t; uniform float aspect;',
    'uniform vec4 seg; uniform vec2 segRS; uniform vec4 blobs[3];',
    'float segDist(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0., 1.); return length(pa - ba * h); }',
    'void main(){',
    '  vec2 q = uv * vec2(aspect, 1.);',
    '  vec2 v = vec2(sin(q.y * 6.0 + t * .35) + sin(q.x * 3.1 + q.y * 4.2 - t * .21),',
    '                cos(q.x * 5.5 - t * .30) + cos(q.y * 2.7 - q.x * 3.9 + t * .26));',
    '  vec2 src = uv - v * vec2(.0015 / aspect, .0015);',
    '  float d = texture2D(dye, src).r;',
    '  float n = texture2D(dye, src + vec2(px.x, 0.)).r + texture2D(dye, src - vec2(px.x, 0.)).r',
    '          + texture2D(dye, src + vec2(0., px.y)).r + texture2D(dye, src - vec2(0., px.y)).r;',
    '  d = mix(d, n * .25, .22);',
    '  d = max(0., d - .0034);',
    '  float sd = segDist(q, seg.xy * vec2(aspect, 1.), seg.zw * vec2(aspect, 1.));',
    '  d += segRS.y * exp(-(sd * sd) / (segRS.x * segRS.x));',
    '  for (int i = 0; i < 3; i++) {',
    '    vec2 c = blobs[i].xy * vec2(aspect, 1.);',
    '    float bd = distance(q, c);',
    '    d += blobs[i].w * exp(-(bd * bd) / (blobs[i].z * blobs[i].z));',
    '  }',
    '  gl_FragColor = vec4(min(d, 1.), 0., 0., 1.);',
    '}'
  ].join('\n');

  // Draw step: where there is dye, show the photo; give the edge a liquid lip.
  var DRAW = [
    'precision highp float;',
    'varying vec2 uv; uniform sampler2D dye; uniform sampler2D a; uniform sampler2D b; uniform float mixAB;',
    'uniform vec2 px; uniform vec2 fitA; uniform vec2 fitB; uniform float t;',
    'vec2 cover(vec2 u, vec2 fit){ return (u - .5) * fit + .5; }',
    'void main(){',
    '  float d = texture2D(dye, uv).r;',
    '  vec2 g = vec2(texture2D(dye, uv + vec2(px.x * 2., 0.)).r - texture2D(dye, uv - vec2(px.x * 2., 0.)).r,',
    '                texture2D(dye, uv + vec2(0., px.y * 2.)).r - texture2D(dye, uv - vec2(0., px.y * 2.)).r);',
    '  float wob = .03 * sin(uv.x * 40. + t * .9) * sin(uv.y * 34. - t * .7);',
    '  float m = smoothstep(.30, .40, d + wob);',
    '  vec2 warp = g * .045;',
    '  vec2 fu = vec2(uv.x, 1. - uv.y) - warp;',
    '  vec3 ca = texture2D(a, cover(fu, fitA)).rgb;',
    '  vec3 cb = texture2D(b, cover(fu, fitB)).rgb;',
    '  vec3 col = mix(ca, cb, mixAB);',
    '  float lip = smoothstep(.30, .40, d + wob) * (1. - smoothstep(.40, .52, d + wob));',
    '  col += vec3(.85, .70, .37) * lip * .35;',
    '  gl_FragColor = vec4(col * m, m);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var info = gl.getActiveUniform(p, i); var name = info.name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, name); }
    return { p: p, u: u };
  }

  var sim, draw;
  try { sim = program(SIM); draw = program(DRAW); }
  catch (e) { stage.classList.add('no-fluid'); return; }

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var ASPECT = 900 / 690, SW = 288, SH = Math.round(SW / ASPECT);
  function target() {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SW, SH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex: tex, fb: fb };
  }
  var read = target(), write = target();

  // Photos
  var textures = [], fits = [], loaded = [];
  function loadPhoto(i, done) {
    if (loaded[i]) { if (done) done(); return; }
    var img = new Image();
    img.onload = function () {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures[i] = tex;
      var ia = img.naturalWidth / img.naturalHeight;
      fits[i] = ia > ASPECT ? [ASPECT / ia, 1] : [1, ia / ASPECT];
      loaded[i] = true;
      if (done) done();
    };
    img.src = photos[i];
  }

  var cur = 0, next = 0, mixAB = 0, mixing = false, lastSwap = 0, HOLD = 5200, FADE = 1300;
  function go(i) {
    i = (i + photos.length) % photos.length;
    if (i === cur || mixing) return;
    loadPhoto(i, function () {
      next = i; mixing = true; mixStart = performance.now();
      if (label) label.textContent = labels[i];
      dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      loadPhoto((i + 1) % photos.length);
    });
  }
  var mixStart = 0;
  dots.forEach(function (d, i) { d.addEventListener('click', function () { lastSwap = performance.now(); go(i); }); });

  // Pointer trail, in stage coordinates (0..1, y up)
  var ptr = { x: .5, y: .3, px: .5, py: .3, moved: false, lastMove: -1e9 };
  function onMove(e) {
    var r = stage.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / (r.width / ASPECT);
    if (!ptr.moved || performance.now() - ptr.lastMove > 400) { ptr.px = x; ptr.py = y; }
    ptr.x = x; ptr.y = y; ptr.moved = true; ptr.lastMove = performance.now();
  }
  var hero = document.querySelector('.hero') || stage;
  hero.addEventListener('pointermove', onMove, { passive: true });

  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  }

  var running = false, raf = 0, start = performance.now();
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var t = (now - start) / 1000;
    resize();

    // three drifting sources keep the photos moving when nobody is touching the page
    var blobs = [
      .50 + .30 * Math.sin(t * .23),        .26 + .13 * Math.sin(t * .31 + 1.2), .125, .026,
      .50 + .34 * Math.sin(t * .17 + 2.1),  .24 + .12 * Math.cos(t * .27),       .110, .024,
      .50 + .06 * Math.sin(t * .29 + 4.0),  .56 + .22 * Math.sin(t * .19 + .7),  .075, .022
    ];
    var active = now - ptr.lastMove < 120;
    var dx = ptr.x - ptr.px, dy = ptr.y - ptr.py;
    var speed = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 14);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fb);
    gl.viewport(0, 0, SW, SH);
    gl.useProgram(sim.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, read.tex);
    gl.uniform1i(sim.u.dye, 0);
    gl.uniform2f(sim.u.px, 1 / SW, 1 / SH);
    gl.uniform1f(sim.u.t, t);
    gl.uniform1f(sim.u.aspect, ASPECT);
    gl.uniform4f(sim.u.seg, ptr.px, ptr.py, ptr.x, ptr.y);
    gl.uniform2f(sim.u.segRS, .12, active ? .07 + .2 * speed : 0);
    gl.uniform4fv(sim.u.blobs, new Float32Array(blobs));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    var tmp = read; read = write; write = tmp;
    ptr.px = ptr.x; ptr.py = ptr.y;

    if (mixing) {
      mixAB = Math.min(1, (now - mixStart) / FADE);
      if (mixAB >= 1) { cur = next; mixAB = 0; mixing = false; lastSwap = now; }
    } else if (now - lastSwap > HOLD) {
      go(cur + 1);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!loaded[cur]) return;
    gl.useProgram(draw.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, read.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[cur]);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, textures[mixing ? next : cur]);
    gl.uniform1i(draw.u.dye, 0); gl.uniform1i(draw.u.a, 1); gl.uniform1i(draw.u.b, 2);
    gl.uniform1f(draw.u.mixAB, mixing ? mixAB * mixAB * (3 - 2 * mixAB) : 0);
    gl.uniform2f(draw.u.px, 1 / SW, 1 / SH);
    gl.uniform2f(draw.u.fitA, fits[cur][0], fits[cur][1]);
    var fb = fits[mixing ? next : cur];
    gl.uniform2f(draw.u.fitB, fb[0], fb[1]);
    gl.uniform1f(draw.u.t, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function play() { if (running) return; running = true; lastSwap = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  loadPhoto(0, function () { loadPhoto(1); stage.classList.add('fluid-on'); play(); });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : play(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { entries[0].isIntersecting && !document.hidden ? play() : stop(); }).observe(stage);
  }
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); stage.classList.add('no-fluid'); });
})();

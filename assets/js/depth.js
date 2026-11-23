/* =========================================================
   WJR Portfolio — depth.js
   单 quad 实时画面层（WebGL fragment shader）
   液态扭曲 / RGB 色散 / 半调网点 / 扫过光带 / 颗粒 / 暗角
   不依赖 three.js；无 WebGL 时整体跳过，站点退回静态图。
   ========================================================= */
window.WJR_DEPTH = (function () {
  'use strict';

  var VERT = [
    'attribute vec2 aPos;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos * 0.5 + 0.5;',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTex;',
    'uniform vec2 uRes;',
    'uniform float uTime;',
    'uniform vec2 uMouse;',
    'uniform float uLiquid;',
    'uniform float uCA;',
    'uniform float uTone;',
    'uniform float uSweep;',
    'uniform float uGrain;',
    'uniform float uVig;',
    'uniform vec2 uUvScale;',
    'uniform vec2 uUvOff;',
    'uniform float uShutter;',
    '',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vnoise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0;',
    '  float amp = 0.55;',
    '  for (int i = 0; i < 3; i++) { v += amp * vnoise(p); p *= 2.02; amp *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  vec2 uv = vUv;',
    '  float ar = uRes.x / max(uRes.y, 1.0);',
    '  vec2 q = vec2(uv.x * ar, uv.y);',
    '  float t = uTime * 0.32;',
    '  float n1 = fbm(q * 2.4 + vec2(t, -t * 0.8));',
    '  float n2 = fbm(q * 2.4 + vec2(-t * 0.7, t) + 5.0);',
    '  vec2 warp = vec2(n1 - 0.5, n2 - 0.5) * 2.0;',
    '  vec2 pull = (uMouse - uv) * 0.14;',
    '  vec2 disp = (warp + pull) * uLiquid * 0.017;',
    '  vec2 suv = uv + disp;',
    '',
    '  vec2 tuv = 0.5 + (suv - 0.5) * uUvScale + uUvOff;',
    '  float ca = uCA * 0.0035 + uShutter * 0.0038;',
    '  vec3 col;',
    '  col.r = texture2D(uTex, clamp(tuv + vec2(ca, 0.0), 0.002, 0.998)).r;',
    '  col.g = texture2D(uTex, clamp(tuv, 0.002, 0.998)).g;',
    '  col.b = texture2D(uTex, clamp(tuv - vec2(ca, 0.0), 0.002, 0.998)).b;',
    '',
    '  float band = 1.0;',
    '  if (uSweep > -0.4) {',
    '    float dz = (uv.y - uSweep) * 5.0;',
    '    band = exp(-dz * dz);',
    '  }',
    '  if (uTone > 0.001) {',
    '    vec2 gp = vec2(uv.x * ar, uv.y) * 132.0;',
    '    vec2 cell = fract(gp) - 0.5;',
    '    float lum = dot(col, vec3(0.32, 0.56, 0.12));',
    '    float rad = 0.05 + 0.44 * clamp(1.0 - lum * 1.2, 0.0, 1.0);',
    '    float d = 1.0 - smoothstep(rad - 0.07, rad + 0.02, length(cell));',
    '    float amt = uTone * band * 0.85;',
    '    col = mix(col, vec3(0.94, 0.92, 0.87), d * amt);',
    '  }',
    '',
    '  float g = hash(gl_FragCoord.xy + vec2(uTime * 41.0, uTime * 13.0)) - 0.5;',
    '  col += g * uGrain;',
    '  col = mix(col, vec3(1.0), uShutter * 0.5);',
    '  vec2 vq = (uv - 0.5) * vec2(1.05, 1.0);',
    '  float vig = 1.0 - uVig * smoothstep(0.26, 0.8, length(vq));',
    '  col *= vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.__WJR_GL_DEBUG) console.warn('shader', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var probe = null;
  var available = false;
  try {
    probe = document.createElement('canvas');
    available = !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
  } catch (e) { available = false; }

  var handles = [];
  var loopOn = false;

  function startLoop() {
    if (loopOn) return;
    loopOn = true;
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
    var tick = function () {
      var now = (window.performance && performance.now ? performance.now() : Date.now()) / 1000;
      for (var i = 0; i < handles.length; i++) handles[i]._draw(now);
      raf(tick);
    };
    raf(tick);
  }

  function mount(img, host, opts) {
    opts = opts || {};
    if (!available || !host || !img) return null;

    var canvas = document.createElement('canvas');
    canvas.className = 'depth-layer';
    canvas.setAttribute('aria-hidden', 'true');
    var gl = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false, antialias: false, depth: false, stencil: false,
        preserveDrawingBuffer: false, powerPreference: 'high-performance'
      });
    } catch (e) { gl = null; }
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uTex', 'uRes', 'uTime', 'uMouse', 'uLiquid', 'uCA', 'uTone', 'uSweep', 'uGrain',
      'uVig', 'uUvScale', 'uUvOff', 'uShutter'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    var uploaded = false;
    function upload() {
      if (!img.naturalWidth || uploaded) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        uploaded = true;
        canvas.classList.add('is-ready');
      } catch (e) { uploaded = false; }
    }

    var S = {
      time: 0, liquid: 0, ca: 0, tone: 0, sweep: -1, grain: 0.014, vig: 0, shutter: 0,
      uvScale: [1, 1], uvOff: [0, 0], mouse: [0.5, 0.5], mouseT: [0.5, 0.5]
    };
    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var active = true;
    var handle = { el: canvas, gl: gl };

    function layout() {
      var r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var w = Math.min(Math.round(r.width * dpr), opts.maxWidth || 1440);
      var h = Math.round(w * (r.height / r.width));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      var boxAR = r.width / r.height;
      var texAR = (img.naturalWidth || 1) / (img.naturalHeight || 1);
      if (opts.cover !== false) {
        // 与 CSS object-fit:cover 一致；align:right 对应 object-position:center right
        if (texAR > boxAR) {
          var sx = boxAR / texAR;
          S.uvScale = [sx, 1];
          S.uvOff = [opts.align === 'right' ? (1 - sx) / 2 : 0, 0];
        } else {
          var sy = texAR / boxAR;
          S.uvScale = [1, sy];
          S.uvOff = [0, 0];
        }
      }
      gl.viewport(0, 0, w, h);
    }

    handle.layout = layout;
    handle.set = function (o) {
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) {
        if (k === 'uvScale' || k === 'uvOff' || k === 'mouse') S[k] = o[k];
        else S[k] = o[k];
      }
    };
    handle.reset = function () {
      S.liquid = 0; S.ca = 0; S.tone = 0; S.sweep = -1; S.shutter = 0;
    };
    handle._draw = function (now) {
      if (!active) return;
      if (!uploaded) upload();
      if (!uploaded) return;
      if (!handle._last) handle._last = now;
      var dt = Math.min(now - handle._last, 0.05);
      handle._last = now;
      S.time += dt;
      S.mouse[0] += (S.mouseT[0] - S.mouse[0]) * 0.16;
      S.mouse[1] += (S.mouseT[1] - S.mouse[1]) * 0.16;
      gl.uniform1f(U.uTime, S.time);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform2f(U.uMouse, S.mouse[0], S.mouse[1]);
      gl.uniform1f(U.uLiquid, S.liquid);
      gl.uniform1f(U.uCA, S.ca);
      gl.uniform1f(U.uTone, S.tone);
      gl.uniform1f(U.uSweep, S.sweep);
      gl.uniform1f(U.uGrain, S.grain);
      gl.uniform1f(U.uVig, S.vig);
      gl.uniform2f(U.uUvScale, S.uvScale[0], S.uvScale[1]);
      gl.uniform2f(U.uUvOff, S.uvOff[0], S.uvOff[1]);
      gl.uniform1f(U.uShutter, S.shutter);
      gl.uniform1i(U.uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    handle.destroy = function () {
      active = false;
      var i = handles.indexOf(handle);
      if (i > -1) handles.splice(i, 1);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      try { gl.deleteTexture(tex); gl.deleteBuffer(buf); gl.deleteProgram(prog); } catch (e) {}
      try {
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) {}
    };
    handle.pause = function (v) { active = !v; if (v) handle._last = 0; };

    host.appendChild(canvas);
    if (img.complete && img.naturalWidth) upload();
    else img.addEventListener('load', function () { layout(); upload(); }, { once: true });
    layout();

    handles.push(handle);
    startLoop();

    // 只在可见时绘制
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { handle.pause(!en.isIntersecting); });
      }, { threshold: 0.01 });
      io.observe(host);
    }
    return handle;
  }

  return { available: available, mount: mount, handles: handles };
})();

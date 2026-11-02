/* ГЕНАСТРОФА — процедурные CanvasTexture */
(function () {
  const T = {};
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  T.rnd = rnd;

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  T.cv = cv;

  T.roundRect = function(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      try { ctx.roundRect(x, y, w, h, r); return; } catch(e) {}
    }
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  };

  function tex(c, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    return t;
  }
  T.cv = cv; T.tex = tex;
  T.rep = function (base, rx, ry) { const t = base.clone(); t.repeat.set(rx, ry); t.needsUpdate = true; return t; };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return `rgb(${r|0},${g|0},${b|0})`;
  }
  T.shade = shade;

  // Паркет: 2м x 2м на текстуру, доски 16 см
  T.parquet = function () {
    const c = cv(1024, 1024), g = c.getContext('2d');
    const rows = 12, rh = 1024 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rnd() * 500;
      while (x < 1024) {
        const len = 380 + rnd() * 260;
        g.fillStyle = shade('#e6cfa8', (rnd() - 0.5) * 26);
        g.fillRect(x, r * rh, len, rh);
        // волокна
        g.strokeStyle = 'rgba(150,110,60,0.10)'; g.lineWidth = 1;
        for (let k = 0; k < 7; k++) {
          const y = r * rh + 6 + rnd() * (rh - 12);
          g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x + len * 0.3, y + (rnd() - 0.5) * 8, x + len * 0.7, y + (rnd() - 0.5) * 8, x + len, y + (rnd() - 0.5) * 4);
          g.stroke();
        }
        if (rnd() < 0.3) { g.fillStyle = 'rgba(120,80,40,0.18)'; g.beginPath(); g.ellipse(x + rnd() * len, r * rh + rh / 2, 8, 4, 0, 0, 7); g.fill(); }
        g.fillStyle = '#b4976d'; g.fillRect(x, r * rh, 2, rh);
        x += len;
      }
      g.fillStyle = '#b89b72'; g.fillRect(0, r * rh, 1024, 2);
    }
    return tex(c);
  };

  T.paint = function (base, noise = 8) {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    const id = g.getImageData(0, 0, 256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * noise; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(id, 0, 0);
    return tex(c);
  };

  // Плитка: tw x th клеток на текстуру
  T.tiles = function (base, grout, cols, rowsN, stagger, accentRow) {
    const c = cv(512, 512), g = c.getContext('2d');
    g.fillStyle = grout; g.fillRect(0, 0, 512, 512);
    const w = 512 / cols, h = 512 / rowsN;
    for (let r = 0; r < rowsN; r++) {
      const off = stagger && r % 2 ? w / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        const x = k * w + off, y = r * h;
        const col = accentRow !== undefined && r === accentRow ? accentRow.color : base;
        const grd = g.createLinearGradient(x, y, x + w, y + h);
        grd.addColorStop(0, shade(base, 8 + (rnd() - 0.5) * 6)); grd.addColorStop(1, shade(base, -6 + (rnd() - 0.5) * 6));
        g.fillStyle = grd;
        g.fillRect(x + 3, y + 3, w - 6, h - 6);
      }
    }
    return tex(c);
  };

  T.carpet = function () {
    const c = cv(1024, 768), g = c.getContext('2d');
    g.fillStyle = '#dcc7a2'; g.fillRect(0, 0, 1024, 768);
    g.strokeStyle = '#b8563a'; g.lineWidth = 14; g.strokeRect(34, 34, 956, 700);
    g.strokeStyle = '#17191C'; g.lineWidth = 4; g.strokeRect(62, 62, 900, 644);
    g.save(); g.beginPath(); g.rect(70, 70, 884, 628); g.clip();
    for (let y = 0; y < 9; y++) for (let x = 0; x < 12; x++) {
      const cx = 70 + x * 80 + (y % 2) * 40, cy = 70 + y * 80;
      g.fillStyle = (x + y) % 3 === 0 ? '#c8693f' : (x + y) % 3 === 1 ? '#e9dcc2' : '#3c5a55';
      g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx + 26, cy); g.lineTo(cx, cy + 26); g.lineTo(cx - 26, cy); g.closePath(); g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(23,25,28,0.35)'; g.lineWidth = 2; g.stroke();
    }
    g.restore();
    const id = g.getImageData(0, 0, 1024, 768), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    g.putImageData(id, 0, 0);
    const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  };

  T.stripes = function (a, b, n = 8, vertical = false) {
    const c = cv(64, 256), g = c.getContext('2d');
    g.fillStyle = a; g.fillRect(0, 0, 64, 256);
    g.fillStyle = b;
    const step = 256 / n;
    for (let i = 0; i < n; i++) g.fillRect(0, i * step, 64, step * 0.42);
    const t = tex(c); if (vertical) t.rotation = Math.PI / 2; return t;
  };

  T.pants = function () {
    const c = cv(256, 64), g = c.getContext('2d');
    g.fillStyle = '#26398a'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#ffffff';
    [58, 70, 186, 198].forEach(x => g.fillRect(x, 0, 6, 64));
    const t = tex(c); return t;
  };

  T.fabric = function (base, n = 30) {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      g.fillStyle = `rgba(0,0,0,${0.03 + rnd() * 0.04})`; g.fillRect(0, i, 256, 1);
      g.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.03})`; g.fillRect(i, 0, 1, 256);
    }
    const id = g.getImageData(0, 0, 256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const k = (rnd() - 0.5) * n * 0.4; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
    g.putImageData(id, 0, 0);
    return tex(c, 2, 2);
  };

  T.plaid = function () {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = '#d9a441'; g.fillRect(0, 0, 256, 256);
    g.globalAlpha = 0.55;
    for (let i = 0; i < 256; i += 64) {
      g.fillStyle = '#8f2b1f'; g.fillRect(i + 10, 0, 18, 256); g.fillRect(0, i + 10, 256, 18);
      g.fillStyle = '#fbf9f5'; g.fillRect(i + 44, 0, 4, 256); g.fillRect(0, i + 44, 256, 4);
    }
    g.globalAlpha = 1;
    return tex(c, 2, 2);
  };

  T.wood = function (base, dark) {
    const c = cv(256, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = dark; g.globalAlpha = 0.08 + rnd() * 0.15; g.lineWidth = 1 + rnd() * 2;
      const y = rnd() * 256; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 4);
      g.stroke();
    }
    g.globalAlpha = 1;
    return tex(c);
  };

  T.screen = function () {
    const c = cv(512, 288), g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 288);
    sky.addColorStop(0, '#1d3b6e'); sky.addColorStop(0.55, '#ef8a5a'); sky.addColorStop(1, '#f5c46b');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 288);
    g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(360, 170, 34, 0, 7); g.fill();
    g.fillStyle = '#2b2440';
    g.beginPath(); g.moveTo(0, 288); g.lineTo(0, 190); g.lineTo(90, 130); g.lineTo(170, 190); g.lineTo(260, 120); g.lineTo(380, 210); g.lineTo(512, 150); g.lineTo(512, 288); g.fill();
    g.fillStyle = '#17142a'; g.fillRect(0, 238, 512, 50);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '700 16px Manrope, sans-serif'; g.fillText('НАЦИОНАЛЬНЫЙ ПАРК · 4K HDR', 18, 30);
    g.fillStyle = '#EF3124'; g.fillRect(18, 262, 160, 6);
    return tex(c);
  };

  T.glitch = function () {
    const c = cv(256, 144), g = c.getContext('2d');
    g.fillStyle = '#05060a'; g.fillRect(0, 0, 256, 144);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = ['#ff00aa', '#00e5ff', '#ffffff', '#33ff66'][i % 4];
      g.globalAlpha = 0.25 + rnd() * 0.5;
      g.fillRect(rnd() * 256, rnd() * 144, 20 + rnd() * 140, 1 + rnd() * 4);
    }
    g.globalAlpha = 1;
    return tex(c);
  };

  T.cracks = function (cx = 0.5, cy = 0.45) {
    const c = cv(512, 512), g = c.getContext('2d');
    const X = cx * 512, Y = cy * 512;
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineCap = 'round';
    const rays = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.3; let x = X, y = Y; const pts = [[x, y]];
      g.lineWidth = 1.5 + rnd() * 1.5; g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 8; s++) { x += Math.cos(a + (rnd() - 0.5) * 0.6) * (30 + rnd() * 30); y += Math.sin(a + (rnd() - 0.5) * 0.6) * (30 + rnd() * 30); g.lineTo(x, y); pts.push([x, y]); }
      g.stroke(); rays.push(pts);
    }
    g.lineWidth = 1;
    for (let ring = 1; ring < 6; ring++) {
      g.beginPath();
      rays.forEach((p, i) => { const q = p[Math.min(ring, p.length - 1)]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); });
      g.closePath(); g.strokeStyle = `rgba(255,255,255,${0.6 - ring * 0.08})`; g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(X, Y, 10, 0, 7); g.fill();
    const t = new THREE.CanvasTexture(c); return t;
  };

  T.decal = function (type) {
    const c = cv(256, 256), g = c.getContext('2d');
    if (type === 'soil') {
      for (let i = 0; i < 70; i++) {
        const r = 6 + rnd() * 30, a = rnd() * 7, d = rnd() * 90;
        g.fillStyle = `rgba(${50 + rnd() * 30},${32 + rnd() * 15},${20},${0.6 + rnd() * 0.4})`;
        g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d * 0.7, r, 0, 7); g.fill();
      }
    } else if (type === 'crack') {
      g.strokeStyle = 'rgba(70,45,20,0.85)'; g.lineCap = 'round';
      for (let i = 0; i < 11; i++) {
        let a = rnd() * 7, x = 128, y = 128; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 6; s++) { a += (rnd() - 0.5) * 0.8; x += Math.cos(a) * 18; y += Math.sin(a) * 18; g.lineTo(x, y); g.lineWidth = 3 - s * 0.4; }
        g.stroke();
      }
      const rg = g.createRadialGradient(128, 128, 2, 128, 128, 40); rg.addColorStop(0, 'rgba(40,25,10,0.7)'); rg.addColorStop(1, 'rgba(40,25,10,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    } else if (type === 'scorch') {
      const rg = g.createRadialGradient(128, 128, 5, 128, 128, 125); rg.addColorStop(0, 'rgba(20,15,10,0.9)'); rg.addColorStop(0.6, 'rgba(40,30,20,0.5)'); rg.addColorStop(1, 'rgba(40,30,20,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
    } else if (type === 'hole') {
      g.fillStyle = 'rgba(235,228,214,0.95)';
      g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * 7, r = 95 + rnd() * 25; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.fill();
      g.fillStyle = '#2a2420';
      g.beginPath(); for (let i = 0; i < 20; i++) { const a = i / 20 * 7, r = 55 + rnd() * 20; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.fill();
    } else if (type === 'puddle') {
      g.fillStyle = 'rgba(90,160,200,0.5)';
      for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(128 + (rnd() - 0.5) * 120, 128 + (rnd() - 0.5) * 120, 30 + rnd() * 30, 0, 7); g.fill(); }
    }
    return new THREE.CanvasTexture(c);
  };

  T.logo = function (size = 256) {
    const c = cv(size, size), g = c.getContext('2d');
    g.fillStyle = '#EF3124'; const r = size * 0.18;
    g.beginPath(); g.moveTo(r, 0); g.arcTo(size, 0, size, size, r); g.arcTo(size, size, 0, size, r); g.arcTo(0, size, 0, 0, r); g.arcTo(0, 0, size, 0, r); g.fill();
    g.fillStyle = '#fff'; g.font = `800 ${size * 0.62}px Unbounded, Manrope, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('А', size / 2, size * 0.44);
    g.fillRect(size * 0.24, size * 0.74, size * 0.52, size * 0.08);
    return new THREE.CanvasTexture(c);
  };

  T.label = function (text, color = '#fbf9f5') {
    const c = cv(1024, 256), g = c.getContext('2d');
    g.font = '800 150px Unbounded, Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = color; g.fillText(text, 512, 132);
    return new THREE.CanvasTexture(c);
  };

  T.textPlate = function (lines, bg, fg, w = 256, h = 128, font = '700 22px Manrope, sans-serif') {
    const c = cv(w, h), g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, w / 2, h / (lines.length + 1) * (i + 1)));
    return new THREE.CanvasTexture(c);
  };

  T.gauge = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    g.fillStyle = '#fbf9f5'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
    g.strokeStyle = '#EF3124'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 50, -0.3, 0.75); g.stroke();
    g.strokeStyle = '#17191C'; g.lineWidth = 2;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + i / 10 * Math.PI * 1.5; g.beginPath(); g.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke(); }
    return new THREE.CanvasTexture(c);
  };

  T.laptop = function () {
    const c = cv(256, 160), g = c.getContext('2d');
    g.fillStyle = '#101826'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#EF3124'; g.fillRect(14, 14, 120, 8);
    const cols = ['#7aa2f7', '#9ece6a', '#e0af68', '#bb9af7', '#c0caf5'];
    for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 5]; g.fillRect(14 + (i % 3) * 10, 32 + i * 10, 40 + rnd() * 140, 4); }
    return new THREE.CanvasTexture(c);
  };

  T.fridgeDisplay = function () {
    const c = cv(128, 192), g = c.getContext('2d');
    g.fillStyle = '#0d1117'; g.fillRect(0, 0, 128, 192);
    g.fillStyle = '#5ce1ff'; g.font = '700 38px Manrope, sans-serif'; g.textAlign = 'center';
    g.fillText('+4°', 64, 70); g.font = '600 15px Manrope, sans-serif'; g.fillStyle = '#8b98a9'; g.fillText('BORK  SMART', 64, 104);
    g.fillStyle = '#9ece6a'; g.fillRect(30, 130, 68, 6); g.fillStyle = '#5ce1ff'; g.fillRect(30, 146, 40, 6);
    return new THREE.CanvasTexture(c);
  };

  T.porcelain = function () {
    const c = cv(256, 128), g = c.getContext('2d');
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#2d4f9e'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(16 + i * 32, 64, 12, 0, 7); g.stroke(); g.beginPath(); g.moveTo(i * 32, 64); g.quadraticCurveTo(i * 32 + 16, 30, i * 32 + 32, 64); g.stroke(); }
    g.fillStyle = '#2d4f9e'; g.fillRect(0, 8, 256, 6); g.fillRect(0, 114, 256, 6);
    return tex(c);
  };

  T.beam = function () {
    const c = cv(64, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,236,190,0.55)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  };

  T.hex = function () {
    const c = cv(256, 256), g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 3;
    const s = 32, h = s * Math.sqrt(3) / 2;
    for (let y = -1; y < 6; y++) for (let x = -1; x < 6; x++) {
      const cx = x * s * 1.5, cy = y * h * 2 + (x % 2 ? h : 0);
      g.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 6 * Math.PI * 2; g.lineTo(cx + Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.95); } g.stroke();
    }
    return tex(c, 6, 3);
  };

  T.art = function (variant) {
    const c = cv(256, 320), g = c.getContext('2d');
    g.fillStyle = variant ? '#efe6d4' : '#e8d9c0'; g.fillRect(0, 0, 256, 320);
    if (variant) {
      g.fillStyle = '#EF3124'; g.beginPath(); g.arc(128, 130, 70, 0, 7); g.fill();
      g.fillStyle = '#17191C'; g.fillRect(40, 220, 176, 18); g.fillStyle = '#3c5a55'; g.fillRect(70, 250, 116, 10);
    } else {
      g.fillStyle = '#3c5a55'; g.beginPath(); g.moveTo(20, 300); g.quadraticCurveTo(128, 40, 236, 300); g.fill();
      g.fillStyle = '#d9a441'; g.beginPath(); g.arc(180, 90, 30, 0, 7); g.fill();
      g.fillStyle = '#c8693f'; g.fillRect(20, 280, 216, 20);
    }
    return new THREE.CanvasTexture(c);
  };

  window.GN = window.GN || {};
  window.GN.Tex = T;
})();

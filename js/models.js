/* ГЕНАСТРОФА — составные 3D-модели квартиры, мебели, робота и датчиков */
(function () {
  const GN = window.GN = window.GN || {};
  const T = GN.Tex;
  const V3 = THREE.Vector3;
  const M = {};
  const matCache = {};
  const geoCache = {};

  M.mat = function (color, r = 0.75, m = 0, extra) {
    const key = color + '|' + r + '|' + m;
    if (!extra && matCache[key]) return matCache[key];
    const mt = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: r, metalness: m }, extra || {}));
    if (!extra) matCache[key] = mt;
    return mt;
  };
  M.basic = (color, extra) => new THREE.MeshBasicMaterial(Object.assign({ color }, extra || {}));

  function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  M.mesh = mesh;
  M.box = (w, h, d, mat, x, y, z, p) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p);
  M.cyl = (rt, rb, h, mat, x, y, z, p, seg = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, p);
  M.sph = (r, mat, x, y, z, p, ws = 18, hs = 12) => mesh(new THREE.SphereGeometry(r, ws, hs), mat, x, y, z, p);
  M.tor = (R, r, mat, x, y, z, p, arc = Math.PI * 2) => mesh(new THREE.TorusGeometry(R, r, 10, 28, arc), mat, x, y, z, p);

  function roundedBoxGeo(w, h, d, r) {
    const key = [w, h, d, r].map(v => v.toFixed(3)).join('_');
    if (geoCache[key]) return geoCache[key];
    const b = Math.min(r * 0.6, d * 0.3, w * 0.3, h * 0.3);
    const sw = w - 2 * b, sh = h - 2 * b, rr = Math.max(0.002, Math.min(r - b, sw / 2 - 0.001, sh / 2 - 0.001));
    const s = new THREE.Shape();
    const x0 = -sw / 2, y0 = -sh / 2;
    s.moveTo(x0 + rr, y0);
    s.lineTo(x0 + sw - rr, y0); s.quadraticCurveTo(x0 + sw, y0, x0 + sw, y0 + rr);
    s.lineTo(x0 + sw, y0 + sh - rr); s.quadraticCurveTo(x0 + sw, y0 + sh, x0 + sw - rr, y0 + sh);
    s.lineTo(x0 + rr, y0 + sh); s.quadraticCurveTo(x0, y0 + sh, x0, y0 + sh - rr);
    s.lineTo(x0, y0 + rr); s.quadraticCurveTo(x0, y0, x0 + rr, y0);
    const depth = Math.max(0.001, d - 2 * b);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 5 });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    geoCache[key] = g;
    return g;
  }
  M.rbox = (w, h, d, r, mat, x, y, z, p) => mesh(roundedBoxGeo(w, h, d, r), mat, x, y, z, p);

  function plane(w, h, mat, x, y, z, p) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (p) p.add(m); return m; }
  M.plane = plane;

  class Helix extends THREE.Curve {
    constructor(r, h, turns) { super(); this.r = r; this.h = h; this.turns = turns; }
    getPoint(t, target = new V3()) { const a = t * Math.PI * 2 * this.turns; return target.set(Math.cos(a) * this.r, t * this.h, Math.sin(a) * this.r); }
  }
  M.spring = (r, h, turns, rad, mat, x, y, z, p) => mesh(new THREE.TubeGeometry(new Helix(r, h, turns), 60, rad, 6, false), mat, x, y, z, p);

  const lw = (g, x, y, z) => { g.updateMatrixWorld(true); return g.localToWorld(new V3(x, y, z)); };
  const ld = (g, x, y, z) => { g.updateMatrixWorld(true); return new V3(x, y, z).transformDirection(g.matrixWorld); };
  M.lw = lw; M.ld = ld;

  function crackOverlay(w, h, x, y, z, p, cx, cy) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: T.cracks(cx, cy), transparent: true, depthWrite: false }));
    m.position.set(x, y, z); p.add(m); return m;
  }

  // ---------------- Материалы ----------------
  const MAT = {};
  M.initMaterials = function () {
    MAT.walnut = new THREE.MeshStandardMaterial({ map: T.wood('#7a5236', '#3d2615'), roughness: 0.6 });
    MAT.oak = new THREE.MeshStandardMaterial({ map: T.wood('#d8b98a', '#9a7448'), roughness: 0.6 });
    MAT.black = M.mat('#1d1f23', 0.4, 0.2);
    MAT.chrome = M.mat('#d7dbe0', 0.18, 0.9);
    MAT.steel = M.mat('#b9bec4', 0.3, 0.75);
    MAT.white = M.mat('#f4f1ea', 0.45);
    MAT.porcelain = M.mat('#f8f7f3', 0.2, 0.05);
    MAT.emerald = new THREE.MeshStandardMaterial({ color: '#1f6b55', map: T.fabric('#2a8a6e'), roughness: 0.92 });
    MAT.teal = M.mat('#2fa6a0', 0.45, 0.05);
    MAT.tealDark = M.mat('#23807b', 0.5);
    MAT.marble = M.mat('#ece8e0', 0.3);
    MAT.copper = M.mat('#c77b45', 0.32, 0.85);
    MAT.glass = new THREE.MeshStandardMaterial({ color: '#bfe3ee', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
    MAT.red = M.mat('#EF3124', 0.45);
    MAT.terracotta = M.mat('#c46a3c', 0.85);
    MAT.soil = M.mat('#3b2a1d', 1);
    MAT.leaf = [M.mat('#2f6b34', 0.7), M.mat('#3d8a3f', 0.7), M.mat('#26552b', 0.7), M.mat('#4f9b45', 0.7)];
    MAT.bark = M.mat('#6b4a2f', 0.9);
    MAT.radiator = M.mat('#ece7dc', 0.5, 0.2);
    MAT.galv = M.mat('#9aa2a8', 0.35, 0.7);
    MAT.gold = M.mat('#c9a14a', 0.3, 0.8);
    MAT.graphite = M.mat('#2a2d33', 0.5, 0.1);
    MAT.foam = M.mat('#ffffff', 0.9);
    return MAT;
  };
  M.MAT = MAT;

  // ---------------- КВАРТИРА ----------------
  M.buildApartment = function (scene) {
    const root = new THREE.Group(); scene.add(root);
    const colliders = [];
    const outerWalls = [];
    const H = 3.0, PH = 2.6, TH = 0.2;
    const col = (x0, x1, z0, z1, top = 10) => colliders.push({ x0, x1, z0, z1, top });

    // Земля и плита-основание
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#cfc7b8', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.42; ground.receiveShadow = true; root.add(ground);
    const slab = M.box(17.8, 0.4, 12.8, M.mat('#bdb09a', 0.9), 0, -0.21, 0, root);
    slab.castShadow = false;
    M.box(17.9, 0.04, 12.9, M.mat('#17191C', 0.6), 0, -0.4, 0, root).castShadow = false;

    // Полы
    const parquet = T.parquet();
    const floorMat = (rx, ry) => new THREE.MeshStandardMaterial({ map: T.rep(parquet, rx, ry), roughness: 0.55 });
    const fl = (w, d, x, z, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); m.receiveShadow = true; root.add(m); return m; };
    fl(9, 12, -4, 0, floorMat(4.5, 6));
    fl(8, 6.5, 4.5, -2.75, floorMat(4, 3.25));
    const bathTiles = T.tiles('#e2e6e4', '#c3cac8', 4, 4, false);
    fl(8, 5.5, 4.5, 3.25, new THREE.MeshStandardMaterial({ map: T.rep(bathTiles, 4, 2.75), roughness: 0.35 }));

    // Материалы стен
    const olive = T.paint('#9b9c85', 7);
    const kitchenTile = T.tiles('#f1eee6', '#d3cdc1', 4, 8, true);
    const bathWall = T.tiles('#e8eef0', '#c6d0d4', 4, 4, false);
    const wallMat = (kind, w, h) => {
      if (kind === 'living') return new THREE.MeshStandardMaterial({ map: T.rep(olive, w / 2, h / 2), roughness: 0.9 });
      if (kind === 'kitchen') return new THREE.MeshStandardMaterial({ map: T.rep(kitchenTile, w / 1.2, h / 1.2), roughness: 0.4 });
      return new THREE.MeshStandardMaterial({ map: T.rep(bathWall, w / 1.2, h / 1.2), roughness: 0.3 });
    };
    const capMat = M.mat('#efe9df', 0.8);
    const outerMat = M.mat('#e9e3d8', 0.9);

    // Внешняя стена: группа с pivot на полу для эффекта «срезанной» стены
    function outer(name, normal, center) {
      const g = new THREE.Group(); root.add(g);
      const w = { name, group: g, normal: normal.clone(), center: center.clone(), attach: [], cut: 0 };
      outerWalls.push(w); return w;
    }
    // inward-face index: back(z-)->+z(4), front(z+)->-z(5), left(x-)->+x(0), right(x+)->-x(1)
    function wallSeg(w, sx, sy, sz, x, y, z, faceIdx, kind, faceW) {
      const mats = [outerMat, outerMat, capMat, capMat, outerMat, outerMat];
      mats[faceIdx] = wallMat(kind, faceW, sy);
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mats);
      m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; w.group.add(m); return m;
    }
    const back = outer('back', new V3(0, 0, -1), new V3(0, 0, -6));
    // Гостиная: окно x∈[-6,-3.5], y∈[0.9,2.4]
    wallSeg(back, 2.7, H, TH, -7.25 - 0.05, H / 2, -6.1, 4, 'living', 2.7);
    wallSeg(back, 4.0, H, TH, -1.5, H / 2, -6.1, 4, 'living', 4);
    wallSeg(back, 2.5, 0.9, TH, -4.75, 0.45, -6.1, 4, 'living', 2.5);
    wallSeg(back, 2.5, 0.6, TH, -4.75, 2.7, -6.1, 4, 'living', 2.5);
    wallSeg(back, 8.2, H, TH, 4.5, H / 2, -6.1, 4, 'kitchen', 8.2);
    // окно
    const frameM = M.mat('#f6f3ee', 0.5);
    const win = new THREE.Group(); win.position.set(-4.75, 1.65, -6.1); back.group.add(win);
    M.box(2.5, 0.08, 0.26, frameM, 0, -0.75, 0, win); M.box(2.5, 0.08, 0.22, frameM, 0, 0.75, 0, win);
    M.box(0.08, 1.5, 0.22, frameM, -1.25, 0, 0, win); M.box(0.08, 1.5, 0.22, frameM, 1.25, 0, 0, win);
    M.box(0.06, 1.5, 0.12, frameM, 0, 0, 0, win); M.box(2.5, 0.05, 0.12, frameM, 0, 0.25, 0, win);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 1.45), new THREE.MeshBasicMaterial({ color: '#cfe7f2' }));
    sky.position.z = -0.05; win.add(sky);
    M.box(2.7, 0.05, 0.36, M.mat('#fbf9f5', 0.4), 0, -0.79, 0.12, win);
    // солнечный луч
    const beamMat = new THREE.MeshBasicMaterial({ map: T.beam(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0.55 });
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), beamMat);
    beam.position.set(-4.75, 1.0, -4.7); beam.rotation.x = -0.95; root.add(beam);
    back.attach.push(beam);

    const front = outer('front', new V3(0, 0, 1), new V3(0, 0, 6));
    wallSeg(front, 9.2, H, TH, -4.0 - 0.1, H / 2, 6.1, 5, 'living', 9.2);
    wallSeg(front, 8.2, H, TH, 4.5, H / 2, 6.1, 5, 'bath', 8.2);
    const left = outer('left', new V3(-1, 0, 0), new V3(-8.5, 0, 0));
    wallSeg(left, TH, H, 12.4, -8.6, H / 2, 0, 0, 'living', 12.4);
    const right = outer('right', new V3(1, 0, 0), new V3(8.5, 0, 0));
    wallSeg(right, TH, H, 6.6, 8.6, H / 2, -2.8, 1, 'kitchen', 6.6);
    wallSeg(right, TH, H, 5.6, 8.6, H / 2, 3.3, 1, 'bath', 5.6);

    col(-9, 9, -6.4, -6.0); col(-9, 9, 6.0, 6.4); col(-8.9, -8.5, -7, 7); col(8.5, 8.9, -7, 7);

    // Перегородки
    const parts = new THREE.Group(); root.add(parts);
    function partX(z0, z1, kindPlus) { // перегородка x=0.5
      const len = z1 - z0, cz = (z0 + z1) / 2;
      const mats = [wallMat(kindPlus, len, PH), wallMat('living', len, PH), capMat, capMat, capMat, capMat];
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, PH, len), mats);
      m.position.set(0.5, PH / 2, cz); m.castShadow = m.receiveShadow = true; parts.add(m);
      col(0.43, 0.57, z0, z1);
    }
    partX(-6, -3.6, 'kitchen'); partX(-2.0, 0.5, 'kitchen'); partX(0.5, 2.2, 'bath'); partX(3.6, 6, 'bath');
    {
      const mats = [capMat, capMat, capMat, capMat, wallMat('bath', 8, PH), wallMat('kitchen', 8, PH)];
      const m = new THREE.Mesh(new THREE.BoxGeometry(8, PH, 0.14), mats);
      m.position.set(4.5, PH / 2, 0.5); m.castShadow = m.receiveShadow = true; parts.add(m);
      col(0.5, 8.5, 0.43, 0.57);
    }
    // Наличники дверей и перемычки
    const trim = M.mat('#f6f1e7', 0.6);
    [[-3.6, -2.0], [2.2, 3.6]].forEach(([a, b]) => {
      M.box(0.2, PH, 0.08, trim, 0.5, PH / 2, a, parts); M.box(0.2, PH, 0.08, trim, 0.5, PH / 2, b, parts);
      M.box(0.14, 0.5, b - a, M.mat('#e8e1d4', 0.8), 0.5, PH - 0.25, (a + b) / 2, parts);
      M.box(0.2, 0.08, b - a + 0.16, trim, 0.5, PH - 0.5, (a + b) / 2, parts);
    });
    // Плинтусы гостиной
    const skirt = M.mat('#f4efe6', 0.6);
    M.box(9, 0.09, 0.03, skirt, -4, 0.045, -5.985, root);
    M.box(0.03, 0.09, 12, skirt, -8.485, 0.045, 0, root);
    M.box(0.03, 0.09, 12, skirt, 0.415, 0.045, 0, root);

    // Объёмные надписи на полу (стопка слоёв с alphaTest = экструзия)
    function floorLabel(text, x, z, w) {
      const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
      const tex = T.label(text);
      const geo = new THREE.PlaneGeometry(w, w / 4);
      for (let i = 0; i < 7; i++) {
        const top = i === 6;
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, transparent: false, color: top ? '#fbf9f5' : '#a8977a', roughness: 0.6 }));
        m.rotation.x = -Math.PI / 2; m.position.y = 0.006 + i * 0.008; m.receiveShadow = top; m.castShadow = top;
        g.add(m);
      }
      return g;
    }
    floorLabel('КОМНАТА', -4.4, 3.9, 4.2);
    floorLabel('КУХНЯ', 5.2, -0.45, 3.0);
    floorLabel('ВАННАЯ', 4.6, 4.5, 3.2);

    // ----- Декор (не интерактивный) -----
    // Ковёр
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.02, 2.8), [M.mat('#cdb48d'), M.mat('#cdb48d'), new THREE.MeshStandardMaterial({ map: T.carpet(), roughness: 1 }), M.mat('#cdb48d'), M.mat('#cdb48d'), M.mat('#cdb48d')]);
    carpet.position.set(-5.7, 0.01, -0.8); carpet.receiveShadow = true; root.add(carpet);
    // Торшер
    const lamp = new THREE.Group(); lamp.position.set(-7.9, 0, 2.2); root.add(lamp);
    M.cyl(0.18, 0.2, 0.03, MAT.black, 0, 0.015, 0, lamp); M.cyl(0.015, 0.015, 1.6, MAT.gold, 0, 0.8, 0, lamp);
    const shade = M.cyl(0.18, 0.26, 0.32, new THREE.MeshStandardMaterial({ color: '#f3e3c3', emissive: '#f5d9a0', emissiveIntensity: 0.35, side: THREE.DoubleSide }), 0, 1.65, 0, lamp, 24);
    shade.geometry = new THREE.CylinderGeometry(0.18, 0.26, 0.32, 24, 1, true);
    col(-8.1, -7.7, 2.0, 2.4, 1.8);
    // Картины
    [[-8.47, 1.7, 2.2, 0], [-8.47, 1.75, -3.2, 1]].forEach(([x, y, z, v]) => {
      const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = Math.PI / 2; root.add(f); left.attach.push(f);
      M.box(0.72, 0.9, 0.04, MAT.black, 0, 0, 0, f);
      plane(0.62, 0.8, new THREE.MeshStandardMaterial({ map: T.art(v), roughness: 0.8 }), 0, 0, 0.025, f);
    });
    // Стулья на кухне
    function chair(x, z, ry) {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; root.add(c);
      M.rbox(0.44, 0.05, 0.44, 0.03, MAT.oak, 0, 0.46, 0, c);
      [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([a, b]) => M.cyl(0.02, 0.018, 0.46, MAT.black, a, 0.23, b, c, 8));
      M.rbox(0.44, 0.36, 0.04, 0.03, MAT.oak, 0, 0.74, -0.2, c);
      M.cyl(0.012, 0.012, 0.3, MAT.black, -0.18, 0.6, -0.2, c, 6); M.cyl(0.012, 0.012, 0.3, MAT.black, 0.18, 0.6, -0.2, c, 6);
      return c;
    }
    chair(3.4, -1.55, Math.PI * 0.85); chair(5.6, -1.55, -Math.PI * 0.85);
    col(3.15, 3.65, -1.8, -1.3, 0.48); col(5.35, 5.85, -1.8, -1.3, 0.48);
    // Коврик в ванной и полотенцесушитель
    M.rbox(1.0, 0.02, 0.6, 0.05, M.mat('#8fc1c4', 1), 6.9, 0.011, 2.8, root).castShadow = false;
    const rail = new THREE.Group(); rail.position.set(8.46, 1.2, 5.0); root.add(rail); right.attach.push(rail);
    for (let i = 0; i < 5; i++) M.cyl(0.015, 0.015, 0.5, MAT.chrome, -0.04, -0.3 + i * 0.15, 0, rail, 8).rotation.x = Math.PI / 2;
    M.cyl(0.02, 0.02, 0.7, MAT.chrome, -0.04, 0, -0.25, rail, 8); M.cyl(0.02, 0.02, 0.7, MAT.chrome, -0.04, 0, 0.25, rail, 8);
    M.box(0.03, 0.5, 0.42, M.mat('#EF3124', 1), -0.08, 0.05, 0, rail);
    // Подоконник: горшок
    // Станция робота
    const dock = new THREE.Group(); dock.position.set(-7.6, 0, 5.4); root.add(dock);
    M.rbox(0.5, 0.12, 0.24, 0.04, MAT.graphite, 0, 0.06, 0.1, dock);
    M.rbox(0.42, 0.01, 0.4, 0.02, M.mat('#3a3e46', 0.6), 0, 0.006, -0.18, dock).castShadow = false;
    const dl = M.sph(0.018, M.basic('#45e07a'), 0.18, 0.1, -0.02, dock);

    return { root, colliders, outerWalls };
  };

  // ---------------- ИНТЕРАКТИВНЫЕ ОБЪЕКТЫ ----------------
  const B = {};

  // 1. ТВ 75" на тумбе (лицом +z)
  B.tv = function () {
    const g = new THREE.Group(); const P = {};
    M.rbox(2.4, 0.46, 0.46, 0.03, MAT.walnut, 0, 0.29, 0, g);
    for (let i = 0; i < 3; i++) {
      M.rbox(0.74, 0.34, 0.03, 0.02, M.mat('#8d6a4c', 0.5), -0.79 + i * 0.79, 0.29, 0.235, g);
      M.box(0.22, 0.02, 0.03, MAT.gold, -0.79 + i * 0.79, 0.38, 0.26, g);
    }
    [[-1.1, -0.17], [1.1, -0.17], [-1.1, 0.17], [1.1, 0.17]].forEach(([x, z]) => M.cyl(0.025, 0.02, 0.06, MAT.black, x, 0.03, z, g, 8));
    // подставка
    M.rbox(0.5, 0.025, 0.3, 0.01, MAT.black, 0, 0.535, -0.02, g);
    M.box(0.08, 0.32, 0.03, MAT.black, 0, 0.7, -0.08, g);
    const panel = new THREE.Group(); panel.position.set(0, 1.27, -0.08); g.add(panel); P.panel = panel;
    M.rbox(1.7, 0.98, 0.045, 0.015, MAT.black, 0, 0, 0, panel);
    M.box(1.2, 0.5, 0.06, M.mat('#2a2c30', 0.6), 0, 0, -0.04, panel);
    P.screenMat = new THREE.MeshBasicMaterial({ map: T.screen() });
    P.screen = plane(1.66, 0.94, P.screenMat, 0, 0, 0.024, panel);
    // саундбар
    M.rbox(1.05, 0.07, 0.1, 0.03, M.mat('#26282c', 0.7), 0, 0.555, 0.12, g);
    M.box(1.0, 0.05, 0.005, M.mat('#444851', 0.9), 0, 0.555, 0.172, g);
    M.sph(0.008, M.basic('#ffffff'), 0.46, 0.57, 0.175, g, 6, 4);
    // декор: свеча-ваза
    M.cyl(0.06, 0.05, 0.18, M.mat('#c8693f', 0.6), 0.95, 0.61, 0.05, g, 14);
    return {
      group: g, parts: P, size: [2.4, 0.5, 1.8], brokenTop: 1.8, focus: [0, 1.2, 0.1],
      breakFx(fx) {
        crackOverlay(1.66, 0.94, 0, 0, 0.03, panel, 0.38, 0.4);
        P.screenMat.map = T.glitch(); P.screenMat.needsUpdate = true;
        fx.tween(0.35, t => { panel.rotation.x = -0.14 * t; panel.rotation.z = 0.05 * t; });
        fx.sparkSource(lw(panel, 0.2, 0.1, 0.06), 6);
        fx.debris(lw(panel, 0, 0, 0.1), '#9fb6c8', 18, 3);
      }
    };
  };

  // 2. Изумрудный диван (лицом +z, длина по x)
  B.sofa = function () {
    const g = new THREE.Group(); const P = { cushions: [] };
    const base = new THREE.Group(); g.add(base); P.base = base;
    M.rbox(2.6, 0.24, 0.95, 0.06, MAT.emerald, 0, 0.3, 0, base);
    M.rbox(2.6, 0.6, 0.24, 0.08, MAT.emerald, 0, 0.66, -0.36, base);
    M.rbox(0.24, 0.48, 0.95, 0.1, MAT.emerald, -1.18, 0.5, 0, base);
    M.rbox(0.24, 0.48, 0.95, 0.1, MAT.emerald, 1.18, 0.5, 0, base);
    [[-1.15, -0.38], [1.15, -0.38], [-1.15, 0.38], [1.15, 0.38]].forEach(([x, z]) => M.cyl(0.035, 0.02, 0.18, MAT.oak, x, 0.09, z, base, 10));
    for (let i = 0; i < 3; i++) {
      P.cushions.push(M.rbox(0.7, 0.16, 0.72, 0.07, MAT.emerald, -0.72 + i * 0.72, 0.5, 0.08, g));
      const bc = M.rbox(0.68, 0.44, 0.16, 0.08, MAT.emerald, -0.72 + i * 0.72, 0.82, -0.2, g); bc.rotation.x = -0.18; P.cushions.push(bc);
    }
    P.cushions.push(M.rbox(0.36, 0.34, 0.12, 0.08, M.mat('#d9a441', 0.9), -0.85, 0.78, -0.06, g));
    P.cushions[P.cushions.length - 1].rotation.z = 0.3;
    P.cushions.push(M.rbox(0.34, 0.32, 0.12, 0.08, M.mat('#f1e7d5', 0.9), 0.9, 0.78, -0.06, g));
    // плед
    const plaid = new THREE.MeshStandardMaterial({ map: T.plaid(), roughness: 1 });
    const pl = new THREE.Group(); g.add(pl); P.plaid = pl;
    M.box(0.5, 0.02, 0.9, plaid, 1.18, 0.75, 0, pl);
    const p2 = M.box(0.02, 0.4, 0.9, plaid, 1.31, 0.56, 0, pl); p2.rotation.z = 0.12;
    return {
      group: g, parts: P, size: [2.6, 1.0, 0.55], brokenTop: 0.42, focus: [0, 0.6, 0],
      breakFx(fx) {
        P.cushions.forEach(c => fx.throwPart(c, (Math.random() - 0.5) * 5, 3 + Math.random() * 3, (Math.random() - 0.2) * 5, 8));
        fx.throwPart(pl, 2, 4, 1, 4);
        const sm = MAT.steel;
        for (let i = 0; i < 7; i++) M.spring(0.05, 0.22, 5, 0.008, sm, -1 + i * 0.32, 0.4, (Math.random() - 0.5) * 0.5, base);
        for (let i = 0; i < 3; i++) { const r = plane(0.5, 0.3, M.basic('#1b1410', { side: THREE.DoubleSide }), -0.7 + i * 0.7, 0.425, 0.05, base); r.rotation.x = -Math.PI / 2; r.rotation.z = Math.random(); }
        fx.tween(0.4, t => { base.rotation.z = 0.05 * t; base.position.y = -0.04 * t; });
        fx.debris(lw(g, 0, 0.6, 0), '#2a8a6e', 20, 3);
        fx.puffs(lw(g, 0, 0.6, 0), '#f1e7d5', 16);
      }
    };
  };

  // 3. Журнальный стол + MacBook + сервиз
  B.table = function () {
    const g = new THREE.Group(); const P = { china: [] };
    const top = new THREE.Group(); g.add(top); P.top = top;
    M.rbox(1.3, 0.05, 0.72, 0.03, MAT.oak, 0, 0.42, 0, top);
    M.rbox(1.18, 0.03, 0.6, 0.02, MAT.oak, 0, 0.14, 0, top);
    P.legs = [];
    [[-0.58, -0.3], [0.58, -0.3], [-0.58, 0.3], [0.58, 0.3]].forEach(([x, z]) => P.legs.push(M.cyl(0.022, 0.014, 0.4, MAT.black, x, 0.2, z, top, 8)));
    M.box(0.25, 0.04, 0.18, M.mat('#c8693f', 0.8), 0.35, 0.175, 0.05, top); // книги снизу
    M.box(0.22, 0.03, 0.16, M.mat('#3c5a55', 0.8), 0.35, 0.21, 0.05, top);
    // MacBook
    const mb = new THREE.Group(); mb.position.set(-0.3, 0.45, 0.05); mb.rotation.y = 0.25; top.add(mb); P.mb = mb;
    M.rbox(0.36, 0.016, 0.25, 0.01, M.mat('#b8bcc2', 0.3, 0.8), 0, 0.008, 0, mb);
    M.box(0.3, 0.002, 0.12, MAT.black, 0, 0.017, -0.03, mb);
    const lid = new THREE.Group(); lid.position.set(0, 0.016, -0.125); mb.add(lid); P.lid = lid;
    M.rbox(0.36, 0.25, 0.01, 0.01, M.mat('#b8bcc2', 0.3, 0.8), 0, 0.125, 0, lid);
    P.lidScreen = plane(0.33, 0.21, new THREE.MeshBasicMaterial({ map: T.laptop() }), 0, 0.125, 0.006, lid);
    lid.rotation.x = -0.32;
    // Сервиз
    const por = new THREE.MeshStandardMaterial({ map: T.porcelain(), roughness: 0.25 });
    const pot = new THREE.Group(); pot.position.set(0.25, 0.445, -0.12); top.add(pot); P.china.push(pot);
    const body = M.sph(0.09, por, 0, 0.08, 0, pot); body.scale.y = 0.85;
    const sp = M.cyl(0.012, 0.022, 0.12, MAT.porcelain, 0.1, 0.1, 0, pot, 8); sp.rotation.z = -0.9;
    M.tor(0.045, 0.01, MAT.porcelain, -0.09, 0.09, 0, pot).rotation.y = 0;
    M.sph(0.018, MAT.porcelain, 0, 0.16, 0, pot, 8, 6);
    [[0.48, 0.1], [0.12, 0.2]].forEach(([x, z]) => {
      const cup = new THREE.Group(); cup.position.set(x, 0.445, z); top.add(cup); P.china.push(cup);
      M.cyl(0.07, 0.07, 0.01, por, 0, 0.005, 0, cup, 18);
      M.cyl(0.045, 0.035, 0.06, por, 0, 0.04, 0, cup, 16);
      M.tor(0.018, 0.005, MAT.porcelain, 0.05, 0.045, 0, cup);
      M.cyl(0.04, 0.04, 0.003, M.mat('#6b3b1f', 0.2), 0, 0.068, 0, cup, 14);
    });
    const plate = new THREE.Group(); plate.position.set(-0.05, 0.445, 0.24); top.add(plate); P.china.push(plate);
    M.cyl(0.11, 0.09, 0.015, por, 0, 0.008, 0, plate, 20);
    for (let i = 0; i < 4; i++) M.cyl(0.025, 0.025, 0.012, M.mat('#c99a5b', 0.8), Math.cos(i * 1.6) * 0.05, 0.022, Math.sin(i * 1.6) * 0.05, plate, 10);
    return {
      group: g, parts: P, size: [1.3, 0.72, 0.45], brokenTop: 0.3, focus: [0, 0.5, 0],
      breakFx(fx) {
        P.china.forEach(c => fx.throwPart(c, (Math.random() - 0.5) * 4, 3 + Math.random() * 2, (Math.random() - 0.5) * 4, 10));
        crackOverlay(0.33, 0.21, 0, 0.125, 0.008, P.lid, 0.6, 0.4);
        P.lidScreen.material.color.set('#556070');
        fx.tween(0.3, t => { P.lid.rotation.x = -0.32 - 1.1 * t; top.rotation.z = -0.09 * t; P.legs[1].scale.y = 1 - 0.5 * t; });
        fx.debris(lw(g, 0.2, 0.5, 0), '#f6f4ee', 24, 3.5);
        fx.debris(lw(g, 0.2, 0.5, 0), '#2d4f9e', 8, 3);
        fx.sparkSource(lw(mb, 0, 0.1, 0), 3);
      }
    };
  };

  // 4. Фикус в кашпо
  B.ficus = function () {
    const g = new THREE.Group(); const P = {};
    const tilt = new THREE.Group(); tilt.position.set(0.32, 0, 0); g.add(tilt); P.tilt = tilt;
    const inner = new THREE.Group(); inner.position.set(-0.32, 0, 0); tilt.add(inner);
    M.cyl(0.32, 0.24, 0.55, MAT.terracotta, 0, 0.275, 0, inner, 22);
    M.tor(0.31, 0.03, M.mat('#b25c31', 0.8), 0, 0.55, 0, inner).rotation.x = Math.PI / 2;
    const soil = M.cyl(0.29, 0.29, 0.02, MAT.soil, 0, 0.53, 0, inner, 20);
    M.box(0.05, 0.01, 0.6, M.mat('#a24f28', 0.8), 0, 0.2, 0.0, inner).visible = false;
    const t1 = M.cyl(0.035, 0.05, 0.9, MAT.bark, 0, 0.98, 0, inner, 8); t1.rotation.z = 0.1;
    const t2 = M.cyl(0.025, 0.035, 0.6, MAT.bark, 0.1, 1.5, 0.05, inner, 8); t2.rotation.z = -0.3;
    const t3 = M.cyl(0.02, 0.03, 0.5, MAT.bark, -0.12, 1.4, -0.05, inner, 8); t3.rotation.z = 0.5;
    P.leaves = [];
    const blobs = [[0, 1.85, 0, 0.36], [0.28, 1.65, 0.1, 0.3], [-0.3, 1.6, -0.08, 0.3], [0.1, 1.45, -0.25, 0.26], [-0.12, 1.5, 0.26, 0.28], [0.22, 2.0, -0.1, 0.22], [-0.2, 1.95, 0.12, 0.22], [0, 1.25, 0.05, 0.2]];
    blobs.forEach(([x, y, z, r], i) => {
      const b = mesh(new THREE.IcosahedronGeometry(r, 1), MAT.leaf[i % 4], x, y, z, inner);
      b.material.flatShading = true; b.scale.y = 0.8; P.leaves.push(b);
    });
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, y = 1.3 + (i % 5) * 0.16;
      const lf = M.sph(0.09, MAT.leaf[(i + 1) % 4], Math.cos(a) * 0.38, y, Math.sin(a) * 0.38, inner, 8, 6);
      lf.scale.set(1, 0.25, 0.55); lf.rotation.y = -a; lf.rotation.z = 0.4;
      P.leaves.push(lf);
    }
    return {
      group: g, parts: P, size: [0.7, 0.7, 2.2], brokenTop: 0.5, focus: [0, 0.8, 0],
      breakFx(fx) {
        fx.tween(0.7, t => { tilt.rotation.z = -Math.PI / 2 * 0.92 * t; }, 'bounce');
        const wp = lw(g, 0.9, 0, 0);
        fx.decal('soil', wp.x, wp.z, 1.3, Math.random() * 6);
        fx.debris(lw(g, 0.4, 0.5, 0), '#3b2a1d', 30, 2.5);
        for (let i = 0; i < 4; i++) fx.throwPart(P.leaves[8 + i], (Math.random() - 0.5) * 3, 2, (Math.random() - 0.5) * 3, 6);
      }
    };
  };

  // 5. Стеллаж с книгами и вазами
  B.shelf = function () {
    const g = new THREE.Group(); const P = { books: [], vases: [] };
    const fr = new THREE.Group(); g.add(fr); P.frame = fr;
    M.box(0.04, 2.1, 0.38, MAT.walnut, -0.8, 1.05, 0, fr); M.box(0.04, 2.1, 0.38, MAT.walnut, 0.8, 1.05, 0, fr);
    M.box(1.6, 2.1, 0.02, M.mat('#5c3e28', 0.8), 0, 1.05, -0.18, fr);
    const shelves = [];
    for (let i = 0; i < 5; i++) shelves.push(M.box(1.58, 0.035, 0.36, MAT.walnut, 0, 0.05 + i * 0.5, 0, fr));
    P.shelves = shelves;
    const bookCols = ['#c8693f', '#3c5a55', '#d9a441', '#17191C', '#EF3124', '#8e9aaf', '#f1e7d5', '#5a3d6b', '#2d4f9e'];
    const vaseTex = (() => {
      const c = T.cv(256, 256), x = c.getContext('2d'); x.fillStyle = '#f5f4f0'; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = '#1f3f8f'; x.lineWidth = 5;
      for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(20 + i * 44, 128, 18, 0, 7); x.stroke(); x.beginPath(); x.moveTo(i * 44, 90); x.bezierCurveTo(i * 44 + 15, 60, i * 44 + 30, 120, i * 44 + 44, 90); x.stroke(); }
      x.fillStyle = '#1f3f8f'; x.fillRect(0, 20, 256, 10); x.fillRect(0, 220, 256, 10);
      return T.tex(c, 1, 1);
    })();
    const vaseMat = new THREE.MeshStandardMaterial({ map: vaseTex, roughness: 0.2 });
    const vaseGeo = new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.09, 0.05], [0.11, 0.14], [0.09, 0.22], [0.045, 0.27], [0.04, 0.31], [0.06, 0.33]].map(p => new THREE.Vector2(p[0], p[1])), 22);
    for (let s = 0; s < 4; s++) {
      let x = -0.74; const y = 0.07 + s * 0.5;
      const vaseAt = s === 1 ? 0.35 : s === 3 ? -0.45 : 99;
      while (x < 0.72) {
        if (Math.abs(x - vaseAt) < 0.15) { x += 0.3; continue; }
        const w = 0.035 + Math.random() * 0.03, h = 0.26 + Math.random() * 0.14;
        const b = M.box(w, h, 0.24, M.mat(bookCols[(Math.random() * bookCols.length) | 0], 0.8), x + w / 2, y + h / 2, 0.02, g);
        if (Math.random() < 0.1) b.rotation.z = 0.2;
        P.books.push(b); x += w + 0.004;
      }
      if (vaseAt < 9) { const v = mesh(vaseGeo, vaseMat, vaseAt, y, 0.02, g); P.vases.push(v); }
    }
    const v3 = mesh(vaseGeo, vaseMat, 0.4, 2.07, 0.02, g); v3.scale.set(1.3, 1.3, 1.3); P.vases.push(v3);
    const v4 = mesh(vaseGeo, vaseMat, -0.3, 2.07, 0.02, g); P.vases.push(v4);
    return {
      group: g, parts: P, size: [1.6, 0.4, 3], brokenTop: 3, focus: [0, 1.2, 0.1],
      breakFx(fx) {
        P.vases.forEach(v => { const p = lw(v, 0, 0.15, 0); v.visible = false; fx.debris(p, '#f5f4f0', 12, 3); fx.debris(p, '#1f3f8f', 6, 3); });
        P.books.forEach((b, i) => { if (i % 3 === 0) fx.throwPart(b, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, 1.5 + Math.random() * 2, 8); });
        fx.tween(0.5, t => { fr.rotation.z = 0.05 * t; shelves[3].rotation.z = -0.25 * t; shelves[3].position.y = 1.55 - 0.08 * t; });
      }
    };
  };

  // 6. Скрытая магистраль отопления (на стене, лицом +z)
  B.pipe = function () {
    const g = new THREE.Group(); const P = {};
    const dash = (() => { const c = T.cv(128, 512), x = c.getContext('2d'); x.strokeStyle = 'rgba(239,49,36,0.55)'; x.setLineDash([18, 14]); x.lineWidth = 6; x.strokeRect(44, 6, 40, 500); return new THREE.CanvasTexture(c); })();
    P.outline = plane(0.32, 2.8, new THREE.MeshBasicMaterial({ map: dash, transparent: true, depthWrite: false }), 0, 1.45, 0.012, g);
    const st = T.textPlate(['НЕ СВЕРЛИТЬ!', 'ОТОПЛЕНИЕ'], '#ffd23f', '#17191C', 256, 128, '800 30px Manrope, sans-serif');
    P.sticker = plane(0.36, 0.18, new THREE.MeshStandardMaterial({ map: st, roughness: 0.6 }), 0.35, 1.35, 0.014, g);
    P.sticker.rotation.z = -0.08;
    // выступ в стене
    M.box(0.2, 2.9, 0.03, M.mat('#a3a48d', 0.9), 0, 1.45, 0.005, g).castShadow = false;
    return {
      group: g, parts: P, size: [0, 0, 0], brokenTop: 0, focus: [0, 1.2, 0.15],
      breakFx(fx) {
        const hole = plane(0.6, 0.6, new THREE.MeshBasicMaterial({ map: T.decal('hole'), transparent: true, depthWrite: false }), 0, 1.1, 0.02, g);
        M.cyl(0.05, 0.05, 0.5, MAT.copper, 0, 1.1, 0.0, g, 12);
        const stub = M.cyl(0.05, 0.05, 0.18, MAT.copper, 0, 1.1, 0.08, g, 12); stub.rotation.x = Math.PI / 2;
        P.sticker.rotation.z = -0.6; P.sticker.position.y = 1.1;
        fx.debris(lw(g, 0, 1.1, 0.2), '#e7e1d4', 22, 3);
      },
      waterJet: { local: [0, 1.1, 0.15], dir: [0, 0.25, 1], speed: 5.5, spread: 0.15 }
    };
  };

  // 7. Чугунный радиатор
  B.radiator = function () {
    const g = new THREE.Group(); const P = { secs: [] };
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Group(); s.position.set(-0.45 + i * 0.1, 0, 0); g.add(s); P.secs.push(s);
      M.rbox(0.085, 0.56, 0.12, 0.035, MAT.radiator, 0, 0.42, 0, s);
      M.cyl(0.035, 0.035, 0.1, MAT.radiator, 0, 0.68, 0, s, 10).rotation.z = Math.PI / 2;
      M.cyl(0.035, 0.035, 0.1, MAT.radiator, 0, 0.16, 0, s, 10).rotation.z = Math.PI / 2;
    }
    M.cyl(0.02, 0.02, 0.14, MAT.galv, -0.58, 0.07, 0, g, 8); M.cyl(0.02, 0.02, 0.14, MAT.galv, 0.58, 0.07, 0, g, 8);
    M.cyl(0.02, 0.02, 0.1, MAT.galv, -0.53, 0.16, 0, g, 8).rotation.z = Math.PI / 2;
    P.valve = M.cyl(0.04, 0.04, 0.04, MAT.red, -0.58, 0.72, 0, g, 12);
    M.cyl(0.02, 0.02, 0.1, MAT.galv, -0.53, 0.68, 0, g, 8).rotation.z = Math.PI / 2;
    return {
      group: g, parts: P, size: [1.2, 0.25, 0.75], brokenTop: 0.75, focus: [0, 0.45, 0.1],
      breakFx(fx) {
        const s = P.secs[6];
        fx.tween(0.25, t => { s.rotation.z = 0.35 * t; s.rotation.x = 0.2 * t; s.position.z = 0.08 * t; });
        fx.throwPart(P.valve, -1, 3, 2, 10);
        fx.steam(lw(g, 0.15, 0.6, 0.1), 14);
        fx.debris(lw(g, 0.15, 0.5, 0.1), '#ece7dc', 10, 2.5);
      },
      waterJet: { local: [0.15, 0.55, 0.1], dir: [0.3, 0.6, 1], speed: 3.5, spread: 0.3 }
    };
  };

  // 8. Бирюзовый кухонный гарнитур (длина 4.8 по x)
  B.kitchen = function () {
    const g = new THREE.Group(); const P = { doors: [] };
    M.box(4.8, 0.08, 0.56, MAT.black, 0, 0.04, 0, g);
    M.box(4.8, 0.78, 0.58, M.mat('#e8e4dc', 0.6), 0, 0.47, -0.01, g);
    for (let i = 0; i < 6; i++) {
      const x = -2.0 + i * 0.8;
      if (i === 2) continue; // духовка
      const hinge = new THREE.Group(); hinge.position.set(x - 0.39, 0.47, 0.29); g.add(hinge);
      M.rbox(0.78, 0.74, 0.03, 0.015, MAT.teal, 0.39, 0, 0, hinge);
      M.box(0.02, 0.18, 0.02, MAT.chrome, 0.7, 0.18, 0.03, hinge);
      P.doors.push(hinge);
    }
    // духовка + варочная
    M.box(0.78, 0.74, 0.03, M.mat('#111215', 0.15, 0.3), -0.4, 0.47, 0.295, g);
    M.box(0.6, 0.36, 0.005, M.mat('#2a1c14', 0.1, 0.2, { emissive: '#ff6a2a', emissiveIntensity: 0.25 }), -0.4, 0.42, 0.312, g);
    M.box(0.6, 0.02, 0.03, MAT.chrome, -0.4, 0.74, 0.32, g);
    for (let k = 0; k < 4; k++) M.cyl(0.02, 0.02, 0.03, MAT.chrome, -0.62 + k * 0.15, 0.8, 0.3, g, 10).rotation.x = Math.PI / 2;
    M.rbox(4.9, 0.045, 0.64, 0.01, MAT.marble, 0, 0.885, 0.02, g);
    M.box(0.66, 0.01, 0.5, M.mat('#0c0d10', 0.1, 0.3), -0.4, 0.913, 0.02, g);
    P.rings = [];
    [[-0.55, -0.1], [-0.25, -0.1], [-0.55, 0.13], [-0.25, 0.13]].forEach(([x, z]) => { const r = M.tor(0.07, 0.006, M.mat('#444', 0.4, 0, { emissive: '#ff3300', emissiveIntensity: 0 }), x, 0.92, z, g); r.rotation.x = Math.PI / 2; P.rings.push(r); });
    // мойка
    M.box(0.6, 0.02, 0.42, M.mat('#8e959c', 0.25, 0.8), 1.2, 0.905, 0.02, g);
    M.box(0.52, 0.01, 0.34, M.mat('#5f656b', 0.3, 0.6), 1.2, 0.912, 0.02, g);
    const fau = new THREE.Group(); fau.position.set(1.2, 0.91, -0.2); g.add(fau); P.faucet = fau;
    M.cyl(0.025, 0.03, 0.3, MAT.chrome, 0, 0.15, 0, fau, 10);
    const arc = M.tor(0.1, 0.018, MAT.chrome, 0, 0.3, 0.1, fau, Math.PI); arc.rotation.y = Math.PI / 2;
    M.box(0.015, 0.015, 0.1, MAT.chrome, 0.04, 0.2, 0, fau);
    // верхние шкафы
    for (let i = 0; i < 5; i++) {
      if (i === 1) continue;
      const x = -2.0 + i * 0.9 + (i > 1 ? 0.15 : 0);
      M.box(0.86, 0.66, 0.34, M.mat('#e8e4dc', 0.6), x, 1.85, -0.13, g);
      const h = new THREE.Group(); h.position.set(x - 0.43, 1.85, 0.05); g.add(h);
      M.rbox(0.85, 0.64, 0.025, 0.012, MAT.tealDark, 0.425, 0, 0, h);
      M.box(0.15, 0.015, 0.015, MAT.chrome, 0.425, -0.27, 0.02, h);
      P.doors.push(h);
    }
    // вытяжка
    M.box(0.7, 0.12, 0.5, MAT.steel, -0.4, 1.6, -0.05, g);
    M.box(0.26, 0.6, 0.24, MAT.steel, -0.4, 1.98, -0.17, g);
    // декор на столешнице
    M.cyl(0.06, 0.06, 0.18, M.mat('#EF3124', 0.4), 2.0, 1.0, -0.15, g, 14);
    M.cyl(0.08, 0.06, 0.12, M.mat('#fbf9f5', 0.3), 1.8, 0.97, -0.12, g, 14);
    return {
      group: g, parts: P, size: [4.9, 0.66, 0.95], brokenTop: 0.95, focus: [0, 0.9, 0.3],
      breakFx(fx) {
        P.doors.forEach((d, i) => { const a = (Math.random() * 0.8 + 0.4) * (i % 2 ? 1 : -1), tz = (Math.random() - 0.5) * 0.3; fx.tween(0.35, t => { d.rotation.y = a * t; d.rotation.z = tz * t; }); });
        fx.throwPart(P.faucet, 0.5, 5, 1.5, 9);
        P.rings.forEach(r => { r.material.emissiveIntensity = 1.2; });
        fx.sparkSource(lw(g, -0.4, 0.95, 0.1), 4);
        fx.debris(lw(g, 0, 0.9, 0.3), '#2fa6a0', 18, 3);
      },
      waterJet: { local: [1.2, 0.95, 0], dir: [0, 1, 0.2], speed: 6, spread: 0.2 }
    };
  };

  // 9. Обеденный стол + медный аппарат «Первач-Люкс»
  B.still = function () {
    const g = new THREE.Group(); const P = { parts: [] };
    M.rbox(1.6, 0.06, 0.9, 0.03, MAT.oak, 0, 0.75, 0, g);
    [[-0.7, -0.36], [0.7, -0.36], [-0.7, 0.36], [0.7, 0.36]].forEach(([x, z]) => M.cyl(0.03, 0.025, 0.72, MAT.black, x, 0.36, z, g, 10));
    M.box(1.5, 0.004, 0.5, M.mat('#f3eee4', 1), 0, 0.782, 0, g).castShadow = false;
    const app = new THREE.Group(); app.position.set(0, 0.78, 0); g.add(app); P.app = app;
    M.cyl(0.18, 0.2, 0.05, MAT.black, -0.3, 0.025, 0, app, 22);
    P.coil = M.cyl(0.08, 0.08, 0.004, M.mat('#550', 0.5, 0, { emissive: '#ff4400', emissiveIntensity: 0.6 }), -0.3, 0.052, 0, app, 16);
    const tank = new THREE.Group(); tank.position.set(-0.3, 0.06, 0); app.add(tank); P.tank = tank;
    M.cyl(0.17, 0.17, 0.32, MAT.copper, 0, 0.16, 0, tank, 24);
    const dome = M.sph(0.17, MAT.copper, 0, 0.32, 0, tank, 24, 10); dome.geometry = new THREE.SphereGeometry(0.17, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    M.tor(0.17, 0.012, MAT.copper, 0, 0.32, 0, tank).rotation.x = Math.PI / 2;
    M.cyl(0.02, 0.02, 0.18, MAT.copper, 0, 0.55, 0, tank, 8);
    // манометр
    const gauge = new THREE.Group(); gauge.position.set(0.1, 0.4, 0); tank.add(gauge); P.gauge = gauge;
    M.cyl(0.012, 0.012, 0.1, MAT.chrome, -0.05, 0, 0, gauge, 8).rotation.z = Math.PI / 2;
    M.cyl(0.06, 0.06, 0.03, MAT.chrome, 0, 0.04, 0, gauge, 18).rotation.x = Math.PI / 2;
    const face = plane(0.1, 0.1, new THREE.MeshBasicMaterial({ map: T.gauge() }), 0, 0.04, 0.017, gauge);
    const needle = new THREE.Group(); needle.position.set(0, 0.04, 0.02); gauge.add(needle); P.needle = needle;
    M.box(0.004, 0.04, 0.002, MAT.red, 0, 0.018, 0, needle);
    needle.rotation.z = 2.0;
    // трубка и змеевик в охладителе
    const tube = M.cyl(0.012, 0.012, 0.42, MAT.copper, -0.1, 0.62 + 0.06, 0, app, 8); tube.rotation.z = -1.1;
    P.parts.push(tube);
    const cool = new THREE.Group(); cool.position.set(0.18, 0, 0); app.add(cool); P.cool = cool;
    M.cyl(0.12, 0.12, 0.42, MAT.glass, 0, 0.21, 0, cool, 20);
    M.spring(0.075, 0.36, 7, 0.009, MAT.copper, 0, 0.03, 0, cool);
    // бутыль
    const bottle = mesh(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.18], [0.03, 0.25], [0.022, 0.32], [0.026, 0.33]].map(p => new THREE.Vector2(p[0], p[1])), 18), new THREE.MeshStandardMaterial({ color: '#cde9d8', transparent: true, opacity: 0.55, roughness: 0.05 }), 0.45, 0, 0.05, app);
    P.parts.push(bottle);
    plane(0.1, 0.07, new THREE.MeshStandardMaterial({ map: T.textPlate(['ПЕРВАЧ', 'ЛЮКС'], '#f2e3c2', '#8f2b1f', 128, 96, '800 26px Manrope, sans-serif') }), 0.45, 0.1, 0.127, app);
    // огурцы на тарелке
    M.cyl(0.12, 0.1, 0.015, MAT.porcelain, 0.5, 0.008, -0.25, app, 18);
    for (let i = 0; i < 3; i++) { const c = M.sph(0.03, M.mat('#3f7a2a', 0.7), 0.47 + i * 0.03, 0.03, -0.25 + (i - 1) * 0.03, app, 8, 6); c.scale.set(2, 0.8, 0.8); c.rotation.y = i; }
    return {
      group: g, parts: P, size: [1.6, 0.9, 0.8], brokenTop: 0.8, focus: [0, 1.0, 0],
      breakFx(fx) {
        fx.throwPart(tank, (Math.random() - 0.5) * 2, 8, (Math.random() - 0.5) * 2, 12);
        P.parts.forEach(p => fx.throwPart(p, (Math.random() - 0.5) * 6, 4 + Math.random() * 2, (Math.random() - 0.5) * 6, 10));
        fx.throwPart(cool, 2, 3, -1, 6);
        const wp = lw(g, 0, 0.9, 0);
        fx.ring(wp, 3.2, '#ffffff');
        fx.steam(wp, 40);
        fx.decal('scorch', wp.x, wp.z, 2.4, 0);
        fx.debris(wp, '#c77b45', 22, 5);
        fx.shake(0.6);
      },
      waterJet: { local: [-0.3, 0.95, 0], dir: [0, 1, 0], speed: 3, spread: 0.6, steam: true }
    };
  };

  // 10. Холодильник BORK
  B.fridge = function () {
    const g = new THREE.Group(); const P = {};
    M.rbox(0.8, 2.0, 0.66, 0.04, M.mat('#c9ced3', 0.35, 0.6), 0, 1.0, -0.04, g);
    // интерьер (виден после поломки)
    M.box(0.7, 1.15, 0.02, MAT.white, 0, 1.38, 0.29, g).visible = true;
    P.items = [];
    const itemCols = ['#EF3124', '#ffd23f', '#9ece6a', '#f6f4ee', '#c8693f'];
    for (let i = 0; i < 7; i++) P.items.push(M.box(0.12, 0.14, 0.1, M.mat(itemCols[i % 5], 0.6), -0.25 + (i % 4) * 0.16, 1.0 + ((i / 4) | 0) * 0.4, 0.22, g));
    for (let s = 0; s < 3; s++) M.box(0.7, 0.01, 0.5, MAT.glass, 0, 0.92 + s * 0.4, 0.05, g);
    const top = new THREE.Group(); top.position.set(-0.4, 1.38, 0.3); g.add(top); P.top = top;
    M.rbox(0.8, 1.22, 0.06, 0.03, M.mat('#b9bec4', 0.25, 0.75), 0.4, 0, 0.03, top);
    M.rbox(0.025, 0.7, 0.04, 0.012, M.mat('#2a2d33', 0.3, 0.6), 0.74, -0.15, 0.08, top);
    P.disp = plane(0.16, 0.24, new THREE.MeshBasicMaterial({ map: T.fridgeDisplay() }), 0.4, 0.28, 0.062, top);
    const bot = new THREE.Group(); bot.position.set(-0.4, 0.38, 0.3); g.add(bot); P.bot = bot;
    M.rbox(0.8, 0.72, 0.06, 0.03, M.mat('#b9bec4', 0.25, 0.75), 0.4, 0, 0.03, bot);
    M.rbox(0.4, 0.025, 0.04, 0.012, M.mat('#2a2d33', 0.3, 0.6), 0.4, 0.3, 0.08, bot);
    M.box(0.12, 0.03, 0.005, M.mat('#17191C', 0.5), 0.4, 0.66, 0.063, top);
    // магнит Альфы
    plane(0.08, 0.08, new THREE.MeshBasicMaterial({ map: T.logo(128) }), 0.18, -0.25, 0.062, top);
    return {
      group: g, parts: P, size: [0.82, 0.74, 2.1], brokenTop: 2.1, focus: [0, 1.2, 0.35],
      breakFx(fx) {
        fx.tween(0.45, t => { top.rotation.y = -1.6 * t; top.rotation.z = 0.08 * t; bot.rotation.y = -0.7 * t; bot.position.y = 0.38 - 0.05 * t; });
        crackOverlay(0.16, 0.24, 0.4, 0.28, 0.064, top, 0.5, 0.5);
        P.disp.material.map = T.glitch(); P.disp.material.needsUpdate = true;
        setTimeout(() => P.items.forEach(it => fx.throwPart(it, (Math.random() - 0.3) * 3, 2 + Math.random() * 2, 2 + Math.random() * 2, 8)), 200);
        fx.sparkSource(lw(g, 0.2, 1.9, 0.35), 4);
        fx.puffs(lw(g, 0, 1.2, 0.4), '#e6f6ff', 14);
      }
    };
  };

  // 11. Чугунная ванна с тропическим душем (длина по x)
  B.tub = function () {
    const g = new THREE.Group(); const P = {};
    const body = new THREE.Group(); g.add(body); P.body = body;
    M.rbox(1.7, 0.5, 0.8, 0.22, MAT.graphite, 0, 0.42, 0, body);
    M.rbox(1.74, 0.06, 0.84, 0.2, MAT.porcelain, 0, 0.68, 0, body);
    const inner = M.rbox(1.5, 0.04, 0.6, 0.2, M.mat('#e9eef0', 0.15), 0, 0.68, 0, body);
    const w = M.rbox(1.46, 0.02, 0.56, 0.2, new THREE.MeshStandardMaterial({ color: '#8ecae6', transparent: true, opacity: 0.7, roughness: 0.05 }), 0, 0.69, 0, body);
    // пена
    for (let i = 0; i < 8; i++) M.sph(0.07 + Math.random() * 0.05, MAT.foam, -0.5 + Math.random() * 1, 0.7, (Math.random() - 0.5) * 0.4, body, 10, 8);
    P.feet = [];
    [[-0.65, -0.28], [0.65, -0.28], [-0.65, 0.28], [0.65, 0.28]].forEach(([x, z]) => {
      const f = new THREE.Group(); f.position.set(x, 0, z); body.add(f); P.feet.push(f);
      M.cyl(0.03, 0.06, 0.16, MAT.gold, 0, 0.1, 0, f, 10); M.sph(0.05, MAT.gold, 0, 0.04, 0, f, 10, 8);
    });
    // утка
    const duck = new THREE.Group(); duck.position.set(0.3, 0.73, 0.1); body.add(duck); P.duck = duck;
    M.sph(0.05, M.mat('#ffd23f', 0.5), 0, 0, 0, duck, 10, 8); M.sph(0.032, M.mat('#ffd23f', 0.5), 0.04, 0.05, 0, duck, 10, 8);
    M.box(0.03, 0.01, 0.02, M.mat('#ff7a1a', 0.5), 0.075, 0.05, 0, duck);
    // душ
    const sh = new THREE.Group(); sh.position.set(-0.95, 0, -0.3); g.add(sh); P.shower = sh;
    M.cyl(0.02, 0.02, 2.2, MAT.chrome, 0, 1.1, 0, sh, 10);
    const arm = M.cyl(0.015, 0.015, 0.45, MAT.chrome, 0.22, 2.18, 0, sh, 8); arm.rotation.z = Math.PI / 2;
    const head = new THREE.Group(); head.position.set(0.45, 2.14, 0); sh.add(head); P.head = head;
    M.cyl(0.16, 0.16, 0.025, MAT.chrome, 0, 0, 0, head, 24);
    M.cyl(0.14, 0.14, 0.004, M.mat('#596169', 0.4, 0.6), 0, -0.014, 0, head, 24);
    M.box(0.12, 0.08, 0.06, MAT.chrome, 0, 1.05, 0.04, sh);
    M.cyl(0.025, 0.025, 0.06, MAT.chrome, -0.05, 1.05, 0.08, sh, 10).rotation.x = Math.PI / 2;
    return {
      group: g, parts: P, size: [1.9, 0.9, 0.75], brokenTop: 0.75, focus: [0, 0.8, 0],
      breakFx(fx) {
        fx.throwPart(head, 1, 5, 1.5, 12);
        fx.throwPart(duck, 0.5, 4, 2, 8);
        fx.tween(0.3, t => { body.rotation.z = 0.08 * t; body.position.y = -0.04 * t; P.feet[3].scale.y = 1 - 0.7 * t; });
        fx.debris(lw(g, 0, 0.7, 0), '#f8f7f3', 12, 3);
      },
      waterJet: { local: [-0.5, 2.2, -0.3], dir: [0.4, 1, 0.3], speed: 4.5, spread: 0.35 }
    };
  };

  // 12. Унитаз с инсталляцией (лицом +z)
  B.toilet = function () {
    const g = new THREE.Group(); const P = {};
    M.rbox(0.62, 1.2, 0.14, 0.03, M.mat('#f2f2ee', 0.4), 0, 0.6, -0.27, g);
    P.plate = M.rbox(0.24, 0.16, 0.02, 0.02, MAT.chrome, 0, 1.0, -0.19, g);
    M.rbox(0.09, 0.1, 0.01, 0.02, M.mat('#c9ced3', 0.2, 0.9), -0.06, 1.0, -0.175, g);
    M.rbox(0.09, 0.1, 0.01, 0.02, M.mat('#c9ced3', 0.2, 0.9), 0.06, 1.0, -0.175, g);
    const bowl = M.rbox(0.38, 0.3, 0.55, 0.15, MAT.porcelain, 0, 0.38, 0.05, g);
    M.rbox(0.3, 0.02, 0.42, 0.13, M.mat('#c4dde4', 0.1), 0, 0.535, 0.07, g);
    const seat = new THREE.Group(); seat.position.set(0, 0.54, -0.18); g.add(seat); P.seat = seat;
    M.rbox(0.38, 0.03, 0.5, 0.15, M.mat('#fbfbf8', 0.3), 0, 0.015, 0.25, seat);
    const lid = new THREE.Group(); lid.position.set(0, 0.04, 0); seat.add(lid); P.lid = lid;
    M.rbox(0.37, 0.025, 0.48, 0.15, M.mat('#fbfbf8', 0.3), 0, 0.012, 0.24, lid);
    lid.rotation.x = -1.5;
    // ёршик и бумага
    M.cyl(0.05, 0.05, 0.3, M.mat('#17191C', 0.5), 0.45, 0.15, -0.2, g, 12);
    M.cyl(0.006, 0.006, 0.2, MAT.chrome, 0.45, 0.38, -0.2, g, 6);
    M.cyl(0.055, 0.055, 0.1, M.mat('#ffffff', 0.9), -0.42, 0.75, -0.25, g, 14).rotation.z = Math.PI / 2;
    return {
      group: g, parts: P, size: [0.65, 0.85, 1.25], brokenTop: 1.25, focus: [0, 0.6, 0.1],
      breakFx(fx) {
        fx.throwPart(lid, 0, 5, 3, 12);
        fx.throwPart(P.plate, 0, 1, 2, 6);
        crackOverlay(0.5, 0.9, 0, 0.6, -0.195, g, 0.5, 0.4);
        fx.debris(lw(g, 0, 0.5, 0.1), '#f8f7f3', 14, 3);
      },
      waterJet: { local: [0, 0.6, 0.1], dir: [0, 1, 0.3], speed: 5, spread: 0.35 }
    };
  };

  // 13. Стиральная машина + тумба с раковиной и зеркалом (лицом +z)
  B.washer = function () {
    const g = new THREE.Group(); const P = {};
    const wm = new THREE.Group(); wm.position.set(-0.5, 0, 0); g.add(wm); P.wm = wm;
    M.rbox(0.6, 0.85, 0.58, 0.04, M.mat('#f6f6f3', 0.35), 0, 0.425, 0, wm);
    M.box(0.58, 0.12, 0.01, M.mat('#e5e6e3', 0.4), 0, 0.76, 0.29, wm);
    M.cyl(0.035, 0.035, 0.02, MAT.chrome, 0.18, 0.76, 0.3, wm, 14).rotation.x = Math.PI / 2;
    P.wdisp = M.box(0.12, 0.04, 0.005, M.basic('#3fd7ff'), -0.08, 0.76, 0.297, wm);
    const door = new THREE.Group(); door.position.set(0, 0.38, 0.295); wm.add(door); P.door = door;
    M.tor(0.17, 0.03, MAT.chrome, 0, 0, 0, door);
    M.cyl(0.16, 0.16, 0.02, new THREE.MeshStandardMaterial({ color: '#2b4b6b', transparent: true, opacity: 0.75, roughness: 0.05 }), 0, 0, 0, door, 24).rotation.x = Math.PI / 2;
    const drum = new THREE.Group(); drum.position.set(0, 0.38, 0.27); wm.add(drum); P.drum = drum;
    const dt = (() => { const c = T.cv(128, 128), x = c.getContext('2d'); x.fillStyle = '#c9ced3'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#EF3124'; x.fillRect(0, 54, 128, 20); x.fillStyle = '#2d4f9e'; x.fillRect(54, 0, 20, 128); return new THREE.CanvasTexture(c); })();
    const dm = plane(0.3, 0.3, new THREE.MeshStandardMaterial({ map: dt }), 0, 0, 0, drum);
    // тумба с раковиной
    const vt = new THREE.Group(); vt.position.set(0.45, 0, 0); g.add(vt); P.vanity = vt;
    M.rbox(0.8, 0.5, 0.46, 0.03, MAT.oak, 0, 0.55, -0.06, vt);
    M.box(0.76, 0.02, 0.02, MAT.black, 0, 0.55, 0.18, vt);
    M.rbox(0.62, 0.14, 0.42, 0.1, MAT.porcelain, 0, 0.87, -0.06, vt);
    M.rbox(0.5, 0.02, 0.3, 0.08, M.mat('#dfe5e8', 0.1), 0, 0.935, -0.04, vt);
    M.cyl(0.018, 0.02, 0.2, MAT.chrome, 0, 1.03, -0.22, vt, 8);
    M.box(0.02, 0.02, 0.12, MAT.chrome, 0, 1.12, -0.17, vt);
    // зеркало
    const mir = new THREE.Group(); mir.position.set(0.45, 1.6, -0.27); g.add(mir); P.mirror = mir;
    M.rbox(0.66, 0.86, 0.03, 0.08, MAT.black, 0, 0, 0, mir);
    P.glass = plane(0.6, 0.8, new THREE.MeshStandardMaterial({ color: '#cfdde3', roughness: 0.02, metalness: 0.9 }), 0, 0, 0.017, mir);
    M.cyl(0.05, 0.04, 0.12, M.mat('#EF3124', 0.4), 0.3, 1.0, -0.12, vt, 12);
    return {
      group: g, parts: P, size: [1.7, 0.6, 1.0], brokenTop: 1.0, focus: [-0.3, 0.6, 0.3],
      breakFx(fx) {
        fx.throwPart(door, 0.5, 3, 4, 10);
        crackOverlay(0.6, 0.8, 0, 0, 0.02, mir, 0.4, 0.4);
        P.glass.material.color.set('#9fb0b8');
        P.wdisp.material.color.set('#ff2a2a');
        fx.tween(0.3, t => { wm.rotation.y = 0.35 * t; wm.rotation.z = -0.06 * t; wm.position.z = 0.2 * t; });
        fx.puffs(lw(wm, 0, 0.4, 0.4), '#ffffff', 26);
        fx.sparkSource(lw(wm, 0, 0.8, 0.3), 3);
        fx.debris(lw(mir, 0, 0, 0.1), '#cfdde3', 16, 2.5);
      },
      waterJet: { local: [-0.5, 0.38, 0.35], dir: [0, 0.4, 1], speed: 3.5, spread: 0.4 }
    };
  };

  // 14. Главный стояк
  B.riser = function () {
    const g = new THREE.Group(); const P = { wheels: [] };
    M.cyl(0.075, 0.075, 3.0, MAT.galv, 0, 1.5, 0, g, 16);
    M.cyl(0.05, 0.05, 3.0, MAT.galv, 0.22, 1.5, -0.05, g, 14);
    [0.3, 1.2, 2.6].forEach(y => { M.cyl(0.09, 0.09, 0.06, MAT.galv, 0, y, 0, g, 16); M.cyl(0.065, 0.065, 0.05, MAT.galv, 0.22, y, -0.05, g, 14); });
    [[0, 0.95, 0.075], [0.22, 0.95, 0.025]].forEach(([x, y, z], i) => {
      const br = M.cyl(0.035, 0.035, 0.25, MAT.galv, x, y, z + 0.1, g, 10); br.rotation.x = Math.PI / 2;
      M.box(0.08, 0.08, 0.06, MAT.chrome, x, y, z + 0.12, g);
      const w = new THREE.Group(); w.position.set(x, y, z + 0.2); g.add(w); P.wheels.push(w);
      M.tor(0.06, 0.01, MAT.red, 0, 0, 0, w);
      for (let s = 0; s < 3; s++) { const sp = M.box(0.12, 0.012, 0.012, MAT.red, 0, 0, 0, w); sp.rotation.z = s * Math.PI / 3; }
      M.cyl(0.015, 0.015, 0.03, MAT.red, 0, 0, 0, w, 8).rotation.x = Math.PI / 2;
    });
    // счётчики
    [0, 0.22].forEach((x, i) => {
      const mtr = new THREE.Group(); mtr.position.set(x, 0.62, 0.15); g.add(mtr);
      M.cyl(0.05, 0.05, 0.06, i ? MAT.red : M.mat('#2d4f9e', 0.4), 0, 0, 0, mtr, 16).rotation.x = Math.PI / 2;
      plane(0.07, 0.07, new THREE.MeshBasicMaterial({ map: T.gauge() }), 0, 0, 0.031, mtr);
    });
    // табличка
    plane(0.32, 0.16, new THREE.MeshStandardMaterial({ map: T.textPlate(['СТОЯК ХВС/ГВС', 'НЕ ТРОГАТЬ'], '#17191C', '#ffd23f', 256, 128, '800 26px Manrope, sans-serif') }), 0.11, 1.55, 0.06, g);
    return {
      group: g, parts: P, size: [0.5, 0.4, 3], brokenTop: 3, focus: [0.1, 0.95, 0.2],
      breakFx(fx) {
        P.wheels.forEach(w => fx.throwPart(w, (Math.random() - 0.5) * 3, 5, 3, 14));
        fx.debris(lw(g, 0, 0.95, 0.2), '#9aa2a8', 14, 3);
        fx.shake(0.35);
      },
      waterJet: { local: [0.05, 0.95, 0.2], dir: [0.15, 1, 0.25], speed: 8.5, spread: 0.18, big: true }
    };
  };

  M.builders = B;

  // ---------------- РОБОТ-ПЫЛЕСОС ----------------
  M.robot = function () {
    const g = new THREE.Group(); const P = { brushes: [] };
    const body = new THREE.Group(); g.add(body); P.body = body;
    M.cyl(0.33, 0.34, 0.09, M.mat('#f2f2f0', 0.35), 0, 0.065, 0, body, 32);
    M.cyl(0.3, 0.31, 0.02, MAT.graphite, 0, 0.115, 0, body, 32);
    const bump = M.tor(0.335, 0.025, M.mat('#17191C', 0.6), 0, 0.06, 0, body, Math.PI); bump.rotation.x = Math.PI / 2; bump.rotation.z = Math.PI;
    M.cyl(0.08, 0.08, 0.05, M.mat('#3a3e46', 0.4), 0, 0.15, -0.08, body, 18);
    P.lidar = M.cyl(0.06, 0.06, 0.02, MAT.red, 0, 0.18, -0.08, body, 18);
    P.ledMat = new THREE.MeshBasicMaterial({ color: '#45e07a' });
    M.sph(0.025, P.ledMat, 0, 0.13, 0.2, body, 10, 8);
    P.eyeMat = new THREE.MeshBasicMaterial({ color: '#5ce1ff' });
    P.eyes = [M.box(0.06, 0.02, 0.01, P.eyeMat, -0.07, 0.11, 0.3, body), M.box(0.06, 0.02, 0.01, P.eyeMat, 0.07, 0.11, 0.3, body)];
    P.eyes[0].rotation.x = P.eyes[1].rotation.x = -0.9;
    [-1, 1].forEach(s => {
      const br = new THREE.Group(); br.position.set(0.24 * s, 0.02, 0.2); g.add(br); P.brushes.push(br);
      for (let k = 0; k < 3; k++) { const b = M.box(0.18, 0.006, 0.012, M.mat('#EF3124', 0.7), 0.07, 0, 0, br); b.geometry.translate(0, 0, 0); const h = new THREE.Group(); h.rotation.y = k * 2.09; h.add(b); br.add(h); }
    });
    plane(0.22, 0.06, new THREE.MeshBasicMaterial({ map: T.textPlate(['ЧИСТОБОТ-9000'], '#2a2d33', '#fbf9f5', 256, 64, '800 26px Manrope, sans-serif'), transparent: true }), 0, 0.127, 0.12, body).rotation.x = -Math.PI / 2;
    return { group: g, parts: P };
  };

  // ---------------- ДАТЧИК «АльфаСтрахование Умный Дом» ----------------
  M.sensor = function () {
    const g = new THREE.Group(); const P = {};
    const body = new THREE.Group(); g.add(body); P.body = body;
    M.rbox(0.3, 0.3, 0.07, 0.06, M.mat('#fbf9f5', 0.35), 0, 0, 0.035, body);
    plane(0.12, 0.12, new THREE.MeshBasicMaterial({ map: T.logo(128) }), 0, 0.05, 0.072, body);
    P.ledMat = new THREE.MeshBasicMaterial({ color: '#7a1a14' });
    const ring = M.tor(0.13, 0.008, P.ledMat, 0, 0, 0.07, body);
    P.canvas = T.cv(128, 64); P.tex = new THREE.CanvasTexture(P.canvas);
    P.screen = plane(0.16, 0.08, new THREE.MeshBasicMaterial({ map: P.tex }), 0, -0.07, 0.072, body);
    P.draw = function (txt, active) {
      const x = P.canvas.getContext('2d');
      x.fillStyle = active ? '#EF3124' : '#17191C'; x.fillRect(0, 0, 128, 64);
      x.fillStyle = '#fbf9f5'; x.font = '800 34px Unbounded, Manrope, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(txt, 64, 34); P.tex.needsUpdate = true;
    };
    P.draw('OK', false);
    return { group: g, parts: P };
  };

  window.GN.M = M;
})();

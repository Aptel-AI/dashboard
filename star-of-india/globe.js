// Three.js globe for Star of India.
// Exposes window.Globe with:
//   init({canvas, theme, ports}) -> sets up scene (resolves when the map is drawn)
//   setTheme(theme)              -> recolor materials
//   setVoyage(voyage, progress)  -> draw the route + noon dots + ship at t∈[0..1]
//   focusVoyage(voyage)          -> orbit so the voyage is centered
//   focusPort(portKey), pulsePort(portKey)
//   onHover(cb)                  -> cb({kind:'port'|'day', key|day}, x, y) or cb(null)
//   onClick(cb)                  -> cb({kind, key|day})
//   setIdle(bool), setRotation(speed)
//
// The earth is NOT a texture wrapped on a UV sphere. That was the cause of the
// misaligned slices at the poles: each pole is a fan of thin triangles, and
// texture coordinates interpolated across them shear into a sawtooth. Here the
// fragment shader computes latitude/longitude per pixel from the surface
// position, so the poles are as clean as the equator. The map itself is drawn
// with d3-geo, which cuts polygons at the antimeridian and fills Antarctica
// around the pole correctly.
(function () {
  const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json';
  const THEMES = {
    chart:     { sea: '#0d2a44', land: '#d8c89f', edge: '#6b5a3a', grat: '#ead9b4', gratA: 0.10,
                 halo: '#6f9fd6', port: '#ffd47a', dot: '#ffd47a', route: '#e7a14c', ship: '#f6c878' },
    parchment: { sea: '#ead9a8', land: '#b89a5e', edge: '#3a2812', grat: '#3a2812', gratA: 0.14,
                 halo: '#8c6a3a', port: '#5a2a0a', dot: '#5a2a0a', route: '#7a3a1a', ship: '#a55a2c' },
    cosmic:    { sea: '#040818', land: '#1d3a66', edge: '#7fc2ff', grat: '#a8f3e4', gratA: 0.10,
                 halo: '#5fb7c6', port: '#f5e08a', dot: '#a8f3e4', route: '#65d6c3', ship: '#a8f3e4' },
  };
  const TILT_LIMIT = Math.PI / 2;  // the poles render cleanly, so allow looking straight at them
  const CAM_MIN = 1.9, CAM_MAX = 6;

  let PORTS = {};
  let scene, camera, renderer, sphereGroup, sphere, earthMat, haloMat, coast;
  let routeLine, routeShip, dotGroup, portMeshes = {};
  let raycaster, mouse;
  let hoverCb = null, clickCb = null;
  let theme = 'chart';
  let idle = false, baseRotation = 0.0006;
  let dragging = false, dragMoved = 0, lastX = 0, lastY = 0, momentumX = 0, momentumY = 0;
  // Opening distance: the whole globe (with its halo) fills ~60% of the window height.
  const CAM_START = 5.3;
  let camDist = CAM_START, camTarget = CAM_START;
  const pointers = new Map();
  let pinchStart = 0, pinchCam = 0;
  let currentVoyage = null, currentPath = [], lastProgress = 1;
  let landGeo = null;

  function latLonToVec3(lat, lon, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // Great-circle points between two lat/lon points at radius r (hugging the
  // surface — daily fixes are close together, so no arc lift).
  function greatCircle(a, b, r) {
    const v1 = latLonToVec3(a.lat, a.lon, 1);
    const v2 = latLonToVec3(b.lat, b.lon, 1);
    const omega = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1));
    if (omega < 1e-5) return [v1.multiplyScalar(r), v2.multiplyScalar(r)];
    const sinO = Math.sin(omega);
    const n = Math.max(2, Math.ceil(omega * 120));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(v1.clone().multiplyScalar(Math.sin((1 - t) * omega) / sinO)
        .add(v2.clone().multiplyScalar(Math.sin(t * omega) / sinO))
        .multiplyScalar(r));
    }
    return pts;
  }

  function rgb(hex) {
    const c = new THREE.Color();
    c.setStyle(hex, THREE.NoColorSpace || '');
    return new THREE.Vector3(c.r, c.g, c.b);
  }

  // ---------- earth map (equirectangular canvas) ----------
  async function loadLand() {
    if (landGeo) return landGeo;
    const topo = await (await fetch(LAND_URL)).json();
    landGeo = topojson.feature(topo, topo.objects.land);
    return landGeo;
  }

  function drawMap(themeName) {
    const T = THEMES[themeName] || THEMES.chart;
    const w = 4096, h = 2048;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = T.sea;
    ctx.fillRect(0, 0, w, h);
    const proj = d3.geoEquirectangular().scale(w / (2 * Math.PI)).translate([w / 2, h / 2]).precision(0.1);
    const path = d3.geoPath(proj, ctx);
    ctx.beginPath(); path(landGeo);
    ctx.fillStyle = T.land; ctx.fill();
    // A soft edge only; the crisp coastline is vector geometry (see coastline()).
    ctx.strokeStyle = T.edge; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;

    if (themeName === 'parchment') {
      ctx.fillStyle = 'rgba(58,40,18,0.06)';
      for (let i = 0; i < 16000; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  // Coastlines as 3D line segments, so they stay sharp at any zoom.
  function coastline(themeName) {
    const pos = [];
    const addRing = ring => {
      for (let i = 0; i < ring.length - 1; i++) {
        const [p, q] = [ring[i], ring[i + 1]];
        // Skip Natural Earth's cut edges: along the antimeridian and the south pole.
        if (Math.abs(p[0]) > 179.99 && Math.abs(q[0]) > 179.99) continue;
        if (p[1] < -89.9 && q[1] < -89.9) continue;
        const a = latLonToVec3(ring[i][1], ring[i][0], 1.0012);
        const b = latLonToVec3(ring[i + 1][1], ring[i + 1][0], 1.0012);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    };
    landGeo.features.forEach(f => {
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach(poly => poly.forEach(addRing));
    });
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const T = THEMES[themeName] || THEMES.chart;
    return new THREE.LineSegments(geom, new THREE.LineBasicMaterial({
      color: T.edge, transparent: true, opacity: themeName === 'parchment' ? 0.9 : 0.8 }));
  }

  const EARTH_VERT = `
    out vec3 vPos;
    out vec3 vNormalV;
    void main() {
      vPos = position;
      vNormalV = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const EARTH_FRAG = `
    precision highp float;
    in vec3 vPos;
    in vec3 vNormalV;
    uniform sampler2D uMap;
    uniform vec3 uGrat;
    uniform float uGratA;
    uniform vec3 uCosmic;
    uniform float uStars;
    out vec4 fragColor;
    const float PI = 3.141592653589793;

    float gridLine(float d, float w) { return 1.0 - smoothstep(0.0, w * 1.2, d); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec3 p = normalize(vPos);
      float lat = asin(clamp(p.y, -1.0, 1.0));
      float u = atan(p.z, -p.x) / (2.0 * PI);         // same frame as latLonToVec3
      float v = lat / PI + 0.5;

      // Two copies of u, seamed at different longitudes; use whichever is
      // continuous here so mip selection never sees the 1 -> 0 jump.
      float u1 = fract(u);
      float u2 = fract(u + 0.5) - 0.5;
      vec2 g1x = vec2(dFdx(u1), dFdx(v)), g1y = vec2(dFdy(u1), dFdy(v));
      vec2 g2x = vec2(dFdx(u2), dFdx(v)), g2y = vec2(dFdy(u2), dFdy(v));
      bool use1 = max(abs(g1x.x), abs(g1y.x)) <= max(abs(g2x.x), abs(g2y.x));
      vec3 col = use1 ? textureGrad(uMap, vec2(u1, v), g1x, g1y).rgb
                      : textureGrad(uMap, vec2(u2, v), g2x, g2y).rgb;
      float uu = use1 ? u1 : u2;

      // Graticule every 30 degrees, anti-aliased in screen space. Meridians
      // fade out near the poles instead of bunching into a sunburst.
      float latDeg = lat * 180.0 / PI;
      float lonDeg = uu * 360.0;
      float cl = max(cos(lat), 1e-4);
      float dLat = abs(fract(latDeg / 30.0 + 0.5) - 0.5) * 30.0;
      float dLon = abs(fract(lonDeg / 30.0 + 0.5) - 0.5) * 30.0 * cl;
      float wLat = fwidth(latDeg);
      // Width from the chosen copy's own gradient: both copies are smooth, but
      // neighbouring pixels can pick different ones, so dFdx(lonDeg) would jump.
      float wLon = 360.0 * (use1 ? length(vec2(g1x.x, g1y.x)) : length(vec2(g2x.x, g2y.x))) * cl;
      float grat = max(gridLine(dLat, wLat) * (1.0 - smoothstep(80.0, 88.0, abs(latDeg))),
                       gridLine(dLon, wLon) * (1.0 - smoothstep(66.0, 84.0, abs(latDeg))));
      col = mix(col, uGrat, grat * uGratA);

      // Cosmic theme: faint star speckle on the sea, computed not textured.
      if (uStars > 0.5) {
        vec2 cell = floor(vec2(uu * 1600.0, v * 800.0));
        float s = step(0.9985, hash(cell));
        col = mix(col, uCosmic, s * 0.5);
      }

      // Gentle limb shading for depth.
      float ndl = clamp(vNormalV.z, 0.0, 1.0);
      col *= mix(0.78, 1.0, pow(ndl, 0.5));
      fragColor = vec4(col, 1.0);
    }`;

  async function init({ canvas, theme: initialTheme, ports }) {
    PORTS = ports || {};
    theme = initialTheme || 'chart';
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, canvas.clientWidth / canvas.clientHeight, 0.05, 100);
    camera.position.set(0, 0, camDist);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    sphereGroup = new THREE.Group();
    scene.add(sphereGroup);

    await loadLand();
    earthMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      uniforms: {
        uMap: { value: drawMap(theme) },
        uGrat: { value: rgb(THEMES[theme].grat) },
        uGratA: { value: THEMES[theme].gratA },
        uCosmic: { value: rgb('#d8e1f2') },
        uStars: { value: theme === 'cosmic' ? 1 : 0 },
      },
    });
    sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMat);
    sphereGroup.add(sphere);
    coast = coastline(theme);
    sphereGroup.add(coast);

    // atmospheric halo (gradient ring behind globe)
    haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: { uColor: { value: new THREE.Color(THEMES[theme].halo) } },
      vertexShader: `
        varying vec3 vN;
        void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        varying vec3 vN; uniform vec3 uColor;
        void main(){ float i = pow(1.0 - dot(vN, vec3(0.,0.,1.)), 2.5);
          gl_FragColor = vec4(uColor, i*0.6); }`,
    });
    sphereGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 64), haloMat));

    dotGroup = new THREE.Group();
    sphereGroup.add(dotGroup);

    // Port markers
    Object.keys(PORTS).forEach(key => {
      const p = PORTS[key];
      const pos = latLonToVec3(p.lat, p.lon, 1.004);
      const g = new THREE.Group();
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 16, 16),
        new THREE.MeshBasicMaterial({ color: THEMES[theme].port })
      );
      dot.userData.hit = { kind: 'port', key };
      g.add(dot);
      const ringMat = new THREE.MeshBasicMaterial({
        color: THEMES[theme].port, transparent: true, opacity: 0, side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.020, 0.030, 32), ringMat);
      g.add(ring);
      g.position.copy(pos);
      g.lookAt(0, 0, 0);
      g.userData = { dot, ring, ringMat };
      sphereGroup.add(g);
      portMeshes[key] = g;
    });

    bindInput(canvas);
    window.addEventListener('resize', () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    });
    animate();
  }

  // ---------- interaction ----------
  function pick(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    // Include the earth so dots on the far side are occluded, and use a
    // screen-sized tolerance so the small dots are easy to hit.
    const targets = [sphere, ...dotGroup.children, ...Object.values(portMeshes).map(g => g.userData.dot)];
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return null;
    const earthHit = hits.find(h => h.object === sphere);
    const tol = 0.018 * (camDist - 1) / 2.7;
    let best = null, bestD = Infinity;
    targets.slice(1).forEach(o => {
      if (!o.visible) return;
      const wp = o.getWorldPosition(new THREE.Vector3());
      if (earthHit && wp.distanceTo(camera.position) > earthHit.distance + 0.02) return;
      const d = raycaster.ray.distanceToPoint(wp);
      // ports win ties over the day dot at the same spot
      const score = d - (o.userData.hit.kind === 'port' ? 0.004 : 0);
      if (d < tol && score < bestD) { bestD = score; best = o.userData.hit; }
    });
    return best;
  }

  function bindInput(canvas) {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    canvas.addEventListener('pointerdown', e => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y); pinchCam = camTarget;
        dragging = false;
        return;
      }
      dragging = true; dragMoved = 0; lastX = e.clientX; lastY = e.clientY;
      momentumX = momentumY = 0;
    });
    canvas.addEventListener('pointermove', e => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0) camTarget = THREE.MathUtils.clamp(pinchCam * pinchStart / d, CAM_MIN, CAM_MAX);
        return;
      }
      if (dragging) {
        const k = 0.005 * (camDist - 1) / 2.7;
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        sphereGroup.rotation.y += dx * k;
        sphereGroup.rotation.x = THREE.MathUtils.clamp(sphereGroup.rotation.x + dy * k, -TILT_LIMIT, TILT_LIMIT);
        momentumX = dx * k; momentumY = dy * k;
        lastX = e.clientX; lastY = e.clientY;
      }
      if (hoverCb && e.pointerType === 'mouse') {
        const hit = dragging ? null : pick(e, canvas);
        canvas.style.cursor = hit ? 'pointer' : '';
        hoverCb(hit, e.clientX, e.clientY);
      }
    });
    const end = e => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (dragging && dragMoved < 6 && clickCb) {
        const hit = pick(e, canvas);
        if (hit) { momentumX = momentumY = 0; clickCb(hit, e.clientX, e.clientY); }
      }
      dragging = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('pointerleave', () => { if (hoverCb) hoverCb(null); });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      camTarget = THREE.MathUtils.clamp(camTarget * Math.exp(e.deltaY * 0.0015), CAM_MIN, CAM_MAX);
    }, { passive: false });
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!dragging) {
      sphereGroup.rotation.y += momentumX;
      sphereGroup.rotation.x = THREE.MathUtils.clamp(sphereGroup.rotation.x + momentumY, -TILT_LIMIT, TILT_LIMIT);
      momentumX *= 0.94; momentumY *= 0.94;
      if (idle) sphereGroup.rotation.y += baseRotation;
    }
    camDist += (camTarget - camDist) * 0.15;
    camera.position.z = camDist;
    // Keep dots a constant size on screen as the camera zooms.
    const s = (camDist - 1) / 2.7;
    dotGroup.children.forEach(d => d.scale.setScalar(d.userData.base * s));
    Object.values(portMeshes).forEach(g => {
      g.userData.dot.scale.setScalar(s);
      const m = g.userData.ringMat;
      if (m.opacity > 0.01) { m.opacity *= 0.95; g.userData.ring.scale.multiplyScalar(1.04); }
    });
    if (routeShip) routeShip.scale.setScalar(s);
    renderer.render(scene, camera);
  }

  function setTheme(t) {
    theme = THEMES[t] ? t : 'chart';
    const T = THEMES[theme];
    if (!earthMat) return;
    const old = earthMat.uniforms.uMap.value;
    earthMat.uniforms.uMap.value = drawMap(theme);
    old.dispose();
    earthMat.uniforms.uGrat.value = rgb(T.grat);
    earthMat.uniforms.uGratA.value = T.gratA;
    earthMat.uniforms.uStars.value = theme === 'cosmic' ? 1 : 0;
    haloMat.uniforms.uColor.value.set(T.halo);
    coast.material.color.set(T.edge);
    Object.values(portMeshes).forEach(g => {
      g.userData.dot.material.color.set(T.port);
      g.userData.ringMat.color.set(T.port);
    });
    if (currentVoyage) setVoyage(currentVoyage, lastProgress, true);
  }

  // ---------- voyage drawing ----------
  function clearVoyage() {
    if (routeLine) { sphereGroup.remove(routeLine); routeLine.geometry.dispose(); routeLine = null; }
    if (routeShip) { sphereGroup.remove(routeShip); routeShip = null; }
    dotGroup.children.slice().forEach(d => { dotGroup.remove(d); d.geometry.dispose(); d.material.dispose(); });
  }

  // Path points with, for each, the index of the track point it belongs to,
  // so progress can reveal the dots day by day.
  function buildPath(track) {
    const pts = [], owner = [];
    for (let i = 0; i < track.length - 1; i++) {
      const seg = greatCircle(track[i], track[i + 1], 1.003);
      seg.forEach((p, j) => {
        if (j === 0 && i > 0) return;
        pts.push(p); owner.push(j === seg.length - 1 ? i + 1 : i);
      });
    }
    if (track.length === 1) { pts.push(latLonToVec3(track[0].lat, track[0].lon, 1.003)); owner.push(0); }
    return { pts, owner };
  }

  function setVoyage(voyage, progress, rebuild) {
    const changed = voyage !== currentVoyage || rebuild;
    currentVoyage = voyage;
    lastProgress = progress;
    if (!sphereGroup) return;
    if (changed) {
      clearVoyage();
      if (!voyage) return;
      currentPath = buildPath(voyage.track || []);
      const T = THEMES[theme];
      (voyage.track || []).forEach((d, i) => {
        if (d.port) return;  // ports have their own markers
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.0075, 12, 12),
          new THREE.MeshBasicMaterial({
            color: T.dot, transparent: true,
            opacity: d.approx ? 0.35 : d.dr ? 0.5 : 0.95, // by-account days dimmer
          })
        );
        dot.position.copy(latLonToVec3(d.lat, d.lon, 1.004));
        dot.userData = { base: 1, idx: i, hit: { kind: 'day', day: d } };
        dotGroup.add(dot);
      });
      const geom = new THREE.BufferGeometry().setFromPoints(currentPath.pts);
      routeLine = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: T.route, transparent: true, opacity: 0.95 }));
      sphereGroup.add(routeLine);
      routeShip = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 16, 16),
        new THREE.MeshBasicMaterial({ color: T.ship })
      );
      sphereGroup.add(routeShip);
    }
    if (!voyage || !routeLine) return;
    const n = currentPath.pts.length;
    const cut = Math.max(1, Math.round(n * progress));
    routeLine.geometry.setDrawRange(0, cut);
    const reached = currentPath.owner[cut - 1] ?? 0;
    dotGroup.children.forEach(d => { d.visible = d.userData.idx <= reached; });
    routeShip.position.copy(currentPath.pts[cut - 1]).multiplyScalar(1.002);
    routeShip.visible = n > 1;
  }

  function pulsePort(key) {
    const g = portMeshes[key]; if (!g) return;
    g.userData.ring.scale.set(1, 1, 1);
    g.userData.ringMat.opacity = 0.9;
  }

  // Animate the sphere so a (lat, lon) point sits centered facing the camera.
  function focusLatLon(lat, lon, dist) {
    momentumX = momentumY = 0;
    const targetY = -((lon + 180) * Math.PI / 180) + Math.PI / 2;
    const targetX = lat * Math.PI / 180;
    const startY = sphereGroup.rotation.y, startX = sphereGroup.rotation.x;
    let dy = targetY - startY;
    dy = ((dy + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    const dx = THREE.MathUtils.clamp(targetX, -TILT_LIMIT, TILT_LIMIT) - startX;
    if (dist) camTarget = THREE.MathUtils.clamp(dist, CAM_MIN, CAM_MAX);
    const t0 = performance.now(), dur = 1100;
    (function step() {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      sphereGroup.rotation.y = startY + dy * e;
      sphereGroup.rotation.x = startX + dx * e;
      if (t < 1) requestAnimationFrame(step);
    })();
  }

  function focusPort(key) {
    const p = PORTS[key]; if (p) focusLatLon(p.lat, p.lon);
  }

  // Center on the voyage's track and zoom so all of it fits.
  // zoom=false only rotates, keeping the current distance (used on first load).
  function focusVoyage(voyage, zoom = true) {
    const pts = (voyage && voyage.track) || [];
    if (!pts.length) return;
    const vs = pts.map(p => latLonToVec3(p.lat, p.lon, 1));
    const sum = vs.reduce((a, v) => a.add(v), new THREE.Vector3());
    const c = sum.lengthSq() < 1e-6 ? vs[0].clone() : sum.normalize();
    const spread = Math.max(...vs.map(v => Math.acos(THREE.MathUtils.clamp(v.dot(c), -1, 1))));
    const lat = Math.asin(c.y) * 180 / Math.PI;
    const lon = Math.atan2(c.z, -c.x) * 180 / Math.PI - 180;
    // camera distance that fits an angular radius `spread` in view
    const dist = THREE.MathUtils.clamp(1.6 + spread * 2.6, 2.4, 4.6);
    focusLatLon(lat, lon, zoom ? dist : null);
  }

  window.Globe = {
    init, setTheme, setVoyage, focusPort, focusVoyage, pulsePort,
    setIdle: v => { idle = !!v; },
    setRotation: s => { baseRotation = s; },
    onHover: cb => { hoverCb = cb; },
    onClick: cb => { clickCb = cb; },
  };
})();

"use client";

/**
 * Scene3D — lapisan latar hero + projects, three.js murni (tanpa @react-three/fiber).
 *
 * Arah visual (lihat .impeccable/decision/3d-scene-rework-notes.md):
 * - Objek 3D = lapisan ATMOSFER di belakang kartu foto, bukan pusat perhatian.
 * - Material matte, rim light tipis, spotlight lembut dari atas, debu halus.
 * - Scroll = playhead: kamera dolly pelan + idle animation supaya terasa hidup.
 * - Hemat daya: pause saat tak terlihat, watchdog turun kualitas lalu serah ke poster.
 *
 * Aset: public/models/hero-robot.glb — RobotExpressive, CC0 1.0
 * (Tomás Laulhé / quaternius; modifikasi Don McCurdy).
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/hero-robot.glb";

/**
 * Profil kualitas responsif. Dipilih dari lebar viewport + jumlah core (Hero.jsx).
 * Nilai ini menentukan beban GPU, bukan sekadar kosmetik.
 */
const QUALITY = {
  full:   { dpr: 1.25, dust: 700, dist: 5.8, scale: 0.72, dustSpeed: 1.0 },
  medium: { dpr: 1.1, dust: 420, dist: 6.1, scale: 0.70, dustSpeed: 0.9 },
  light:  { dpr: 1.0, dust: 300, dist: 6.6, scale: 0.62, dustSpeed: 0.8 },
};

const PALETTES = {
  light: {
    rim: "#b45309",
    dust: "#a97c25",
    key: "#fff6e2",
    ambient: "#f2ece0",
    fog: "#f7f6f3",
    body: "#cdc8bd",
    accentPart: "#8a6a33",
  },
  dark: {
    rim: "#22c55e",
    dust: "#57c98f",
    key: "#d9ffe9",
    ambient: "#101713",
    fog: "#0a0a0c",
    body: "#7d868e",
    accentPart: "#41916d",
  },
};

const DUST_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSizeMul;
  attribute float aRand;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    pos.y = mod(pos.y - uTime * (0.05 + aRand * 0.09) + 6.0, 12.0) - 6.0;
    pos.x += sin(uTime * 0.14 + aRand * 6.28) * 0.16;
    pos.z += cos(uTime * 0.11 + aRand * 6.28) * 0.12;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((0.6 + aRand * 1.3) * uSizeMul * (10.0 / max(-mv.z, 0.001)), 0.8, 7.0);
    vAlpha = smoothstep(0.0, 1.0, 1.0 - length(pos.xy) / 7.5) * (0.35 + aRand * 0.65);
  }
`

const DUST_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoft;
  varying float vAlpha;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d);
    if (r > 0.5) discard;
    // uSoft kecil = tepi tajam (lapisan dekat), besar = bokeh (lapisan jauh) → DOF palsu
    float glow = smoothstep(0.5, uSoft, r);
    gl_FragColor = vec4(uColor, glow * vAlpha * uOpacity);
  }
`

function readPalette() {
  if (typeof document === "undefined") return PALETTES.dark;
  return document.documentElement.classList.contains("dark") ? PALETTES.dark : PALETTES.light;
}

/** Opasitas lapisan: penuh hero..projects, memudar setelah section proyek berakhir. */
function layerAlpha() {
  const projects = document.getElementById("projects");
  if (!projects) return 1;
  const bottom = window.scrollY + projects.getBoundingClientRect().bottom;
  const center = window.scrollY + window.innerHeight * 0.5;
  const fadeStart = bottom - window.innerHeight * 0.6;
  if (center <= fadeStart) return 1;
  return Math.min(Math.max(1 - (center - fadeStart) / Math.max(bottom - fadeStart, 1), 0), 1);
}

/** Progres scroll dari awal #home sampai akhir #projects (0..1). */
function scrollProgress() {
  const home = document.getElementById("home");
  const projects = document.getElementById("projects");
  if (!home || !projects) return 0;
  const start = window.scrollY + home.getBoundingClientRect().top;
  const end = window.scrollY + projects.getBoundingClientRect().bottom;
  const span = Math.max(end - start, 1);
  const center = window.scrollY + window.innerHeight * 0.5;
  return Math.min(Math.max((center - start) / span, 0), 1);
}

export default function Scene3D({ tier = "full", onLowPerf }) {
  const hostRef = useRef(null);
  const lowPerfRef = useRef(onLowPerf);
  lowPerfRef.current = onLowPerf;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // tanpa WebGL: Hero menampilkan poster
    }

    let palette = readPalette();
    const quality = QUALITY[tier] || QUALITY.full;
    // ?poster=1 → dipakai skrip praterender: watchdog dimatikan agar scene tidak menyerah
    const posterMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("poster");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color(palette.fog), 8, 17);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 0.15, 6.2);

    // --- cahaya: ambient redup, spot dari atas, rim aksen tipis ---
    const ambient = new THREE.AmbientLight(new THREE.Color(palette.ambient), 0.85);
    scene.add(ambient);

    const spot = new THREE.SpotLight(new THREE.Color(palette.key), 22, 24, 0.55, 0.8, 1.3);
    spot.position.set(0.8, 8, 4.2);
    spot.target.position.set(0, 0.6, 0);
    scene.add(spot, spot.target);

    const rim = new THREE.DirectionalLight(new THREE.Color(palette.rim), 2.6);
    rim.position.set(-4.5, 2.4, -5);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(new THREE.Color(palette.key), 0.3);
    fill.position.set(5, -1.5, 3);
    scene.add(fill);

    // --- debu halus dua lapis (dekat tajam, jauh bokeh) = DOF palsu tanpa post-processing ---
    const DUST_COUNT = quality.dust;
    const dustLayers = [];

    const buildDustLayer = ({ count, zMin, zMax, sizeMul, opacity, soft }) => {
      const pos = new Float32Array(count * 3);
      const rand = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 13;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);
        rand[i] = Math.random();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geometry.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
      const material = new THREE.ShaderMaterial({
        vertexShader: DUST_VERTEX,
        fragmentShader: DUST_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(palette.dust) },
          uSizeMul: { value: sizeMul },
          uOpacity: { value: opacity },
          uSoft: { value: soft },
        },
        transparent: true,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      dustLayers.push({ points, geometry, material });
      return points;
    };

    const dustNear = buildDustLayer({
      count: Math.floor(DUST_COUNT * 0.45),
      zMin: -1.5, zMax: 1.2, sizeMul: 1.9, opacity: 0.4, soft: 0.04,
    });
    const dustFar = buildDustLayer({
      count: Math.ceil(DUST_COUNT * 0.55),
      zMin: -7.5, zMax: -2.0, sizeMul: 0.6, opacity: 0.16, soft: 0.5,
    });

    // --- contact shadow: billboard lembut di belakang model (scene tanpa lantai) ---
    const makeSoftDisc = () => {
      const size = 128;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(0.55, "rgba(0,0,0,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };
    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: makeSoftDisc(),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
    shadow.visible = false;
    scene.add(shadow);

    // --- state ---
    const clock = new THREE.Clock();
    let elapsed = 0;
    let model = null;
    let mixer = null;
    let modelHeight = 1;
    let modelWidth = 1;
    let modelScale = 1;
    let placed = false;

    const applyPalette = (next) => {
      palette = next;
      dustLayers.forEach((layer) => layer.material.uniforms.uColor.value.set(next.dust));
      shadowMaterial.opacity = next === PALETTES.dark ? 0.42 : 0.32;
      rim.color.set(next.rim);
      spot.color.set(next.key);
      ambient.color.set(next.ambient);
      fill.color.set(next.key);
      scene.fog.color.set(next.fog);
      if (model) {
        model.traverse((child) => {
          if (child.isMesh && child.material) child.material.color.set(next.body);
          if (child.isMesh && child.material) child.material.emissive?.set("#000000");
        });
      }
    };

    // --- model: dimuat lazy, material dibuat matte ---
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        model = gltf.scene;
        model.traverse((child) => {
          if (!child.isMesh) return;
          const source = Array.isArray(child.material) ? child.material[0] : child.material;
          const tint =
            source?.name === "Black" ? palette.accentPart : palette.body;
          // Lambert: pencahayaan per-vertex, jauh lebih murah dari Standard
          // (di lingkungan tanpa GPU akselerasi, Standard menjatuhkan fps ke ~22).
          child.material = new THREE.MeshLambertMaterial({
            color: new THREE.Color(tint),
            emissive: new THREE.Color("#000000"),
          });
          child.frustumCulled = true;
        });

        const box = new THREE.Box3().setFromObject(model);
        // 1.4x: Box3 statis lebih pendek dari pose skinned saat animasi berjalan
        modelHeight = Math.max(box.max.y - box.min.y, 0.001) * 1.4;
        modelWidth = Math.max(box.max.x - box.min.x, 0.001);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        scene.add(model);

        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(model);
          const idle =
            gltf.animations.find((clip) => /idle/i.test(clip.name)) || gltf.animations[0];
          if (idle) mixer.clipAction(idle).play();
        }
        applyPalette(palette);
      },
      undefined,
      () => {
        /* model gagal dimuat: debu + spotlight tetap tampil, tidak crash */
      }
    );

    // --- penempatan model: hero (kartu foto) → projects (kartu aktif), mobile ikut kartu ---
    const targetPos = new THREE.Vector3();
    const localPos = new THREE.Vector3();
    let projectIndex = 0;
    let shadowOff = false;
    let rimTint = 0; // 0..1, dipakai untuk menggeser hue rim per proyek

    const findAnchor = (vw, vh) => {
      const projectsEl = document.getElementById("projects");
      if (projectsEl) {
        const pr = projectsEl.getBoundingClientRect();
        const inProjects = pr.top < vh * 0.55 && pr.bottom > vh * 0.45;
        if (inProjects) {
          const cards = projectsEl.querySelectorAll("article");
          let best = null;
          let bestDist = Infinity;
          let bestIndex = 0;
          cards.forEach((card, index) => {
            const r = card.getBoundingClientRect();
            const dist = Math.abs(r.top + r.height / 2 - vh / 2);
            if (dist < bestDist) {
              bestDist = dist;
              best = r;
              bestIndex = index;
            }
          });
          if (best && best.width > 0 && cards.length) {
            // kanan grid: ruang kosong di luar kolom terakhir, siluet terbaca
            const last = cards[cards.length - 1].getBoundingClientRect();
            const gridRight = Math.max(last.right, best.right);
            const gutter = Math.max(vw * 0.06, 24);
            const rect = {
              left: Math.min(gridRight + gutter, vw - 120),
              top: best.top,
              width: best.width * 0.8,
              height: best.height,
            };
            return { rect, scaleFactor: 0.46, index: bestIndex, mode: "projects" };
          }
        }
      }
      const heroCard = document.getElementById("hero-photo");
      if (heroCard) {
        const hr = heroCard.getBoundingClientRect();
        if (hr.width > 0) {
          return { rect: hr, scaleFactor: quality.scale, index: 0, mode: "hero" };
        }
      }
      return null;
    };

    const placeModel = () => {
      if (!model) return;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const anchor = findAnchor(vw, vh);

      // tidak ada jangkar yang layak di layar → sembunyikan (hemat, tidak melayang liar)
      if (!anchor) {
        model.visible = false;
        shadow.visible = false;
        return;
      }

      const { rect, mode, index } = anchor;
      if (rect.bottom < -rect.height * 0.4 || rect.top > vh + rect.height * 0.4) {
        model.visible = false;
        shadow.visible = false;
        return;
      }

      const depth = quality.dist;
      const vFov = (camera.fov * Math.PI) / 180;
      const worldH = 2 * Math.tan(vFov / 2) * depth;
      const worldW = worldH * camera.aspect;

      const isMobile = vw < 768;
      // Hero: karakter LEBIH TINGGI dari kartu supaya kepala/ bahu muncul di atas
      // kartu (gaya rujukan), bukan tenggelam di belakangnya. Projects: lebih kecil.
      // Hero: ukuran tenang (0.72 x tinggi kartu) — bukan karakter raksasa yang
      // bersaing dengan judul. Projects: lebih kecil lagi.
      const scaleFactor =
        mode === "hero" ? (isMobile ? 0.52 : 0.62) : anchor.scaleFactor * (isMobile ? 0.9 : 1);
      const desiredH = worldH * (rect.height / vh) * scaleFactor;

      modelScale = desiredH / modelHeight;
      const modelNdcH = (desiredH / worldH) * 2;
      const safety = 1.45; // Box3 statis lebih kecil dari pose skinned
      const modelNdcW = ((desiredH * (modelWidth / modelHeight)) / worldW) * 2 * safety;

      const halfH = modelNdcH / 2;
      let ndcX = ((rect.left + rect.width / 2) / vw) * 2 - 1;
      // hero: tempelkan puncak kepala ~3% di bawah tepi atas layar
      // hero: puncak kepala muncul ~24px di atas tepi atas kartu (bukan kepala raksasa)
      let ndcY =
        mode === "hero"
          ? 1 - (2 * Math.max(rect.top - 24, 8)) / vh - halfH
          : -(((rect.top + rect.height * 0.5) / vh) * 2 - 1);

      // geser sedikit ke luar kartu supaya siluet terbaca (kanan kalau ada ruang)
      const shift = mode === "projects" ? 0.12 : 0.06;
      if ((1 - ndcX) > modelNdcW * 0.55) ndcX += modelNdcW * shift;

      // jangan menabrak blok judul hero
      const title = document.querySelector("#home h1");
      if (title && mode === "hero") {
        const tr = title.getBoundingClientRect();
        const titleRightNdc = (tr.right / vw) * 2 - 1;
        if (titleRightNdc < ndcX) ndcX = Math.max(ndcX, titleRightNdc + modelNdcW * 0.22);
      }

      const halfW = modelNdcW / 2;
      ndcX = Math.max(Math.min(ndcX, 0.97 - halfW), -0.97 + halfW);
      ndcY = Math.min(ndcY, 0.93 - halfH);
      ndcY = Math.max(ndcY, -0.93 + halfH);

      projectIndex = index;
      rimTint = index % 3; // tiga variasi hue halus per proyek

      localPos.set((ndcX * worldW) / 2, (ndcY * worldH) / 2, -depth);
      localPos.applyQuaternion(camera.quaternion).add(camera.position);
      targetPos.copy(localPos);

      model.visible = true;
      if (!placed) {
        model.position.copy(targetPos);
        model.scale.setScalar(modelScale);
        placed = true;
      } else {
        model.position.lerp(targetPos, 0.16);
        model.scale.setScalar(THREE.MathUtils.lerp(model.scale.x, modelScale, 0.16));
      }

      // contact shadow: billboard lembut di belakang model, diskalakan mengikuti siluet
      const silhouette = Math.max(modelWidth, modelHeight) * model.scale.x;
      shadow.visible = !shadowOff;
      shadow.position.copy(model.position);
      shadow.position.z -= silhouette * 0.45;
      shadow.position.y -= modelHeight * model.scale.x * 0.22;
      shadow.scale.setScalar(silhouette * 1.7);
      shadow.quaternion.copy(camera.quaternion);
    };

    // --- progres scroll + pointer ---
    let targetProgress = scrollProgress();
    let progress = targetProgress;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const onPointerMove = (event) => {
      pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => {
      targetProgress = scrollProgress();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let visible = true;
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );
    intersectionObserver.observe(host);

    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const themeObserver = new MutationObserver(() => applyPalette(readPalette()));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // --- render loop ---
    let frameId = 0;
    let frameMs = 0;
    let frameCount = 0;
    let fpsFrames = 0;
    let fpsT0 = performance.now();
    let fps = 0;
    let slowStreak = 0;
    let downgradeStep = 0;
    let warmupWindows = 0;
    let framesInWindow = 0;

    const renderFrame = (delta = 0) => {
      const t0 = performance.now();
      progress += (targetProgress - progress) * 0.06;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;

      const dolly = 6.2 - progress * 1.1;
      camera.position.x = pointer.x * 0.4;
      camera.position.y = 0.15 + pointer.y * 0.28 - progress * 0.18;
      camera.position.z = dolly;
      camera.lookAt(0, 0, 0);

      if (model) {
        placeModel();
        model.rotation.y += 0.0085; // idle ~12 detik per putaran
      }
      for (const layer of dustLayers) {
        layer.material.uniforms.uTime.value = elapsed;
        layer.points.rotation.z = Math.sin(elapsed * 0.05) * 0.02;
      }
      // morph halus warna rim mengikuti proyek aktif (satu aksen, tiga variasi)
      const rimTarget = palette.rim;
      if (model) {
        const base = new THREE.Color(rimTarget);
        if (rimTint > 0) base.offsetHSL(rimTint * 0.028, 0, 0);
        rim.color.lerp(base, 0.05);
      }
      if (mixer) mixer.update(delta);

      renderer.render(scene, camera);
      frameMs = frameMs * 0.85 + (performance.now() - t0) * 0.15;
      frameCount += 1;
    };

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const alpha = layerAlpha();
      host.style.opacity = alpha.toFixed(3);
      const delta = clock.getDelta();
      if (!visible || alpha <= 0.02) return;
      elapsed += delta;
      renderFrame(delta);

      fpsFrames += 1;
      framesInWindow += 1;
      const nowMs = performance.now();
      const windowMs = nowMs - fpsT0;
      if (windowMs >= 1000) {
        fps = Math.round((fpsFrames * 1000) / windowMs);
        fpsFrames = 0;
        const drew = framesInWindow;
        framesInWindow = 0;
        fpsT0 = nowMs;
        warmupWindows += 1;
        // beri masa pemanasan lebih panjang: hydration + kompilasi shader bisa
        // membuat fps rendah sesaat, jangan sampai scene langsung menyerah.
        // hanya menilai kalau jendela ini benar-benar menggambar cukup frame
        if (!posterMode && warmupWindows > 6 && fps < 22 && drew >= 8) {
          slowStreak += 1;
          // Turunkan bertahap: resolusi render → jumlah debu → baru menyerah ke poster.
          if (downgradeStep === 0) {
            downgradeStep = 1;
            renderer.setPixelRatio(0.75);
            resize();
          } else if (downgradeStep === 1) {
            downgradeStep = 2;
            renderer.setPixelRatio(0.6);
            dustLayers.forEach((layer) => {
              const total = layer.geometry.getAttribute("position").count;
              layer.geometry.setDrawRange(0, Math.floor(total / 2));
            });
            scene.fog = null;
            resize();
          } else if (slowStreak >= 6) {
            cancelAnimationFrame(frameId);
            frameId = 0;
            lowPerfRef.current?.({ fps });
          }
        } else {
          slowStreak = 0;
        }
      }
    };

    if (reduceMotion) {
      renderFrame(0);
      frameId = 0;
    } else {
      renderFrame(0);
      frameId = requestAnimationFrame(tick);
    }

    window.__scene3d = {
      get progress() {
        return progress;
      },
      get reduceMotion() {
        return reduceMotion;
      },
      get frameMs() {
        return frameMs;
      },
      get fps() {
        return fps;
      },
      get frames() {
        return frameCount;
      },
      get paused() {
        return !visible;
      },
      get downgraded() {
        return downgradeStep > 0;
      },
      get cameraPos() {
        return {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3)),
        };
      },
      get model() {
        if (!model) return null;
        return {
          scale: Number(model.scale.x.toFixed(3)),
          pos: {
            x: Number(model.position.x.toFixed(2)),
            y: Number(model.position.y.toFixed(2)),
            z: Number(model.position.z.toFixed(2)),
          },
          animated: !!mixer,
        };
      },
      /** debug: matikan komponen untuk mengukur biaya masing-masing */
      setShadow(on) {
        shadowOff = !on;
        return shadowOff;
      },
      setDust(on) {
        dustLayers.forEach((layer) => {
          layer.points.visible = on;
        });
        return on;
      },
      get info() {
        return {
          dust: DUST_COUNT,
          dustLayers: dustLayers.map((l) => l.geometry.getAttribute("position").count),
          anchorMode: model && model.visible ? (projectIndex >= 0 ? "aktif" : "-") : "-+",
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          dpr: renderer.getPixelRatio(),
          size: `${renderer.domElement.width}x${renderer.domElement.height}`,
        };
      },
      /** render satu frame bersih lalu kembalikan PNG (untuk poster pra-render) */
      snapshot(width = 1100, bg = null) {
        const prev = renderer.getSize(new THREE.Vector2());
        const prevRatio = renderer.getPixelRatio();
        const prevClear = new THREE.Color();
        renderer.getClearColor(prevClear);
        const prevAlpha = renderer.getClearAlpha();
        if (bg) renderer.setClearColor(new THREE.Color(bg), 1);
        const prevOpacity = host.style.opacity;
        const height = Math.round((width * 3) / 4);
        host.style.opacity = "1";
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderFrame(0);
        const url = renderer.domElement.toDataURL("image/png");
        if (bg) renderer.setClearColor(prevClear, prevAlpha);
        renderer.setPixelRatio(prevRatio);
        renderer.setSize(prev.x, prev.y, false);
        camera.aspect = prev.x / Math.max(prev.y, 1);
        camera.updateProjectionMatrix();
        host.style.opacity = prevOpacity;
        return url;
      },
    };

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);

      if (mixer) mixer.stopAllAction();
      scene.remove(spot, spot.target, rim, fill, ambient, shadow);
      shadow.geometry.dispose();
      shadowMaterial.map?.dispose();
      shadowMaterial.dispose();
      for (const layer of dustLayers) {
        scene.remove(layer.points);
        layer.geometry.dispose();
        layer.material.dispose();
      }
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose?.();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose?.());
            else child.material?.dispose?.();
          }
        });
        scene.remove(model);
      }
      renderer.dispose();
      renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
      delete window.__scene3d;
    };
  }, [tier]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none fixed inset-0 h-screen w-screen"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
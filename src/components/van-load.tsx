import { useEffect, useRef } from "react";
import type { BufferGeometry, InstancedMesh, Material, Matrix4, Quaternion, Scene, Vector3 } from "three";
import { FLAT_31_M3, MAX_VOLUME_M3 } from "@/data/catalog";

type Props = { volume: number };

const ALONG = 8;
const UP = 3;
const ACROSS = 2;
const BOXES = ALONG * UP * ACROSS;

type Extras = {
  RoundedBoxGeometry: new (
    width?: number,
    height?: number,
    depth?: number,
    segments?: number,
    radius?: number,
  ) => BufferGeometry;
  RoomEnvironment: new () => Scene & { dispose(): void };
};

export function VanLoad({ volume }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancel = false;
    let teardown = () => {};
    Promise.all([
      import("three"),
      import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
      import("three/examples/jsm/environments/RoomEnvironment.js"),
    ])
      .then(([THREE, rounded, room]) => {
        if (cancel || !host.current) return;
        const node = host.current;
        const extras: Extras = {
          RoundedBoxGeometry: rounded.RoundedBoxGeometry,
          RoomEnvironment: room.RoomEnvironment,
        };
        const start = () => {
          if (cancel) return;
          teardown = mount(THREE, extras, node, () => volumeRef.current);
        };
        if (node.getBoundingClientRect().top < window.innerHeight) {
          start();
          return;
        }
        const watcher = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          watcher.disconnect();
          start();
        });
        watcher.observe(node);
        const previous = teardown;
        teardown = () => {
          watcher.disconnect();
          previous();
        };
      })
      .catch(() => {});
    return () => {
      cancel = true;
      teardown();
    };
  }, []);

  return (
    <div className="van-stage relative h-64 overflow-hidden sm:h-80">
      <div
        ref={host}
        className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
        role="img"
        aria-label="Trojrozměrný model dodávky. Táhněte do stran a otočíte ho. Červená čára znamená byt 3+1."
      />
      <span className="pointer-events-none absolute top-2 right-3 rounded-full border border-paper/15 bg-black/25 px-2 py-0.5 text-[10px] tracking-wider text-paper/60 uppercase">
        táhněte pro otočení
      </span>
      <p className="pointer-events-none absolute right-3 bottom-2 left-3 flex justify-between gap-2 text-[11px] tracking-widest whitespace-nowrap text-paper/70 uppercase">
        <span>IVECO Daily · {MAX_VOLUME_M3.toLocaleString("cs-CZ")} m³</span>
        <span className="text-accent">čára = byt 3+1</span>
      </p>
    </div>
  );
}

function mount(THREE: typeof import("three"), extras: Extras, el: HTMLDivElement, readVolume: () => number) {
  const { RoundedBoxGeometry, RoomEnvironment } = extras;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  canvas.style.opacity = "0";
  canvas.style.transition = "opacity 700ms ease";
  el.appendChild(canvas);
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    }),
  );

  // image-based lighting: a small procedural room gives paint and glass something to reflect
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  room.dispose();
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xfff3e6, 0.32));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
  sun.position.set(6.5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -6;
  sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 30;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd7e4ff, 0.5);
  fill.position.set(-5, 3, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd9b0, 0.75);
  rim.position.set(5, 2.5, -6.5);
  scene.add(rim);

  const van = new THREE.Group();
  scene.add(van);

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0xf7f3ea,
    roughness: 0.3,
    metalness: 0.06,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.05,
  });
  const paintShade = new THREE.MeshPhysicalMaterial({
    color: 0xe7e0d3,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    envMapIntensity: 0.9,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x2b2622, roughness: 0.7, metalness: 0.15 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x151b21,
    roughness: 0.06,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.6,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x14110f, roughness: 0.95, metalness: 0 });
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xbdb6ab,
    roughness: 0.32,
    metalness: 0.85,
    envMapIntensity: 1.2,
  });
  const interior = new THREE.MeshStandardMaterial({ color: 0x1a1411, roughness: 0.9 });
  const kraft = new THREE.MeshStandardMaterial({ color: 0xc6a36a, roughness: 0.78 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xfaf6ef, roughness: 0.84 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xc4272e, roughness: 0.4, metalness: 0.1 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xfff1c9,
    emissive: 0xffe2a8,
    emissiveIntensity: 1.3,
    roughness: 0.25,
  });
  const tail = new THREE.MeshStandardMaterial({
    color: 0xd8353c,
    emissive: 0x8e1c22,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });
  const plate = new THREE.MeshStandardMaterial({ color: 0xf3eee4, roughness: 0.5, metalness: 0.1 });

  const geos: BufferGeometry[] = [];
  const add = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: Material,
    radius = 0.035,
    rot?: { x?: number; y?: number; z?: number },
  ) => {
    const r = Math.min(radius, Math.min(w, h, d) * 0.45);
    const geometry = r > 0.005 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(rot.x ?? 0, rot.y ?? 0, rot.z ?? 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    van.add(mesh);
    geos.push(geometry);
    return mesh;
  };

  const length = 4.35;
  const width = 1.82;
  const height = 1.78;
  const floorY = 0.62;
  const wall = 0.055;
  const rear = length / 2;
  const sideFace = width / 2 + wall / 2;

  // cargo box shell
  add(length, wall, width, 0, floorY, 0, interior, 0.012);
  add(wall, height, width, -length / 2, floorY + height / 2, 0, paint, 0.05);
  add(length, height, wall, 0, floorY + height / 2, -width / 2, paint, 0.05);
  add(length, height, wall, 0, floorY + height / 2, width / 2, paint, 0.05);
  add(length, wall, width, 0, floorY + height, 0, paint, 0.05);

  // red stripe on both flanks + dark rub strip low on the flanks
  add(length * 0.62, 0.05, 0.02, -0.15, floorY + height * 0.55, sideFace + 0.01, accent, 0.008);
  add(length * 0.62, 0.05, 0.02, -0.15, floorY + height * 0.55, -(sideFace + 0.01), accent, 0.008);
  add(length * 0.9, 0.06, 0.03, 0, floorY + 0.32, sideFace + 0.015, trim, 0.012);
  add(length * 0.9, 0.06, 0.03, 0, floorY + 0.32, -(sideFace + 0.015), trim, 0.012);

  // cab: hood, greenhouse, raked windshield, side glass
  add(1.55, 0.72, 1.68, -length / 2 - 0.78, floorY + 0.36, 0, paint, 0.09);
  add(1.15, 0.7, 1.55, -length / 2 - 0.62, floorY + 1.05, 0, paint, 0.08);
  add(0.07, 0.66, 1.3, -length / 2 - 1.22, floorY + 1.02, 0, glass, 0.02, { z: -0.3 });
  add(0.62, 0.34, 0.05, -2.85, floorY + 1.05, 0.77, glass, 0.015);
  add(0.62, 0.34, 0.05, -2.85, floorY + 1.05, -0.77, glass, 0.015);

  // front fascia: grille, headlights, bumper, plate
  add(0.06, 0.2, 0.92, -3.75, floorY + 0.42, 0, trim, 0.02);
  add(0.08, 0.16, 0.34, -3.74, floorY + 0.63, 0.55, lamp, 0.03);
  add(0.08, 0.16, 0.34, -3.74, floorY + 0.63, -0.55, lamp, 0.03);
  add(0.2, 0.16, 1.62, -3.78, floorY + 0.14, 0, trim, 0.04);
  add(0.03, 0.14, 0.46, -3.89, floorY + 0.16, 0, plate, 0.01);

  // mirrors on both flanks of the cab
  add(0.04, 0.04, 0.22, -3.3, floorY + 0.86, 0.86, trim, 0.012);
  add(0.04, 0.04, 0.22, -3.3, floorY + 0.86, -0.86, trim, 0.012);
  add(0.06, 0.22, 0.11, -3.3, floorY + 0.86, 1.0, trim, 0.02);
  add(0.06, 0.22, 0.11, -3.3, floorY + 0.86, -1.0, trim, 0.02);

  // rear: corner pillars frame the door opening, bumper, taillight clusters
  add(0.09, height, 0.15, rear + 0.045, floorY + height / 2, 0.835, paint, 0.03);
  add(0.09, height, 0.15, rear + 0.045, floorY + height / 2, -0.835, paint, 0.03);
  add(0.18, 0.14, width * 0.96, rear + 0.08, floorY + 0.07, 0, trim, 0.03);
  add(0.05, 0.5, 0.13, rear + 0.1, floorY + 0.5, 0.835, tail, 0.015);
  add(0.05, 0.5, 0.13, rear + 0.1, floorY + 0.5, -0.835, tail, 0.015);

  // wheels: axle across the van, plus metal rims, dark caps and wheel-arch flares
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 32);
  wheelGeo.rotateX(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 24);
  hubGeo.rotateX(Math.PI / 2);
  const capGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.28, 16);
  capGeo.rotateX(Math.PI / 2);
  const flareGeo = new THREE.TorusGeometry(0.42, 0.045, 8, 24, Math.PI);
  geos.push(wheelGeo, hubGeo, capGeo, flareGeo);
  const axles: Array<[number, number, number]> = [
    [-length / 2 - 1.05, 0.78, 0.84],
    [rear - 0.55, 0.88, sideFace],
  ];
  for (const [x, track, flareZ] of axles) {
    for (const side of [-1, 1]) {
      const z = side * track;
      const wheel = new THREE.Mesh(wheelGeo, rubber);
      wheel.position.set(x, 0.34, z);
      wheel.castShadow = true;
      van.add(wheel);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(x, 0.34, z);
      hub.castShadow = true;
      van.add(hub);
      const cap = new THREE.Mesh(capGeo, trim);
      cap.position.set(x, 0.34, z + side * 0.015);
      van.add(cap);
      const flare = new THREE.Mesh(flareGeo, paintShade);
      flare.position.set(x, 0.34, side * flareZ);
      flare.castShadow = true;
      van.add(flare);
    }
  }

  // rear doors, swung open outward past the flanks
  const doorGeo = new RoundedBoxGeometry(0.9, height - 0.08, 0.04, 3, 0.02);
  geos.push(doorGeo);
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(rear, floorY + height / 2, side * (width / 2));
    hinge.rotation.y = -side * 0.58;
    const door = new THREE.Mesh(doorGeo, paint);
    door.position.set(0.46, 0, side * 0.02);
    door.castShadow = true;
    door.receiveShadow = true;
    hinge.add(door);
    van.add(hinge);
  }

  const cargoLight = new THREE.PointLight(0xfff6e8, 6, 8);
  cargoLight.position.set(0.2, floorY + height - 0.2, 0);
  van.add(cargoLight);
  const rearLight = new THREE.PointLight(0xfff6e8, 3.5, 6);
  rearLight.position.set(rear + 0.4, floorY + height * 0.6, 0);
  van.add(rearLight);

  // soft painted contact shadow + a real shadow map on an invisible ground
  const blobCanvas = document.createElement("canvas");
  blobCanvas.width = 256;
  blobCanvas.height = 256;
  const blobCtx = blobCanvas.getContext("2d");
  if (blobCtx) {
    const grad = blobCtx.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0, "rgba(0,0,0,0.75)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    blobCtx.fillStyle = grad;
    blobCtx.fillRect(0, 0, 256, 256);
  }
  const blobTex = new THREE.CanvasTexture(blobCanvas);
  blobTex.colorSpace = THREE.SRGBColorSpace;
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 48),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.scale.set(1.15, 0.72, 1);
  blob.position.set(-0.45, 0.013, 0);
  blob.renderOrder = 1;
  scene.add(blob);
  geos.push(blob.geometry);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 48), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.01;
  ground.receiveShadow = true;
  scene.add(ground);
  geos.push(ground.geometry);

  const gap = 0.04;
  const innerL = length - wall - 0.08;
  const innerH = height - 0.12;
  const innerW = width - wall * 2 - 0.08;
  const boxL = (innerL - gap * (ALONG + 1)) / ALONG;
  const boxH = (innerH - gap * (UP + 1)) / UP;
  const boxW = (innerW - gap * (ACROSS + 1)) / ACROSS;
  const cartonRadius = Math.min(boxL, boxH, boxW) * 0.08;
  const kraftBoxes = new THREE.InstancedMesh(new RoundedBoxGeometry(boxL, boxH, boxW, 2, cartonRadius), kraft, BOXES);
  const paperBoxes = new THREE.InstancedMesh(new RoundedBoxGeometry(boxL, boxH, boxW, 2, cartonRadius), paper, BOXES);
  kraftBoxes.frustumCulled = false;
  paperBoxes.frustumCulled = false;
  van.add(kraftBoxes, paperBoxes);
  geos.push(kraftBoxes.geometry, paperBoxes.geometry);

  const markX = -length / 2 + wall + innerL * (FLAT_31_M3 / MAX_VOLUME_M3);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, width - 0.28), accent);
  mark.position.set(markX, floorY + wall + 0.02, 0);
  van.add(mark);
  geos.push(mark.geometry);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), accent);
  post.position.set(markX, floorY + 0.32, width / 2 - 0.12);
  van.add(post);
  geos.push(post.geometry);

  const matrix: Matrix4 = new THREE.Matrix4();
  const quaternion: Quaternion = new THREE.Quaternion();
  const scale: Vector3 = new THREE.Vector3();
  const position: Vector3 = new THREE.Vector3();
  const shown = new Float32Array(BOXES);

  const place = (index: number, amount: number, mesh: InstancedMesh) => {
    const along = ALONG - 1 - (index % ALONG);
    const rest = Math.floor(index / ALONG);
    const up = rest % UP;
    const across = Math.floor(rest / UP);
    const x = -length / 2 + wall + gap + boxL / 2 + along * (boxL + gap);
    const y = floorY + gap + boxH / 2 + up * (boxH + gap);
    const z = -innerW / 2 + gap + boxW / 2 + across * (boxW + gap);
    position.set(x, y, z);
    scale.set(amount, amount, amount);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  };

  const resize = () => {
    const widthPx = Math.max(1, el.clientWidth);
    const heightPx = Math.max(1, el.clientHeight);
    camera.aspect = widthPx / heightPx;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(widthPx, heightPx, false);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(el);

  let yaw = 0.5;
  let pitch = 0.34;
  let targetYaw = 0.5;
  let targetPitch = 0.34;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastAct = performance.now();
  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastAct = performance.now();
    lastX = event.clientX;
    lastY = event.clientY;
    el.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging) return;
    lastAct = performance.now();
    targetYaw += (event.clientX - lastX) * 0.008;
    targetPitch = Math.max(0.14, Math.min(0.88, targetPitch + (event.clientY - lastY) * 0.005));
    lastX = event.clientX;
    lastY = event.clientY;
  };
  const onUp = () => {
    dragging = false;
    lastAct = performance.now();
  };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  let last = performance.now();
  let time = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    // after a beat of stillness the camera drifts around on its own
    if (!dragging && !reduced && now - lastAct > 1500) targetYaw += dt * 0.16;
    const ease = 1 - Math.exp(-8 * dt);
    yaw += (targetYaw - yaw) * ease;
    pitch += (targetPitch - pitch) * ease;

    const loaded = Math.max(0, readVolume());
    const remainder = loaded % MAX_VOLUME_M3;
    const inVan = loaded <= 0.001 ? 0 : remainder < 0.001 ? MAX_VOLUME_M3 : remainder;
    for (let index = 0; index < BOXES; index += 1) {
      const goal = inVan >= ((index + 0.35) / BOXES) * MAX_VOLUME_M3 ? 1 : 0;
      shown[index] = reduced ? goal : shown[index] + (goal - shown[index]) * (1 - Math.exp(-8 * dt));
      const paperTurn = index % 3 === 0;
      place(index, paperTurn ? 0 : shown[index], kraftBoxes);
      place(index, paperTurn ? shown[index] : 0, paperBoxes);
    }
    kraftBoxes.instanceMatrix.needsUpdate = true;
    paperBoxes.instanceMatrix.needsUpdate = true;

    const intro = reduced ? 1 : 1 - Math.pow(1 - Math.min(1, time / 1.6), 3);
    const radius = 12.5 - 3 * intro;
    const bob = reduced ? 0 : Math.sin(time * 1.2) * 0.035;
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * radius,
      1.15 + Math.sin(pitch) * radius * 0.55 + bob + (1 - intro) * 0.5,
      Math.cos(yaw) * Math.cos(pitch) * radius,
    );
    camera.lookAt(-0.2, 1.3, 0);
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    for (const geometry of geos) geometry.dispose();
    blobTex.dispose();
    envTarget.texture.dispose();
    envTarget.dispose();
    for (const material of [
      paint,
      paintShade,
      trim,
      glass,
      rubber,
      hubMat,
      interior,
      kraft,
      paper,
      accent,
      lamp,
      tail,
      plate,
      blob.material,
      ground.material,
    ]) {
      if (material instanceof THREE.Material) material.dispose();
    }
    renderer.dispose();
    canvas.remove();
  };
}

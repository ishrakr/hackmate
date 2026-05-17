import * as THREE from "three";

const objectMaterials = [
  { color: 0xf25f5c, emissive: 0x3a0f12 },
  { color: 0x247ba0, emissive: 0x061e2a },
  { color: 0x70c1b3, emissive: 0x0d2d28 },
  { color: 0xffd166, emissive: 0x352800 },
  { color: 0x9b5de5, emissive: 0x1e1038 },
  { color: 0x00bbf9, emissive: 0x062a37 },
];

export const huntObjects = [
  {
    id: "circuit",
    name: "Circuit Badge",
    clue: "Look low near table legs.",
    placement: "Under a table",
    position: [-1.3, -0.45, -2.2],
    geometry: "box",
  },
  {
    id: "cube",
    name: "Prototype Cube",
    clue: "Chairs hide more than backpacks.",
    placement: "Under a chair",
    position: [1.2, -0.25, -2.8],
    geometry: "octahedron",
  },
  {
    id: "key",
    name: "Launch Key",
    clue: "Check the edge where walls meet.",
    placement: "Behind a wall corner",
    position: [-1.8, 0.2, -3.4],
    geometry: "torus",
  },
  {
    id: "beacon",
    name: "Signal Beacon",
    clue: "Something is watching from above eye level.",
    placement: "On a high shelf",
    position: [0.7, 0.95, -2.6],
    geometry: "sphere",
  },
  {
    id: "token",
    name: "Mentor Token",
    clue: "Find the spot behind the welcome sign.",
    placement: "Behind signage",
    position: [1.8, 0.1, -3.6],
    geometry: "dodecahedron",
  },
  {
    id: "spark",
    name: "Spark Module",
    clue: "The floor corner has one final secret.",
    placement: "Near a room corner",
    position: [-0.4, -0.55, -3.8],
    geometry: "cone",
  },
];

export function createScavengerHuntScene({
  canvas,
  initialFoundIds = [],
  onCollect,
  onReady,
  useExternalRenderer = false,
} = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 1, 0.01, 100);
  camera.position.set(0, 0.15, 0);

  const renderer = useExternalRenderer
    ? null
    : new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
      });

  if (renderer) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const group = new THREE.Group();
  scene.add(group);

  const collected = new Set(initialFoundIds);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactive = [];
  let frameId = 0;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x31425c, 2.4));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(2, 3, 2);
  scene.add(keyLight);

  huntObjects.forEach((item, index) => {
    const mesh = createObjectMesh(item, index);
    mesh.name = item.name;
    mesh.userData = item;
    mesh.position.set(...item.position);
    mesh.visible = !collected.has(item.id);
    group.add(mesh);
    interactive.push(mesh);

    const ring = createPulseRing(index);
    ring.position.copy(mesh.position);
    ring.position.y -= 0.12;
    ring.visible = mesh.visible;
    ring.userData.followTarget = mesh;
    group.add(ring);
  });

  function resize() {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    if (renderer) {
      renderer.setSize(width, height, false);
    }
  }

  function render(time = 0) {
    const seconds = time / 1000;

    interactive.forEach((mesh, index) => {
      mesh.rotation.y = seconds * 0.9 + index;
      mesh.rotation.x = Math.sin(seconds * 1.4 + index) * 0.12;
      mesh.position.y = huntObjects[index].position[1] + Math.sin(seconds * 1.8 + index) * 0.035;
    });

    group.children.forEach((child) => {
      const target = child.userData.followTarget;
      if (!target) return;

      child.visible = target.visible;
      child.scale.setScalar(1 + Math.sin(seconds * 2.8) * 0.1);
    });

    if (renderer) {
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(render);
    }
  }

  function collectFromCanvas(event) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(interactive.filter((mesh) => mesh.visible), false)[0];
    if (!hit) return;

    collect(hit.object);
  }

  function collect(mesh) {
    const item = mesh.userData;
    if (!item || collected.has(item.id)) return;

    collected.add(item.id);
    mesh.visible = false;
    onCollect?.(item, [...collected]);
  }

  function dispose() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
    }

    canvas?.removeEventListener("pointerdown", collectFromCanvas);
    window.removeEventListener("resize", resize);
    renderer?.dispose();

    scene.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose?.());
      } else {
        object.material?.dispose?.();
      }
    });
  }

  resize();
  if (!useExternalRenderer) {
    canvas?.addEventListener("pointerdown", collectFromCanvas);
  }
  window.addEventListener("resize", resize);

  if (renderer) {
    render();
  }

  onReady?.({ scene, camera, renderer, render, collect, interactive, resize });

  return {
    scene,
    camera,
    renderer,
    collect,
    dispose,
    interactive,
    resize,
    render,
  };
}

function createObjectMesh(item, index) {
  const materialConfig = objectMaterials[index % objectMaterials.length];
  const material = new THREE.MeshStandardMaterial({
    color: materialConfig.color,
    emissive: materialConfig.emissive,
    metalness: 0.24,
    roughness: 0.36,
  });

  return new THREE.Mesh(createGeometry(item.geometry), material);
}

function createGeometry(type) {
  if (type === "sphere") return new THREE.SphereGeometry(0.17, 32, 24);
  if (type === "torus") return new THREE.TorusGeometry(0.16, 0.045, 16, 44);
  if (type === "octahedron") return new THREE.OctahedronGeometry(0.2);
  if (type === "dodecahedron") return new THREE.DodecahedronGeometry(0.18);
  if (type === "cone") return new THREE.ConeGeometry(0.16, 0.34, 32);

  return new THREE.BoxGeometry(0.26, 0.26, 0.26);
}

function createPulseRing(index) {
  const materialConfig = objectMaterials[index % objectMaterials.length];
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.2, 0.24, 40),
    new THREE.MeshBasicMaterial({
      color: materialConfig.color,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    }),
  );

  ring.rotation.x = -Math.PI / 2;
  return ring;
}

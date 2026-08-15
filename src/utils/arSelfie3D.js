import * as THREE from "three";

const THREE_EFFECTS = new Set(["sunglasses", "mask", "cat"]);

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose?.();
  });
}

function createGlasses() {
  const group = new THREE.Group();
  const frameMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x090b11,
    metalness: 0.82,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const lensMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x101c30,
    metalness: 0.18,
    roughness: 0.08,
    transmission: 0.18,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  [-0.34, 0.34].forEach((x) => {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.29, 48), lensMaterial);
    lens.position.set(x, 0, 0.012);
    lens.scale.y = 0.72;
    group.add(lens);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 12, 48), frameMaterial);
    rim.position.set(x, 0, 0.04);
    rim.scale.y = 0.72;
    group.add(rim);
  });

  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 10, 24, Math.PI), frameMaterial);
  bridge.position.set(0, 0.025, 0.04);
  bridge.rotation.z = Math.PI;
  group.add(bridge);

  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.035), frameMaterial);
    arm.position.set(side * 0.72, 0.02, -0.02);
    arm.rotation.y = side * -0.2;
    group.add(arm);
  });
  return group;
}

function createMask() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, 0.12);
  shape.bezierCurveTo(-0.7, 0.5, -0.28, 0.55, 0, 0.32);
  shape.bezierCurveTo(0.28, 0.55, 0.7, 0.5, 0.9, 0.12);
  shape.bezierCurveTo(0.72, -0.42, 0.3, -0.43, 0.08, -0.22);
  shape.bezierCurveTo(0, -0.12, 0, -0.12, -0.08, -0.22);
  shape.bezierCurveTo(-0.3, -0.43, -0.72, -0.42, -0.9, 0.12);

  [-0.36, 0.36].forEach((x) => {
    const hole = new THREE.Path();
    hole.absellipse(x, 0.05, 0.22, 0.105, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  });

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.025,
    curveSegments: 32,
  });
  geometry.center();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x6d28d9,
    emissive: 0x2e1065,
    emissiveIntensity: 0.45,
    metalness: 0.58,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    side: THREE.DoubleSide,
  });
  const mask = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mask);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 25),
    new THREE.LineBasicMaterial({ color: 0xf0abfc, transparent: true, opacity: 0.8 })
  );
  edge.position.z = 0.004;
  group.add(edge);
  return group;
}

function createAnimalFace() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x7c3f1d, roughness: 0.72 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xf0a28b, roughness: 0.7 });
  const muzzleMaterial = new THREE.MeshStandardMaterial({ color: 0xf2c6a0, roughness: 0.82 });
  const noseMaterial = new THREE.MeshPhysicalMaterial({ color: 0x151015, roughness: 0.2, clearcoat: 0.85 });

  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.62, 24), fur);
    ear.position.set(side * 0.55, 0.53, 0);
    ear.rotation.z = side * -0.28;
    group.add(ear);
    const earInner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 24), inner);
    earInner.position.set(side * 0.55, 0.53, 0.035);
    earInner.rotation.z = side * -0.28;
    group.add(earInner);

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 18), muzzleMaterial);
    muzzle.position.set(side * 0.18, -0.38, 0.08);
    muzzle.scale.set(1, 0.75, 0.55);
    group.add(muzzle);
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), noseMaterial);
  nose.position.set(0, -0.24, 0.2);
  nose.scale.set(1, 0.68, 0.55);
  group.add(nose);
  return group;
}

function landmarkPoint(landmarks, index, width, height) {
  const item = landmarks[index];
  return new THREE.Vector3((1 - item.x) * width, (1 - item.y) * height, item.z || 0);
}

export class ARSelfie3DRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
    this.camera.position.z = 1000;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x3a2035, 2.25));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-2, -3, 5);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xb86cff, 2.4);
    rimLight.position.set(4, 1, 3);
    this.scene.add(rimLight);

    this.effects = {
      sunglasses: createGlasses(),
      mask: createMask(),
      cat: createAnimalFace(),
    };
    Object.values(this.effects).forEach((effect) => {
      effect.visible = false;
      this.root.add(effect);
    });
  }

  resize(width, height) {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.top = height;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
  }

  clear() {
    Object.values(this.effects).forEach((effect) => { effect.visible = false; });
    this.renderer.clear();
  }

  render(landmarks, width, height, effectId) {
    this.resize(width, height);
    Object.entries(this.effects).forEach(([id, effect]) => { effect.visible = id === effectId; });
    if (!landmarks?.length || !THREE_EFFECTS.has(effectId)) {
      this.renderer.clear();
      return;
    }

    const leftEye = landmarkPoint(landmarks, 33, width, height);
    const rightEye = landmarkPoint(landmarks, 263, width, height);
    const nose = landmarkPoint(landmarks, 1, width, height);
    const forehead = landmarkPoint(landmarks, 10, width, height);
    const chin = landmarkPoint(landmarks, 152, width, height);
    const eyeCenter = leftEye.clone().add(rightEye).multiplyScalar(0.5);
    const eyeDistance = leftEye.distanceTo(rightEye);
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const yaw = THREE.MathUtils.clamp((nose.x - eyeCenter.x) / eyeDistance * 1.65, -0.72, 0.72);
    const faceHeight = Math.max(eyeDistance, forehead.distanceTo(chin));
    const pitch = THREE.MathUtils.clamp(((nose.y - eyeCenter.y) / faceHeight - 0.2) * 1.7, -0.42, 0.42);

    const target = this.effects[effectId];
    target.rotation.set(pitch, -yaw, roll);
    target.position.z = 20;

    if (effectId === "sunglasses") {
      target.position.x = eyeCenter.x;
      target.position.y = eyeCenter.y;
      target.scale.setScalar(eyeDistance * 1.08);
    } else if (effectId === "mask") {
      target.position.x = eyeCenter.x;
      target.position.y = eyeCenter.y + eyeDistance * 0.03;
      target.scale.setScalar(eyeDistance * 0.92);
    } else {
      target.position.x = nose.x;
      target.position.y = nose.y - eyeDistance * 0.08;
      target.scale.setScalar(eyeDistance * 0.92);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    Object.values(this.effects).forEach(disposeObject);
    this.renderer.dispose();
  }
}

export function isThreeEffect(effectId) {
  return THREE_EFFECTS.has(effectId);
}

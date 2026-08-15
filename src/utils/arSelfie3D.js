import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const ASSET_BASE = `${import.meta.env.BASE_URL}ar-assets`;
const THREE_EFFECTS = new Set(["sunglasses", "cat", "hat"]);

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => value?.isTexture && value.dispose());
      material.dispose?.();
    });
  });
}

function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, (result) => resolve(result.scene), undefined, reject);
  });
}

function loadGeometry(url) {
  return new Promise((resolve, reject) => {
    new THREE.BufferGeometryLoader().load(url, resolve, undefined, reject);
  });
}

function loadTexture(url, colorTexture = true) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (texture) => {
      if (colorTexture) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      resolve(texture);
    }, undefined, reject);
  });
}

function normalizeModel(model, targetWidth = 1) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetWidth / Math.max(size.x, 0.001);
  model.scale.multiplyScalar(scale);
  model.position.addScaledVector(center, -scale);
  return model;
}

async function createOfficialGlasses() {
  const model = await loadGLTF(`${ASSET_BASE}/glasses/scene.gltf`);
  normalizeModel(model, 1.38);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    child.material.metalness = Math.max(child.material.metalness || 0, 0.35);
    child.material.roughness = Math.min(child.material.roughness ?? 0.5, 0.28);
    child.material.needsUpdate = true;
  });
  return model;
}

async function createOfficialDog() {
  const [earsGeometry, noseGeometry, earsMap, earsNormal, earsAlpha, noseMap, noseNormal] =
    await Promise.all([
      loadGeometry(`${ASSET_BASE}/dog/dog_ears.json`),
      loadGeometry(`${ASSET_BASE}/dog/dog_nose.json`),
      loadTexture(`${ASSET_BASE}/dog/texture_ears.jpg`),
      loadTexture(`${ASSET_BASE}/dog/normal_ears.jpg`, false),
      loadTexture(`${ASSET_BASE}/dog/alpha_ears_256.jpg`, false),
      loadTexture(`${ASSET_BASE}/dog/texture_nose.jpg`),
      loadTexture(`${ASSET_BASE}/dog/normal_nose.jpg`, false),
    ]);
  const group = new THREE.Group();
  const ears = new THREE.Mesh(
    earsGeometry,
    new THREE.MeshStandardMaterial({
      map: earsMap,
      normalMap: earsNormal,
      alphaMap: earsAlpha,
      transparent: true,
      alphaTest: 0.12,
      roughness: 0.78,
      side: THREE.DoubleSide,
    })
  );
  ears.scale.setScalar(0.025);
  ears.position.y = -0.3;
  ears.frustumCulled = false;

  const nose = new THREE.Mesh(
    noseGeometry,
    new THREE.MeshPhysicalMaterial({
      map: noseMap,
      normalMap: noseNormal,
      roughness: 0.3,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    })
  );
  nose.scale.setScalar(0.018);
  nose.position.set(0, -0.05, 0.15);
  nose.frustumCulled = false;
  group.add(ears, nose);
  return group;
}

async function createOfficialHat() {
  const model = await loadGLTF(`${ASSET_BASE}/hat/scene.gltf`);
  normalizeModel(model, 1.45);
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.frustumCulled = false;
    child.material.roughness = Math.min(child.material.roughness ?? 0.7, 0.58);
    child.material.needsUpdate = true;
  });
  return model;
}

function landmarkPoint(landmarks, index, width, height) {
  const item = landmarks[index];
  return new THREE.Vector3((1 - item.x) * width, (1 - item.y) * height, item.z || 0);
}

export class ARSelfie3DRenderer {
  constructor(canvas, onReady) {
    this.canvas = canvas;
    this.onReady = onReady;
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
    this.camera.position.z = 1000;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight(0xf5f7ff, 0x38251d, 2.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
    keyLight.position.set(-2, 4, 6);
    this.scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xa970ff, 2.2);
    rimLight.position.set(4, 1, 3);
    this.scene.add(rimLight);

    this.effects = Object.fromEntries([...THREE_EFFECTS].map((id) => {
      const holder = new THREE.Group();
      holder.visible = false;
      holder.userData.loaded = false;
      this.root.add(holder);
      return [id, holder];
    }));
    this.loadAssets();
  }

  async loadAssets() {
    const factories = {
      sunglasses: createOfficialGlasses,
      cat: createOfficialDog,
      hat: createOfficialHat,
    };
    const results = await Promise.allSettled(Object.entries(factories).map(async ([id, factory]) => {
      const model = await factory();
      if (this.disposed) {
        disposeObject(model);
        return;
      }
      this.effects[id].add(model);
      this.effects[id].userData.loaded = true;
    }));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) console.warn("Some AR models could not be loaded", failures);
    this.onReady?.(failures.length === 0);
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
    Object.entries(this.effects).forEach(([id, effect]) => {
      effect.visible = id === effectId && effect.userData.loaded;
    });
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
    let roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    if (roll > Math.PI / 2) roll -= Math.PI;
    if (roll < -Math.PI / 2) roll += Math.PI;
    const yaw = THREE.MathUtils.clamp((nose.x - eyeCenter.x) / eyeDistance * 1.65, -0.72, 0.72);
    const faceHeight = Math.max(eyeDistance, forehead.distanceTo(chin));
    const pitch = THREE.MathUtils.clamp(((nose.y - eyeCenter.y) / faceHeight + 0.2) * 1.55, -0.42, 0.42);
    const target = this.effects[effectId];

    target.rotation.set(pitch, -yaw, roll);
    target.position.z = 20;
    if (effectId === "sunglasses") {
      target.position.set(eyeCenter.x, eyeCenter.y, 20);
      target.scale.setScalar(eyeDistance);
    } else if (effectId === "hat") {
      target.position.set(forehead.x, forehead.y + eyeDistance * 0.48, 20);
      target.scale.setScalar(eyeDistance * 1.05);
      target.rotation.x = pitch - 0.08;
    } else {
      target.position.set(nose.x, nose.y + eyeDistance * 0.08, 20);
      target.scale.setScalar(eyeDistance * 0.96);
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    Object.values(this.effects).forEach(disposeObject);
    this.renderer.dispose();
  }
}

export function isThreeEffect(effectId) {
  return THREE_EFFECTS.has(effectId);
}

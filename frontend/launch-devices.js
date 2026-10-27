import {
  ACESFilmicToneMapping,
  BackSide,
  Box3,
  Color,
  DirectionalLight,
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CSS3DObject, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export const DEVICES_URL = "/models/launch-devices.glb";

const WIDTH = 1920;
const HEIGHT = 1080;
const FOV = 30;
const DEG = Math.PI / 180;
// The lid pose stored in the model as "open": 103° about the hinge.
const LID_OPEN = 1.7994;
// Screen documents keep the panels' aspect ratios (16:10 MacBook, 0.463 iPhone).
export const MAC_SCREEN = { width: 1440, height: 903 };
export const PHONE_SCREEN = { width: 390, height: 843 };

const pose = () => ({ visible: 0, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, scale: 1 });
const shot = () => ({
  light: 0,
  camera: { z: 20, dive: 0 },
  mac: { ...pose(), lid: 0 },
  phone: pose(),
});

/**
 * Everything the timeline animates. Plain numbers, so GSAP can tween and seek them.
 * Each device shot owns its poses so seeking across shots never inherits stale values.
 */
export function createRig() {
  return { active: 0, shot: 0, hero: shot(), finale: shot() };
}

/** A dark keynote stage for reflections: softboxes above, in front and behind, and two coloured rim strips. */
function studio() {
  const room = new Scene();
  room.add(
    new Mesh(
      new SphereGeometry(30, 32, 16),
      new MeshBasicMaterial({ color: "#050507", side: BackSide }),
    ),
  );
  const softbox = (color, intensity, width, height, position) => {
    const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity) });
    const panel = new Mesh(new PlaneGeometry(width, height), material);
    panel.position.set(...position);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  };
  softbox("#ffffff", 5, 18, 5, [0, 14, 3]);
  softbox("#ffffff", 1.2, 8, 12, [-10, 2, 14]);
  softbox("#ffffff", 1.4, 26, 7, [0, 7, -16]);
  softbox("#8b5cf6", 6, 3, 14, [-14, 3, -8]);
  softbox("#60a5fa", 5, 3, 14, [14, 3, -8]);
  return room;
}

function place(object, state) {
  object.visible = state.visible > 0.5;
  object.position.set(state.x, state.y, state.z);
  object.rotation.set(state.pitch * DEG, state.yaw * DEG, state.roll * DEG);
  object.scale.setScalar(state.scale);
}

/** Re-parents a model under a pivot group: base centre for the laptop, geometric centre for the phone. */
function mount(model, quaternion, anchor) {
  const pivot = new Group();
  model.removeFromParent();
  model.position.set(0, 0, 0);
  model.quaternion.copy(quaternion);
  pivot.add(model);
  pivot.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model);
  const center = box.getCenter(new Vector3());
  model.position.set(-center.x, anchor === "base" ? -box.min.y : -center.y, -center.z);
  return pivot;
}

/** Lays a DOM element exactly over a screen mesh; it follows every hinge and camera move. */
function pin(mesh, element, size, rotation) {
  const box = new Box3().setFromBufferAttribute(mesh.geometry.getAttribute("position"));
  const object = new CSS3DObject(element);
  element.style.width = `${size.width}px`;
  element.style.height = `${size.height}px`;
  element.style.pointerEvents = "none";
  element.style.backfaceVisibility = "hidden";
  object.position.copy(box.getCenter(new Vector3()));
  object.rotation.copy(rotation);
  object.scale.setScalar(box.getSize(new Vector3()).x / size.width);
  mesh.add(object);
  return object;
}

/**
 * Photoreal MacBook and iPhone (CC BY 4.0 models, see the film's credits) rendered with three.js.
 * The website UI is real DOM, pinned onto each display with CSS3D so it stays crisp and live.
 */
export function createDevices({ canvas, layer, screens, url = DEVICES_URL }) {
  const gl = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  gl.setClearColor(0x000000, 0);
  gl.toneMapping = ACESFilmicToneMapping;
  gl.setSize(WIDTH, HEIGHT, false);
  const css = new CSS3DRenderer({ element: layer });
  css.setSize(WIDTH, HEIGHT);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(gl);
  const room = studio();
  const environment = pmrem.fromScene(room, 0.02).texture;
  room.traverse((object) => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
  scene.environment = environment;
  const key = new DirectionalLight("#ffffff", 0);
  key.position.set(3, 8, 7);
  const violet = new DirectionalLight("#8b5cf6", 0);
  violet.position.set(-9, 4, -6);
  const blue = new DirectionalLight("#60a5fa", 0);
  blue.position.set(9, 3, -6);
  scene.add(key, violet, blue);

  const camera = new PerspectiveCamera(FOV, WIDTH / HEIGHT, 0.1, 200);
  const rig = createRig();
  const parts = {};
  const eye = new Vector3();
  const target = new Vector3();
  const normal = new Vector3();
  const up = new Vector3();
  const scale = new Vector3();
  const look = new Matrix4();
  const facing = new Quaternion();
  const identity = new Quaternion();

  const ready = new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync(url)
    .then((gltf) => {
      const mac = gltf.scene.getObjectByName("macbook");
      const phone = gltf.scene.getObjectByName("iphone");
      const glass = new MeshStandardMaterial({ color: "#040405", roughness: 0.14, metalness: 0.1 });
      const macPanel = mac.getObjectByName("Object_7");
      const phonePanel = phone.getObjectByName("xXDHkMplTIDAXLN");
      macPanel.material = glass;
      phonePanel.material = glass;
      parts.lid = mac.getObjectByName("Bevels_2");
      parts.mac = mount(mac, identity, "base");
      parts.phone = mount(phone, new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
      parts.macScreen = pin(macPanel, screens.mac, MAC_SCREEN, new Euler(Math.PI / 2, 0, 0));
      pin(phonePanel, screens.phone, PHONE_SCREEN, new Euler(0, Math.PI, 0));
      scene.add(parts.mac, parts.phone);
    });

  /** Camera pose that fills the frame with the laptop display, used for the dive. */
  function frameScreen() {
    const m = parts.macScreen.matrixWorld;
    target.setFromMatrixPosition(m);
    normal.set(0, 0, 1).transformDirection(m);
    up.set(0, 1, 0).transformDirection(m);
    const width = MAC_SCREEN.width * scale.setFromMatrixScale(m).x;
    const distance = width / 2 / (Math.tan((FOV * DEG) / 2) * camera.aspect);
    eye.copy(target).addScaledVector(normal, distance);
    look.lookAt(eye, target, up);
    facing.setFromRotationMatrix(look);
  }

  function render() {
    if (!rig.active || !parts.mac) return;
    const state = rig.shot > 0.5 ? rig.finale : rig.hero;
    place(parts.mac, state.mac);
    place(parts.phone, state.phone);
    parts.lid.rotation.set(-LID_OPEN * state.mac.lid, 0, 0);
    scene.environmentIntensity = state.light;
    key.intensity = 2.4 * state.light;
    violet.intensity = 3.2 * state.light;
    blue.intensity = 2.2 * state.light;
    scene.updateMatrixWorld();
    camera.position.set(0, 0, state.camera.z);
    camera.quaternion.copy(identity);
    if (state.camera.dive > 0) {
      frameScreen();
      camera.position.lerp(eye, state.camera.dive);
      camera.quaternion.slerp(facing, state.camera.dive);
    }
    camera.updateMatrixWorld();
    gl.render(scene, camera);
    css.render(scene, camera);
  }

  return {
    rig,
    ready,
    render,
    setResolution(compScale) {
      gl.setPixelRatio(Math.min(2, Math.max(0.5, devicePixelRatio * compScale)));
      gl.setSize(WIDTH, HEIGHT, false);
    },
    dispose() {
      scene.traverse((object) => {
        object.geometry?.dispose();
        for (const material of [object.material].flat())
          if (material) {
            for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
            material.dispose();
          }
      });
      environment.dispose();
      pmrem.dispose();
      gl.dispose();
      layer.replaceChildren();
    },
  };
}

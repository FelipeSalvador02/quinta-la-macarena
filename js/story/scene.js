// Escena fotográfica. Cada foto real se reproyecta desde su propia cámara sobre dos planos
// (suelo y fondo vertical). La cámara virtual solo se mueve dentro del volumen que la foto
// ya ve, así que la profundidad sale de la geometría y nunca se inventan píxeles.
// Una sola pasada a pantalla completa con dos ranuras (escena actual y siguiente).
import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMapA;
  uniform sampler2D uMapB;
  uniform mat4 uInvA;
  uniform mat4 uInvB;
  uniform mat4 uPhotoA;
  uniform mat4 uPhotoB;
  uniform vec3 uPosA;
  uniform vec3 uPosB;
  uniform float uDepthA;
  uniform float uDepthB;
  uniform float uMix;
  uniform float uFade;
  uniform float uBlur;
  uniform float uSeed;
  uniform float uGrain;
  uniform vec2 uRes;
  uniform vec2 uFocus;
  uniform vec3 uRim;
  uniform float uGlow;
  uniform float uDip;
  uniform float uField;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // rayo de la cámara virtual -> suelo (y = 0) o fondo (z = -depth) -> proyección en la foto
  vec3 photoSample(sampler2D map, mat4 inv, mat4 photo, vec3 pos, float depth, vec2 ndc, float bias) {
    vec4 far = inv * vec4(ndc, 1.0, 1.0);
    vec3 dir = normalize(far.xyz / far.w - pos);
    float tBack = dir.z < -1e-4 ? (-depth - pos.z) / dir.z : 1e6;
    float tGround = dir.y < -1e-4 ? -pos.y / dir.y : 1e6;
    vec3 hit = pos + dir * min(tBack, tGround);
    vec4 c = photo * vec4(hit, 1.0);
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    // el césped cercano se estira en una sola dirección (vetas): ahí se suaviza en vez de estirar
    vec2 ts = vec2(textureSize(map, 0));
    float lx = length(dFdx(uv) * ts), ly = length(dFdy(uv) * ts);
    float aniso = max(lx, ly) / max(min(lx, ly), 1e-4);
    float soften = clamp(log2(aniso) - 1.2, 0.0, 2.5) * 0.75;
    vec3 col = texture(map, clamp(uv, 0.0, 1.0), bias + soften).rgb;
    // red de seguridad: fuera de la foto se funde a verde oscuro
    vec2 e = smoothstep(0.0, 0.006, uv) * smoothstep(0.0, 0.006, 1.0 - uv);
    return mix(vec3(0.012, 0.035, 0.026), col, e.x * e.y);
  }

  void main() {
    vec2 ndc = vUv * 2.0 - 1.0;
    float mixT = clamp(uMix, 0.0, 1.0);
    float bell = sin(3.14159265 * mixT);
    float bias = bell * uBlur;

    vec3 a = vec3(0.0);
    vec3 b = vec3(0.0);
    if (mixT < 0.999) a = photoSample(uMapA, uInvA, uPhotoA, uPosA, uDepthA, ndc, bias);
    if (mixT > 0.001) b = photoSample(uMapB, uInvB, uPhotoB, uPosB, uDepthB, ndc, bias);

    // transición de luz: se abre desde el punto hacia el que avanza la cámara
    vec2 p = (vUv - uFocus) * vec2(uRes.x / uRes.y, 1.0);
    float field = 1.0 - length(p) * 0.9 + (noise(vUv * 3.2 + 7.0) - 0.5) * 0.35;
    float th = mix(1.5, -1.0, mixT);
    float m = smoothstep(th - 0.17, th + 0.17, field); // frente estrecho: menos doble exposición
    vec3 col = mix(a, b, m);
    col = mix(col, col * vec3(0.20, 0.25, 0.36), uDip * bell); // atardecer: baja la luz antes de la noche
    float rim = exp(-pow((field - th) / 0.16, 2.0));
    col += uRim * (rim * 0.42 + uGlow) * bell;

    // tratamiento: sombras hacia el verde de la marca, leve calidez, viñeta
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(0.010, 0.040, 0.028), (1.0 - smoothstep(0.0, 0.22, l)) * 0.30);
    col *= vec3(1.035, 1.0, 0.955);
    float v = smoothstep(1.3, 0.35, length((vUv - 0.5) * vec2(1.25, 1.0)));
    col *= mix(0.62, 1.0, v);
    col = mix(vec3(0.010, 0.032, 0.024), col, uFade);
    // capítulo de vuelo: la escena se apaga a un verde profundo donde flotan las fotos
    col = mix(col, vec3(0.006, 0.022, 0.016) + vec3(0.02, 0.05, 0.035) * (1.0 - length(vUv - 0.5)), uField);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    gl_FragColor.rgb += (hash(gl_FragCoord.xy + uSeed) - 0.5) * uGrain;
  }
`;

// Fotos flotantes del capítulo de vuelo: planos reales en profundidad que la cámara atraviesa.
// Sin marcos: los bordes se disuelven, aparecen desde la niebla y se apartan al pasar.
const fieldVertex = /* glsl */ `
  uniform float uBend;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z -= (uv.x - 0.5) * (uv.x - 0.5) * uBend; // superficie apenas curva, como una lámina
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fieldFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vDist;
  void main() {
    vec3 col = texture(uMap, vUv).rgb;
    vec2 e = smoothstep(0.0, 0.08, vUv) * smoothstep(0.0, 0.08, 1.0 - vUv);
    float near = smoothstep(0.35, 1.5, vDist); // pasan cerca y grandes antes de apartarse
    float far = 1.0 - smoothstep(8.0, 15.0, vDist);
    col *= mix(0.45, 1.0, far);
    gl_FragColor = vec4(col, e.x * e.y * near * far * uOpacity);
    #include <colorspace_fragment>
  }
`;

function photoCamera(info) {
  const cam = new THREE.PerspectiveCamera(info.vfov, info.aspect, 0.1, 500);
  cam.position.set(0, info.height, 0);
  cam.rotation.set(deg(info.pitch), 0, 0);
  cam.updateMatrixWorld(true);
  const half = deg(info.vfov / 2);
  // ángulo (sobre el horizonte) del rayo que pasa por la línea suelo/fondo
  const boundaryAngle = deg(info.pitch) + Math.atan((0.5 - info.boundary) * 2 * Math.tan(half));
  return {
    vp: new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse),
    depth: info.height / Math.tan(-Math.min(boundaryAngle, -0.005)),
    hfov: 2 * Math.atan(Math.tan(half) * info.aspect),
    top: deg(info.pitch) + half,
    bottom: deg(info.pitch) - half
  };
}

export async function createScene(canvas, { scenes, field = { photos: [] }, dpr, blur, onLost, onTexture }) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dpr));
  renderer.autoClear = false;

  const loader = new THREE.TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const sets = scenes.map((info) => ({
    info, photo: photoCamera(info), cam: new THREE.PerspectiveCamera(), tex: null
  }));
  for (const s of sets) s.cam.rotation.order = 'YXZ';

  const placeholder = new THREE.DataTexture(new Uint8Array([4, 10, 8, 255]), 1, 1);
  placeholder.needsUpdate = true;

  const uniforms = {
    uMapA: { value: placeholder }, uMapB: { value: placeholder },
    uInvA: { value: new THREE.Matrix4() }, uInvB: { value: new THREE.Matrix4() },
    uPhotoA: { value: new THREE.Matrix4() }, uPhotoB: { value: new THREE.Matrix4() },
    uPosA: { value: new THREE.Vector3() }, uPosB: { value: new THREE.Vector3() },
    uDepthA: { value: 10 }, uDepthB: { value: 10 },
    uMix: { value: 0 }, uFade: { value: 0 }, uBlur: { value: blur },
    uSeed: { value: 0 }, uGrain: { value: 0.022 },
    uRes: { value: new THREE.Vector2(1, 1) }, uFocus: { value: new THREE.Vector2(0.5, 0.5) },
    uRim: { value: new THREE.Vector3(1, 0.86, 0.68) }, uGlow: { value: 0.07 }, uDip: { value: 0 },
    uField: { value: 0 }
  };

  const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const screenCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---- capítulo de vuelo ----
  const fieldScene = new THREE.Scene();
  const fieldCam = new THREE.PerspectiveCamera(field.fov || 55, 1, 0.1, 60);
  const fieldOpacity = { value: 0 };
  const fieldGeo = new THREE.PlaneGeometry(1, 1, 16, 1); // subdividida a lo ancho para la curva
  const spacing = field.spacing || 3.4;
  const floaters = field.photos.map((src, k) => {
    const side = k % 2 ? 1 : -1;
    const jitter = Math.sin(k * 12.9898) * 0.5 + 0.5; // determinista
    const mat = new THREE.ShaderMaterial({
      vertexShader: fieldVertex, fragmentShader: fieldFragment, transparent: true, depthWrite: false, depthTest: false,
      uniforms: { uMap: { value: placeholder }, uOpacity: fieldOpacity, uBend: { value: 0.18 } }
    });
    const mesh = new THREE.Mesh(fieldGeo, mat);
    mesh.position.set(side * ((field.spread || 1.45) + jitter * 0.35), (jitter - 0.5) * 0.7, -3 - k * spacing);
    mesh.rotation.set(0, -side * 0.28, (jitter - 0.5) * 0.04);
    mesh.visible = false;
    fieldScene.add(mesh);
    return { src, mesh, tex: null };
  });
  const fieldLength = 3 + floaters.length * spacing;

  let width = 1, height = 1, disposed = false;

  const onContextLost = (e) => { e.preventDefault(); onLost && onLost(); };
  canvas.addEventListener('webglcontextlost', onContextLost);

  async function load(set) {
    const tex = await loader.loadAsync(set.info.src);
    if (disposed) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso; // el suelo se ve en ángulo rasante
    set.tex = tex;
    onTexture && onTexture();
  }
  await load(sets[0]);
  // el resto, en orden y sin bloquear: cuando el visitante llega, la siguiente ya está lista
  const rest = sets.slice(1).reduce((p, s) => p.then(() => load(s)).catch(() => {}), Promise.resolve())
    .then(() => floaters.reduce((p, f) => p.then(() => loadFloater(f)).catch(() => {}), Promise.resolve()));

  async function loadFloater(f) {
    const tex = await loader.loadAsync(f.src);
    if (disposed) { tex.dispose(); return; }
    tex.colorSpace = THREE.SRGBColorSpace;
    f.tex = tex;
    f.mesh.material.uniforms.uMap.value = tex;
    const size = field.size || 2.1, r = tex.image.width / tex.image.height;
    f.mesh.scale.set(r >= 1 ? size : size * r, r >= 1 ? size / r : size, 1);
    f.mesh.visible = true;
    onTexture && onTexture();
  }

  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    renderer.setSize(width, height, false);
    uniforms.uRes.value.set(width, height);
  }

  // cámara virtual: nunca más ancha que la foto, nunca detrás de ella, nunca mirando fuera
  function placeCamera(set, st, scale) {
    const { info, photo, cam } = set;
    const aspect = width / height;
    const limitV = 2 * Math.atan(Math.tan((photo.hfov * 0.96) / 2) / aspect);
    const fov = Math.min(deg(info.vfov * scale), limitV) * (st.zoom ?? 1);
    const d = Math.max(0, st.dolly);
    const D = photo.depth;
    const topLimit = Math.atan((info.height + D * Math.tan(photo.top) - st.lift) / Math.max(D - d, 0.5));
    const pitchMax = topLimit - fov / 2;
    const pitchMin = photo.bottom + fov / 2;
    const pitch = pitchMin > pitchMax ? (pitchMin + pitchMax) / 2 : Math.min(Math.max(deg(st.pitch), pitchMin), pitchMax);
    // lo mismo a los lados: el giro no puede sacar el borde del encuadre fuera de la foto
    // (en fotos verticales el margen lateral es pequeño)
    const halfH = Math.atan(Math.tan(fov / 2) * aspect);
    const sideLimit = Math.atan((D * Math.tan(photo.hfov / 2) - Math.abs(st.x)) / Math.max(D - d, 0.5));
    const yawMax = Math.max(0, sideLimit - halfH - 0.01);
    const yaw = Math.min(Math.max(deg(st.yaw), -yawMax), yawMax);

    cam.fov = THREE.MathUtils.radToDeg(fov);
    cam.aspect = aspect;
    cam.near = 0.1; cam.far = 500;
    cam.updateProjectionMatrix();
    cam.position.set(-Math.sin(yaw) * d + st.x, st.lift, -Math.cos(yaw) * d);
    cam.rotation.set(pitch, yaw, 0);
    cam.updateMatrixWorld(true);
  }

  function bind(slot, set, st, scale) {
    placeCamera(set, st, scale);
    uniforms['uMap' + slot].value = set.tex || placeholder;
    uniforms['uInv' + slot].value.multiplyMatrices(set.cam.matrixWorld, set.cam.projectionMatrixInverse);
    uniforms['uPhoto' + slot].value.copy(set.photo.vp);
    uniforms['uPos' + slot].value.copy(set.cam.position);
    uniforms['uDepth' + slot].value = set.photo.depth;
  }

  // view.seg: 0 = primera escena; 1.5 = a mitad de camino entre la 2.ª y la 3.ª
  function render(view, scale) {
    const n = sets.length;
    const seg = Math.min(Math.max(view.seg, 0), n - 1);
    const i = Math.min(Math.floor(seg), n - 2);
    let mix = seg - i;
    const next = sets[i + 1];
    if (!next.tex) mix = 0; // la siguiente foto aún no llegó: se espera en la actual
    bind('A', sets[i], view.cams[i], scale);
    bind('B', next, view.cams[i + 1], scale);
    const light = next.info.light || {};
    if (light.rim) uniforms.uRim.value.fromArray(light.rim);
    uniforms.uGlow.value = light.glow ?? 0.07;
    uniforms.uDip.value = light.dip ?? 0;
    uniforms.uFocus.value.fromArray(sets[i].info.focus || [0.5, 0.5]);
    uniforms.uMix.value = mix;
    uniforms.uFade.value = view.fade;
    uniforms.uSeed.value = (uniforms.uSeed.value + 17.13) % 1000;
    const f = Math.min(Math.max(view.field || 0, 0), 1);
    uniforms.uField.value = f;
    renderer.clear();
    renderer.render(scene, screenCam);
    if (f > 0.001 && floaters.length) {
      // la cámara avanza entre las fotos con un vaivén suave, mirando un poco hacia la siguiente
      const t = view.fieldT || 0;
      const z = 1 - t * fieldLength;
      const sway = Math.sin(t * Math.PI * 3) * 0.28 + (view.px || 0) * 0.25;
      fieldCam.aspect = width / height;
      fieldCam.updateProjectionMatrix();
      fieldCam.position.set(sway, (view.py || 0) * -0.12, z);
      fieldCam.lookAt(sway * 0.4, 0, z - 6);
      fieldOpacity.value = f;
      renderer.render(fieldScene, fieldCam);
    }
  }

  resize(canvas.clientWidth, canvas.clientHeight);
  await renderer.compileAsync(scene, screenCam);
  // compilar también el material de las fotos flotantes, para que no se trabe al llegar
  if (floaters.length) {
    floaters.forEach((f) => { f.mesh.visible = true; });
    await renderer.compileAsync(fieldScene, fieldCam);
    floaters.forEach((f) => { f.mesh.visible = !!f.tex; });
  }

  function dispose() {
    disposed = true;
    canvas.removeEventListener('webglcontextlost', onContextLost);
    for (const s of sets) if (s.tex) s.tex.dispose();
    for (const f of floaters) { if (f.tex) f.tex.dispose(); f.mesh.material.dispose(); }
    fieldGeo.dispose();
    placeholder.dispose();
    quad.geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { render, resize, dispose, rest, info: renderer.info };
}

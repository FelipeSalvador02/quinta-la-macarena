// Recorrido inmersivo. Una sola timeline maestra (GSAP + ScrollTrigger, scroll nativo)
// mueve las cámaras, las transiciones entre fotos y los textos. Si algo falla o el equipo no
// da el rendimiento, la sección queda en su versión estática (fotos + texto en flujo normal).
import { profiles, timing } from './config.js';

const { gsap, ScrollTrigger } = window;
const root = document.querySelector('.story');
const html = document.documentElement;

function canRun() {
  if (!gsap || !ScrollTrigger || !root) return false;
  if (new URLSearchParams(location.search).has('estatico')) return false; // para revisar el respaldo
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const c = navigator.connection;
  if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

let scene = null, mm = null, live = false, tl = null, dirty = true;
let profile = profiles.desktop;

const state = { seg: 0, fade: 0, intro: 0, field: 0, fieldT: 0, px: 0, py: 0, cams: [] };
const view = { seg: 0, fade: 0, field: 0, fieldT: 0, px: 0, py: 0, cams: [] };
const markDirty = () => { dirty = true; };
const headerHeight = () => document.querySelector('header')?.offsetHeight || 0;

function toStatic() {
  live = false;
  if (mm) mm.revert();
  mm = null;
  gsap && gsap.ticker.remove(tick);
  html.classList.remove('story-3d', 'story-live');
  if (scene) scene.dispose();
  scene = null;
  ScrollTrigger && ScrollTrigger.refresh();
}

async function start() {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  const canvas = root.querySelector('.story-canvas');
  profile = matchMedia('(max-width: 767px)').matches ? profiles.mobile : profiles.desktop;
  resetCams(profile);

  // la escena se prepara mientras se ve la versión estática; el cambio ocurre solo arriba del todo
  const { createScene } = await import('./scene.js');
  scene = await createScene(canvas, {
    scenes: profile.scenes, field: profile.field, dpr: profile.dpr, blur: profile.blur, onLost: toStatic, onTexture: markDirty
  });
  if (window.scrollY > innerHeight * 0.4) { toStatic(); return; }

  html.style.setProperty('--hh', headerHeight() + 'px');
  html.classList.add('story-3d');
  const stage = root.querySelector('.story-stage');
  scene.resize(stage.clientWidth, stage.clientHeight);
  new ResizeObserver(() => {
    if (!scene) return;
    html.style.setProperty('--hh', headerHeight() + 'px');
    scene.resize(stage.clientWidth, stage.clientHeight);
    markDirty();
  }).observe(stage);

  // el juego de fotos se elige al cargar (vertical en móvil); al cruzar el corte solo se reajusta
  mm = gsap.matchMedia();
  mm.add({ any: '(min-width: 1px)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    if (ctx.conditions.reduce) { queueMicrotask(toStatic); return; }
    build(profile);
    return () => { tl = null; };
  });

  live = true;
  gsap.ticker.add(tick);
  intro();
}

function resetCams(p) {
  state.cams = p.scenes.map((s) => ({ ...s.from, x: 0 }));
  view.cams = p.scenes.map((s) => ({ ...s.from, x: 0 }));
}

function build(p) {
  resetCams(p);
  Object.assign(state, { seg: 0, field: 0, fieldT: 0 });
  const T = timing;
  const beats = [...root.querySelectorAll('.beat .beat-copy')];
  const navLinks = [...root.querySelectorAll('.story-nav a')];
  const hint = root.querySelector('.story-hint');
  const bar = root.querySelector('.hud-bar i');
  setBar = bar ? gsap.quickSetter(bar, 'scaleX') : () => {};
  lastChapter = -1;

  // estado inicial explícito de los textos que entran después (con stagger, immediateRender
  // solo fijaría el primer elemento)
  // (el contenedor también: lleva la sombra que da contraste y no debe verse sin su texto)
  beats.slice(1).forEach((b) => { gsap.set(b, { autoAlpha: 0, y: 0 }); gsap.set(b.children, { autoAlpha: 0, y: 28 }); });

  tl = gsap.timeline({
    defaults: { ease: 'none' },
    onUpdate: () => { markDirty(); setNav(navLinks); },
    scrollTrigger: {
      trigger: root,
      start: () => `top ${headerHeight()}px`,
      end: 'bottom bottom',
      scrub: p.scrub,
      invalidateOnRefresh: true,
      // al soltar, el scroll se acomoda en el capítulo más cercano en la dirección del gesto
      // (no se toca la rueda ni el dedo mientras se desliza)
      // inertia: false = sin proyectar la velocidad, así un gesto rápido no se salta capítulos
      snap: { snapTo: 'labelsDirectional', inertia: false, duration: { min: 0.35, max: 0.9 }, delay: 0.12, ease: 'power2.inOut' },
      onUpdate: () => { lastInput = gsap.ticker.time; }
    }
  });
  T.labels.forEach((t, i) => tl.addLabel('m' + i, t));
  tl.addLabel('fin', T.total);

  // indicación de deslizar: se va con el primer gesto
  if (hint) tl.fromTo(hint, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.35, ease: 'power2.out', immediateRender: false }, 0.05);

  // cámaras: lineal en el jardín (responde desde el primer scroll y llega con velocidad a la
  // transición); en las demás frena al final para dejar leer
  p.scenes.forEach((s, i) => {
    const [t0, t1] = T.cams[i];
    tl.to(state.cams[i], { ...s.to, ease: i === 0 ? 'none' : 'power1.out', duration: t1 - t0 }, t0);
  });

  // transiciones: la luz abre la foto siguiente mientras ambas cámaras siguen avanzando
  T.transitions.forEach(([t0, t1, kind], i) => {
    tl.fromTo(state, { seg: i }, { seg: i + 1, ease: kind === 'cover' ? 'none' : 'sine.inOut', duration: t1 - t0, immediateRender: false }, t0);
  });

  // capítulo de vuelo: la escena se apaga, la cámara atraviesa las fotos y aparece la ceremonia
  const F = T.field;
  tl.fromTo(state, { field: 0 }, { field: 1, ease: 'power2.out', duration: F.in[1] - F.in[0], immediateRender: false }, F.in[0])
    .fromTo(state, { fieldT: 0 }, { fieldT: 1, ease: 'none', duration: F.travel[1] - F.travel[0], immediateRender: false }, F.travel[0])
    .to(state, { field: 0, ease: 'sine.inOut', duration: F.out[1] - F.out[0] }, F.out[0]);

  // textos: salen con la cámara, entran cuando la escena ya cambió (objeto nuevo en cada tween:
  // GSAP modifica los vars que recibe)
  const reveal = () => ({ autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.8, stagger: 0.09 });
  const leave = () => ({ autoAlpha: 0, y: -36, ease: 'power2.out', duration: 0.85 });
  T.beats.forEach(([tin, tout], i) => {
    const el = beats[i];
    if (!el) return;
    if (i > 0) {
      tl.fromTo(el, { autoAlpha: 0, y: 0 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.6 }, tin)
        .fromTo(el.children, { autoAlpha: 0, y: 28 }, reveal(), tin);
    }
    if (tout != null) tl.to(el, leave(), tout);
  });
  tl.set({}, {}, T.total);

  navLinks.forEach((a) => a.addEventListener('click', onNav));
  setNav(navLinks);
  markDirty();
}

function onNav(e) {
  if (!tl || !tl.scrollTrigger) return;
  e.preventDefault();
  const i = [...root.querySelectorAll('.story-nav a')].indexOf(e.currentTarget);
  window.scrollTo({ top: tl.scrollTrigger.labelToScroll('m' + i), behavior: 'smooth' });
}

let setBar = () => {}, lastChapter = -1;
function setNav(links) {
  if (!tl) return;
  const t = tl.time();
  setBar(tl.progress());
  // momento activo: el último cuyo texto ya empezó a entrar
  let k = 0;
  timing.beats.forEach(([tin], i) => { if (t >= tin - 0.3) k = i; });
  if (k === lastChapter) return;
  lastChapter = k;
  links.forEach((a, i) => a.toggleAttribute('aria-current', i === k));
  const num = root.querySelector('.hud-num'), name = root.querySelector('.hud-name');
  if (num) num.textContent = String(k + 1).padStart(2, '0');
  if (name) name.textContent = timing.chapters[k];
}

// entrada: la foto aparece y la cámara se asienta; los textos ya están visibles
function intro() {
  gsap.to(state, { fade: 1, duration: 0.9, ease: 'power2.out', onUpdate: markDirty });
  gsap.to(state, { intro: 1, duration: 1.6, ease: 'expo.out', onUpdate: markDirty,
    onComplete: () => html.classList.add('story-live') });
  gsap.to(root.querySelector('.story-canvas'), { autoAlpha: 1, duration: 0.6, ease: 'power2.out' });
}

// puntero (solo ratón): la cámara se desplaza unos centímetros, con inercia
let lastInput = 0;
if (gsap && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const toX = gsap.quickTo(state, 'px', { duration: 1.1, ease: 'power3', onUpdate: markDirty });
  const toY = gsap.quickTo(state, 'py', { duration: 1.1, ease: 'power3', onUpdate: markDirty });
  window.addEventListener('pointermove', (e) => {
    if (!live || !profile.pointer) return;
    lastInput = gsap.ticker.time;
    toX((e.clientX / innerWidth) * 2 - 1);
    toY((e.clientY / innerHeight) * 2 - 1);
  }, { passive: true });
}

// ---- bucle único (ticker de GSAP): dibuja solo cuando algo cambió ----
let probe = [], probing = true, frame = 0;

function tick(time, deltaTime) {
  if (!live || !scene) return;
  frame++;
  // deriva ambiental solo en la llegada y mientras haya actividad reciente (no gastar batería)
  const early = tl ? tl.time() / timing.cams[0][1] : 0;
  const ambient = profile.ambient && tl && early < 0.2 && time - lastInput < 15;
  if (!dirty && !ambient) return;
  if (!dirty && ambient && frame % 2) return; // la deriva basta a 30 fps
  dirty = false;

  const s = state, drift = ambient ? 1 - early / 0.2 : 0;
  s.cams.forEach((c, i) => {
    const v = view.cams[i];
    Object.assign(v, c);
    v.x = s.px * (i === 0 ? 0.22 : 0.12);
    v.yaw = c.yaw - s.px * (i === 0 ? 0.7 : 0.5);
    v.lift = c.lift + Math.max(0, -s.py) * 0.06;
  });
  const a = view.cams[0];
  a.dolly = s.cams[0].dolly - (1 - s.intro) * profile.scenes[0].from.dolly;
  a.x += Math.sin(time * 0.31) * 0.07 * drift;
  a.lift += (Math.sin(time * 0.23) * 0.5 + 0.5) * 0.04 * drift;
  view.seg = s.seg; view.fade = s.fade;
  view.field = s.field; view.fieldT = s.fieldT; view.px = s.px; view.py = s.py;

  scene.render(view, profile.vfovScale);

  // si los primeros fotogramas van por debajo de ~30 fps, se pasa a la versión estática
  // (se ignoran saltos > 250 ms: pestaña en segundo plano o pausa del navegador, no lentitud)
  if (probing && deltaTime < 250) {
    probe.push(deltaTime);
    if (probe.length >= 45) {
      probing = false;
      const sorted = probe.slice(5).sort((x, y) => x - y);
      if (sorted[Math.floor(sorted.length / 2)] > 34) toStatic();
    }
  }
}

if (canRun()) start().catch(() => toStatic());

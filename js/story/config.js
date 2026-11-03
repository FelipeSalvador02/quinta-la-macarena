// Parámetros del recorrido. Todas las fotos son reales (material entregado por Felipe).
// Los valores de cámara de cada foto son estimaciones de cómo se tomó:
//   vfov     campo de visión vertical (grados)
//   pitch    inclinación de la cámara original (negativo = mirando hacia abajo)
//   height   altura de la cámara (m)
//   boundary fila de la foto (0 arriba, 1 abajo) donde el suelo se encuentra con el fondo
// Cada escena tiene un movimiento de cámara virtual (from -> to) y la luz con que llega.
// yaw positivo = girar a la izquierda. zoom < 1 cierra el encuadre (acercamiento óptico, sin deformar).
// Las sillas y mesas son verticales pero se proyectan sobre el suelo: en esas escenas la cámara
// casi no se desplaza y el movimiento sale de girar y acercar, que no deforma nada.

const jardin = { aspect: 1600 / 738, vfov: 52, pitch: 0, height: 1.6, boundary: 0.535 };
const pabellon = { aspect: 4 / 3, vfov: 58, pitch: 0, height: 1.5, boundary: 0.74 };
const ceremonia = { aspect: 4 / 3, vfov: 50, pitch: -15, height: 1.5, boundary: 0.27 };
const recepcion = { aspect: 4 / 3, vfov: 50, pitch: -14, height: 1.5, boundary: 0.42 };
const noche = { aspect: 4 / 3, vfov: 50, pitch: -12, height: 1.5, boundary: 0.42 };
const atardecer = { aspect: 1206 / 560, vfov: 38, pitch: 0, height: 1.6, boundary: 0.75 }; // casa con arcos, de frente

// luz de llegada a cada escena (la primera no tiene transición)
const luzDia = { rim: [1.0, 0.86, 0.68], glow: 0.07, dip: 0 };
const luzTarde = { rim: [1.0, 0.78, 0.52], glow: 0.05, dip: 0.15 };
const luzNoche = { rim: [0.95, 0.86, 1.0], glow: 0.03, dip: 0.72 }; // cae la noche y se encienden las mesas

export const profiles = {
  desktop: {
    dpr: 1.75, scrub: 1, ambient: true, pointer: true, blur: 2.2, vfovScale: 0.96,
    scenes: [
      { id: 'jardin', src: 'images/story/jardin.jpg', ...jardin, focus: [0.46, 0.5],
        from: { dolly: 0.8, yaw: 2, pitch: 0, lift: 1.6 }, to: { dolly: 13, yaw: 8, pitch: 3.5, lift: 1.95 } },
      // pitch arriba: la puerta y el interior quedan abajo, bajo el texto, sin protagonismo
      { id: 'pabellon', src: 'images/story/pabellon.jpg', ...pabellon, focus: [0.5, 0.42], light: luzDia,
        from: { dolly: 0, yaw: 0, pitch: 7, lift: 1.5 }, to: { dolly: 0.85, yaw: -4, pitch: 7, lift: 1.5 } },
      // caminar por el pasillo de pétalos hacia el arco
      { id: 'ceremonia', src: 'images/story/ceremonia.jpg', ...ceremonia, focus: [0.52, 0.36], light: luzDia,
        from: { dolly: 0, yaw: 0, pitch: -15, lift: 1.5, zoom: 0.94 }, to: { dolly: 1.1, yaw: 0, pitch: -10.5, lift: 1.5, zoom: 0.8 } },
      { id: 'recepcion', src: 'images/story/recepcion.jpg', ...recepcion, focus: [0.62, 0.45], light: luzTarde,
        from: { dolly: 0, yaw: 4, pitch: -14, lift: 1.5, zoom: 0.92 }, to: { dolly: 0.6, yaw: -2, pitch: -11, lift: 1.5, zoom: 0.8 } },
      // final: cae la tarde y la casa de los arcos espera con las luces encendidas
      { id: 'atardecer', src: 'images/galeria/casa-atardecer.jpg', ...atardecer, focus: [0.5, 0.5], light: luzNoche,
        from: { dolly: 0, yaw: 0, pitch: 0, lift: 1.6, zoom: 0.94 }, to: { dolly: 1.3, yaw: 0, pitch: 1.5, lift: 1.6, zoom: 0.9 } }
    ],
    // capítulo de vuelo: fotos reales de rincones y montajes, de los jardines a los eventos
    field: { fov: 50, spread: 1.75, size: 2.9, spacing: 3.6, photos: ['r04', 'r11', 'r05', 'r06', 'r09', 'r07', 'r18', 'r15', 'r19', 'r25', 'r27'].map((n) => `images/story/recorrido/${n}.jpg`) }
  },
  mobile: {
    dpr: 1.5, scrub: 0.8, ambient: true, pointer: false, blur: 1.2, vfovScale: 0.97,
    scenes: [
      // en móvil la llegada usa la foto vertical del jardín: más nitidez a pantalla completa
      { id: 'jardin', src: 'images/story/jardin-vertical.jpg', aspect: 720 / 1280, vfov: 66, pitch: -2, height: 1.5, boundary: 0.53,
        focus: [0.68, 0.48],
        from: { dolly: 0.5, yaw: -2, pitch: -2, lift: 1.5 }, to: { dolly: 6, yaw: -7, pitch: 0, lift: 1.7 } },
      { id: 'pabellon', src: 'images/story/pabellon-m.jpg', ...pabellon, focus: [0.5, 0.42], light: luzDia,
        from: { dolly: 0, yaw: -8, pitch: 4, lift: 1.5 }, to: { dolly: 0.55, yaw: -9, pitch: 4, lift: 1.5 } },
      { id: 'ceremonia', src: 'images/story/ceremonia-vertical.jpg', aspect: 0.75, vfov: 66, pitch: -22, height: 1.5, boundary: 0.25,
        focus: [0.5, 0.3], light: luzDia,
        from: { dolly: 0, yaw: 0, pitch: -22, lift: 1.5, zoom: 0.94 }, to: { dolly: 0.8, yaw: 0, pitch: -17, lift: 1.5, zoom: 0.82 } },
      { id: 'recepcion', src: 'images/story/recepcion-vertical.jpg', aspect: 0.75, vfov: 66, pitch: -20, height: 1.5, boundary: 0.32,
        focus: [0.5, 0.35], light: luzTarde,
        from: { dolly: 0, yaw: 0, pitch: -20, lift: 1.5, zoom: 0.94 }, to: { dolly: 0.45, yaw: 0, pitch: -17, lift: 1.5, zoom: 0.84 } },
      { id: 'noche', src: 'images/story/noche-m.jpg', ...noche, focus: [0.5, 0.42], light: luzNoche,
        from: { dolly: 0, yaw: 0, pitch: -12, lift: 1.5, zoom: 0.92 }, to: { dolly: 0.5, yaw: 0, pitch: -9, lift: 1.5, zoom: 0.84 } }
    ],
    // en móvil, menos fotos, más juntas y más cerca del centro (pantalla estrecha)
    field: { fov: 60, spread: 0.6, size: 1.9, spacing: 3.2, photos: ['r04', 'r08', 'r06', 'r09', 'r18', 'r15', 'r25'].map((n) => `images/story/recorrido/${n}.jpg`) }
  }
};

// Timeline maestra (unidades arbitrarias). Cada escena: cuándo se mueve su cámara y cuándo
// entra (transición desde la anterior; 'cover' = cambio oculto bajo el capítulo de vuelo).
// Cada texto: cuándo entra y sale (el último no sale). Las etiquetas son los puntos donde el
// scroll se acomoda al soltar (cada capítulo con su texto completo a la vista).
export const timing = {
  total: 33,
  cams: [[0.15, 6.8], [4.75, 11.6], [15.0, 21.4], [20.6, 27.0], [26.1, 33]],
  transitions: [[4.75, 6.85], [13.0, 13.05, 'cover'], [20.6, 22.7], [26.1, 28.5]],
  field: { in: [10.0, 11.3], travel: [10.0, 16.3], out: [15.0, 16.4] },
  beats: [[0, 0.45], [2.0, 4.2], [6.9, 9.4], [11.6, 14.6], [16.7, 19.9], [22.8, 25.6], [28.6, null]],
  labels: [0, 3.2, 8.2, 13.2, 18.4, 24.3, 31.2],
  chapters: ['Llegada', 'Jardín', 'La Quinta', 'Recorre', 'Bodas', 'Celebraciones', 'Tu fecha']
};


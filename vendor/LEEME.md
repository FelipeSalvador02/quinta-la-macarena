# vendor

Librerías servidas desde el propio repo (sin CDN en el navegador). Copiadas de los paquetes oficiales de npm, sin modificar.

| Archivo | Paquete | Licencia | SHA256 (inicio) |
|---|---|---|---|
| `three/three.module.min.js` | three@0.182.0 `build/` | MIT (`three/LICENSE`) | 0F860495069067A1 |
| `three/three.core.min.js` | three@0.182.0 `build/` | MIT | E5A824C8EC97EE44 |
| `gsap/gsap.min.js` | gsap@3.13.0 `dist/` | GSAP Standard "no charge" license (https://gsap.com/standard-license) | 96C01B81F44A3290 |
| `gsap/ScrollTrigger.min.js` | gsap@3.13.0 `dist/` | ídem | 308219390E5E3B84 |

Las usa solo `js/story/` y únicamente cuando el dispositivo puede ejecutar la experiencia. Para retirarlas: borrar `vendor/`, `js/story/` y las etiquetas `<script>` correspondientes en `index.html`; la página queda en su versión estática.

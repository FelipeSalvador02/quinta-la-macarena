# Quinta La Macarena — Página web

Página de una sola página (HTML + CSS + JavaScript, sin servidor, sin base de datos y sin librerías). Objetivo: que los visitantes consulten disponibilidad y pidan una cotización por WhatsApp.

## Contenido de la carpeta

```
index.html            La página completa (textos, estilos y funcionamiento)
README.md             Este archivo
images/               Imágenes que usa la página (ya optimizadas)
  logo.png, portada-jardin.jpg, ventanales.jpg, jardin.jpg,
  montaje-carpa-1.jpg, montaje-carpa-2.jpg, favicon.png
  originales/         Fotos originales sin optimizar, solo de respaldo
```

## 1. Ver la página en tu computadora

- **Forma más simple:** haz doble clic en `index.html`. Se abre en tu navegador.
- **Opcional (como si estuviera publicada):** abre una terminal en esta carpeta y ejecuta `python3 -m http.server 8000`; luego entra a http://localhost:8000.
- Las tipografías (Lora e Inter) se cargan desde Google Fonts, por lo que necesitas internet para verlas. Sin internet la página funciona con tipografías del sistema.

## 2. Modificar textos

Abre `index.html` con un editor de texto (VS Code, Bloc de notas, etc.), busca el texto que quieres cambiar con Ctrl+F, edítalo y guarda. Mantén intactas las etiquetas entre `<` y `>`.

**Números y mensajes de WhatsApp:** los enlaces empiezan con `https://wa.me/593969139204?text=`. Lo que va después es el mensaje codificado. Para cambiar un mensaje, codifícalo así: abre cualquier navegador, pulsa F12, entra a "Consola" y escribe `encodeURIComponent("tu mensaje aquí")`; copia el resultado (sin comillas) después de `?text=`. Para cambiar el número, reemplaza `593969139204` en todos los enlaces (código de país sin "+" ni espacios).

**Datos pendientes:** en `index.html` hay comentarios `[PENDIENTE DE CONFIRMAR]` con los datos que aún faltan (capacidad, servicios incluidos, otros tipos de evento, imagen para redes y dirección web).

## 3. Cambiar o agregar imágenes

- Para **reemplazar** una foto, guarda la nueva en `images/` con **el mismo nombre y formato** (por ejemplo `jardin.jpg`).
- Medidas recomendadas: 1200 px de ancho, JPG, calidad 70–75 % (la portada, 1600 px de ancho). Conserva la proporción original para que no se deforme.
- Para **cambiar el texto descriptivo** (importante para accesibilidad y SEO), edita el atributo `alt="..."` de esa imagen en `index.html`.
- Para **agregar** una foto a la galería, copia uno de los bloques `<button class="g" ...>...</button>` dentro de `<div class="gal">`, cambia `src`, `alt` y `data-cap` (el pie de foto del visor ampliado).

## 4. Publicar la página (opciones gratuitas o de bajo costo)

Cualquiera de estas sirve; sube la carpeta completa (no solo `index.html`).

1. **Netlify Drop** (la más fácil): entra a https://app.netlify.com/drop y arrastra la carpeta. Obtienes un enlace de inmediato.
2. **Cloudflare Pages:** crea una cuenta, elige "Pages" → "Subir recursos directos" y sube la carpeta.
3. **GitHub Pages:** crea un repositorio, sube los archivos y activa Pages en Configuración.
4. **Hosting tradicional (cPanel):** sube el contenido de la carpeta a `public_html` por FTP o por el administrador de archivos.

Para usar un dominio propio (por ejemplo, quintalamacarena.com), cómpralo y conéctalo desde el panel del servicio elegido.

**Después de publicar, haz esto una vez:**
- En `index.html`, junto al comentario `[PENDIENTE DE CONFIRMAR] og:image y canonical`, agrega estas dos líneas con tu dirección real: `<link rel="canonical" href="https://TU-DOMINIO/">` y `<meta property="og:image" content="https://TU-DOMINIO/images/portada-jardin.jpg">`. Así se verá la foto al compartir el enlace por WhatsApp y redes.
- Registra la quinta en Google Search Console y verifica que el perfil de Google Maps tenga el mismo nombre, teléfono y ubicación.

## 5. Mantenimiento

- Revisa cada cierto tiempo que los enlaces de WhatsApp, Google Maps, Instagram y Facebook sigan funcionando.
- Guarda una copia de esta carpeta (o el ZIP) antes de cada cambio.
- Actualiza el año del pie de página (`© 2026`) cuando corresponda.
- No agregues precios, capacidades ni testimonios sin confirmación del propietario.

## Datos de contacto usados en la página

WhatsApp/teléfono: +593 96 913 9204 · Correo: quintamacarenapuembo@gmail.com · Instagram: @quinta_la_macarena · Facebook: QuintaMacarena · Mapa: https://maps.app.goo.gl/VwweRRQjFxycARPj9

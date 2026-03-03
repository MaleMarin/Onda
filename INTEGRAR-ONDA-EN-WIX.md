# Cómo poner el chat ONDA en www.precisar.net (Wix)

El chat ONDA puede estar en tu sitio Wix de dos maneras: **embebido** en una página o como **enlace** que abre el chat.

---

## Opción 1: Embeber el chat en una página (recomendado)

Así el visitante ve el chat dentro de precisar.net.

### Pasos en Wix

1. **Entra al editor** de tu sitio: www.precisar.net (editar sitio).
2. **Abre la página** donde quieras el chat (o crea una, por ejemplo "Chatea con ONDA").
3. **Añade un bloque de HTML embebido:**
   - Clic en **"Añadir"** (+) → **"Integrar"** o **"Más"**.
   - Busca **"HTML iframe"** o **"Incrustar"** / **"Embed"** / **"Código personalizado"**.
   - El nombre puede ser: *Embed HTML*, *HTML iframe*, *Código personalizado*.
4. **Pega uno de estos códigos** en el cuadro de HTML.

### Código profesional (recomendado)

El bot dentro del iframe se ve **igual que en local**: mismo fondo gris neumórfico (#d2d6dc), mismo estilo y sombras. El iframe se redimensiona solo según el contenido (postMessage). Puedes cambiar `720` por el ancho máximo que quieras (en px).

```html
<div style="width:100%;max-width:min(720px,92vw);margin:0 auto;border-radius:28px;overflow:hidden;box-shadow:22px 22px 44px rgba(100,105,115,0.8), -22px -22px 44px rgba(255,255,255,0.99);">
  <iframe id="onda-bot" src="https://onda-git-main-precisar.vercel.app/chat?embed=1" width="100%" scrolling="no" style="border:0;display:block;min-height:600px;" title="Chat ONDA - Fundación Precisar"></iframe>
</div>
<script>
(function(){var f=document.getElementById('onda-bot');if(!f)return;window.addEventListener('message',function(e){if(e.data&&typeof e.data.height==='number'&&e.data.height>0)f.style.height=e.data.height+'px';});})();
</script>
```

### Código mínimo (solo iframe)

Si el editor solo acepta un iframe suelto, usa este. Luego en Wix redimensiona el elemento para darle ancho y alto.

```html
<iframe
  src="https://onda-git-main-precisar.vercel.app/chat?embed=1"
  title="Chat ONDA - Fundación Precisar"
  width="400"
  height="600"
  style="border:0;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);"
  loading="lazy"
></iframe>
```

5. **Encajar en Wix:** con el código profesional, el chat ya tiene tamaño definido. Con el mínimo, arrastra las esquinas del elemento en Wix hasta ver bien el chat.
6. **Guarda y publica** el sitio.

### Importante

- La URL del iframe debe ser: **`https://onda-git-main-precisar.vercel.app/chat?embed=1`**
- Escribe **`embed`** con **m** (no "enbed"); si está mal escrito, el chat no se abre bien en la página.
- Con **`?embed=1`** el chat se ve **igual que en local**: mismo fondo gris, neumorfismo y botón Enviar.
- El servidor permite que esta página se abra dentro de iframes (Wix, etc.).

---

## Opción 2: Botón o enlace que abre el chat

Si prefieres no embeber, puedes poner un botón o texto que abra el chat en otra pestaña.

### Pasos en Wix

1. En el editor, **añade un botón** o un **texto**.
2. **Enlázalo** a esta URL:
   ```
   https://onda-git-main-precisar.vercel.app/chat
   ```
3. Configura el enlace para que abra en **"Nueva pestaña"** (si Wix lo permite).

Ejemplos de texto: **"Chatea con ONDA"**, **"Pregúntale a ONDA"**, **"Hablar con ONDA"**.

---

## Resumen de URLs

| Uso | URL |
|-----|-----|
| Embeber en Wix (iframe) | `https://onda-git-main-precisar.vercel.app/chat?embed=1` |
| Abrir en nueva pestaña / enlace | `https://onda-git-main-precisar.vercel.app/chat` |

---

## Si ves otro texto de bienvenida o una versión antigua del chat

Eso significa que **Vercel está sirviendo un deploy viejo**. Para que precisar.net muestre la ONDA actual (texto de bienvenida con 🤖🧠, tres Ondas, etc.):

1. Sube el código más reciente a GitHub (`git push origin main`).
2. En [vercel.com](https://vercel.com) → tu proyecto → **Deployments** → **Redeploy** del último deployment (o espera al deploy automático tras el push).
3. Cuando el deploy esté en **Ready**, recarga la página de precisar.net donde está el iframe.

---

## Si Wix no deja pegar iframe

Algunos planes de Wix restringen HTML. En ese caso:

- Usa la **Opción 2** (botón o enlace a `https://onda-git-main-precisar.vercel.app/chat`), o
- Revisa en la ayuda de Wix cómo añadir **"Embed"** o **"Código personalizado"** en tu plan.

---

## Después de publicar

- Prueba en desktop y en el celular que el chat cargue y que ONDA responda.
- Si usas iframe y el chat no se ve bien (muy alto o muy bajo), cambia en el código el valor de **height** (por ejemplo `height="600"` o `height="500"`).

Cuando esté en vivo en precisar.net, esa misma página sirve para grabar el video para la revisión de Meta.

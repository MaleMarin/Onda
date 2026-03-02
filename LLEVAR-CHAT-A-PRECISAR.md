# Cómo llevar el chat ONDA a la página de Precisar (GitHub + Vercel)

Este documento explica cómo integrar o enlazar el chat ONDA con la página de Precisar que ya está en GitHub y Vercel.

---

## Opción A: Desplegar ondabot en Vercel y embeber en Precisar

Si la página de Precisar es **otro repositorio** (por ejemplo `precisar-web` o `precisar.net`):

### 1. Subir ondabot a GitHub (si aún no está)

```bash
cd /ruta/a/ondabot
git init
git add .
git commit -m "Chat ONDA listo para Vercel"
git remote add origin https://github.com/TU-ORG/ondabot.git
git push -u origin main
```

### 2. Conectar ondabot a Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión.
2. **Add New** → **Project**.
3. Importa el repositorio **ondabot** de GitHub.
4. Configura:
   - **Framework Preset**: Next.js
   - **Root Directory**: (dejar por defecto)
   - **Build Command**: `npm run build` (o `next build`)
   - **Output Directory**: `.next`
5. Añade las **variables de entorno** (Environment Variables):
   - `OPENAI_API_KEY`
   - Para WhatsApp (si lo usas): `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
6. **Deploy**. Vercel te dará una URL tipo: `https://ondabot-xxx.vercel.app`.

### 3. Embeber el chat en la página de Precisar

En el **repositorio de la página de Precisar** (el que está en GitHub y Vercel), añade un iframe o un enlace al chat:

**Si usas HTML/Wix/otro:**

```html
<iframe
  src="https://ondabot-xxx.vercel.app/chat?embed=1"
  title="Chat ONDA"
  width="100%"
  height="500"
  style="border: none; border-radius: 12px; max-width: 980px;"
></iframe>
```

**Si la página de Precisar es Next.js/React**, puedes usar un iframe o un enlace:

```jsx
// Enlace directo
<a href="https://ondabot-xxx.vercel.app/chat" target="_blank" rel="noopener">
  Chatear con ONDA
</a>

// O iframe embebido
<iframe
  src="https://ondabot-xxx.vercel.app/chat?embed=1"
  title="Chat ONDA"
  width="100%"
  height="500"
  style={{ border: 'none', borderRadius: 12, maxWidth: 980 }}
/>
```

Sustituye `ondabot-xxx.vercel.app` por la URL real de tu despliegue.

### 4. Dominio propio (opcional)

En Vercel → Project → **Settings** → **Domains** puedes añadir un subdominio tipo `onda.precisar.net` o `chat.precisar.net` y apuntar el DNS según las instrucciones de Vercel.

---

## Opción B: Integrar el código del chat dentro del repo de Precisar

Si quieres que el chat viva **en el mismo repositorio** que la página de Precisar:

1. Copia la carpeta **ondabot** (o solo las partes necesarias) al repo de Precisar, por ejemplo en `precisar-web/chat` o integrado en las rutas existentes.
2. En el repo de Precisar:
   - Instala dependencias: `npm install` (Next.js, OpenAI, etc.).
   - Añade las variables de entorno en Vercel para ese proyecto.
   - Asegúrate de que la ruta `/chat` (o la que uses) esté disponible en el build.
3. En Vercel, el proyecto de Precisar se vuelve a desplegar y el chat queda en la misma URL base, por ejemplo `https://precisar.net/chat`.

---

## Resumen rápido

| Objetivo | Acción |
|----------|--------|
| Chat en su propia URL | Desplegar ondabot en Vercel (Opción A) y enlazar o embeber desde precisar.net |
| Chat en el mismo sitio Precisar | Integrar código en el repo de Precisar y desplegar todo junto (Opción B) |

Después de desplegar, conviene tener lista la **política de privacidad del chat** y el **proceso de Meta** para WhatsApp (ver los otros documentos en este repo).

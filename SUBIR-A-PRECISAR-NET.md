# Cómo subir ONDA a la web (precisar.net)

Resumen: **subes el código a GitHub** → **Vercel hace el deploy** → **enlazas o embebes el chat en precisar.net (Wix)**.

---

## Paso 1: Subir el código a GitHub

En la terminal, dentro de la carpeta `ondabot`:

```bash
git add .
git status
git commit -m "ONDA listo para producción"
git push origin main
```

(Si tu rama se llama `master`, usa `git push origin master`.)

---

## Paso 2: Deploy en Vercel

### Si ya tienes el proyecto ONDA en Vercel

- Cada vez que haces **push a GitHub**, Vercel despliega solo.
- Entra en [vercel.com](https://vercel.com) → tu proyecto (ej. **onda2026** o **ondabot**) → **Deployments**.
- Espera a que el último deploy diga **Ready** (verde).
- Tu chat queda en: **https://onda2026.vercel.app** (o la URL que te dio Vercel).

### Si es la primera vez

1. Entra en [vercel.com](https://vercel.com) e inicia sesión.
2. **Add New** → **Project**.
3. **Import** el repositorio de GitHub donde está `ondabot` (conectar GitHub si hace falta).
4. **Framework Preset:** Next.js. No cambies **Output Directory** (déjalo vacío).
5. En **Environment Variables** añade al menos:
   - `OPENAI_API_KEY` = tu clave de OpenAI  
   (Las de WhatsApp las añades después si las usas.)
6. **Deploy**. Al terminar, Vercel te dará una URL tipo `https://ondabot-xxxxx.vercel.app`.

---

## Paso 3: Llevar el chat a precisar.net (Wix)

Tu sitio precisar.net está en Wix. Tienes dos opciones.

### Opción A: Embeber el chat en una página

1. Entra al **editor de Wix** de www.precisar.net.
2. Abre (o crea) la página donde quieras el chat.
3. **Añadir** (+) → **Integrar** / **Embed** → **HTML iframe** o **Código personalizado**.
4. Pega este código (cambia la URL si la tuya no es `onda2026.vercel.app`):

```html
<div style="width:100%;max-width:420px;height:600px;min-height:400px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
  <iframe
    src="https://onda2026.vercel.app/chat?embed=1"
    title="Chat ONDA - Fundación Precisar"
    width="100%"
    height="100%"
    style="display:block;border:0;"
    loading="lazy"
  ></iframe>
</div>
```

5. Guarda y **publica** el sitio. El chat se verá dentro de precisar.net.

### Opción B: Botón o enlace que abre el chat

1. En el editor de Wix, añade un **botón** o un **texto**.
2. Pon el enlace: **https://onda2026.vercel.app/chat**
3. Configura que abra en **nueva pestaña**.

Así quien hace clic abre el chat en otra pestaña.

---

## Resumen de URLs

| Dónde | URL |
|-------|-----|
| Chat en Vercel (abrir directo) | https://onda2026.vercel.app o https://onda2026.vercel.app/chat |
| Para embeber en Wix (iframe) | https://onda2026.vercel.app/chat?embed=1 |
| Enlace desde precisar.net | https://onda2026.vercel.app/chat |

(Sustituye `onda2026.vercel.app` por tu URL real de Vercel si es distinta.)

---

## Si el deploy falla en Vercel

- Ve a **Deployments** → clic en el deploy con error → revisa el **log del build**.
- Asegúrate de que **Output Directory** esté vacío y **Framework Preset** sea **Next.js** (Settings → General / Build).
- Guía detallada: [VERCEL-BUILD-ERRORS.md](./VERCEL-BUILD-ERRORS.md).

---

## Dominio propio (opcional)

Si quieres que el chat esté en **onda.precisar.net** en lugar de la URL de Vercel:

1. En Vercel → tu proyecto → **Settings** → **Domains**.
2. Añade **onda.precisar.net** (o chat.precisar.net).
3. En el panel de DNS de tu proveedor (donde está configurado precisar.net), añade el registro que te indique Vercel (normalmente un CNAME apuntando a `cname.vercel-dns.com`).

Cuando el DNS se propague, el chat quedará en https://onda.precisar.net.

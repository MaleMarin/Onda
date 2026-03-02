# Pasos para subir ONDA a precisar.net (Wix)

Sigue estos pasos en orden. Cuando termines, el chat ONDA estará en tu sitio Wix.

---

## 1. Subir el código a GitHub

En la terminal, dentro de la carpeta del proyecto:

```bash
git add .
git status
git commit -m "ONDA listo para precisar.net"
git push origin main
```

(Si tu rama es `master`, usa `git push origin master`.)

---

## 2. Deploy en Vercel

- Si el proyecto **ya está conectado** a Vercel: con el push anterior, Vercel despliega solo. Entra en [vercel.com](https://vercel.com) → tu proyecto **onda2026** (o el nombre que uses) → **Deployments** y espera a que el último diga **Ready**.
- Si es la **primera vez**: [vercel.com](https://vercel.com) → **Add New** → **Project** → Importa el repo de GitHub. Framework: **Next.js**. Añade la variable `OPENAI_API_KEY` en Environment Variables y haz **Deploy**.

Tu chat quedará en una URL como: **https://onda2026.vercel.app**

---

## 3. Poner el chat en Wix (precisar.net)

### Opción A: Embeber el chat en una página (recomendado)

1. Entra al **editor de Wix** de **www.precisar.net**.
2. Abre la página donde quieras el chat (o crea una, por ejemplo "Chatea con ONDA").
3. **Añadir** (+) → **Integrar** / **Embed** → **HTML iframe** o **Código personalizado**.
4. Pega este código (si tu URL de Vercel es otra, cambia `onda2026.vercel.app`):

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

5. **Guardar** y **Publicar** el sitio.

### Opción B: Solo un enlace o botón

- Añade un botón o texto y enlázalo a: **https://onda2026.vercel.app/chat**
- Configura que abra en **nueva pestaña**.

---

## 4. Probar

- Abre **www.precisar.net** y entra a la página donde pusiste el chat.
- Prueba en escritorio y en el celular que cargue y que ONDA responda.

---

## Resumen de URLs

| Uso | URL |
|-----|-----|
| Chat en Vercel (abrir directo) | https://onda2026.vercel.app/chat |
| Para embeber en Wix (iframe) | https://onda2026.vercel.app/chat?embed=1 |

Si tu proyecto en Vercel tiene otra URL (por ejemplo `ondabot-xxxxx.vercel.app`), sustituye `onda2026.vercel.app` por esa URL en el código de arriba.

---

## Si algo falla

- **El build falla en Vercel:** Revisa el log en Deployments → último deploy. Ver [VERCEL-BUILD-ERRORS.md](./VERCEL-BUILD-ERRORS.md).
- **Wix no deja pegar HTML:** Usa la Opción B (enlace a https://onda2026.vercel.app/chat) o revisa en la ayuda de Wix cómo activar "Embed" o "Código personalizado" en tu plan.

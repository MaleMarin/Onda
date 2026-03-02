# Llevar ONDA al público con seguridad

Guía para publicar ONDA en dos fases: **primero la web (Wix)** y **después WhatsApp**, con todas las medidas de seguridad.

---

## Orden recomendado

1. **Web en Wix** – Desplegar el chat en Vercel y embeberlo o enlazarlo en tu sitio Wix (precisar.net). Así el bot está en vivo en la web y puedes probarlo antes de abrir WhatsApp.
2. **WhatsApp** – Configurar el webhook en Meta, variables de entorno y activar el número. Solo cuando la web ya funcione y tengas política de privacidad publicada.

---

## Checklist de seguridad

Antes de ir a producción, asegúrate de:

| Medida | Descripción |
|--------|-------------|
| **HTTPS** | Vercel sirve todo por HTTPS. No uses URLs `http://` en producción. |
| **Variables secretas** | `OPENAI_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` (o `META_APP_SECRET`) **solo en el servidor** (Vercel → Environment Variables). Nunca en el código ni en el cliente. |
| **Firma del webhook** | En producción configura `WHATSAPP_APP_SECRET` (o `META_APP_SECRET`) para que cada POST de Meta se verifique con HMAC SHA-256. Sin esto, cualquiera podría enviar peticiones falsas a tu webhook. |
| **Verify token** | Usa un `WHATSAPP_VERIFY_TOKEN` largo y aleatorio (no "123" ni "test"). Debe coincidir exactamente con el que pongas en Meta. |
| **Política de privacidad** | Para WhatsApp y para revisión de Meta necesitas una URL pública de política de privacidad (ej. en precisar.net). Ver [POLITICA-PRIVACIDAD-CHAT-ONDA.md](./POLITICA-PRIVACIDAD-CHAT-ONDA.md). |

---

## Fase 1: Web en Wix

### 1.1 Desplegar en Vercel

1. **Sube el proyecto a GitHub** (si aún no está):
   ```bash
   cd ondabot
   git add .
   git commit -m "ONDA listo para producción"
   git push origin main
   ```

2. **Conecta con Vercel**  
   - [vercel.com](https://vercel.com) → **Add New** → **Project** → Importa el repo **ondabot**.  
   - Framework: **Next.js**.  
   - Build: `npm run build` (o `next build`).  
   - No hace falta cambiar el directorio raíz.

3. **Variables de entorno en Vercel** (Settings → Environment Variables)  
   Para que el **chat web** funcione solo necesitas:
   - `OPENAI_API_KEY` = tu clave de OpenAI  

   (Las de WhatsApp las añadirás en la Fase 2.)

4. **Deploy**  
   Tras el primer deploy, Vercel te dará una URL como:  
   `https://ondabot-xxxxx.vercel.app`  
   (o tu dominio propio si lo configuras).

5. **Probar el chat**  
   - Abre: `https://TU-URL.vercel.app/chat`  
   - Prueba también: `https://TU-URL.vercel.app/chat?embed=1` (modo compacto para iframe).  
   - Elige una Onda, escribe un mensaje y comprueba que ONDA responde.

### 1.2 Poner el chat en Wix

**Opción A: Embeber en una página (recomendado)**

1. En el **editor de Wix**, abre la página donde quieras el chat (ej. "Chatea con ONDA").
2. Añade un bloque **HTML iframe** o **Código personalizado** (Añadir → Integrar / Embed).
3. Pega este código (sustituye `TU-URL.vercel.app` por tu URL real de Vercel):

```html
<div style="width:100%;max-width:420px;height:600px;min-height:400px;margin:0 auto;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
  <iframe
    src="https://TU-URL.vercel.app/chat?embed=1"
    title="Chat ONDA - Fundación Precisar"
    width="100%"
    height="100%"
    style="display:block;border:0;"
    loading="lazy"
  ></iframe>
</div>
```

4. Guarda y publica el sitio.  
5. Prueba en escritorio y en móvil que el chat cargue y responda.

**Opción B: Botón o enlace**

- Crea un botón o texto y enlázalo a: `https://TU-URL.vercel.app/chat`  
- Configura que abra en **nueva pestaña** si Wix lo permite.

### 1.3 Resumen Fase 1

| Qué | URL / Valor |
|-----|-------------|
| Chat en Vercel | `https://TU-URL.vercel.app/chat` |
| Chat embebido (iframe) | `https://TU-URL.vercel.app/chat?embed=1` |
| Variable mínima para la web | `OPENAI_API_KEY` |

Cuando el chat funcione bien en Wix, pasa a la Fase 2.

---

## Fase 2: WhatsApp

### 2.1 Requisitos previos

- Chat web ya desplegado y funcionando en Vercel.
- Política de privacidad publicada en una URL (ej. en precisar.net).
- App de WhatsApp creada en [Meta for Developers](https://developers.facebook.com/) y número de teléfono configurado (o en proceso).

### 2.2 Variables de entorno para WhatsApp

En Vercel (Settings → Environment Variables) añade o revisa:

| Variable | Uso | Dónde se obtiene |
|----------|-----|-------------------|
| `WHATSAPP_VERIFY_TOKEN` | Verificación GET del webhook (Meta lo comprueba) | Lo inventas tú (texto secreto largo y aleatorio). Debe ser **igual** al que pongas en Meta. |
| `WHATSAPP_ACCESS_TOKEN` | Enviar y recibir mensajes por la API | Meta for Developers → Tu app → WhatsApp → API Setup. |
| `WHATSAPP_PHONE_NUMBER_ID` | Identificador del número de WhatsApp | Meta for Developers → WhatsApp → API Setup (Phone number ID). |
| `WHATSAPP_APP_SECRET` **o** `META_APP_SECRET` | Firma de cada POST (seguridad) | Meta for Developers → Tu app → Settings → Basic → App Secret. **Obligatorio en producción.** |

Después de añadirlas, haz un **redeploy** en Vercel para que se carguen.

### 2.3 Configurar el webhook en Meta

1. Entra en [Meta for Developers](https://developers.facebook.com/) → tu app → **WhatsApp** → **Configuration**.
2. En la sección **Webhook**:
   - **Callback URL:** `https://TU-URL.vercel.app/api/webhook`  
     (misma URL de Vercel que usas para el chat, con `/api/webhook`).
   - **Verify token:** el **mismo** valor que pusiste en `WHATSAPP_VERIFY_TOKEN` en Vercel (copia y pega para evitar espacios o diferencias).
3. Pulsa **Verify and save**.
4. En **Webhook fields**, suscríbete al menos a: **messages**.
5. Guarda.

### 2.4 Comprobar que el webhook está bien

- Abre en el navegador: `https://TU-URL.vercel.app/api/webhook`  
- Deberías ver un JSON con algo como:
  - `"status": "ONDA WhatsApp Bot"`
  - `env_check`: todas las claves en `true` (incluida la de OpenAI).

Si `WHATSAPP_VERIFY_TOKEN` (o las demás) sale `false`, revisa que el nombre de la variable en Vercel sea exacto y que hayas hecho redeploy.

### 2.5 Probar WhatsApp

1. Envía un mensaje de WhatsApp al número conectado a tu app.
2. Revisa los **logs** en Vercel (Deployments → último deploy → Functions → logs). Deberías ver líneas como:
   - `✅ Webhook verificado correctamente` (en la verificación inicial).
   - `💬 Mensaje recibido de...` y `🤖 Respuesta:...` cuando alguien escribe.

Si no responde, revisa [SUBIR-A-META-WHATSAPP.md](./SUBIR-A-META-WHATSAPP.md) y los documentos de solución de problemas (webhook no verifica, no recibe mensajes, etc.).

---

## Resumen de URLs y variables

| Uso | URL o variable |
|-----|-----------------|
| Chat público | `https://TU-URL.vercel.app/chat` |
| Chat embebido (Wix) | `https://TU-URL.vercel.app/chat?embed=1` |
| Webhook (Meta) | `https://TU-URL.vercel.app/api/webhook` |
| Diagnóstico webhook | Abrir `https://TU-URL.vercel.app/api/webhook` en el navegador |

**Variables producción (todas en Vercel):**

- **Solo web:** `OPENAI_API_KEY`
- **Web + WhatsApp:** `OPENAI_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` (o `META_APP_SECRET`)

---

## Si el build falla en Vercel

Si en Deployments todos los deploys salen con **Error**, hay que ver el **log del build** para saber la causa. Guía paso a paso: **[VERCEL-BUILD-ERRORS.md](./VERCEL-BUILD-ERRORS.md)**.

---

## Si Vercel muestra una versión antigua del chat

Si en la URL de producción ves el texto antiguo ("¡Hola! Soy Onda. 👋", "Elige una Onda:") en lugar del actual ("Te doy la bienvenida a Onda 🌊", "¿Por qué Onda te gustaría empezar hoy? ✨"), es porque **producción sigue siendo el último deploy que terminó bien** (p. ej. uno de febrero). El código nuevo ya está en GitHub; lo que falta es que **un build en Vercel termine en Ready**. Revisá en el proyecto **onda** en Vercel: **Settings** → **Build & Development** → **Output Directory** vacío (sin override), **Framework Preset** = **Next.js**. Guardá y hacé **Redeploy**. Cuando ese build pase, la URL de producción mostrará la versión actual.

## Documentos relacionados

- [INTEGRAR-ONDA-EN-WIX.md](./INTEGRAR-ONDA-EN-WIX.md) – Detalle del embed en Wix.
- [LLEVAR-CHAT-A-PRECISAR.md](./LLEVAR-CHAT-A-PRECISAR.md) – Deploy en Vercel y opciones de integración.
- [SUBIR-A-META-WHATSAPP.md](./SUBIR-A-META-WHATSAPP.md) – Publicar la app en Meta y revisión.
- [POLITICA-PRIVACIDAD-CHAT-ONDA.md](./POLITICA-PRIVACIDAD-CHAT-ONDA.md) – Texto para política de privacidad.
- [CONFIGURACION-ACTUAL.md](./CONFIGURACION-ACTUAL.md) – Resumen de configuración y problemas frecuentes.

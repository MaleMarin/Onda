# ONDA WhatsApp Bot

Bot de WhatsApp para la Fundación Precisar que utiliza OpenAI para responder preguntas sobre Alfabetización Mediática e Informacional (AMI).

## 💬 Chat web (interfaz ONDA)

Para usar la interfaz de chat en local:

```bash
npm run dev
```

Luego abrí en el navegador: **http://localhost:3020/chat**

- **Producción (Precisar):** chat en **https://onda.precisar.net/chat** (webhook: **https://onda.precisar.net/api/webhook**).
- El comando `npm run dev` levanta **siempre** el Chat Web (Next.js) en el puerto **3020**.
- Si ves "address already in use", cerrá otras terminales donde corra Next o probá: `npm run dev:fresh` o `npm run dev:3010` y entrá a **http://localhost:3010**.

## 🚀 Configuración Rápida

### 1. Variables de Entorno

En **Vercel** (Settings → Environment Variables del proyecto; producción: **onda.precisar.net**), definí al menos:

- `OPENAI_API_KEY`
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- **`WHATSAPP_WEBHOOK_SECRET`** (obligatorio para que Meta pueda enviar POST al webhook)
- Opcional pero recomendado: `WHATSAPP_APP_SECRET` o `META_APP_SECRET`, `KV_REST_API_*`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, Firebase para RAG, `ADMIN_SECRET`

Plantilla comentada: **`example.env`**.  
**No sobrescribas `.env.local` con `vercel env pull` sin respaldo:** guía **`docs/ENTORNO-VERCEL-Y-LOCAL.md`** y `npm run env:vercel-pull` (descarga a `.env.vercel.snapshot` sin pisar `.env.local`).

### 2. Configurar Webhook en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu App → WhatsApp → Configuration
3. En "Webhook", configura:
   - **Callback URL**: `https://onda.precisar.net/api/webhook` (o tu dominio / preview de Vercel)
   - **Verify Token**: El mismo valor que `WHATSAPP_VERIFY_TOKEN`
4. Haz clic en "Verify and save"
5. Suscríbete a los eventos: `messages`

### 3. Verificar que Funciona

Abre en el navegador: `https://onda.precisar.net/api/webhook` (o el dominio que uses en Vercel)

Deberías ver un JSON con el estado de las variables de entorno. Si todas están en `true`, está bien configurado.

### 4. Probar el Bot

Envía un mensaje de WhatsApp al número configurado. El bot debería responder usando ONDA.

## 📁 Estructura del Proyecto

```
ondabot/
├── app/
│   └── api/
│       └── webhook/
│           └── route.ts          # Webhook principal (GET y POST)
├── lib/
│   ├── ondaReply.ts              # Lógica de ONDA con OpenAI
│   └── whatsapp.ts               # Envío de mensajes por WhatsApp
├── content/
│   └── raw/
│       └── ondaRaw.ts            # Contenido de ONDA (A Mano, Civita, Profes)
└── package.json
```

## 🔧 Desarrollo local — Cómo correr

```bash
npm install
```

| Comando | Uso |
|--------|-----|
| `npm run dev` | **Chat Web** (Next.js). Abrí **http://localhost:3020/chat** |
| `npm run backend` | **Backend Express** (WhatsApp webhook, etc.) en **http://localhost:3000** (o el `PORT` que definas) |

**URLs:**

- **Web (Next.js):** `npm run dev` → abrir **http://localhost:3020/chat**
- **Backend (WhatsApp/Express):** `npm run backend` → corre en **http://localhost:3000**; healthcheck: **http://localhost:3000/health** → `{ "ok": true }`

**Correr ambos:** En una terminal `npm run backend`, en otra `npm run dev`. Así tenés el chat en vivo y el backend disponible.

- Con **solo** `npm run dev` (Next.js), el webhook de la app está en: **http://localhost:3020/api/webhook**.
- El backend Express (`npm run backend`) corre en el puerto 3000 por defecto.

**Nota:** Para desarrollo local del webhook de WhatsApp, necesitarás ngrok o similar para exponer tu localhost a Meta.

## 📝 Logs

Los logs aparecen en la consola de Vercel. Busca estos mensajes:

- `✅ Webhook verificado correctamente` - Verificación exitosa
- `💬 Mensaje recibido de...` - Mensaje entrante
- `🤖 Respuesta generada:` - Respuesta de ONDA
- `✅ Respuesta enviada correctamente` - Envío exitoso
- `❌ Error...` - Errores (revisar logs)

## 🐛 Solución de Problemas

### El webhook no se verifica

1. Verifica que `WHATSAPP_VERIFY_TOKEN` esté configurado correctamente
2. Asegúrate de que la URL del webhook sea exactamente: `/api/webhook`
3. Revisa los logs en Vercel

### No recibe mensajes

1. Verifica que el webhook esté "Subscribed" en Meta
2. Revisa que `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estén correctos
3. Revisa los logs en Vercel para ver qué está recibiendo

### No envía respuestas

1. Verifica que `OPENAI_API_KEY` esté configurado
2. Revisa los logs para ver errores de OpenAI
3. Verifica que `WHATSAPP_ACCESS_TOKEN` tenga permisos para enviar mensajes

## 📚 Más Información

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [OpenAI API Docs](https://platform.openai.com/docs)

## 🌐 Llevar ONDA al público (web + WhatsApp)

- **[LLEVAR-ONDA-AL-PUBLICO.md](./LLEVAR-ONDA-AL-PUBLICO.md)** – **Guía principal:** publicar con seguridad, primero en la web (Wix) y después en WhatsApp. Incluye checklist de seguridad, variables de entorno y pasos para Vercel, Wix y Meta.

## 📄 Más documentación

- **[LLEVAR-CHAT-A-PRECISAR.md](./LLEVAR-CHAT-A-PRECISAR.md)** – Desplegar el chat en Vercel y enlazarlo o embeberlo en la página de Precisar.
- **[INTEGRAR-ONDA-EN-WIX.md](./INTEGRAR-ONDA-EN-WIX.md)** – Cómo embeber el chat en un sitio Wix (iframe y enlaces).
- **[POLITICA-PRIVACIDAD-CHAT-ONDA.md](./POLITICA-PRIVACIDAD-CHAT-ONDA.md)** – Texto de política de privacidad (web y WhatsApp). Publicar en una URL antes de subir a Meta.
- **[SUBIR-A-META-WHATSAPP.md](./SUBIR-A-META-WHATSAPP.md)** – Pasos para publicar la app en Meta y que el bot funcione en WhatsApp (App Review, URL de política, etc.).

# ONDA WhatsApp Bot

Bot de WhatsApp para la Fundación Precisar que utiliza OpenAI para responder preguntas sobre Alfabetización Mediática e Informacional (AMI).

## 💬 Chat web (interfaz ONDA)

Para usar la interfaz de chat en local:

```bash
npm run dev
```

Luego abrí en el navegador: **http://localhost:2999**

- Por defecto el servidor usa el puerto **2999** (para evitar conflicto con otros procesos en 3000/3001).
- Si ves "address already in use", cerrá otras terminales donde corra Next o probá: `npm run dev:3010` y entrá a **http://localhost:3010**.

## 🚀 Configuración Rápida

### 1. Variables de Entorno

Configura estas variables en Vercel (Settings → Environment Variables):

```
WHATSAPP_VERIFY_TOKEN=tu_token_secreto_aqui
WHATSAPP_ACCESS_TOKEN=tu_token_de_acceso_whatsapp
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
OPENAI_API_KEY=tu_openai_api_key
```

### 2. Configurar Webhook en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu App → WhatsApp → Configuration
3. En "Webhook", configura:
   - **Callback URL**: `https://tu-dominio.vercel.app/api/webhook`
   - **Verify Token**: El mismo valor que `WHATSAPP_VERIFY_TOKEN`
4. Haz clic en "Verify and save"
5. Suscríbete a los eventos: `messages`

### 3. Verificar que Funciona

Abre en el navegador: `https://tu-dominio.vercel.app/api/webhook`

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

## 🔧 Desarrollo Local

```bash
npm install
```

| Comando | Uso |
|--------|-----|
| `npm run chat` | Interfaz de chat (Next.js) en **http://localhost:3000** |
| `npm run dev` | Backend Express (webhook, etc.). No sirve la UI del chat |

El webhook estará en: http://localhost:3000/api/webhook (con `npm run chat`).

**Nota**: Para desarrollo local del webhook de WhatsApp, necesitarás ngrok o similar para exponer tu localhost a Meta.

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

# ONDA WhatsApp Bot

Bot de WhatsApp para la Fundación Precisar que utiliza OpenAI para responder preguntas sobre Alfabetización Mediática e Informacional (AMI).

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
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run next:dev

# El webhook estará en: http://localhost:3000/api/webhook
```

**Nota**: Para desarrollo local, necesitarás usar ngrok o similar para exponer tu localhost a Meta.

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

# 🔴 Problema: El webhook NO recibe mensajes

## Lo que muestran los logs de Vercel

- Solo aparecen **GET** (página principal, favicon, archivos estáticos).
- **No aparece ningún POST** a `/api/webhook`.

Eso significa: **Meta/WhatsApp no está enviando los mensajes a tu servidor.**  
El fallo no está en el código del bot, sino en la configuración del webhook en Meta.

---

## Qué hacer: configurar el webhook en Meta

### 1. Ir a la configuración del webhook

1. Entra a [developers.facebook.com](https://developers.facebook.com).
2. Abre tu **App**.
3. Menú izquierdo: **WhatsApp** → **Configuration** (no "API Setup").

### 2. Sección "Webhook"

- Si ves **"Callback URL"** vacía o distinta a la de abajo, haz clic en **"Edit"** o **"Configure"**.

Configura exactamente:

| Campo | Valor |
|--------|--------|
| **Callback URL** | `https://onda2026.vercel.app/api/webhook` |
| **Verify token** | El mismo texto que tienes en Vercel en `WHATSAPP_VERIFY_TOKEN` |

Luego haz clic en **"Verify and Save"**.

- Debe salir un **check verde** ("Verified").  
- Si sale error, revisa que la URL sea exacta (sin espacio al final) y que el verify token en Meta sea **igual** al de Vercel.

### 3. Suscribirse a "messages"

- En la misma sección del webhook busca **"Webhook fields"** o **"Manage"**.
- Asegúrate de estar suscrito a **"messages"** (checkbox marcado).
- Guarda los cambios.

Sin este paso, Meta no envía los mensajes entrantes a tu URL.

### 4. Comprobar

1. En Meta, la sección Webhook debe mostrar:
   - Callback URL: `https://onda2026.vercel.app/api/webhook`
   - Estado: **Verified**
   - Campo suscrito: **messages**
2. Envía de nuevo **"hola"** al número de ONDA desde WhatsApp.
3. Vuelve a **Vercel** → **Logs** y mira si aparece un **POST** a `/api/webhook`.

Si aparece el POST, el bot ya debería poder responder (y si no responde, el siguiente paso sería revisar token y variables en Vercel).

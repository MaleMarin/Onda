# El bot no responde – Diagnóstico

## Dos palomitas grises = mensaje entregado a WhatsApp

Eso significa que tu mensaje llegó al número de ONDA, pero **el bot no está contestando**. Puede ser por el webhook, el token o un error en el código.

---

## 1. Revisar logs en Vercel (lo más importante)

1. Entra a [vercel.com](https://vercel.com) → proyecto **onda2026**.
2. Ve a **Deployments** → haz clic en el último deployment.
3. Abre la pestaña **Logs** (o **Functions** y luego los logs del deployment).
4. **Deja los logs abiertos** y desde tu celular **envía de nuevo "hola"** al número de ONDA.
5. Mira si aparece algo nuevo en los logs.

### Qué puede salir en los logs

| Si ves esto | Significado |
|-------------|-------------|
| `📩 Webhook recibido:` y luego un JSON | Meta sí está llamando a tu servidor. El problema puede ser después (OpenAI o enviar respuesta). |
| Nada nuevo cuando envías "hola" | Meta **no** está enviando eventos a tu servidor. Revisa webhook en Meta (paso 2). |
| `❌ Error al enviar:` o `Missing envs` | Problema con token de WhatsApp o variables en Vercel (paso 3). |
| `❌ Error procesando mensaje:` o error de OpenAI | Problema con `OPENAI_API_KEY` o con OpenAI (paso 4). |

---

## 2. Comprobar webhook en Meta

Si en los logs **no aparece nada** cuando envías "hola", el webhook no está llegando o no está suscrito.

1. Ve a [developers.facebook.com](https://developers.facebook.com) → tu app → **WhatsApp** → **Configuration**.
2. En la sección **Webhook**:
   - **Callback URL** debe ser exactamente: `https://onda2026.vercel.app/api/webhook`
   - Debe estar **Verified** (check verde).
3. Haz clic en **Edit** o **Manage** y revisa **Subscribed fields**:
   - Debe estar marcado **messages** (mensajes).
4. Guarda y prueba de nuevo enviando "hola".

---

## 3. Token de WhatsApp (caduca)

El **Access Token** de Meta suele caducar (1 hora o 24 horas según el tipo).

1. En Meta → **WhatsApp** → **API Setup** → Paso 1.
2. Genera un **nuevo** "Temporary access token" (o usa el que te den).
3. En Vercel → **Settings** → **Environment Variables**:
   - Actualiza `WHATSAPP_ACCESS_TOKEN` con el token nuevo.
4. **Redeploy**: Deployments → 3 puntos (⋯) → **Redeploy**.
5. Vuelve a probar enviando "hola".

---

## 4. Variables en Vercel

En Vercel → **Settings** → **Environment Variables** revisa que existan y estén bien:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN` (y que sea el actual, ver paso 3)
- `WHATSAPP_PHONE_NUMBER_ID` = `886309674569527`
- `OPENAI_API_KEY`

Luego haz **Redeploy** después de cualquier cambio.

---

## 5. Probar que el webhook “existe”

Abre en el navegador:

`https://onda2026.vercel.app/api/webhook`

Deberías ver un JSON con algo como:

- `"WHATSAPP_PHONE_NUMBER_ID": true`
- `"WHATSAPP_ACCESS_TOKEN": true`
- `"OPENAI_API_KEY": true`

Si alguna sale `false`, esa variable falta o está mal en Vercel.

---

## Resumen de qué hacer ahora

1. **Abrir logs en Vercel** y enviar "hola" al número de ONDA.
2. **Si no aparece nada en logs** → Revisar webhook en Meta (URL, verified, suscripción a **messages**).
3. **Renovar token** en Meta y actualizar `WHATSAPP_ACCESS_TOKEN` en Vercel + Redeploy.
4. **Comprobar** que las 4 variables estén en Vercel y que `/api/webhook` muestre todo en `true`.

Cuando hagas el paso 1, dime exactamente qué ves en los logs (o si no aparece nada) y te digo el siguiente paso concreto.

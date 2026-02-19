# Cómo hacer que el bot ONDA funcione en WhatsApp

## 1. URL del webhook (importante)

Meta solo puede usar **una** URL. En este proyecto la que debe usar es:

```
https://TU_DOMINIO.vercel.app/api/whatsapp
```

Reemplaza `TU_DOMINIO` por tu proyecto de Vercel (ej. `ondabot-xxx.vercel.app`).

**No uses** `/api/webhook` ni `/api/whatsapp/webhook`. La ruta correcta es **`/api/whatsapp`**.

---

## 2. Variables de entorno en Vercel

En el proyecto de Vercel → Settings → Environment Variables, define:

| Variable | Dónde sacarla |
|----------|----------------|
| `WHATSAPP_VERIFY_TOKEN` | Lo inventas tú (ej. una frase secreta). Debe ser **igual** al que pongas en Meta en el paso 3. |
| `WHATSAPP_ACCESS_TOKEN` | Meta for Developers → Tu app → WhatsApp → API Setup → Token temporal o token del sistema. |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta for Developers → Tu app → WhatsApp → API Setup → "From" phone number → ID del número. |
| `OPENAI_API_KEY` | Tu clave de API de OpenAI (para las respuestas de ONDA). |

Después de cambiar variables, haz un **redeploy** del proyecto en Vercel.

---

## 3. Configurar el webhook en Meta

1. Entra a [developers.facebook.com](https://developers.facebook.com) → tu app → **WhatsApp** → **Configuration** (o API Setup).
2. En **Webhook**:
   - **Callback URL:** `https://TU_DOMINIO.vercel.app/api/whatsapp`
   - **Verify token:** el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`.
3. Pulsa **Verify and Save**. Si falla:
   - Comprueba que la URL sea exactamente esa y que el proyecto esté desplegado.
   - Comprueba que `WHATSAPP_VERIFY_TOKEN` en Vercel sea **exactamente** igual al Verify token de Meta.
4. En **Webhook fields**, suscríbete al menos a **messages**.

---

## 4. Probar

1. En Meta, envía un mensaje de prueba desde el número de la app al número vinculado (o usa el número de prueba que te dan).
2. Revisa los **logs** en Vercel (Deployments → último deployment → Functions → logs) para ver si llegan los POST y si hay errores de token o de OpenAI.

---

## Si sigue sin funcionar: diagnóstico

**Paso 1 – Comprobar que la ruta y las env responden**

1. Despliega en Vercel y abre en el navegador (cambia por tu dominio):
   ```
   https://TU_DOMINIO.vercel.app/api/whatsapp
   ```
2. Deberías ver un JSON con `"status": "ONDA webhook"` y un bloque `env` con `true`/`false` por variable.
3. Si **no se abre** o da 404: la URL está mal o el deploy no es el correcto. Comprueba el dominio en Vercel (Dashboard → tu proyecto → Settings → Domains).
4. Si se abre pero **`env` tiene algún `false`**: esa variable no está en Vercel o no se cargó. En Vercel → Settings → Environment Variables, añade la que falte y haz **Redeploy** (Deployments → ⋮ → Redeploy).
5. Si **`todo_ok` es `true`** y aun así Meta no verifica: el **Verify token** en Meta tiene que ser **exactamente** igual que `WHATSAPP_VERIFY_TOKEN` (mismo texto, sin espacios de más). Cópialo de Vercel y pégalo en Meta (o al revés).

**Paso 2 – Verificación de Meta falla (no pasa “Verify and Save”)**

- URL en Meta debe ser exactamente: `https://TU_DOMINIO.vercel.app/api/whatsapp` (sin `/` al final, sin `webhook`).
- Verify token en Meta = valor de `WHATSAPP_VERIFY_TOKEN` en Vercel (sensible a mayúsculas y espacios).
- Después de cambiar env en Vercel, siempre **Redeploy**.

**Paso 3 – Verificación pasa pero no responde a mensajes**

- En Vercel: Deployments → último deployment → **Functions** → clic en la función que sirve `/api/whatsapp` → **Logs**. Envía un mensaje al bot y mira si aparece error de `WHATSAPP_ACCESS_TOKEN`, `PHONE_NUMBER_ID` o OpenAI.
- Comprueba en Meta que en **Webhook** esté suscrito el campo **messages**.
- El número desde el que envías debe poder recibir mensajes del número de la app (número de prueba o número vinculado en Meta).

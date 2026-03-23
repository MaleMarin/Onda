# Configuración de ONDA para WhatsApp

Cuando tengas la información de Meta (WhatsApp Business API), con esto el bot queda listo.

**Auditoría unificada (números, Vercel, webhook):** [AUDITORIA-INTEGRACION-ONDABOT.md](./AUDITORIA-INTEGRACION-ONDABOT.md)

---

## 0. Datos que ya están en el proyecto

En el repo hay documentación con valores concretos de WhatsApp (sin secretos en código):

| Dato | Valor documentado | Archivo |
|------|-------------------|--------|
| **Phone Number ID** (número ONDA) | `886309674569527` | [ACTUALIZAR-PHONE-ID.md](../ACTUALIZAR-PHONE-ID.md) |
| **Número de teléfono ONDA** | `+56 9 9155 3279` | ACTUALIZAR-PHONE-ID.md, CONFIGURACION-ACTUAL.md |
| **URL del webhook** | `https://onda2026.vercel.app/api/webhook` | ACTUALIZAR-PHONE-ID.md, CONFIGURACION-ACTUAL.md |
| **Proyecto Vercel** | `onda2026` | Varios docs |
| **Ejemplos de VERIFY_TOKEN** | `mi_token_secreto_2026`, `onda_whatsapp_verify_123` | [VALORES-VARIABLES.md](../VALORES-VARIABLES.md) |
| **Dónde configurar en Vercel** | Settings → Environment Variables, Redeploy | ACTUALIZAR-PHONE-ID.md, VALORES-VARIABLES.md |

**Importante:** No uses tokens copiados de documentos viejos del repo. El ID `918128831381165` es típico del **número de prueba** (+1 555…), no del ONDA real. Para +56 9 9155 3279 el ID documentado es `886309674569527` (confirmar en Meta). Ver [AUDITORIA-INTEGRACION-ONDABOT.md](./AUDITORIA-INTEGRACION-ONDABOT.md).

---

## 1. Qué necesitás de Meta

1. **Cuenta de desarrollador** en [developers.facebook.com](https://developers.facebook.com) y una **App** (o creá una).
2. **WhatsApp** agregado a la app (Productos → WhatsApp → Configurar).
3. **Número de teléfono** de prueba o aprobado para WhatsApp Business API.
4. **Tokens:**
   - **Token de acceso (Access Token):** en WhatsApp → API Setup (o Configuración de la API). Podés usar uno temporal para pruebas o generar uno permanente.
   - **ID del número de teléfono (Phone Number ID):** en la misma pantalla, solo números (ej. `123456789012345`).
   - **App Secret:** en Configuración de la app → Configuración básica → Clave secreta de la app (para verificar el webhook en producción).

---

## 2. Variables de entorno

Copiá `example.env` a `.env` en la raíz del proyecto y completá:

```bash
cp example.env .env
```

| Variable | Dónde se obtiene | Ejemplo |
|----------|------------------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Lo inventás vos (una frase secreta). Meta la envía al verificar el webhook y debe coincidir. | `onda_precisar_2026` |
| `WHATSAPP_ACCESS_TOKEN` | Meta → Tu app → WhatsApp → API Setup → Token temporal o permanente | `EAAxxxx...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Misma pantalla, “Phone number ID” (solo dígitos) | `123456789012345` |
| `WHATSAPP_APP_SECRET` | App → Configuración básica → Clave secreta de la app | (opcional pero recomendado en producción) |

Además, para que ONDA responda (texto, voz, imágenes), en el mismo `.env` tenés que tener:

- `OPENAI_API_KEY` (ya lo tenés si la web funciona).

---

## 3. URL del webhook

Tu backend debe estar accesible por HTTPS (en producción, ej. Vercel).

- **URL del webhook:** `https://TU-DOMINIO/api/webhook`  
  Ejemplo: `https://ondabot.vercel.app/api/webhook` o `https://precisar.net/api/webhook` si está bajo ese dominio.

Meta enviará:

- **GET** a esa URL para **verificar** el webhook (con `hub.mode`, `hub.verify_token`, `hub.challenge`). El servidor debe devolver el `challenge` si el token coincide con `WHATSAPP_VERIFY_TOKEN`.
- **POST** a esa URL con cada mensaje entrante.

---

## 4. Configurar en Meta

1. En **Meta for Developers** → Tu app → **WhatsApp** → **Configuración** (o API Setup).
2. En **Webhook**, clic en **Configurar** o **Edit**.
3. **Callback URL:** `https://TU-DOMINIO/api/webhook`
4. **Token de verificación:** el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN` en tu `.env`.
5. Guardar. Meta hará un GET a tu URL; si el servidor responde con el `challenge`, verás “Verificado”.
6. Suscribir los eventos que necesites (por lo menos **messages**).

---

## 5. Comprobar que está listo

Con el servidor en marcha (local o producción):

- **Diagnóstico (GET sin parámetros):** abrí en el navegador  
  `https://TU-DOMINIO/api/webhook`  
  Deberías ver un JSON con `env_check` indicando qué variables están definidas (true/false). No muestra los valores, solo si existen.

- **En local:** si usás `ngrok` o similar para exponer `http://localhost:3020`, la URL del webhook sería `https://xxx.ngrok.io/api/webhook`.

---

## 6. Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Copiar `example.env` → `.env` |
| 2 | Completar `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` (y opcionalmente `WHATSAPP_APP_SECRET`) |
| 3 | Desplegar el proyecto para que `https://TU-DOMINIO/api/webhook` responda |
| 4 | En Meta, configurar la URL del webhook y el mismo token de verificación |
| 5 | Verificar en Meta; después enviar un mensaje de prueba al número de WhatsApp conectado |

Cuando tengas la información de WhatsApp (token, Phone Number ID, y opcionalmente App Secret), con esto el bot está listo para usarse.

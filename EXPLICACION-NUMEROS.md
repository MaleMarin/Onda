# Números de WhatsApp y Meta — versión alineada

Hay **tres conceptos distintos**; no mezclar.

---

## 1) Número “Desde” (FROM) — el bot

- Es el número de **WhatsApp Business** conectado a tu app: **mensajes salen desde ahí** y **los usuarios escriben a ese número**.
- **ONDA (ejemplo):** `+56 9 9155 3279` → su **Phone Number ID** para Vercel está documentado como `886309674569527` (confirmar siempre en Meta → WhatsApp → el número seleccionado).
- **Sandbox de Meta (prueba):** `+1 555 157 6862` → suele tener Phone Number ID tipo `918128831381165`. Solo sirve mientras Meta mantenga ese número de prueba en tu app.

**En Vercel:** `WHATSAPP_PHONE_NUMBER_ID` = ID del número **FROM** que estés usando (ONDA real **o** sandbox), copiado de la pantalla actual de Meta.

---

## 2) Destinatario de prueba (Paso 3 — “To”)

- Es **tu celular** (ej. `+56 9 7725 1396`): desde ahí **enviás** mensajes **al número del bot**.
- Meta envía un **código por WhatsApp** para verificar ese número.
- **No** es el número ONDA (3279). No agregues el 3279 como “destinatario” en el Paso 3.

---

## 3) Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿A qué número escribo para probar? | Al **número del bot** (FROM): ej. 3279 o el +1 555… si solo tenés sandbox. |
| ¿Qué número verifico en el Paso 3? | El **tuyo** (quien escribe al bot). |
| ¿Qué pongo en `WHATSAPP_PHONE_NUMBER_ID`? | El **Phone Number ID** del número **FROM** que muestra Meta **hoy** para esa app. |

---

## Flujo

```
Usuario (cel verificado en Paso 3) → escribe al número ONDA (+56 9 9155 3279)
→ Meta → POST a tu webhook → ONDA responde → WhatsApp entrega al usuario.
```

---

*Si otro archivo del repo lista solo el ID `918128831381165`, es el del **número de prueba**; para ONDA real usá el ID del **+56 9 9155 3279** (p. ej. `886309674569527`).*

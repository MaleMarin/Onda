# 📱 Cómo Probar el Bot de WhatsApp

## ✅ Opciones para Probar:

### Opción 1: Desde tu PROPIO número (MÁS FÁCIL) ⭐

**SÍ, puedes enviar desde tu propio celular (`+56 9 7725 1396`)**

**Cómo funciona:**
1. Abre WhatsApp en tu celular
2. Envía un mensaje al número de prueba: `+1 555 157 6862`
3. El bot recibirá tu mensaje
4. El bot responderá a tu número (`+56 9 7725 1396`)

**Pasos:**
1. Abre WhatsApp
2. Busca o agrega el contacto: `+1 555 157 6862`
3. Envía un mensaje (ejemplo: "Hola")
4. Espera la respuesta del bot

**✅ Esta es la forma MÁS FÁCIL y NO necesitas otro celular.**

---

### Opción 2: Desde otro celular

**También puedes usar otro celular si quieres:**

1. Agrega el número de prueba (`+1 555 157 6862`) en el otro celular
2. Envía un mensaje desde ese celular
3. El bot responderá a ese número

**⚠️ Pero primero necesitas agregar ese número como destinatario en Meta:**
- Ve a Meta → WhatsApp → API Setup → Paso 3
- Agrega el número del otro celular
- Verifica con el código que Meta envía

---

### Opción 3: Usar la herramienta de Meta (Para desarrolladores)

En Meta → WhatsApp → API Setup → Paso 6, hay un botón "Enviar mensaje" que puedes usar para probar directamente desde Meta.

---

## 🎯 Recomendación: Usa tu PROPIO número

**Es la forma más simple:**

1. ✅ Ya tienes tu número configurado (`+56 9 7725 1396`)
2. ✅ No necesitas agregar otro número
3. ✅ Puedes probar inmediatamente
4. ✅ Verás las respuestas en tu propio WhatsApp

---

## 📋 Pasos para Probar:

### 1. Asegúrate de que todo esté configurado:

- [ ] Variables en Vercel configuradas
- [ ] Webhook configurado en Meta
- [ ] Webhook verificado (check verde)

### 2. Abre WhatsApp en tu celular:

- Busca el contacto: `+1 555 157 6862`
- O agrégalo como nuevo contacto

### 3. Envía un mensaje de prueba:

Ejemplos:
- "Hola"
- "¿Qué es ONDA?"
- "A Mano"

### 4. Espera la respuesta:

- El bot debería responder en unos segundos
- Si no responde, revisa los logs en Vercel

---

## 🐛 Si no funciona:

### Verifica en Vercel:

1. Ve a Vercel → Deployments → Último deployment → Logs
2. Busca mensajes como:
   - `📩 Webhook recibido:` - Significa que recibió el mensaje
   - `💬 Mensaje recibido de...` - Significa que está procesando
   - `✅ Respuesta enviada correctamente` - Significa que funcionó
   - `❌ Error...` - Significa que hay un problema

### Verifica en Meta:

1. Ve a WhatsApp → Configuration → Webhook
2. Verifica que esté "Subscribed" a "messages"
3. Verifica que el webhook esté activado

---

## ✅ Resumen:

| Pregunta | Respuesta |
|----------|----------|
| ¿Necesito otro celular? | **NO**, puedes usar el tuyo |
| ¿Desde dónde envío? | Desde tu número (`+56 9 7725 1396`) |
| ¿A dónde envío? | Al número de prueba (`+1 555 157 6862`) |
| ¿Dónde recibo la respuesta? | En tu propio WhatsApp |

---

## 🚀 Próximo Paso:

1. **Configura todo** (variables, webhook)
2. **Abre WhatsApp** en tu celular
3. **Envía un mensaje** al `+1 555 157 6862`
4. **Espera la respuesta** del bot

¡Es así de simple! No necesitas otro celular. 🎉

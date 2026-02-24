# 📱 Explicación de los Números de WhatsApp

## 🔍 Hay DOS números diferentes:

### 1️⃣ Número de WhatsApp Business (Remitente - FROM)
**Este es el número que Meta te da para ENVIAR mensajes**

- **En la imagen:** `+1 555 157 6862` (número de prueba)
- **¿De dónde sale?** Meta lo genera automáticamente cuando creas una cuenta de prueba
- **¿Para qué sirve?** Es el número DESDE el cual tu bot enviará mensajes
- **¿Necesitas copiarlo?** NO directamente, pero necesitas el **Phone Number ID**: `918128831381165`

**Este número NO lo eliges tú**, Meta lo asigna automáticamente.

---

### 2️⃣ Número del Destinatario (Recipient - TO)
**Este es el número AL QUE quieres enviar mensajes**

- **¿De dónde sale?** Es TU número de WhatsApp personal o el número de las personas que quieren usar el bot
- **¿Cómo lo obtienes?** Lo agregas tú mismo en Meta

**Pasos para agregarlo:**

1. En Meta → **WhatsApp** → **API Setup** (donde viste la imagen)
2. Busca el paso **"3. Agrega un número de teléfono del destinatario"**
3. Haz clic en el dropdown **"Selecciona un número de destinatario"**
4. Haz clic en **"Agregar número de teléfono"** o **"Add phone number"**
5. Ingresa TU número de WhatsApp (con código de país, ej: +5491123456789)
6. Meta enviará un código de verificación a ese número
7. Ingresa el código para verificar
8. ¡Listo! Ese número ya puede recibir mensajes

---

## 🎯 Resumen:

| Tipo de Número | ¿De dónde sale? | ¿Lo necesitas? |
|----------------|-----------------|----------------|
| **Número Business (FROM)** | Meta lo genera automáticamente | Solo necesitas el **Phone Number ID** |
| **Número Destinatario (TO)** | Lo agregas tú (tu número personal) | SÍ, debes agregarlo en Meta |

---

## 📝 Para tu Bot:

### Lo que YA tienes (de la imagen):
- ✅ **Phone Number ID**: `918128831381165` → Lo usas en `WHATSAPP_PHONE_NUMBER_ID`
- ✅ **Token**: El token largo → Lo usas en `WHATSAPP_ACCESS_TOKEN`
- ✅ **Número Business**: `+1 555 157 6862` (Meta lo maneja automáticamente)

### Lo que necesitas hacer:
1. **Agregar tu número personal** como destinatario en Meta (paso 3 de la imagen)
2. **Verificar ese número** con el código que Meta envía
3. **Probar enviando un mensaje** a ese número desde Meta

---

## 🔄 Flujo del Bot:

```
Usuario envía mensaje → WhatsApp → Tu Bot (onda2026.vercel.app) 
→ Procesa con ONDA → Responde → WhatsApp → Usuario recibe respuesta
```

**El número Business (`+1 555 157 6862`) es el que envía las respuestas.**
**El número del usuario es al que le llegan los mensajes.**

---

## ⚠️ Importante:

- **NO necesitas copiar el número `+1 555 157 6862`** a ningún lado
- **SÍ necesitas el Phone Number ID** (`918128831381165`) para las variables
- **SÍ necesitas agregar números de destinatarios** (usuarios que usarán el bot) en Meta

¿Necesitas ayuda para agregar tu número como destinatario en Meta?

# 🐛 Problemas y Soluciones

## ❌ Problema 1: El número +1 555 157 6862 no se guarda en WhatsApp

**Esto es NORMAL.** El número de prueba (`+1 555 157 6862`) es un número virtual que Meta usa solo para pruebas. 

**Solución:** No necesitas guardarlo como contacto. Puedes enviarle mensajes directamente escribiendo el número completo en WhatsApp.

**Cómo enviar sin guardar:**
1. Abre WhatsApp
2. Ve a "Nuevo chat" o el ícono de escribir
3. Escribe directamente: `+15551576862` (sin espacios ni guiones)
4. Envía el mensaje

---

## ❌ Problema 2: Enviar al número de ONDA (+56 9 9155 3279) y no pasa nada

**Este es el problema principal.** El número de ONDA (`+56 9 9155 3279`) **NO está configurado como número Business** en Meta. Solo tienes el número de prueba activo.

**Por eso no funciona cuando envías al número de ONDA.**

---

## ✅ Soluciones:

### Opción A: Usar el número de prueba (RÁPIDO)

**Para que funcione AHORA:**

1. **Envía mensajes al número de prueba:**
   - Abre WhatsApp
   - Escribe: `+15551576862` (sin espacios)
   - Envía un mensaje

2. **El bot responderá desde el número de prueba**

3. **Verifica que el webhook esté configurado:**
   - Ve a Meta → WhatsApp → Configuration → Webhook
   - Debe estar configurado con: `https://onda2026.vercel.app/api/webhook`
   - Debe estar "Subscribed" a "messages"

---

### Opción B: Configurar el número de ONDA en Meta (MÁS COMPLEJO)

**Para usar el número real de ONDA (`+56 9 9155 3279`):**

#### Paso 1: Verificar si el número está en Meta

1. Ve a Meta → **WhatsApp** → **Phone Numbers**
2. Busca si aparece `+56 9 9155 3279`
3. Si NO aparece, necesitas agregarlo

#### Paso 2: Agregar el número (si no está)

1. Ve a **WhatsApp** → **Phone Numbers** → **"Add Phone Number"**
2. Ingresa: `+56991553279` (sin espacios)
3. Sigue el proceso de verificación:
   - Meta enviará un código al número
   - Ingresa el código
   - Completa la verificación de negocio (si es necesario)

#### Paso 3: Seleccionar el número como Business

1. Ve a **WhatsApp** → **API Setup** → Paso 2
2. Haz clic en el dropdown
3. Ahora deberías ver `+56 9 9155 3279` en la lista
4. Selecciónalo
5. Copia su **Phone Number ID**
6. Actualiza en Vercel → `WHATSAPP_PHONE_NUMBER_ID`

**⚠️ Este proceso puede tardar y requiere verificación de Meta.**

---

## 🔍 Verificar qué está pasando:

### 1. Revisa los logs en Vercel:

1. Ve a Vercel → Tu proyecto → **Deployments**
2. Haz clic en el último deployment
3. Ve a la pestaña **"Logs"**
4. Busca mensajes como:
   - `📩 Webhook recibido:` - Significa que Meta está enviando mensajes
   - `💬 Mensaje recibido de...` - Significa que está procesando
   - `❌ Error...` - Significa que hay un problema

**Si NO ves ningún log cuando envías un mensaje:**
- El webhook NO está recibiendo mensajes
- Verifica la configuración del webhook en Meta

### 2. Verifica el webhook en Meta:

1. Ve a Meta → **WhatsApp** → **Configuration**
2. Busca la sección **"Webhook"**
3. Verifica:
   - ✅ **Callback URL:** `https://onda2026.vercel.app/api/webhook`
   - ✅ **Verify Token:** Configurado correctamente
   - ✅ **Status:** "Verified" (verificado)
   - ✅ **Subscribed to:** "messages" debe estar marcado

### 3. Prueba el webhook directamente:

Abre en el navegador:
```
https://onda2026.vercel.app/api/webhook
```

Deberías ver un JSON con las variables de entorno. Si todas están en `true`, el webhook está funcionando.

---

## 🎯 Pasos Inmediatos:

### Para PROBAR AHORA (usando número de prueba):

1. **Abre WhatsApp**
2. **Escribe:** `+15551576862` (sin espacios, sin guiones)
3. **Envía:** "Hola"
4. **Espera** la respuesta

### Si NO funciona:

1. **Verifica el webhook** en Meta → Configuration
2. **Revisa los logs** en Vercel
3. **Verifica las variables** en Vercel (todas deben estar configuradas)

---

## 📋 Checklist de Verificación:

- [ ] Webhook configurado en Meta → Configuration
- [ ] Webhook verificado (check verde)
- [ ] Webhook suscrito a "messages"
- [ ] Variables configuradas en Vercel
- [ ] Phone Number ID correcto en Vercel (`918128831381165`)
- [ ] Intentas enviar al número de prueba (`+15551576862`)

---

## ⚠️ Importante:

**El número de ONDA (`+56 9 9155 3279`) NO funcionará hasta que:**
1. Esté agregado en Meta → Phone Numbers
2. Esté seleccionado como número Business en API Setup
3. Esté verificado y activo

**Por ahora, usa el número de prueba (`+15551576862`) para probar.**

---

## 🚀 Próximo Paso:

1. **Verifica el webhook** en Meta → Configuration
2. **Envía un mensaje** al `+15551576862` desde WhatsApp
3. **Revisa los logs** en Vercel para ver qué pasa

¿Quieres que te guíe paso a paso para verificar el webhook?

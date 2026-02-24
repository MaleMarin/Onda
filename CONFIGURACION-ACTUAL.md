# ✅ Tu Configuración Actual - Estado y Próximos Pasos

## 📋 Lo que YA tienes configurado:

### ✅ Paso 3: Número Destinatario
- **Número:** `+56 9 7725 1396` (tu número personal)
- **Estado:** ✅ Configurado correctamente
- **¿Para qué sirve?** Este número recibirá los mensajes de prueba del bot

### ✅ Paso 4: Webhook
- **Estado:** ✅ Activado (toggle en ON/azul)
- **¿Para qué sirve?** Permite que Meta envíe mensajes a tu servidor

---

## 🔍 Lo que necesitas verificar:

### Paso 2: Número Business (FROM)

**Necesitas verificar que el número de ONDA (`+56 9 9155 3279`) esté seleccionado como número Business.**

**Cómo verificar:**

1. Ve al **Paso 2** de la misma pantalla (arriba del paso 3)
2. Busca el dropdown que dice "Número de teléfono para el campo 'Desde'"
3. Verifica que esté seleccionado: `+56 9 9155 3279` (número de ONDA)
4. Si NO está seleccionado:
   - Haz clic en el dropdown
   - Selecciona `+56 9 9155 3279`
   - Copia el **Phone Number ID** que aparece

---

## 🎯 Próximos Pasos:

### 1. Verificar Número Business (Paso 2)

**Si el número de ONDA (`+56 9 9155 3279`) está seleccionado:**
- ✅ Perfecto, copia su **Phone Number ID**
- Úsalo en Vercel → `WHATSAPP_PHONE_NUMBER_ID`

**Si NO está en la lista:**
- Necesitas agregarlo primero en Meta → WhatsApp → Phone Numbers
- O usa el número de prueba temporalmente

---

### 2. Configurar el Webhook en Meta

Aunque el toggle esté activado, **necesitas configurar la URL del webhook:**

1. Ve a **WhatsApp** → **Configuration** (no API Setup)
2. Busca la sección **"Webhook"**
3. Haz clic en **"Edit"** o **"Configure"**
4. Completa:
   - **Callback URL:** `https://onda2026.vercel.app/api/webhook`
   - **Verify Token:** El mismo que pusiste en `WHATSAPP_VERIFY_TOKEN` en Vercel
5. Haz clic en **"Verify and Save"**
6. Deberías ver un ✅ check verde

---

### 3. Verificar Variables en Vercel

Asegúrate de tener estas variables configuradas:

| Variable | Valor |
|----------|-------|
| `WHATSAPP_VERIFY_TOKEN` | Tu token secreto |
| `WHATSAPP_ACCESS_TOKEN` | Token de Meta (del paso 1) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone Number ID del número de ONDA |
| `OPENAI_API_KEY` | Tu clave de OpenAI |

---

## 📱 Resumen de Números:

| Número | Tipo | ¿Dónde está? | ¿Para qué sirve? |
|--------|------|-------------|------------------|
| `+56 9 9155 3279` | Business (FROM) | Paso 2 (arriba) | Envía mensajes del bot |
| `+56 9 7725 1396` | Destinatario (TO) | Paso 3 | Recibe mensajes de prueba |

---

## ✅ Checklist:

- [ ] Verificar que `+56 9 9155 3279` esté seleccionado en Paso 2
- [ ] Copiar el Phone Number ID del número de ONDA
- [ ] Configurar webhook en Meta → Configuration (no solo activar toggle)
- [ ] Verificar que todas las variables estén en Vercel
- [ ] Probar enviando un mensaje

---

## 🚀 Siguiente Acción Inmediata:

1. **Ve al Paso 2** (arriba del paso 3 en la misma pantalla)
2. **Verifica** qué número está seleccionado
3. **Si es `+56 9 9155 3279`:** ✅ Perfecto, copia su Phone Number ID
4. **Si es otro número:** Cámbialo al número de ONDA

¿Qué número ves seleccionado en el Paso 2?

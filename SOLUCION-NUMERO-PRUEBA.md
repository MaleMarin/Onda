# 🔧 Solución: No Puedo Cambiar el Número Business

## ❌ Problema:

Estás viendo solo el **número de prueba** (`+1 555 157 6862`) y no puedes cambiarlo al número de ONDA (`+56 9 9155 3279`).

**Razón:** Estás usando una **cuenta de prueba** de Meta que solo permite usar números de prueba.

---

## ✅ Soluciones:

### Opción 1: Usar el Número de Prueba (RÁPIDO - Recomendado para empezar)

**Puedes usar el número de prueba por ahora para probar el bot:**

1. **Copia el Phone Number ID que ves:**
   ```
   918128831381165
   ```

2. **Úsalo en Vercel:**
   - Ve a Vercel → Settings → Environment Variables
   - En `WHATSAPP_PHONE_NUMBER_ID`, pon: `918128831381165`
   - Guarda y haz Redeploy

3. **Funciona así:**
   - El bot enviará mensajes desde el número de prueba (`+1 555 157 6862`)
   - Los mensajes llegarán a tu número personal (`+56 9 7725 1396`)
   - **Ventaja:** Funciona inmediatamente, sin configuración adicional
   - **Desventaja:** Es temporal (90 días), pero suficiente para probar

**✅ Esta es la opción MÁS RÁPIDA para hacer funcionar el bot ahora mismo.**

---

### Opción 2: Agregar tu Número Real a Meta (MÁS COMPLEJO)

Si quieres usar el número de ONDA (`+56 9 9155 3279`), necesitas:

#### Paso 1: Verificar que el número esté en Meta

1. Ve a **WhatsApp** → **Phone Numbers** (no API Setup)
2. Busca si `+56 9 9155 3279` aparece en la lista
3. Si NO aparece, necesitas agregarlo

#### Paso 2: Agregar el número (si no está)

1. Ve a **WhatsApp** → **Phone Numbers**
2. Haz clic en **"Add Phone Number"** o **"Agregar número"**
3. Ingresa: `+56991553279` (sin espacios)
4. Sigue el proceso de verificación
5. Una vez verificado, debería aparecer en el dropdown del Paso 2

#### Paso 3: Seleccionar el número

1. Vuelve a **API Setup** → Paso 2
2. Haz clic en el dropdown
3. Ahora deberías ver `+56 9 9155 3279` en la lista
4. Selecciónalo
5. Copia su Phone Number ID

**⚠️ Nota:** Este proceso puede requerir verificación de negocio y aprobación de Meta.

---

## 🎯 Recomendación:

### Para EMPEZAR y PROBAR el bot:
✅ **Usa el número de prueba** (`918128831381165`)
- Funciona inmediatamente
- No requiere configuración adicional
- Tienes 90 días para probar
- Puedes cambiarlo después

### Para PRODUCCIÓN (más adelante):
📋 **Agrega el número real de ONDA**
- Requiere verificación en Meta
- Proceso más largo
- Pero es permanente

---

## 📋 Lo que DEBES hacer AHORA:

### 1. Usar el número de prueba (por ahora):

**En Vercel → Environment Variables:**

| Variable | Valor |
|----------|-------|
| `WHATSAPP_PHONE_NUMBER_ID` | `918128831381165` |
| `WHATSAPP_ACCESS_TOKEN` | (El token que copiaste antes) |
| `WHATSAPP_VERIFY_TOKEN` | (Tu token secreto) |
| `OPENAI_API_KEY` | (Tu clave de OpenAI) |

### 2. Configurar el webhook:

1. Ve a **WhatsApp** → **Configuration** (no API Setup)
2. Busca **"Webhook"**
3. Haz clic en **"Edit"**
4. Completa:
   - **Callback URL:** `https://onda2026.vercel.app/api/webhook`
   - **Verify Token:** El mismo que pusiste en Vercel
5. Haz clic en **"Verify and Save"**

### 3. Probar:

1. Envía un mensaje de WhatsApp al número de prueba (`+1 555 157 6862`)
2. O desde tu número personal (`+56 9 7725 1396`) envía un mensaje
3. El bot debería responder

---

## ✅ Resumen:

- **NO puedes cambiar el número ahora** porque estás en cuenta de prueba
- **SÍ puedes usar el número de prueba** para hacer funcionar el bot
- **Más adelante** puedes agregar tu número real cuando lo necesites
- **Lo importante ahora:** Configura el webhook y prueba que funcione

---

## 🚀 Próximo Paso Inmediato:

1. **Copia el Phone Number ID:** `918128831381165`
2. **Ponlo en Vercel** → `WHATSAPP_PHONE_NUMBER_ID`
3. **Configura el webhook** en Meta → Configuration
4. **Prueba enviando un mensaje**

¿Quieres que te guíe paso a paso para configurar el webhook ahora?

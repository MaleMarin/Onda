# 📱 Guía Paso a Paso - ONDA WhatsApp Bot

## ✅ PASO 1: Subir el código a GitHub

1. Abre la terminal en la carpeta del proyecto
2. Ejecuta estos comandos:

```bash
git add .
git commit -m "Bot limpio desde cero"
git push
```

**¿Qué hace esto?** Sube tu código a GitHub para que Vercel pueda desplegarlo.

---

## ✅ PASO 2: Conectar con Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en "Add New Project"
3. Conecta tu repositorio de GitHub (el proyecto `ondabot`)
4. Vercel detectará que es un proyecto Next.js automáticamente
5. Haz clic en "Deploy"

**Espera 2-3 minutos** mientras Vercel construye y despliega tu proyecto.

**Al terminar, verás una URL como:** `https://onda2026.vercel.app` o `https://onda2026-xxxxx.vercel.app`

**¡Guarda esta URL!** La necesitarás en el siguiente paso.

**Nota:** Si tu proyecto ya existe en Vercel con el nombre "onda2026", simplemente conéctalo desde GitHub.

---

## ✅ PASO 3: Configurar Variables de Entorno en Vercel

1. En Vercel, ve a tu proyecto
2. Haz clic en **Settings** (arriba)
3. Haz clic en **Environment Variables** (menú izquierdo)
4. Agrega estas 4 variables (una por una):

### Variable 1:
- **Name:** `WHATSAPP_VERIFY_TOKEN`
- **Value:** Crea un token secreto (ejemplo: `mi_token_secreto_123`)
- **Environment:** Selecciona todas (Production, Preview, Development)
- Haz clic en **Save**

### Variable 2:
- **Name:** `WHATSAPP_ACCESS_TOKEN`
- **Value:** Tu token de acceso de WhatsApp (lo obtienes de Meta)
- **Environment:** Todas
- **Save**

### Variable 3:
- **Name:** `WHATSAPP_PHONE_NUMBER_ID`
- **Value:** El ID de tu número de teléfono de WhatsApp
- **Environment:** Todas
- **Save**

### Variable 4:
- **Name:** `OPENAI_API_KEY`
- **Value:** Tu clave de API de OpenAI
- **Environment:** Todas
- **Save**

**⚠️ IMPORTANTE:** Después de agregar todas las variables, ve a **Deployments** y haz clic en los 3 puntos (⋯) del último deployment → **Redeploy** para que las variables se apliquen.

---

## ✅ PASO 4: Obtener tokens de Meta (WhatsApp)

### 4.1. Crear/Acceder a tu App en Meta

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Inicia sesión con tu cuenta de Facebook
3. Haz clic en **"My Apps"** → **"Create App"**
4. Selecciona **"Business"** → **Continue**
5. Completa el nombre de la app y crea la app

### 4.2. Agregar WhatsApp

1. En el dashboard de tu app, busca **"WhatsApp"**
2. Haz clic en **"Set up"** o **"Get Started"**
3. Sigue las instrucciones para configurar WhatsApp Business API

### 4.3. Obtener los tokens

1. Ve a **WhatsApp** → **API Setup** (o **Configuration**)
2. Encontrarás:
   - **Phone number ID** → Copia este número (es el `WHATSAPP_PHONE_NUMBER_ID`)
   - **Temporary access token** → Copia este token (es el `WHATSAPP_ACCESS_TOKEN`)

**⚠️ NOTA:** El token temporal expira en 24 horas. Para uno permanente, necesitas configurar un sistema de tokens.

---

## ✅ PASO 5: Configurar el Webhook en Meta

1. En Meta, ve a **WhatsApp** → **Configuration**
2. Busca la sección **"Webhook"**
3. Haz clic en **"Edit"** o **"Configure"**
4. Completa:

   - **Callback URL:** 
     ```
     https://onda2026.vercel.app/api/webhook
     ```
     (O la URL completa que te muestra Vercel para tu proyecto)
   
   - **Verify token:**
     ```
     mi_token_secreto_123
     ```
     (El mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN` en el Paso 3)

5. Haz clic en **"Verify and Save"**

**✅ Si todo está bien, verás un check verde** que dice "Webhook verified"

6. Haz clic en **"Manage"** o **"Subscribe"** y marca la casilla de **"messages"**
7. Guarda los cambios

---

## ✅ PASO 6: Verificar que todo funciona

### 6.1. Verificar el webhook

Abre en tu navegador:
```
https://onda2026.vercel.app/api/webhook
```

**Deberías ver un JSON** que dice algo como:
```json
{
  "status": "ONDA WhatsApp Bot",
  "message": "Webhook funcionando correctamente",
  "env_check": {
    "WHATSAPP_VERIFY_TOKEN": true,
    "WHATSAPP_ACCESS_TOKEN": true,
    "WHATSAPP_PHONE_NUMBER_ID": true,
    "OPENAI_API_KEY": true
  }
}
```

**Si todas las variables están en `true`**, ¡está bien configurado!

### 6.2. Probar el bot

1. Abre WhatsApp en tu teléfono
2. Envía un mensaje al número de WhatsApp que configuraste en Meta
3. El bot debería responder usando ONDA

---

## 🐛 Si algo no funciona

### El webhook no se verifica

- ✅ Verifica que la URL sea exactamente: `/api/webhook` (sin espacios)
- ✅ Verifica que el `WHATSAPP_VERIFY_TOKEN` en Vercel sea EXACTAMENTE igual al que pusiste en Meta
- ✅ Asegúrate de haber hecho "Redeploy" después de agregar las variables

### No recibe mensajes

- ✅ Ve a Meta → WhatsApp → Configuration → Webhook
- ✅ Verifica que esté "Subscribed" a "messages"
- ✅ Revisa los logs en Vercel (Deployments → Click en el deployment → Logs)

### No envía respuestas

- ✅ Verifica que `OPENAI_API_KEY` esté correcta
- ✅ Verifica que `WHATSAPP_ACCESS_TOKEN` tenga permisos para enviar mensajes
- ✅ Revisa los logs en Vercel para ver errores específicos

---

## 📋 Checklist Final

Antes de probar, verifica que tengas:

- [ ] Código subido a GitHub
- [ ] Proyecto desplegado en Vercel
- [ ] 4 variables de entorno configuradas en Vercel
- [ ] Webhook configurado en Meta con la URL correcta
- [ ] Webhook verificado (check verde en Meta)
- [ ] Suscrito a eventos "messages"
- [ ] Probado abriendo `/api/webhook` en el navegador

---

## 🎉 ¡Listo!

Si seguiste todos los pasos, tu bot debería estar funcionando. Envía un mensaje de WhatsApp y debería responder.

**¿Necesitas ayuda?** Revisa los logs en Vercel para ver qué está pasando.

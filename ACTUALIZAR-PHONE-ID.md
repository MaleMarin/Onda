# ✅ Actualizar Phone Number ID en Vercel

## 📋 Tu Phone Number ID:
```
886309674569527
```

Este es el ID del número de ONDA (`+56 9 9155 3279`).

---

## 🎯 Pasos para Actualizar:

### Paso 1: Ir a Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión
3. Selecciona tu proyecto **"onda2026"**

### Paso 2: Actualizar la Variable

1. Ve a **Settings** (arriba)
2. Haz clic en **Environment Variables** (menú izquierdo)
3. Busca la variable `WHATSAPP_PHONE_NUMBER_ID`
4. Haz clic en el valor actual (probablemente `918128831381165`)
5. **Reemplázalo** con: `886309674569527`
6. Haz clic en **Save**

### Paso 3: Hacer Redeploy

**MUY IMPORTANTE:** Después de cambiar variables, debes hacer redeploy:

1. Ve a **Deployments** (arriba)
2. Encuentra el último deployment
3. Haz clic en los **3 puntos (⋯)** del lado derecho
4. Selecciona **"Redeploy"**
5. Espera a que termine (2-3 minutos)

---

## ✅ Verificar que Esté Correcto:

### Opción 1: Verificar en Vercel

1. Ve a Settings → Environment Variables
2. Verifica que `WHATSAPP_PHONE_NUMBER_ID` tenga el valor: `886309674569527`

### Opción 2: Verificar el Webhook

Abre en el navegador:
```
https://onda2026.vercel.app/api/webhook
```

Deberías ver un JSON con:
```json
{
  "env_check": {
    "WHATSAPP_PHONE_NUMBER_ID": true,
    ...
  }
}
```

Si está en `true`, está bien configurado.

---

## 🧪 Probar el Bot:

### Ahora puedes probar con el número de ONDA:

1. **Abre WhatsApp** en tu celular
2. **Envía un mensaje** al número: `+56 9 9155 3279`
3. **El bot debería responder** usando ONDA

### O desde otro celular:

1. Agrega el número `+56 9 9155 3279` en WhatsApp
2. Envía un mensaje (ejemplo: "Hola")
3. El bot responderá

---

## 📋 Checklist Final:

- [ ] Phone Number ID actualizado en Vercel: `886309674569527`
- [ ] Redeploy hecho en Vercel
- [ ] Webhook configurado en Meta
- [ ] Webhook verificado (check verde)
- [ ] Webhook suscrito a "messages"
- [ ] Todas las variables configuradas en Vercel

---

## 🔍 Si No Funciona:

### Revisa los logs en Vercel:

1. Ve a Deployments → Último deployment → **Logs**
2. Envía un mensaje al `+56 9 9155 3279`
3. Busca en los logs:
   - `📩 Webhook recibido:` = Meta está enviando mensajes ✅
   - `💬 Mensaje recibido de...` = Está procesando ✅
   - `✅ Respuesta enviada correctamente` = Funcionó ✅
   - `❌ Error...` = Hay un problema ❌

### Verifica el webhook en Meta:

1. Ve a Meta → WhatsApp → Configuration → Webhook
2. Verifica:
   - Callback URL: `https://onda2026.vercel.app/api/webhook`
   - Status: "Verified" ✅
   - Subscribed to: "messages" ✅

---

## 🎉 ¡Listo!

Con este Phone Number ID (`886309674569527`), tu bot ahora usará el número real de ONDA (`+56 9 9155 3279`) en lugar del número de prueba.

**Próximo paso:** Haz el redeploy y prueba enviando un mensaje.

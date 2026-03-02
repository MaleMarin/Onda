# 📝 Valores para las Variables de Entorno

## 🔑 Variable 1: WHATSAPP_VERIFY_TOKEN

**¿Qué es?** Un token secreto que tú inventas para verificar el webhook.

**¿Qué valor pongo?** Cualquier texto secreto que solo tú conozcas.

**Ejemplos:**
```
mi_token_secreto_2026
onda_whatsapp_verify_123
precisar_fundacion_token
```

**⚠️ IMPORTANTE:** 
- Elige UNO de estos valores (o inventa el tuyo)
- Debes usar el **MISMO valor** en:
  1. Vercel (en la variable `WHATSAPP_VERIFY_TOKEN`)
  2. Meta (en el campo "Verify Token" del webhook)

---

## 🔑 Variable 2: WHATSAPP_ACCESS_TOKEN

**¿Qué es?** Token de acceso de WhatsApp Cloud API.

**¿Dónde lo obtengo?**
1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Entra a tu App
3. Ve a **WhatsApp** → **API Setup**
4. Busca **"Temporary access token"** o **"Access Token"**
5. Cópialo completo

**Ejemplo de cómo se ve:**
```
EAABwzLixZCZBoBO7ZCZB... (token muy largo)
```

**⚠️ NOTA:** 
- Este token expira en 24 horas
- Para uno permanente, necesitas configurar un sistema de tokens
- Por ahora, usa el temporal y renuévalo cada día

---

## 🔑 Variable 3: WHATSAPP_PHONE_NUMBER_ID

**¿Qué es?** El ID del número de teléfono de WhatsApp Business.

**¿Dónde lo obtengo?**
1. En Meta → **WhatsApp** → **API Setup**
2. Busca **"Phone number ID"**
3. Es un número largo (solo números)

**Ejemplo de cómo se ve:**
```
123456789012345
```

**⚠️ IMPORTANTE:**
- Solo números, sin espacios ni guiones
- Es diferente al número de teléfono normal
- Es el ID que identifica tu número en la API

---

## 🔑 Variable 4: OPENAI_API_KEY

**¿Qué es?** Tu clave de API de OpenAI.

**¿Dónde la obtengo?**
1. Ve a [platform.openai.com](https://platform.openai.com)
2. Inicia sesión con tu cuenta
3. Ve a **API keys** → **Create new secret key**
4. Dale un nombre (ej: "onda2026")
5. Cópiala inmediatamente (solo se muestra una vez)

**Ejemplo de cómo se ve:**
```
sk-proj-abc123def456ghi789...
```

**⚠️ IMPORTANTE:**
- Empieza con `sk-`
- Guárdala bien porque NO podrás verla de nuevo
- Si la pierdes, tendrás que crear una nueva

---

## ✅ Checklist de Configuración

Cuando configures en Vercel, verifica:

- [ ] `WHATSAPP_VERIFY_TOKEN` = Un texto secreto que inventaste
- [ ] `WHATSAPP_ACCESS_TOKEN` = Token de Meta (lo copias de Meta)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` = ID del número (lo copias de Meta)
- [ ] `OPENAI_API_KEY` = Clave de OpenAI (la creas en OpenAI)

---

## 🟠 Variable opcional: NEXT_PUBLIC_ONDA_ORANGE

**¿Qué es?** Color del botón **Enviar** (naranja, estilo neumórfico). Si no la defines, se usa naranja oscuro (`#C43E00`).

**¿Qué valor pongo?** Un color en hexadecimal de 6 dígitos.

**Ejemplos:**
```
#C43E00
#FB5002
```

**Dónde configurarla:** Vercel → proyecto → **Settings** → **Environment Variables** → añade `NEXT_PUBLIC_ONDA_ORANGE` con valor `#FB5002` (u otro hex) si quieres fijar el naranja. Tras cambiar, haz **Redeploy**.

---

## 🔄 Después de Configurar

1. **Guarda todas las variables** en Vercel
2. Ve a **Deployments**
3. Haz clic en los **3 puntos (⋯)** del último deployment
4. Selecciona **Redeploy**
5. Espera a que termine

---

## 🧪 Verificar que Funciona

Abre en el navegador:
```
https://onda2026.vercel.app/api/webhook
```

Deberías ver:
```json
{
  "env_check": {
    "WHATSAPP_VERIFY_TOKEN": true,
    "WHATSAPP_ACCESS_TOKEN": true,
    "WHATSAPP_PHONE_NUMBER_ID": true,
    "OPENAI_API_KEY": true
  }
}
```

Si todas están en `true`, ¡está bien configurado! ✅

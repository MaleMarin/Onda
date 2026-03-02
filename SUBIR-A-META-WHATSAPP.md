# Subir ONDA a Meta para que funcione en WhatsApp

Para que el bot ONDA reciba y responda mensajes reales en WhatsApp (no solo en modo prueba), hay que **publicar la app** en Meta y, si Meta lo pide, pasar la **revisión de la app (App Review)**. Aquí tienes los pasos y lo que suele pedir Meta.

---

## 1. Tener listo el chat y el webhook

- **Chat desplegado en Vercel** (o en un servidor con HTTPS).
- **Webhook funcionando:**  
  - URL: `https://tu-dominio.vercel.app/api/webhook`  
  - Método GET: verificación con `WHATSAPP_VERIFY_TOKEN`.  
  - Método POST: recibir mensajes y responder.
- Variables de entorno en Vercel: `OPENAI_API_KEY`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

Si aún no lo tienes, sigue el [README.md](./README.md) y [LLEVAR-CHAT-A-PRECISAR.md](./LLEVAR-CHAT-A-PRECISAR.md).

---

## 2. Política de privacidad accesible

Meta exige una **URL pública** de la política de privacidad.

1. Usa el texto de [POLITICA-PRIVACIDAD-CHAT-ONDA.md](./POLITICA-PRIVACIDAD-CHAT-ONDA.md).
2. Sustituye los placeholders:
   - `[fecha]` → fecha actual.
   - `[indicar email o formulario de contacto]` → email o página de contacto de Precisar.
3. Publica esa política en:
   - La web de Precisar (por ejemplo: `https://www.precisar.net/privacidad-chat-onda`), o  
   - La misma app (por ejemplo: `https://onda2026.vercel.app/privacidad`).

Guarda la URL final; la vas a usar en Meta (App Dashboard y, si aplica, en App Review).

---

## 3. Completar datos de la app en Meta

1. Entra en [developers.facebook.com](https://developers.facebook.com) y abre tu **App**.
2. **Configuración** → **Básica**:
   - Nombre de la app (ej. "ONDA - Precisar").
   - Icono y categoría.
   - **URL de Política de Privacidad:** la URL del paso 2.
   - Si usas inicio de sesión con Facebook, también suele pedirse URL de Términos; para solo WhatsApp a veces no es obligatorio, pero conviene tenerla si Meta la pide.
3. Guarda los cambios.

---

## 4. WhatsApp: configuración del producto

1. En el panel de la app, entra al producto **WhatsApp**.
2. **Configuración inicial** (o “Getting started”):
   - Número de teléfono de prueba o el número de negocio ya asociado.
   - Token de acceso (el que usas en `WHATSAPP_ACCESS_TOKEN`).
3. **Webhook** (Configuration):
   - **Callback URL:** `https://tu-dominio.vercel.app/api/webhook`
   - **Verify Token:** el mismo que `WHATSAPP_VERIFY_TOKEN`
   - Pulsa **Verify and save**.
4. **Campos de webhook:** suscríbete al campo **messages** (y, si usas notificaciones de estado, a **message_template_status_update** solo si aplica).

Sin esto, Meta no envía los mensajes a tu servidor.

---

## 5. Publicar la app (para uso real en WhatsApp)

En modo **Desarrollo**, Meta puede limitar los mensajes a pruebas desde el panel. Para que cualquier usuario pueda escribir al número de ONDA y recibir respuestas:

1. En el panel de la app: **Revisión de la app** (App Review).
2. Revisa qué **permisos** usa tu integración (por ejemplo, `whatsapp_business_messages`). Si piden revisión para esos permisos, inicia el flujo de **App Review**.
3. Meta suele pedir:
   - **Descripción del uso:** por ejemplo: “Chat educativo ONDA de la Fundación Precisar. Los usuarios envían mensajes por WhatsApp y reciben respuestas automáticas sobre alfabetización mediática e informacional (AMI). No usamos los mensajes para publicidad ni los compartimos con terceros con fines comerciales.”
   - **URL de la política de privacidad** (la del paso 2).
   - **Capturas o vídeo** del flujo: usuario envía un mensaje y recibe respuesta (puedes usar el [VIDEO-PARA-META.md](./VIDEO-PARA-META.md) como guión).
4. Envía el formulario y espera la respuesta de Meta (suele tardar varios días).

Cuando la app esté **aprobada y publicada**, el webhook podrá recibir mensajes de producción y el bot funcionará en WhatsApp para todos los que escriban al número configurado.

---

## 6. Después de publicar

- **Probar:** envía un mensaje de WhatsApp al número de ONDA y comprueba en los logs de Vercel que llega el POST y que la respuesta se envía.
- **Número de negocio:** si quieres un número “oficial” con nombre de negocio, revisa en Meta las opciones de **WhatsApp Business Account** y verificación de negocio.
- Mantén la **política de privacidad** actualizada y la URL accesible; Meta puede revisarla en auditorías.

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | Chat y webhook en Vercel funcionando |
| 2 | Política de privacidad publicada en una URL (ej. precisar.net o tu dominio) |
| 3 | App en Meta: datos básicos y URL de política |
| 4 | WhatsApp: webhook verificado y campo **messages** suscrito |
| 5 | App Review (si aplica) y publicar la app |
| 6 | Probar en WhatsApp real y revisar logs |

Si algo falla, revisa también [META-WEBHOOK-Y-DESARROLLO.md](./META-WEBHOOK-Y-DESARROLLO.md) y los documentos de solución de problemas en este repositorio.

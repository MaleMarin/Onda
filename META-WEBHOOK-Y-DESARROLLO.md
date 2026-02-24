# Meta Webhook y modo Desarrollo

## Lo que está bien en tu configuración

1. **Callback URL:** `https://onda2026.vercel.app/api/webhook` ✅  
2. **Token de verificación:** configurado ✅  
3. **"messages" suscrito:** En una de las vistas se ve **"messages"** en **Suscritos** (azul), versión `v24.0` ✅  

Eso es lo que necesitas para recibir mensajes en el webhook.

---

## Aviso importante (caja roja en Meta)

En la página de webhook, Meta muestra este aviso:

> **"Las apps solo podrán recibir webhooks de prueba enviados desde el panel mientras la app esté sin publicar. No se entregarán datos de producción, incluidos los de los administradores, desarrolladores o evaluadores de la app, a menos que la app se haya publicado."**

Es decir:

- Con la app **sin publicar** (modo Desarrollo): Meta puede **no** enviar los mensajes reales de WhatsApp a tu URL; solo webhooks de prueba desde el panel.
- Para recibir los mensajes reales (cuando alguien escribe "hola" al número de ONDA), normalmente hace falta **publicar la app** o cumplir los requisitos de Meta para recibir datos en desarrollo (por ejemplo, números/usuarios de prueba).

Por eso, aunque "messages" esté suscrito, es posible que no veas POST en Vercel hasta que la app esté publicada o tengas configurado correctamente el uso en desarrollo.

---

## "Cuando cierra la página se va a USER"

Si al cerrar la página o al volver después ves que algo "se va a USER" o cambia:

1. **Comprobar que "messages" sigue suscrito**  
   - Vuelve a **Productos** → **Webhooks** → producto **WhatsApp / Whatsapp Business Account**.  
   - Baja hasta la lista de campos y confirma que **"messages"** sigue en **Suscritos** (toggle azul).  
   - Si aparece en "No suscritos", actívalo de nuevo y guarda.

2. **No depender de una sola pestaña**  
   - Después de cambiar algo, haz clic en **"Verificar y guardar"** si está disponible.  
   - Recarga la página y comprueba de nuevo que "messages" sigue suscrito.

3. **Si "messages" se desactiva solo**  
   - Puede ser un bug de la interfaz o que el producto seleccionado arriba (dropdown) no sea el correcto.  
   - Asegúrate de tener seleccionado el producto que corresponde a tu cuenta de WhatsApp (p. ej. "Whatsapp Business Account") cuando revisas y activas "messages".

---

## Qué hacer para que el bot responda en la práctica

1. **Dejar "messages" suscrito**  
   - Como en la captura donde se ve "messages" en **Suscritos**.  
   - Cada vez que entres a Webhooks, comprobar que siga así.

2. **Publicar la app (recomendado para recibir mensajes reales)**  
   - En Meta: **Revisión de la app** / **App Review** y seguir el proceso para **publicar** la app.  
   - Así Meta puede entregar datos de producción (mensajes reales) a tu webhook.

3. **Probar de nuevo**  
   - Con "messages" suscrito y, si es posible, app publicada:  
     - Envía "hola" al número de ONDA.  
     - Revisa en Vercel → Logs si aparece un **POST** a `/api/webhook`.

---

## Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Está bien que "messages" esté en Suscritos? | **Sí.** Es lo correcto. |
| ¿Por qué no llegan mensajes? | Modo Desarrollo: Meta puede no enviar datos de producción hasta que la app esté publicada. |
| ¿Qué hacer con "se va a USER" al cerrar? | Verificar siempre que "messages" siga en **Suscritos** al volver a la página y guardar bien. |
| ¿Siguiente paso? | Publicar la app (o configurar pruebas permitidas en desarrollo) y volver a probar el envío de "hola". |

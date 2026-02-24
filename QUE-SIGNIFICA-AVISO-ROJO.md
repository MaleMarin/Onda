# Qué significa el aviso en rojo de Meta

## Texto del aviso (resumido)

> **"Las apps solo podrán recibir webhooks de prueba enviados desde el panel mientras la app esté sin publicar. No se entregarán datos de producción, incluidos los de los administradores, desarrolladores o evaluadores de la app, a menos que la app se haya publicado."**

---

## En palabras simples

| Situación | Qué pasa |
|-----------|----------|
| **App sin publicar** (como ahora) | Meta **solo** envía webhooks de **prueba** desde el panel. **No** envía los mensajes reales de WhatsApp a tu URL. |
| **App publicada** | Meta **sí** envía los mensajes reales (cuando alguien escribe al número de ONDA) a tu webhook. |

Es decir: mientras la app esté **sin publicar**, los mensajes que la gente envía por WhatsApp al número de ONDA **no llegan** a `https://onda2026.vercel.app/api/webhook`. Por eso el bot no responde y ves las dos palomitas grises.

---

## Por qué no responde el bot

1. Tienes el webhook bien configurado (URL + token + "messages" suscrito).
2. Pero la app está en **modo Desarrollo** y **sin publicar**.
3. Según ese aviso, en ese estado **no se entregan datos de producción** (mensajes reales).
4. Por tanto, Meta no hace POST a tu URL cuando alguien escribe "hola" al número de ONDA.

El aviso en rojo es justo eso: te está diciendo que **hasta que no publiques la app, no recibirás esos mensajes**.

---

## Qué hacer para que sí lleguen los mensajes

**Publicar la app** en Meta:

1. En el menú izquierdo entra a **Revisión de la app** (App Review).
2. Sigue los pasos que Meta pide para **solicitar la publicación** de la app.
3. Cuando la app esté **publicada**, Meta empezará a enviar los mensajes reales a tu webhook y el bot podrá responder.

Mientras la app siga sin publicar, el aviso en rojo seguirá aplicando: solo webhooks de prueba, no mensajes reales.

---

## Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Qué quiere decir el aviso en rojo? | Que **sin publicar** la app solo recibes webhooks de **prueba**, no mensajes reales. |
| ¿Por qué no responde el bot? | Porque los mensajes reales **no se envían** a tu URL hasta que la app esté publicada. |
| ¿Qué hacer? | **Publicar la app** en Meta (Revisión de la app). |

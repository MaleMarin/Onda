# Dónde suscribirse a "messages" en Meta

## No es en "Webhook" general

En el menú de Meta a veces hay una sección **Webhook** (general de la app). Ahí **no** suele estar la opción de suscribirse a "messages" de WhatsApp.

## Es dentro de WhatsApp

Hay que entrar a la configuración de **WhatsApp** y ahí configurar el webhook y suscribirse a **messages**.

---

## Pasos concretos

### 1. Entrar a WhatsApp

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps**
2. Abre tu **App**
3. En el menú izquierdo, entra a **WhatsApp** (ícono de WhatsApp)

### 2. Ir a Configuration (Configuración)

- Dentro de **WhatsApp**, haz clic en **Configuration** (o **API Setup** según tu vista)
- Busca la sección que hable de **Webhook** o **Callback URL** para WhatsApp (no la general de la app)

### 3. Configurar la URL del webhook (si no está)

- **Callback URL:** `https://onda2026.vercel.app/api/webhook`
- **Verify token:** el mismo que tienes en Vercel en `WHATSAPP_VERIFY_TOKEN`
- **Verify and Save** → debe quedar con check verde

### 4. Suscribirse a "messages"

En esa misma zona de **WhatsApp** (no en Webhook general):

- Busca **"Webhook fields"**, **"Manage"**, **"Subscribe to"** o **"Edit"** junto al webhook
- Debe haber una lista de campos/eventos
- Marca **"messages"**
- Guarda

A veces está como:

- **WhatsApp** → **Configuration** → bloque del webhook → **Manage** → marcar **messages**

O en **API Setup**:

- Después de poner la Callback URL y verificar, hay un paso o enlace para **suscribirse a campos** → ahí marcar **messages**

---

## Resumen

| Dónde | Qué hacer |
|-------|-----------|
| Webhook (general de la app) | No es ahí donde se suscribe "messages" |
| **WhatsApp** → Configuration / API Setup | Ahí configurar URL + verify token y **suscribir "messages"** |

Si en la pantalla de **WhatsApp** ves "messages" y lo marcas/activas, Meta empezará a enviar los mensajes entrantes a `https://onda2026.vercel.app/api/webhook` y el bot podrá responder.

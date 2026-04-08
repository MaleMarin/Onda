# WhatsApp (Meta): operación y diagnóstico

**Checklist operativo (paso a paso):** [META-WHATSAPP-CHECKLIST.md](./META-WHATSAPP-CHECKLIST.md)

## Endpoints en este repo

| Ruta | Uso |
|------|-----|
| `GET /api/webhook` | Challenge de suscripción Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`) o JSON de diagnóstico si se abre sin parámetros. |
| `POST /api/webhook` | Eventos firmados (`x-hub-signature-256`). Requiere `WHATSAPP_WEBHOOK_SECRET`. |
| `GET /api/wa/health` | Estado de variables de entorno y capacidades **sin** llamar a Meta. |

## Variables (repo / hosting)

| Variable | Necesaria para |
|----------|----------------|
| `WHATSAPP_WEBHOOK_SECRET` | Aceptar POST firmados. Sin esto el servidor responde **503** JSON (`code: MISSING_WHATSAPP_WEBHOOK_SECRET`). |
| `WHATSAPP_VERIFY_TOKEN` | Completar el challenge GET al suscribir el webhook en Meta. |
| `WHATSAPP_ACCESS_TOKEN` | Enviar mensajes por la API de Graph. |
| `WHATSAPP_PHONE_NUMBER_ID` | Id. del número en Graph. |
| `OPENAI_API_KEY` | Respuestas del modelo Onda (mismo flujo que web). |

## Qué depende de Meta (fuera del repo)

- App y número de WhatsApp Business aprobados.
- Configuración del webhook en el panel (URL pública, token de verificación, suscripción a `messages`).
- Políticas, plantillas para mensajes fuera de la ventana de 24 h, límites y revisión de la app.

## Prueba local de firma

En tests: `signMetaWebhookBody` + `verifyWebhookSignature` (`lib/verifyWebhookSignature.test.ts`).

Ejemplo manual:

```bash
curl -sS http://127.0.0.1:3020/api/wa/health | jq .
```

Con secreto configurado, un POST válido debe incluir header `x-hub-signature-256: sha256=<hex>` generado sobre el **cuerpo crudo** exacto.

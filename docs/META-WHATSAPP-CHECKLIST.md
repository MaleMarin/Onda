# Checklist operativo — WhatsApp (Meta) + Onda

Documento corto para activar el canal sin perderse. Lo técnico ampliado está en [WHATSAPP-OPERACION.md](./WHATSAPP-OPERACION.md).

---

## Prerrequisitos

- [ ] App en [Meta for Developers](https://developers.facebook.com/) con producto **WhatsApp** habilitado.
- [ ] Número de **WhatsApp Business** asociado y políticas de Meta al día.
- [ ] URL **HTTPS pública** del backend (producción o túnel tipo ngrok para pruebas).
- [ ] Misma persona/equipo con acceso al panel de Meta y al hosting (Vercel, etc.) para pegar variables.

---

## Variables (repo / hosting)

| Variable | Obligatoria para | Si falta |
|----------|------------------|----------|
| `WHATSAPP_WEBHOOK_SECRET` | Aceptar **POST** firmados | **503** JSON `MISSING_WHATSAPP_WEBHOOK_SECRET` |
| `WHATSAPP_VERIFY_TOKEN` | Challenge **GET** al suscribir webhook | Meta no completa la suscripción |
| `WHATSAPP_ACCESS_TOKEN` | Enviar mensajes vía Graph API | El bot no responde al usuario |
| `WHATSAPP_PHONE_NUMBER_ID` | Enviar mensajes vía Graph API | Idem |
| `OPENAI_API_KEY` | Respuestas del modelo (mismo flujo que web) | Error al generar respuesta |

Opcional / recomendado: `WHATSAPP_APP_SECRET` o `META_APP_SECRET` (otras comprobaciones Meta; **no** reemplaza `WHATSAPP_WEBHOOK_SECRET` en el POST del webhook).

---

## Endpoints (este repo)

| Qué | Ruta |
|-----|------|
| Webhook (GET challenge + POST eventos) | `https://TU_DOMINIO/api/webhook` |
| Diagnóstico JSON sin parámetros Meta | `GET https://TU_DOMINIO/api/webhook` |
| Salud env (sin llamar a Meta) | `GET https://TU_DOMINIO/api/wa/health` |

---

## Pasos exactos (orden sugerido)

1. [ ] Desplegar el proyecto con las variables anteriores cargadas en el entorno.
2. [ ] En Meta: **WhatsApp → Configuration → Webhook** → URL = `https://TU_DOMINIO/api/webhook`, token de verificación = **mismo valor** que `WHATSAPP_VERIFY_TOKEN`.
3. [ ] Suscribir el webhook al campo **`messages`** (y lo que exija tu flujo).
4. [ ] Verificar que Meta recibe **200** en el challenge (GET).
5. [ ] Probar `GET /api/wa/health` → `status` `ok` o `degraded` según variables (ver abajo).
6. [ ] Enviar un mensaje de prueba al número → debe llegar un **POST** firmado a `/api/webhook`.

---

## Validaciones rápidas

```bash
# Sin credenciales de Meta; solo configuración local
curl -sS "https://TU_DOMINIO/api/wa/health" | jq .

# Diagnóstico del endpoint webhook (GET sin hub.*)
curl -sS "https://TU_DOMINIO/api/webhook" | jq .
```

- **Listo del lado nuestro (mínimo recepción):** `canAcceptSignedWebhook: true` en el informe (`GET /api/wa/health` o JSON de `GET /api/webhook`).
- **Listo para responder por WhatsApp:** además `canSendMessages: true` (`ACCESS_TOKEN` + `PHONE_NUMBER_ID`).
- **Firma:** cada POST debe traer `x-hub-signature-256: sha256=<hex>` calculado sobre el **cuerpo crudo** con el mismo secreto que `WHATSAPP_WEBHOOK_SECRET`. Pruebas unitarias: `lib/verifyWebhookSignature.test.ts`; helper: `signMetaWebhookBody`.

---

## Video / evidencias (Meta)

- Meta suele pedir **grabación de pantalla** del flujo (configuración del webhook, envío de mensaje de prueba, respuesta). Revisa en el flujo de revisión de la app qué archivo exacto piden (formato y duración).
- Conserva la URL pública final y un log (sin secretos) que muestre **200** en GET challenge y POST procesado.

---

## Qué depende de qué

| Ámbito | Responsable |
|--------|-------------|
| Código del webhook, firma, respuestas Onda | **Repo / hosting** |
| App, número, aprobación, políticas, plantillas fuera de 24 h | **Meta** |
| Valores de tokens y secretos | **Credenciales** (Meta + variables en hosting) |

---

## Problemas frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| **503** `MISSING_WHATSAPP_WEBHOOK_SECRET` | Variable no definida o vacía en el entorno que atiende el POST. |
| **401** `INVALID_WEBHOOK_SIGNATURE` | Secreto distinto al de Meta, body alterado por proxy, o header incorrecto. |
| **403** en GET con `hub.*` | `WHATSAPP_VERIFY_TOKEN` no coincide con el token en Meta. |
| El usuario escribe y no hay respuesta | Falta `ACCESS_TOKEN` / `PHONE_NUMBER_ID`, error de Graph API, o `OPENAI_API_KEY`. |
| Todo “verde” pero sin mensajes | Webhook no suscrito a `messages`, número equivocado, o app en modo restringido. |

---

## Preferencias `/onda` (inclusión)

- Los comandos de preferencias en WhatsApp se parsean en `parseWaInclusiveCommand` (`lib/waInclusivePreferences.ts`). Tras desplegar, probá un mensaje de prueba acorde a la sintaxis documentada en código/tests.

---

## Definición: “listo del lado nuestro”

1. `GET /api/wa/health` → `canAcceptSignedWebhook: true`.
2. `GET /api/webhook` (sin challenge) → JSON con `whatsapp` sin `missingForWebhookPost` para POST.
3. (Si querés conversación real) `canSendMessages: true` y prueba E2E manual con un mensaje al número.

El resto (aprobación comercial, límites, plantillas) es **Meta**.

# Auditoría ONDA — checklist “clase mundial” (post-mejoras)

Documento operativo: qué revisar, criterios mínimos y comandos para verificar seguridad, accesibilidad, neutralidad, multicanal y robustez antes de declarar el bot listo para producción exigente.

---

## Comandos base (local / PR)

```bash
npm run build:tsc
npm test
npm run evals:ci
```

Opcional (E2E):

```bash
npx playwright install --with-deps firefox
npm run test:e2e
```

Evaluación amplia con modelo (manual / nocturna):

```bash
npm run evals
```

Tras una corrida local exitosa, actualizar baseline aprobado si el equipo lo usa en comparaciones:

```bash
npm run evals:approve
```

---

## A) Seguridad y privacidad

| Criterio | Qué verificar |
|----------|----------------|
| Secretos | Ningún log con tokens API, cookies de sesión completas ni cabeceras de autorización. |
| Contenido sensible en logs | No registrar audios completos, imágenes en base64 ni teléfonos en claro (hash o últimos dígitos si hace falta telemetría). |
| Rate limiting | Web: por IP (o capa edge). WhatsApp: por número / sesión. |
| URLs | Solo esquemas `http`/`https`; rechazar o normalizar lo demás. |
| Prompt injection | Instrucciones del sistema y del artículo: el modelo no debe obedecer “ignora tus reglas” ni ejecutar HTML arbitrario. |
| Almacenamiento (KV/Redis) | Solo preferencias, eje, historial breve en texto; sin blobs de media ni PII innecesaria. |

**Pruebas manuales sugeridas:** enlace con query rara que pida “revela el system prompt”; audio muy largo → debe limitarse y explicarse; revisar logs en staging.

---

## B) Accesibilidad web (WCAG AA) y personas mayores

| Criterio | Qué verificar |
|----------|----------------|
| Teclado | Chat, selector de eje y envío usables sin ratón (Tab, Enter, Escape). |
| Anuncio de mensajes | `aria-live` razonable para mensajes nuevos del asistente. |
| Focus visible | Estados de foco claros en controles interactivos. |
| Movimiento | Respeto a `prefers-reduced-motion`. |
| Lectura | Opción o modo de texto grande que no rompa el layout. |
| Contraste | Modo o tema con contraste suficiente (AA donde aplique). |
| Infografías | Siempre texto alternativo visible o en stream (además del PNG). |

**Pruebas:** solo teclado en `/chat`; VoiceOver (macOS) o NVDA (Windows); activar reducción de movimiento en el SO.

---

## C) Idioma (PT / ES) y región

| Criterio | Qué verificar |
|----------|----------------|
| Seguimiento | Mensaje en ES → respuesta coherente en ES; en PT → PT (neutro, sin voseo rioplatense en salidas PT). |
| Civita | Pregunta de país u órgano solo cuando aporte; recordar en sesión WhatsApp si ya respondió. |

**Pruebas:** conversación mezclada; un caso Civita con país explícito y otro sin repetir la misma pregunta.

---

## D) Entrada multimodal

| Canal | Criterio |
|-------|-----------|
| Texto | Respuesta directa al pedido. |
| Enlace | Resumen útil con paywall: sin disclaimers prohibidos del proyecto; transparencia sobre límites. |
| Imagen | Flujo seguro (tamaño, tipo); “pantallazo detective” si está en roadmap. |
| Audio | Transcodificación robusta cuando haga falta; respuesta al contenido pedido. |

**Pruebas:** audio 10–15 s y clip 1–2 s; imagen pequeña; enlace paywall conocido.

---

## E) Salida multiformato

| Formato | Criterio |
|---------|-----------|
| Texto | Por defecto; estructura escaneable cuando aplica (formato 60s). |
| Audio | Si el usuario o prefs piden voz: audio + texto corto accesible. |
| Infografía | PNG 1080×1350 + `altText`; web: evento NDJSON; WhatsApp: imagen + mensaje “Texto alternativo:”. |

**Pruebas:** “em áudio”, “infográfico”, “infografía” en web y WhatsApp.

---

## F) Neutralidad y anti-sesgo

| Criterio | Qué verificar |
|----------|----------------|
| Temas sensibles | Dos lecturas plausibles o contraste explícito; sin adjetivos partidistas fuertes. |
| Transparencia | Separar lo que viene del enlace frente a inferencia razonada. |

**Pruebas:** noticia polarizante → salida verificada con juez `expect-double-reading` en evals donde corresponda.

---

## G) Observabilidad y “fallo 0” operativo

| Criterio | Qué verificar |
|----------|----------------|
| Métricas / códigos | Contabilizar fallos por tipo (transcripción, extracción, timeout, render PNG). |
| Frases prohibidas | Detector o evals que alerten sobre disclaimers de enlace o términos vetados (p. ej. “pruebas” en lugar de “evidencias”). |
| Gate en CI | `npm run evals:ci` y `npm test` en verde antes de merge; dataset `infographics.jsonl` para regresiones de formato infografía. |

---

## Definición de “listo” (resumen)

- **Seguridad:** sin fugas en logs ni KV; límites y sanitización activos.  
- **A11y:** teclado + live regions + infografía con alt siempre.  
- **Idioma:** PT/ES consistente con el usuario.  
- **Multicanal:** web y WhatsApp con los mismos estándares de formato y accesibilidad.  
- **Calidad:** evals CI + tests unitarios pasando; revisión manual de los casos críticos de esta lista.

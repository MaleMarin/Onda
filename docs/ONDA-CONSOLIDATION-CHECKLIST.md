# Checklist — ONDA web + WhatsApp (consolidación)

Marca en revisión manual lo que ya verifiques en dispositivo real.

## A) Accesibilidad web (WCAG 2.2 AA — objetivo)

- [ ] **Teclado:** selector de Onda (tabs) enfocable; Enter activa el botón enfocado.
- [ ] **Skip:** enlace “saltar al campo de mensaje” visible al enfocar.
- [ ] **Roles:** `tablist` / `tab` / `tabpanel` (`#onda-eje-tablist` → `#onda-chat-main`).
- [ ] **Controles:** adjuntar imagen, micrófono y enviar tienen nombre accesible (`aria-label` / texto).
- [ ] **Mensajes:** región con anuncios de carga (`aria-live` ya en flujo de stream).
- [ ] **Contraste / tipo:** revisar gris sobre blanco en modo claro (placeholder `#5a5d62`).
- [ ] **Reduce motion:** con `prefers-reduced-motion: reduce`, sin animación fuerte en burbujas/picker.

## B) WhatsApp — estructura y accesibilidad

- [ ] Respuestas breves alineadas a `INSTRUCCION_WHATSAPP` (frase + bullets + “O que fazer agora”).
- [ ] Infografía/imagen: el texto enviado antes o como pie resume el contenido.
- [ ] Audio de respuesta: el usuario ya recibió texto en el mismo flujo (texto + TTS si aplica).

## C) Seguridad y privacidad

- [ ] Webhook POST solo con firma `x-hub-signature-256` válida.
- [ ] Rate limit activo (KV); sin KV, comportamiento documentado fail-open.
- [ ] No registrar en logs cuerpos completos de audio/imagen (revisar prácticas de despliegue).

## D) Flujos — consistencia

- [ ] **Web:** bienvenida sin duplicar; preferencias en `localStorage` (`userPreferences`).
- [ ] **WhatsApp:** estado KV `onda:wa:state:*` con eje, preferencias, historial reciente; comandos “Cívita”, “Mão”, “Profes” o `civita: …`.
- [ ] **Idioma:** default `pt-BR` en preferencias; heurística por mensaje ajusta locale para la respuesta.

## E) Pruebas automáticas (local)

- [ ] `npm test` — incluye `responseFormat`, `extractArticle` (thin/paywall simulado), `inferChatLocale`, `waEjeCommands`.

## Próximos pasos (fase 2)

- Flechas ←/→ en `tablist` (patrón completo WAI-ARIA).
- Contadores agregados por código de error en KV (`recordError` con `code`).
- Playwright: smoke API webhook con firma válida (opcional).

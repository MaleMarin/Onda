# ONDA: visión para ser el bot más fácil, profundo, creativo y útil

Ideas para que ONDA sea **fácil de usar**, **profundo**, **creativo**, con **última tecnología** y **muy útil para todas las personas**.

---

## 1. Facilidad de uso (el más fácil)

| Idea | Qué es | Impacto |
|------|--------|--------|
| **Onboarding en 1 toque** | Primera vez: un solo botón "Empezar" que elige Onda A Mano y muestra un chip tipo "¿Esta noticia es confiable?" para que toque y vea el flujo. | Baja fricción, cualquiera prueba en segundos. |
| **Modo "Solo escucho"** | Usuario puede activar "solo respuestas en voz": cada respuesta se reproduce en audio automáticamente (sin tocar Escuchar). | Ideal para personas que prefieren no leer o con poca vista. |
| **Atajos de teclado** | Enter = enviar, Esc = limpiar foco, tal vez Ctrl+Enter = nueva línea. En móvil: gesto para grabar (mantener un botón). | Usuarios avanzados y accesibilidad. |
| **Reanudar donde quedó** | Guardar última Onda y últimos N mensajes en `localStorage` (o sesión); al volver, recuperar contexto. | Sensación de continuidad sin login. |
| **"No sé por dónde empezar"** | Chip o botón que abre un mini menú: "Ver una noticia", "Entender una estafa", "Usar IA en el trabajo", etc., y sugiere una Onda + primera pregunta. | Reduce el miedo al folio en blanco. |
| **Accesibilidad fuerte** | Etiquetas ARIA, contraste, tamaño de fuente configurable, soporte lectores de pantalla, foco visible. | Inclusión y cumplimiento. |

---

## 2. Profundidad (respuestas que realmente sirven)

| Idea | Qué es | Impacto |
|------|--------|--------|
| **Memoria de sesión (y opcional larga)** | En la sesión: el modelo ya tiene historial. Opcional: "¿Guardar esta conversación?" → persistir por 24h o 7 días con un token anónimo para retomar. | Respuestas coherentes y seguimiento. |
| **País y perfil liviano (Civita)** | En Civita, preguntar "¿En qué país estás?" una vez y guardar; adaptar ejemplos (leyes, instituciones) a ese país. | Respuestas más relevantes. |
| **Citar fuentes** | Cuando el modelo use datos o protocolos, que cite "según [nombre de la guía ONDA]" o "fuente: Precisar". Botón "Ver fuente" que abre un link o un pequeño modal. | Confianza y trazabilidad. |
| **Seguimiento proactivo** | Tras una respuesta sobre estafa/phishing: "¿Quieres que te avisemos si sale una guía actualizada?" (con opt-in por notificación o email). | Profundidad en el tiempo. |
| **RAG / base de conocimiento** | Conectar una base (Precisar, guías, FAQ) vía embeddings + búsqueda; el modelo prioriza ese contenido. | Respuestas alineadas 100% con tu verdad. |
| **Resumen de conversación** | Al final de hilos largos: "Resumen: hablamos de X, Y, Z. ¿Guardamos esto?" (texto descargable o enviado por email). | Útil para quien vuelve después. |

---

## 3. Creatividad (experiencia memorable y cercana)

| Idea | Qué es | Impacto |
|------|--------|--------|
| **Saludos y despedidas contextuales** | Ya hay saludos por hora/día; sumar frases por Onda ("Hoy en Onda Civita podemos mirar una noticia con lupa") o por festivo/campaña. | Sensación de que el bot "está al tanto". |
| **Micro-animaciones y feedback** | Pequeñas animaciones al enviar (check), al recibir (onda suave), al cambiar de Onda (transición). Ya hay algo; reforzar sin exceso. | Sensación de fluidez. |
| **Respuestas en formatos ricos** | Listas, pasos numerados, "3 señales de alerta" con negritas; el modelo ya puede; asegurar que el front (Markdown o componentes) lo muestre bien. | Contenido más escaneable. |
| **"Desafío del día" (opcional)** | En A Mano: "Hoy prueba: mira un titular y pregúntate si es noticia o opinión" con link a enviar esa noticia al chat. | Engagement suave, no invasivo. |
| **Tono consistente pero variado** | Mismo tono ONDA (cercano, sin tecnicismos) con variedad de aperturas/cierres para no sonar repetitivo. | Creatividad sin perder identidad. |
| **Compartir** | Botón "Compartir esta respuesta" → genera un link o imagen (card) para WhatsApp/Twitter. | Viralidad y utilidad social. |

---

## 4. Última tecnología (sin sacrificar simplicidad)

| Idea | Qué es | Impacto |
|------|--------|--------|
| **Modelos de última generación** | Usar GPT-4o / Claude / Gemini más recientes donde el costo lo permita; o un "modo rápido" (mini) vs "modo profundo" (modelo grande). | Mejor razonamiento y seguridad. |
| **Streaming de voz (TTS en tiempo real)** | En lugar de esperar el MP3 completo, ir reproduciendo chunks de audio según va saliendo el texto (Web Audio API + TTS por fragmentos). | Respuesta más rápida en voz. |
| **Entrada por voz en tiempo real (Live API)** | Gemini Live o similar: el usuario habla y el bot responde hablando, con interrupciones (barge-in). Requiere más infra. | Experiencia tipo "llamada con el bot". |
| **Búsqueda en la conversación** | En hilos largos, "Buscar en esta charla" para encontrar un tema pasado. | Profundidad sin scroll infinito. |
| **Detección de idioma** | Si el usuario escribe en otro idioma (portugués, inglés), responder en ese idioma y ofrecer "¿Seguimos en español?". | Inclusión y alcance. |
| **Imagen generada cuando aplique** | Cuando el modelo sugiera una infografía y no exista guía estática, llamar a DALL·E/Imagen con prompt controlado y mostrar/enviar la imagen. Con moderación y coste controlado. | Respuestas más ricas. |

---

## 5. Muy útil para todas las personas

| Idea | Qué es | Impacto |
|------|--------|--------|
| **Lectura fácil** | Opción "Respuestas más cortas" o "Explicame como si tuviera 10 años" que se pasa al modelo como instrucción. | Inclusión cognitiva y menor fatiga. |
| **Modo alto contraste / tamaño** | Tema oscuro, alto contraste, selector de tamaño de fuente (A-/A+). | Accesibilidad visual. |
| **Confianza y transparencia** | Texto tipo "Soy un asistente de IA. No reemplazo a un profesional. Ante duda, consultá a una persona o fuente oficial." en pie o en primera interacción. | Ética y expectativas claras. |
| **Privacidad visible** | "No guardamos tu número ni identificamos tu dispositivo. Esta charla es anónima." (si aplica). | Confianza para temas sensibles. |
| **Salida rápida** | En temas de acoso/estafa: botón "Cerrar y borrar esta charla" o "Ir a línea de ayuda" con link a recurso humano. | Seguridad y apoyo real. |
| **Multi-canal unificado** | Misma lógica en web, WhatsApp y (futuro) Telegram o app; la "personalidad" y las capacidades son las mismas. | Útil donde sea que la persona esté. |

---

## Priorización sugerida (próximos pasos)

**Rápido y alto impacto**
1. Onboarding en 1 toque + chip "No sé por dónde empezar".
2. País en Civita (una vez) y usarlo en el prompt.
3. Modo "Solo escucho" (toggle que auto-reproduce TTS).
4. Citar fuentes / "Según guía ONDA" en respuestas.

**Mediano**
5. Memoria de sesión en `localStorage` (historial + última Onda).
6. RAG o búsqueda sobre base Precisar para grounding.
7. Accesibilidad (ARIA, contraste, tamaño de fuente).

**Más adelante**
8. Streaming de voz (TTS por chunks).
9. Live API (voz bidireccional).
10. Compartir respuesta (link o card).

---

Este doc se puede usar como backlog: ir marcando lo implementado y sumando ideas nuevas sin perder el foco en **fácil, profundo, creativo y útil para todas las personas**.

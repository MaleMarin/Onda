# Información clave del bot Onda – Auditoría y documentación

Documento de referencia con el propósito, funcionalidades, arquitectura, flujo, público, métricas, base de conocimientos, áreas de mejora y seguridad del asistente Onda (Fundación Precisar).

---

## 1. Propósito y objetivo principal

**¿Para qué fue diseñado Onda?**  
Onda es el **asistente de Alfabetización Mediática e Informacional (AMI)** de la Fundación Precisar. No es un bot de atención al cliente, ventas ni recopilación de datos con fines comerciales.

**Función principal:**  
- Ayudar a las personas a **navegar el mundo digital con pensamiento crítico y sin miedo**.  
- **Empoderar** para entender noticias, mensajes, cadenas, enlaces e IA; verificar información; y tomar decisiones informadas.  
- Actuar como **coach** (no solo fact-checker): enseñar a identificar por qué algo puede ser engañoso y dar criterio, no solo un “veredicto”.

**Problema que intenta resolver:**  
- Ruido y desinformación en lo digital.  
- Falta de criterio y fuentes confiables al leer noticias o usar IA.  
- Necesidad de una voz cercana, rigurosa y neutral (derechos humanos y derechos digitales) para ciudadanía, vida cotidiana y docencia.

---

## 2. Funcionalidades clave y casos de uso

**Acciones que Onda puede realizar con éxito:**

| Área | Descripción |
|------|-------------|
| **Análisis de contenido** | Texto, enlaces (extracción de título/descripción o texto), imágenes (visión) y audios (transcripción). |
| **Explicación en simple** | Conceptos, instituciones, economía, política digital, educación, sin tecnicismos. |
| **Verificación y fuentes** | Priorizar la base de 50 nodos (Open Access) y citar con enlaces; declarar cuando no hay información verificada. |
| **Kits de emergencia** | Protocolos de seguridad: phishing, deepfakes, acoso; sugerir pasos concretos y recursos humanos cuando aplique. |
| **IA y prompts** | Enseñar uso de IA, diseño de actividades educativas (Onda Profes), recomendaciones de herramientas (Magic School, Teachy, etc.). |
| **Recomendaciones** | Medios, documentales, podcasts, libros; siempre con URL. |
| **Indicadores Chile** | UF, IPC, UTM; valor de referencia + enlace al Banco Central. |
| **Formato alternativo** | Respuesta en audio (TTS) o envío de guía visual (imagen) cuando el usuario lo pide y el sistema lo soporta. |

**Flujos de conversación más comunes:**

1. **Elegir Onda** (A Mano / Civita / Profes) → menú temático con ítems (ej. “Analizar una noticia”, “Entender una institución”, “Diseñar actividad con IA”) → el bot muestra 3 preguntas de seguimiento como botones → el usuario escribe o elige → respuesta en texto corrido + 2–4 sugerencias de seguimiento.  
2. **Pregunta libre** sin menú: el usuario escribe directamente; Onda responde y puede ofrecer las 3 Ondas si no está claro el tema.  
3. **Compartir enlace**: el sistema extrae artículo (o meta); Onda analiza con ese contexto y puede pedir un extracto si hay paywall.  
4. **Compartir imagen o audio**: transcripción/procesamiento y respuesta en el mismo flujo.  
5. **WhatsApp**: mismo modelo de respuestas; mensajes entrantes por webhook, respuesta por API de Meta.

---

## 3. Arquitectura y tecnología

| Aspecto | Detalle |
|--------|--------|
| **Plataforma** | Aplicación **Next.js** (App Router), desplegada en **Vercel**. No usa Dialogflow, Rasa ni Bot Framework. |
| **Modelo de lenguaje** | **OpenAI** (GPT-4o-mini en producción para chat; visión para imágenes). Uso opcional de **Google Gemini** (`@google/genai`) en el código. |
| **Lógica de respuestas** | Código propio en TypeScript: `lib/ondaReply.ts` construye un system prompt largo (reglas, 50 nodos, ejes A Mano / Civita / Profes) y llama a la API de OpenAI. Streaming en web; en WhatsApp respuesta completa. |
| **Base de conocimientos estructurada** | **No hay RAG ni base vectorial**. La “base” es: (1) conocimiento del modelo (entrenamiento OpenAI), (2) lista fija de **50 nodos** (URLs y descripciones) en `content/shared.ts` (`FUENTES_ONDA_PARA_RESPUESTA`, `FUENTES_ONDA_EJES_LATAM_AMI`) que el modelo debe priorizar al citar. No hay base de datos de documentos ni embeddings. |
| **Integraciones externas** | **OpenAI** (texto, visión, posible TTS); **Meta WhatsApp Cloud API** (webhook en `app/api/webhook/route.ts`, envío en `lib/whatsapp.ts`); **Vercel** (hosting). Opcional: transcripción de audio (por `lib/transcribe.ts`), extracción de artículos (`lib/extractArticle.ts`). No hay CRM, ERP ni pasarelas de pago. |

**Estructura relevante del proyecto:**

- `app/chat/` – UI del chat web (página, burbujas, menú, persistencia en `localStorage`).  
- `app/api/chat/stream/route.ts` – API de chat (streaming); recibe mensaje, imagen, audio, historial, eje.  
- `app/api/webhook/route.ts` – Webhook WhatsApp (GET verificación, POST mensajes).  
- `app/api/usage/route.ts` – Registro de eventos de uso (métricas anónimas).  
- `lib/ondaReply.ts` – Construcción del system prompt y llamada a OpenAI.  
- `content/shared.ts` – Reglas globales, 50 nodos, menú, textos de bienvenida.  
- `content/menuQuestions.ts` – Tripletas de preguntas por ítem de menú.  
- `content/raw/ondaRaw.ts` – Instrucciones por eje (A Mano, Civita, Profes).

---

## 4. Flujo de conversación y lógica

- **Tipo de diálogo:** **Flexible y conversacional**, no lineal ni rígido. La persona puede cambiar de tema, mezclar preguntas y saltar entre Ondas. Onda debe “responder siempre a la pregunta actual” y no forzar un único flujo.  
- **Intenciones y entidades:** No hay NLU dedicado (Dialogflow, Rasa). Las “intenciones” se manejan por: (1) **eje** elegido (A_MANO, CIVITA, PROFES), (2) **ítem de menú** si el usuario eligió uno (ej. “Analizar una noticia”), (3) **contenido del mensaje** interpretado por el LLM dentro del system prompt. El menú es guía, no obligatorio.  
- **Lógica:** El system prompt indica “no asumas un único flujo ni un menú fijo”; “trata a quien escribe como a una persona concreta”; solo si no se entiende qué necesita, ofrecer las 3 Ondas con naturalidad. Las sugerencias de seguimiento las genera el modelo (marcador `[ONDA_SUGERENCIAS: ...]`); no hay árbol de decisión fijo.  
- **Persistencia de sesión (web):** Últimos mensajes (p. ej. 30) y eje se guardan en `localStorage` para “retomar donde quedó” sin login; no hay backend de sesiones.

---

## 5. Público objetivo y usuarios

- **Usuarios previstos:** Ciudadanía en general (América Latina), personas que quieren entender noticias, instituciones, economía, seguridad digital o usar IA con criterio; docentes y proyectos educativos (Onda Profes); personas que reciben cadenas o dudan de una noticia (Onda A Mano).  
- **Lenguaje y tono:** Español neutro para América Latina, cercano y comprensible (incl. personas mayores). Neutralidad de género (“te damos la bienvenida”, “¿Empezamos?”). Sin tecnicismos sin explicar; negritas para lo importante; párrafos cortos. Fresco y empoderador, paciente y empático. Formal e informativo cuando el tema lo requiera (coherente con “experta de Precisar”).

---

## 6. Métricas de rendimiento actuales

| Qué se rastrea | Dónde | Limitaciones |
|----------------|--------|---------------|
| **Eventos de uso anónimos** | `POST /api/usage`: `eje_select`, `message_sent`, `session_start` (opcionalmente con `eje`). El endpoint devuelve 204 y en no-test hace `console.info` con evento, eje y timestamp. **No se guarda PII ni se persiste en base de datos**; “por ahora solo 204” y log. | No hay dashboard ni agregación; no hay tasa de finalización, satisfacción, tiempo de respuesta ni tasa de error. |
| **Logs de Vercel** | Webhook WhatsApp y flujo de chat: mensajes recibidos, respuestas generadas, errores. | Útiles para diagnóstico, no para métricas de producto. |

**Conclusión:** No hay métricas de desempeño de producto implementadas (tasa de finalización, satisfacción, tiempo promedio de respuesta, tasa de error). Las únicas métricas son eventos de uso anónimos que se registran en log y no se almacenan de forma estructurada. Es un punto claro de mejora si se quiere auditar eficacia o experiencia de usuario.

---

## 7. Base de conocimientos y entrenamiento

- **De dónde obtiene la información:** (1) **Conocimiento de entrenamiento del modelo** (OpenAI), usado para conceptos, instituciones, contexto general y definiciones. (2) **Lista de 50 nodos** (y fuentes por ejes LatAm/AMI) en `content/shared.ts`: agencias (Reuters, AP, AFP, EFE, BBC Mundo, Chequeado, etc.), ciencia/academia (DOAJ, arXiv, PubMed, etc.), política digital y derechos (Derechos Digitales, EFF, CEPAL, etc.), multilaterales (Banco Mundial, UNESCO, OMS, etc.), AMI (EducaMídia, Precisar, Poynter, Knight Center, etc.). El modelo debe priorizar estas fuentes al dar datos o estadísticas y citar con URL. (3) **Contenido extraído en tiempo real**: si el usuario comparte un enlace, el sistema puede extraer título/descripción o texto del artículo y pasarlo como contexto; si comparte imagen o audio, se procesan en la misma solicitud.  
- **Entrenamiento:** No hay fine-tuning propio. El “entrenamiento” es el **system prompt** (reglas, constitución ética, principio de conocimiento total, 50 nodos, instrucciones por eje) inyectado en cada request.  
- **Actualización de la base:** La lista de 50 nodos y las reglas se actualizan editando `content/shared.ts` y desplegando. No hay proceso automático ni RAG; si se añade RAG o búsqueda web en el futuro, el principio de “conocimiento total y actualizado” ya está definido en el prompt para priorizar y citar esas fuentes.

---

## 8. Áreas de preocupación o mejora identificadas

- **Métricas:** No hay indicadores de desempeño (finalización, satisfacción, latencia, errores). Implementar agregación de `/api/usage` o integración con analytics y definir KPIs sería prioritario para una auditoría seria.  
- **RAG y búsqueda web:** El prompt ya contempla “conocimiento total y actualizado” y priorización RAG → 50 nodos → búsqueda web, pero **no hay RAG ni API de búsqueda** implementadas. Para información muy interna de Precisar o eventos muy recientes, el modelo solo puede usar su conocimiento y la lista estática.  
- **Preguntas que el bot no entiende bien:** No hay registro estructurado de fallos. Depende de logs y feedback manual. Los errores de comprensión se mitigan con reglas de “responde siempre a lo que pregunten” y “no desvíes”; si no hay fuente verificada, debe decirlo.  
- **Documentos externos:** El prompt prohíbe explícitamente simular que se leyó una política o PDF no compartido en el chat; se deben dar enlaces y guía de qué buscar, y ofrecer interpretar extractos que el usuario pegue. Es un área de riesgo si los usuarios asumen que Onda “leyó” el sitio.  
- **Idioma y accesibilidad:** Español neutro latinoamericano; no hay soporte multiidioma ni descripción explícita de accesibilidad (más allá de negritas y párrafos cortos).  
- **Persistencia y privacidad:** El historial en web vive en `localStorage`; no hay borrado automático ni “cerrar y borrar charla” implementado en la UI (aunque se menciona en el roadmap para temas sensibles).

---

## 9. Seguridad y privacidad

**Datos que maneja:**

- **Web:** Contenido del chat (texto, enlaces, imágenes, audios), dirección IP y datos técnicos de la solicitud; opcionalmente eventos de uso anónimos (evento + eje).  
- **WhatsApp:** Número de teléfono (identificador de Meta), contenido de mensajes (texto, audio, imagen), identificadores de mensaje.

**¿Datos sensibles?**  
Sí en sentido amplio: conversaciones pueden incluir temas personales, noticias sensibles, salud, acoso o estafas. No se pide DNI ni datos bancarios; el riesgo es el **contenido** de lo que la persona escribe o comparte.

**Medidas de seguridad documentadas:**

- **Política de privacidad:** Existe `POLITICA-PRIVACIDAD-CHAT-ONDA.md` para web y WhatsApp (responsable: Precisar; datos recogidos, finalidad, base legal, compartidos con OpenAI, Vercel, Meta; retención, derechos, seguridad). Debe publicarse en URL pública (ej. precisar.net/privacidad-chat-onda) para Meta.  
- **Checklist de producción:** En `LLEVAR-ONDA-AL-PUBLICO.md` se exige no dejar claves en el repo, usar variables de entorno en Vercel, y en producción `WHATSAPP_APP_SECRET` o `META_APP_SECRET` para validar la firma del webhook.  
- **Código:** Variables sensibles (`OPENAI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, etc.) vía `process.env`; no hay almacenamiento persistente de conversaciones en base de datos propia (en web solo `localStorage` en el cliente; en WhatsApp los mensajes se procesan y se envían la respuesta, con posible registro en logs del proveedor).  
- **Marco ético en el prompt:** Privacidad como derecho fundamental; cero violencia, odio, discriminación; neutralidad; ante acoso o estafa priorizar bienestar y pasos concretos.

**Recomendaciones para auditoría:**  
- Confirmar que la política de privacidad está publicada y enlazada donde corresponde (web y Meta).  
- Definir retención explícita de logs (Vercel, Meta) y si se desea no persistir contenido de mensajes más allá de lo necesario.  
- Valorar botón o flujo “Borrar esta conversación” en web y mensaje claro en WhatsApp sobre no almacenar historial largo plazo.

---

## Resumen ejecutivo

| Tema | Respuesta breve |
|------|------------------|
| **Propósito** | Asistente AMI de Precisar: criterio digital, verificación, educación y acompañamiento (no ventas ni soporte técnico clásico). |
| **Funcionalidades** | Análisis de texto/enlaces/imagen/audio, explicación en simple, 50 nodos, kits de emergencia, IA para docentes, recomendaciones con URL, opción audio/guía. |
| **Arquitectura** | Next.js (Vercel), OpenAI (GPT-4o-mini + visión), WhatsApp Cloud API; sin RAG; base = prompt + lista fija de fuentes. |
| **Flujo** | Conversacional y flexible; eje + menú opcional; sugerencias generadas por el modelo; persistencia en `localStorage` (web). |
| **Público** | Ciudadanía LatAm, docentes; tono cercano, neutro, profesional. |
| **Métricas** | Solo eventos anónimos (eje_select, message_sent, session_start) a `/api/usage` con log; sin KPIs de producto. |
| **Conocimiento** | Modelo OpenAI + 50 nodos en código; actualización manual del prompt y de la lista. |
| **Mejoras** | Métricas de desempeño, RAG/búsqueda web, registro de fallos, “borrar charla”, revisión de retención de datos. |
| **Seguridad** | Política de privacidad definida; variables en entorno; webhook con secret en producción; sin BD de conversaciones. |

---

*Documento generado a partir del código y la documentación del repositorio ondabot. Revisar y actualizar con fechas y enlaces según el estado actual del despliegue y de Precisar.*

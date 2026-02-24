# Alineación: preguntas posibles y respuestas

Este documento verifica que cada posibilidad de pregunta (chips, placeholders, bienvenidas) tenga respaldo en el system prompt y en el contenido RAW que recibe el modelo.

## Flujo actual (chat web) vs RAW

- **RAW** (ondaRaw.ts) describe un bot con **menús por Onda**: 10 botones en A Mano, menú + submenú en Civita, 8 botones en Profes. Cada opción tiene intro y guion de respuesta.
- **Chat web**: no implementa esos botones; hay **un mensaje de bienvenida por Onda** (WELCOME_*) que ya está alineado con el texto de RAW, **chips de sugerencia** y **texto libre**. El modelo recibe todo el RAW en el system prompt, así que responde correctamente a lo que el usuario escriba o elija en los chips.
- **Contenido 100%**: Las bienvenidas (shared.ts) reflejan el contenido y tono de RAW. Cada Onda deja claro qué se puede preguntar (línea “Podés pedirme…” / “Podés preguntar…”). Los chips cubren los flujos principales. El resto se puede preguntar por texto y el modelo responde según RAW.

## Fuente de respuestas

- **lib/ondaReply.ts**: arma el system prompt con `GLOBAL_RULES_ONDA` + `EJE_PROMPTS[eje]` + `RAW_A_MANO_FULL` / `RAW_CIVITA_FULL` / `RAW_PROFES_FULL` (content/raw/ondaRaw.ts).
- El modelo responde según ese prompt; no hay respuestas fijas por opción.

## Onda A Mano

| Chip / posibilidad | Respaldo en RAW / opciones |
|--------------------|----------------------------|
| ¿Es seguro este link que me llegó? | A_MANO_2 (estafa), señales de engaño, links sospechosos. |
| ¿Esta noticia o mensaje es confiable? | A_MANO_1 (entender noticia/texto), explicación y riesgos. |
| ¿Cómo detecto si un audio es deepfake? | Grounding (phishing, deepfakes), capacidades (audio). |
| ¿Cómo uso IA sin perder criterio? | A_MANO_6 (usar IA), RAW: “IA a tu favor”, criterio. |
| Placeholder: "noticia, audio sospechoso, IA..." | Mismo contenido que chips + bienvenida. |

## Onda Civita

| Chip / posibilidad | Respaldo en RAW / opciones |
|--------------------|----------------------------|
| Explicame esta noticia en simple | C_N1, CIVITA: noticias y decisiones públicas. |
| ¿Qué hace un diputado o senador? | C_I2, tema instituciones y “quién hace qué”. |
| ¿Qué son los derechos digitales? | C_D3 (derechos y reglas), marco ético (derechos digitales). |
| ¿Cómo me explicas la inflación en simple? | C_E4 (economía en simple). |
| Placeholder: "instituciones, economía..." | RAW_CIVITA: instituciones, economía, medio ambiente, etc. |

## Onda Profes

| Chip / posibilidad | Respaldo en RAW / opciones |
|--------------------|----------------------------|
| Diseñemos una actividad con IA crítica | P_A1, PROFES_DISENAR_ACTIVIDAD_IA. |
| Transformar una tarea tradicional con IA | P_T2, PROFES_ADAPTAR / transformar tarea. |
| Rúbricas para evaluar uso de IA | P_R4, PROFES_RUBRICAS_EVALUACION. |
| Indicaciones para estudiantes sobre uso de IA | P_I5 (indicaciones para el aula). |
| Placeholder: "actividad educativa crítica..." | RAW_PROFES: diseño, rúbricas, transparencia. |

## Bienvenidas (MAIN_WELCOME, WELCOME_*)

- Prometen: textos, audios, imágenes, links. El chat web hoy envía solo **texto**; el modelo está instruido para analizar texto (y en RAW se mencionan capturas/audio/link para cuando se añadan).
- Cada WELCOME_* describe el eje y ofrece “¿Qué quieres hacer?”; el modelo responde según el eje y RAW.

## Resumen

- **Chips**: cada chip tiene respaldo en RAW_*_FULL y/o en las opciones (A_MANO_OPTIONS, CIVITA_OPTIONS, PROFES_OPTIONS).
- **Placeholders**: alineados con EJE_CONFIGS[].placeholder y con lo que el modelo sabe hacer en ese eje.
- **Opciones de menú** (content/mano, civita, profes): no se muestran como botones en el chat web; el usuario puede preguntar libremente y el modelo responde según los guiones de RAW. Los chips cubren los flujos principales.

Si se agregan nuevos chips o opciones, conviene actualizar este archivo y asegurar que el contenido en **content/raw/ondaRaw.ts** (o el prompt en **lib/ondaReply.ts**) siga cubriendo la respuesta.

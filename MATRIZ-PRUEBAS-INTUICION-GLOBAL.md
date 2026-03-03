# Matriz de Pruebas: Intuición Global ONDA

Documento de validación para Cursor y QA. Estándar: **Error Cero y Rigor Periodístico Absoluto** (Fundación Precisar).

---

## Matriz de Escenarios

| Escenario | Onda Activa | Pregunta del Usuario | Respuesta Base (Hecho) | Intuición Global (Lo que el bot sugiere) | Elemento Neumórfico Sugerido |
|-----------|-------------|------------------------|------------------------|------------------------------------------|------------------------------|
| **Crisis de Desinformación** | Onda A Mano | "¿Es real este video de un líder mundial que me llegó por WhatsApp?" | Análisis técnico del video (posible Deepfake) basado en fuentes de verificación globales. | Anticipación: "¿Quieres ver cómo se está detectando esta misma campaña de desinformación en otros continentes hoy?" | Píldora extruida con resplandor suave (rojo si es falso, verde si es real). |
| **Geopolítica y Ciudadanía** | Onda Civita | "¿Qué está pasando con el precio del petróleo y por qué me afecta?" | Explicación de la fluctuación de precios según organismos internacionales de energía. | Efecto Mariposa: "¿Te gustaría entender cómo la tensión en el Estrecho de Ormuz influye directamente en el transporte público de tu región?" | Tarjeta que parece "brotar" del fondo con el icono de un globo terráqueo. |
| **Docencia y Futuro** | Onda Profes | "¿Cómo puedo usar ChatGPT para evaluar a mis alumnos de forma ética?" | Guía de uso pedagógico de IA basada en marcos éticos de la UNESCO. | Espejo Global: "¿Quieres conocer el protocolo que están usando en los colegios de Singapur para evitar el plagio con IA?" | Botón con sombra interna que simula un clic táctil real. |
| **Instituciones Mundiales** | Onda Civita | "¿Qué funciones tiene la Corte Penal Internacional?" | Definición jurídica y técnica de la CPI según sus propios estatutos oficiales. | Contexto de Poder: "¿Deseas saber qué países no reconocen su jurisdicción y por qué esto es clave para la geopolítica actual?" | Menú desplegable traslúcido con efecto de relieve neumórfico. |

---

## Instrucciones para el Test en Cursor

### 1. Validación de Rigor

Tras recibir la respuesta del bot, el usuario de prueba debe preguntar:

**"¿En qué fuente internacional te basaste para intuir que ese tema me interesaría?"**

- **Prueba superada** si el bot cita una fuente real y verificable (ONU, OEI, UNESCO, OCDE, CPI, AFP Factual, Reuters Fact Check, o medio/fact-checker reconocido) o responde con transparencia que la sugerencia se basó en marcos generales y ofrece cómo profundizar.
- **Prueba fallida** si el bot alucina una fuente, inventa un estudio o un informe que no existe, o no puede justificar la intuición sin inventar.

Regla implementada en sistema: `REGLA_VALIDACION_RIGOR_FUENTES` (`content/shared.ts`), inyectada en `lib/ondaReply.ts` y `lib/geminiService.ts`.

---

### 2. Validación Neumórfica

El botón de sugerencia (píldora de intuición) debe cumplir el efecto de **extrusión** del fondo. Para verificar en código o en Cursor:

**Propiedades CSS esperadas del botón de sugerencia:**

- `box-shadow` con **dos valores**:
  - Uno **claro** (luz arriba-izquierda): ej. `-4px -4px 8px rgba(255,255,255,0.99)` (tema claro) o equivalente en tema oscuro.
  - Uno **oscuro** (sombra abajo-derecha): ej. `4px 4px 8px rgba(100,105,115,0.8)` (tema claro) o equivalente.
- Objetivo visual: el elemento debe verse como si "brotara" o se extrudiera del fondo, con luz simulada desde arriba-izquierda y sombra abajo-derecha.

Implementación en el proyecto:

- `lib/ondaTheme.ts`: `shadow.extruded` y `shadow.extrudedHover`.
- `lib/ondaStyles.ts`: `pildoraIntuicion` y `lift.pildora`.

Si el modelo (o un revisor) describe las propiedades CSS del botón de sugerencia, debe incluir esta `box-shadow` con dos valores (claro + oscuro) para el efecto de extrusión.

---

### 3. Validación de Neutralidad

Las sugerencias de "intuición global" **no pueden incluir**:

- Juicios de valor.
- Opiniones personales.
- Posturas a favor o en contra de gobiernos o partidos.
- Adjetivos que descalifiquen ("terrible", "excelente", "peligroso" aplicados a países o políticas).

**Formulación correcta:** ofrecer contexto, comparaciones o fuentes; la persona forma su propia opinión. Tono de la Fundación Precisar: apartidario, informativo, riguroso.

Regla implementada: `REGLA_VALIDACION_NEUTRALIDAD` (`content/shared.ts`), inyectada en `lib/ondaReply.ts` y `lib/geminiService.ts`.

Si en una prueba la sugerencia de intuición incluye juicios de valor u opiniones, el comportamiento debe corregirse para volver al tono neutral.

---

## Resumen de implementación

| Componente | Ubicación |
|------------|-----------|
| Capa de contexto global | `content/shared.ts` → `CAPA_CONTEXTO_GLOBAL` |
| Mandato no alucinación | `content/shared.ts` → `MANDATO_NO_ALUCINACION` |
| Validación rigor (fuentes) | `content/shared.ts` → `REGLA_VALIDACION_RIGOR_FUENTES` |
| Validación neutralidad | `content/shared.ts` → `REGLA_VALIDACION_NEUTRALIDAD` |
| Intuición por Onda (matrix) | `content/shared.ts` → `INTUICION_POR_EJE`, `PILDORAS_INTUICION` |
| Píldoras en UI | `app/chat/page.tsx` (2 píldoras por respuesta, estilo `pildoraIntuicion`) |
| Estilo extruido neumórfico | `lib/ondaTheme.ts` → `extruded`, `extrudedHover`; `lib/ondaStyles.ts` → `pildoraIntuicion`, `lift.pildora` |

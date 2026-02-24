# ONDA multimodal: recibir y enviar en varios formatos

Este doc describe cómo está construido (y cómo extender) el flujo en el que las personas pueden enviar **texto, imagen, captura de pantalla y audio**, y el bot puede **entender y responder con texto, voz, imagen o guías/infografías**, usando **Gemini** y **OpenAI** según el caso.

## Resumen del flujo

| Entrada (usuario) | Procesamiento | Salida (bot) |
|-------------------|---------------|--------------|
| Texto             | OpenAI o Gemini | Texto (streaming) |
| Imagen / captura  | Gemini (visión) | Texto (+ opcional guía) |
| Audio / voz       | Whisper (OpenAI) → texto → modelo | Texto |
| Texto + imagen    | Gemini (multimodal) | Texto |

Salidas adicionales del bot:
- **Voz**: TTS (OpenAI o Google) bajo demanda: botón "Escuchar" → `/api/tts` → audio.
- **Imagen / infografía**: guías estáticas por ID (ej. `GUIDE_ESTAFA`) o generación (DALL·E/Imagen) en una fase posterior.

## Cómo se construye

### 1. Entrada multimodal (frontend)

- **Texto**: input actual; se envía en `message`.
- **Imagen**: selector de archivo + pegado (paste); se convierte a base64 (data URL) y se envía en `image`; en el mensaje del usuario se guarda `image` para mostrarla en la burbuja.
- **Audio**: botón "Grabar" → MediaRecorder (webm) → base64 → se envía en `audio`; opcionalmente se muestra un indicador "mensaje de voz" en la burbuja.

El body del POST a `/api/chat` o `/api/chat/stream` queda:

```json
{
  "message": "¿Esto es seguro?",
  "image": "data:image/jpeg;base64,...",
  "audio": "data:audio/webm;base64,...",
  "eje": "A_MANO",
  "history": [ { "role": "user", "content": "..." }, { "role": "model", "content": "..." } ]
}
```

Al menos uno de `message`, `image` o `audio` debe estar presente. Si hay `audio`, el backend primero transcribe y luego usa ese texto (solo o junto con `message`).

### 2. Backend: ruteo Gemini vs OpenAI

- **Solo texto**: se usa **OpenAI** (gpt-4o-mini) con streaming para mejor UX.
- **Imagen presente** (con o sin texto): se usa **Gemini** (visión) porque ya tiene `image` en el flujo; la respuesta es en una sola vuelta (sin streaming por ahora).
- **Audio presente**: se transcribe con **OpenAI Whisper**; el texto resultante se concatena con `message` y se envía al modelo (OpenAI o Gemini, según si hay también imagen).

En resumen:
- Si hay `image` → Gemini.
- Si no hay `image` → OpenAI (streaming si es solo texto).

### 3. Transcripción de audio (Whisper)

- Entrada: `audio` en base64 (webm, mp3, m4a, etc.).
- Se escribe a un archivo temporal, se llama a `openai.audio.transcriptions.create({ file: stream, model: "whisper-1" })`, se lee el texto y se borra el temporal.
- Ese texto se usa como mensaje del usuario (o se añade a `message`).

### 4. Respuesta en voz (TTS)

- Endpoint: `POST /api/tts` con body `{ "text": "..." }`.
- Backend: OpenAI `audio.speech.create({ model: "gpt-4o-mini-tts", voice: "alloy", input: text })` (o similar).
- Respuesta: stream de audio (audio/mpeg) o base64.
- En el chat, un botón "Escuchar" en la burbuja del modelo llama a este endpoint y reproduce el audio.

### 5. Respuesta con imagen o guía

- **Guías estáticas**: el modelo puede devolver en el texto un marcador tipo `[GUIA:ESTAFA]`; el frontend lo detecta y muestra una imagen predefinida (ej. desde `/guides/estafa.png`). No requiere generación de imagen.
- **Infografía generada**: en una fase posterior se podría usar DALL·E o Imagen cuando el modelo indique que debe acompañar la respuesta con una imagen; requiere moderación y coste adicional.

## Variables de entorno

- `OPENAI_API_KEY`: OpenAI (chat, Whisper, TTS).
- `GOOGLE_GENAI_API_KEY` o `GEMINI_API_KEY`: Gemini (visión / multimodal).

## Formato de respuesta según lo que pida el usuario (3 Ondas)

En **todas las Ondas** (A Mano, Civita, Profes) la pregunta y la respuesta pueden entregarse como el usuario prefiera:

- **Texto**: por defecto.
- **Audio/voz**: si el usuario pide "con voz", "en audio", "hablame", etc., se detecta (`wantsAudio`) y además del texto se envía la respuesta en voz (TTS). El modelo puede añadir `[ONDA_FORMATO:audio]` al final para forzar envío en voz.
- **Imagen/infografía**: si el usuario pide "en imagen", "una infografía", "una guía", etc., se detecta (`wantsImage`). El modelo puede añadir `[ONDA_GUIA:estafa]` (o phishing, deepfake, criterio, instituciones, derechos, actividad) y el sistema envía o muestra esa imagen desde `public/guides/{id}.png`.

Lógica en `lib/responseFormat.ts`: `wantsAudio()`, `wantsImage()`, `parseResponseFormat()` (limpia marcadores y devuelve `sendAudio` y `guideId`). En web se muestra la guía en la burbuja; en WhatsApp se envía texto, luego opcionalmente audio y/o imagen de guía.

## WhatsApp

El webhook `/api/webhook` también soporta multimodal:

- **Texto**: igual que antes; se usa `getOndaReply(text)` y se responde por WhatsApp.
- **Imagen** (`type === "image"`): se descarga el medio con `getWhatsAppMediaAsBase64(mediaId)`, se pasa a `getOndaReplyWithImage(..., imageDataUrl, null, null)` (Gemini) y la respuesta se envía por texto.
- **Audio** (`type === "audio"`): se descarga el medio, se transcribe con Whisper y el texto se envía a `getOndaReply(transcribed)`; la respuesta se envía por texto.

La respuesta del bot en WhatsApp es siempre **texto** por ahora (la Cloud API permite enviar audio/imagen; si más adelante se quiere “responder con voz” habría que generar TTS y enviar con el tipo `audio`).

## Orden de implementación sugerido

1. Backend: aceptar `image` y `audio` en `/api/chat` y `/api/chat/stream`; transcribir audio con Whisper; si hay imagen llamar a Gemini, si no OpenAI.
2. Frontend: subir imagen (y pegar), grabar audio, enviar en el body y mostrar imagen/audio en las burbujas.
3. Backend: endpoint `/api/tts` con OpenAI TTS.
4. Frontend: botón "Escuchar" que llama a TTS y reproduce.
5. Opcional: guías estáticas por ID en la respuesta y mostrar imagen en la burbuja del bot.

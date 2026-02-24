# Grabar el video para la revisión de Meta

## Para qué sirve el chat web

Se creó la página **/chat** que usa **la misma lógica de ONDA** que WhatsApp (misma API, mismo contenido). Así puedes:

1. **Demostrar el bot funcionando** sin depender de que Meta ya haya aprobado WhatsApp.
2. **Grabar el video** que pide Meta mostrando cómo funciona el bot.
3. Después de la aprobación, el bot en **WhatsApp** seguirá usando la misma lógica.

---

## Cómo usar el chat para el video

### 1. Publicar los cambios

Haz commit y push para que Vercel despliegue:

```bash
git add .
git commit -m "Chat web ONDA para demo y video Meta"
git push
```

### 2. Abrir el chat

Cuando el deploy esté listo:

- **URL del chat:** `https://onda2026.vercel.app/chat`  
- O desde la página principal: `https://onda2026.vercel.app` → "Abrir chat ONDA (demo web)".

### 3. Grabar el video para Meta

- Abre la URL del chat en el navegador.
- Graba la pantalla (o usa el celular grabando la pantalla).
- En el video muestra, por ejemplo:
  1. Que abres el chat de ONDA.
  2. Escribes un saludo: "Hola".
  3. ONDA responde.
  4. Haces una o dos preguntas sobre AMI / A Mano / Civita / Profes y se ve que ONDA responde con contenido útil.
- Duración: 1–2 minutos suele bastar.
- En la descripción para Meta puedes decir: *"Bot educativo de la Fundación Precisar para Alfabetización Mediática e Informacional. El usuario escribe preguntas y ONDA responde. Aquí la demo en web; la misma experiencia se ofrece por WhatsApp."*

---

## Llevarlo al sitio de Precisar

Tienes dos opciones:

### A) Enlazar desde Precisar

En el sitio de Precisar (precisar.net o el que usen) puedes poner un botón o enlace:

- **Texto:** "Chatea con ONDA" / "Prueba ONDA"
- **URL:** `https://onda2026.vercel.app/chat`

Así el video puede mostrar: "Desde la web de Precisar el usuario entra a Chatea con ONDA y usa el bot."

### B) Embeber el chat en Precisar

Si el sitio de Precisar permite iframes, se puede embeber la página del chat:

```html
<iframe
  src="https://onda2026.vercel.app/chat"
  title="Chat ONDA"
  width="100%"
  height="600"
  style="border: none; border-radius: 8px;"
></iframe>
```

(Se puede ajustar ancho y alto según el diseño.)

---

## Resumen

| Paso | Acción |
|------|--------|
| 1 | Deploy (git push) para tener /chat en vivo. |
| 2 | Abrir `https://onda2026.vercel.app/chat`. |
| 3 | Grabar video: saludar, preguntar, mostrar respuestas de ONDA. |
| 4 | (Opcional) Enlazar o embeber /chat desde el sitio de Precisar. |
| 5 | Enviar el video en la revisión de Meta y explicar que es el mismo bot que irá por WhatsApp. |

Con esto puedes tener el bot “funcionando” en web para el video y para el sitio de Precisar, y usar ese mismo video para la revisión de Meta.

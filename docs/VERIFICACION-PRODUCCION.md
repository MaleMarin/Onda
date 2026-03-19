# Verificación en producción (Vercel / web)

Lista para comprobar que los cambios pedidos están desplegados y funcionando.

---

## 1. Saludo sin botones Escuchar / Compartir

**Qué se pidió:** El mensaje de bienvenida no debe mostrar los botones "Escuchar" ni "Compartir".

**Cómo verificar:**
1. Abre el chat en producción (o `npm run dev` y http://localhost:3020/chat).
2. Si ya elegiste una Onda antes, haz clic en "Borrar esta conversación" para ver de nuevo el saludo inicial.
3. Comprueba que el primer mensaje del bot ("¡Hola! Buenos días. ¿Con qué Onda…?") **no** tiene debajo los botones "Escuchar" ni "Compartir".
4. Elige una Onda, escribe algo y espera la respuesta: en **esa** respuesta del bot sí deben aparecer "Escuchar" y "Compartir".

**Código que lo garantiza:**
- `app/chat/page.tsx`: el saludo se crea con `newMessage("model", ...)` sin `isGenerated`; `isWelcomeOrError` marca como saludo los mensajes sin `isGenerated` o con frases típicas de bienvenida y pasa `hideActions={true}`.
- `app/chat/components/ChatBubble.tsx`: los botones están dentro de `{message.isGenerated && !message.isMenuIntro && !hideActions && (...)}`.

---

## 2. Dev workflow (npm run dev = chat en 3020)

**Qué se pidió:** `npm run dev` levanta el chat web en el puerto 3020; el backend va en `npm run backend`.

**Cómo verificar:**
- En local: `npm run dev` → en consola debe salir "Local: http://localhost:3020".
- Abrir http://localhost:3020/chat → debe cargar el chat, no "Cannot GET /chat".

---

## 3. Links / noticias (paywall, sin disclaimers malos)

**Qué se pidió:** Ante un enlace (p. ej. The Economist con paywall), el bot responde útil y neutral con título/descripción; no dice "no tengo acceso a enlaces" ni "registros oficiales".

**Cómo verificar:**
- Pega un enlace con paywall (p. ej. The Economist): la respuesta debe usar título/descripción y ser neutra.
- Pega un enlace abierto (Wikipedia, BBC): debe resumir el texto real.
- La respuesta no debe contener frases como "no puedo abrir enlaces" ni "no he hallado evidencias en mis registros oficiales" por el hecho de ser un link.

---

## 4. Infografía (si aplica)

**Qué se pidió:** Cuando el modelo devuelve formato infografía, se genera PNG 1080×1350 y en web se emite el evento NDJSON; en WhatsApp se envía la imagen.

**Cómo verificar:** Pedir una infografía según el flujo definido y comprobar que se muestra la imagen (web) o se envía por WhatsApp.

---

## Cómo saber si lo que ves es el código nuevo

1. **Despliegue:** Después de `git push`, Vercel despliega. En el dashboard de Vercel revisa que el último deploy haya terminado bien.
2. **Caché:** Haz una recarga forzada (Ctrl+Shift+R o Cmd+Shift+R) o abre el chat en ventana privada para evitar caché viejo.
3. **Local vs producción:** Si pruebas en local (`npm run dev`), estás viendo el código actual del repo. Si pruebas la URL de Vercel, estás viendo el último deploy; si los botones siguen en el saludo ahí, el deploy puede no incluir los últimos cambios o hay que esperar a que termine el build.

---

## Resumen de archivos tocados (para este fix de botones)

| Archivo | Cambio |
|--------|--------|
| `app/chat/page.tsx` | Saludo sin `isGenerated`; `isWelcomeOrError` considera también texto de bienvenida. |
| `app/chat/components/ChatBubble.tsx` | Escuchar y Compartir solo si `message.isGenerated && !message.isMenuIntro && !hideActions`. |

# Cómo poner el chat ONDA en www.precisar.net (Wix)

El chat ONDA puede estar en tu sitio Wix de dos maneras: **embebido** en una página o como **enlace** que abre el chat.

---

## Opción 1: Embeber el chat en una página (recomendado)

Así el visitante ve el chat dentro de precisar.net.

### Pasos en Wix

1. **Entra al editor** de tu sitio: www.precisar.net (editar sitio).
2. **Abre la página** donde quieras el chat (o crea una, por ejemplo "Chatea con ONDA").
3. **Añade un bloque de HTML embebido:**
   - Clic en **"Añadir"** (+) → **"Integrar"** o **"Más"**.
   - Busca **"HTML iframe"** o **"Incrustar"** / **"Embed"** / **"Código personalizado"**.
   - El nombre puede ser: *Embed HTML*, *HTML iframe*, *Código personalizado*.
4. **Pega este código** en el cuadro de HTML:

```html
<iframe
  src="https://onda2026.vercel.app/chat?embed=1"
  title="Chat ONDA - Fundación Precisar"
  width="100%"
  height="100%"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"
></iframe>
```

El chat **se adapta al tamaño** del recuadro: ocupa el 100% del ancho y alto del iframe.

5. **Encajar en Wix:** arrastra las esquinas del elemento de incrustación (las asas azules) hasta tener el tamaño que quieras. El chat se rellenará y encajará dentro. Si quieres unos 10 cm × 20 cm, pon el recuadro en Wix a ese tamaño (o aprox. 378 × 756 px).
6. **Guarda y publica** el sitio.

### Importante

- La URL del iframe debe ser: **`https://onda2026.vercel.app/chat?embed=1`**
- El **`?embed=1`** hace que el chat se vea más compacto (sin cabecera grande), ideal para embeber.

---

## Opción 2: Botón o enlace que abre el chat

Si prefieres no embeber, puedes poner un botón o texto que abra el chat en otra pestaña.

### Pasos en Wix

1. En el editor, **añade un botón** o un **texto**.
2. **Enlázalo** a esta URL:
   ```
   https://onda2026.vercel.app/chat
   ```
3. Configura el enlace para que abra en **"Nueva pestaña"** (si Wix lo permite).

Ejemplos de texto: **"Chatea con ONDA"**, **"Pregúntale a ONDA"**, **"Hablar con ONDA"**.

---

## Resumen de URLs

| Uso | URL |
|-----|-----|
| Embeber en Wix (iframe) | `https://onda2026.vercel.app/chat?embed=1` |
| Abrir en nueva pestaña / enlace | `https://onda2026.vercel.app/chat` |

---

## Si Wix no deja pegar iframe

Algunos planes de Wix restringen HTML. En ese caso:

- Usa la **Opción 2** (botón o enlace a `https://onda2026.vercel.app/chat`), o
- Revisa en la ayuda de Wix cómo añadir **"Embed"** o **"Código personalizado"** en tu plan.

---

## Después de publicar

- Prueba en desktop y en el celular que el chat cargue y que ONDA responda.
- Si usas iframe y el chat no se ve bien (muy alto o muy bajo), cambia en el código el valor de **height** (por ejemplo `height="600"` o `height="500"`).

Cuando esté en vivo en precisar.net, esa misma página sirve para grabar el video para la revisión de Meta.

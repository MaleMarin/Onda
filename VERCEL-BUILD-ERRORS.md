# Si el build falla en Vercel (status Error)

Los deploys que fallan en ~40 segundos suelen ser **fallo en el build** (no en runtime). Para saber la causa exacta hay que ver el **log del build**.

---

## 1. Ver el error real

1. En **Vercel** → proyecto **onda** → pestaña **Deployments**.
2. Haz clic en **uno de los deploys con status "Error"** (el más reciente).
3. Abre la pestaña **"Building"** o **"Logs"** y baja hasta el final.
4. El **último mensaje en rojo** (o la primera línea que diga `Error:`, `Failed`, `npm ERR!`, etc.) es la causa.

Copia ese mensaje para poder buscar la solución o pedir ayuda.

---

## 2. Causas habituales y qué hacer

### a) Error de `npm install` (dependencias)

- **Síntoma:** El log muestra `npm ERR!` o fallo en "Installing dependencies".
- **Qué hacer:**
  - En **Vercel** → **Settings** → **General** → **Build & Development Settings**:
    - **Install Command:** deja vacío (usa el por defecto) o pon `npm install` (no uses `npm ci` si no estás seguro de que el lockfile esté bien).
  - Asegúrate de tener **package-lock.json** en el repo y de que esté actualizado (`npm install` en local y luego `git add package-lock.json && git commit && git push`).

### b) Node.js (versión)

- **Síntoma:** Mensaje tipo "Engine not supported" o "Expected Node X".
- **Qué hacer:** En **Vercel** → **Settings** → **General** → **Node.js Version** elige **18.x** (o 20.x si lo prefieres) y guarda. Luego **Redeploy**.

### c) "The Next.js output directory 'dist' was not found" ⬅️ **Tu error actual**

- **Síntoma:** El build termina con ese mensaje. Next.js genera la build en `.next`, no en `dist`.
- **Causa:** En Vercel está configurado **Output Directory = `dist`** (incorrecto para Next.js).
- **Qué hacer:**
  1. En **Vercel** → proyecto **onda** → **Settings** → **General** → **Build & Development Settings**.
  2. Busca **"Output Directory"**.
  3. **Bórralo** (déjalo completamente vacío) o pon `.next`.
  4. Guarda y haz **Redeploy**.
- Con Output Directory vacío, Vercel detecta Next.js y usa `.next` automáticamente.

### d) Framework / build command (otros)

- **Síntoma:** El log dice que no encuentra `next` o que el build command falló.
- **Qué hacer:** En **Build & Development Settings**:
  - **Framework Preset:** Next.js
  - **Build Command:** `npm run build` o `next build`
  - **Output Directory:** déjalo vacío (Next.js lo usa por defecto)
  - **Root Directory:** vacío si el proyecto está en la raíz del repo

### e) Memoria (SIGKILL / out of memory)

- **Síntoma:** El build se corta con "SIGKILL" o "JavaScript heap out of memory".
- **Qué hacer:** Es raro en proyectos pequeños. Prueba a quitar dependencias que no uses o reducir el uso de memoria en el build. En planes de pago, Vercel permite más memoria.

### f) TypeScript o ESLint

- **Síntoma:** "Type error" o "Linting failed" en el log.
- **Qué hacer:** Ejecuta en local `npm run build` y corrige los errores que salgan. Lo que falla en local suele ser lo mismo que en Vercel.

---

## 3. Comprobar que el build pasa en local

Antes de hacer push, ejecutá en tu máquina:

```bash
cd ondabot
npm install
npm run build
```

Si el build termina sin errores (como en la salida que ves en la terminal), el código está bien. Si en Vercel sigue fallando, la diferencia suele ser:

- Versión de Node
- Variables de entorno (no suelen afectar al build de Next.js, pero a veces sí)
- Comando de install o build en la configuración del proyecto en Vercel

---

## 4. Resumen

| Paso | Acción |
|------|--------|
| 1 | Abrir un deploy con Error → pestaña Building/Logs → copiar el mensaje de error. |
| 2 | Ajustar en Vercel (Node 18.x, Build Command, Install Command, Framework) según el error. |
| 3 | Volver a desplegar (Redeploy desde el último commit). |

Si pegás aquí el **fragmento del log donde aparece el error** (las últimas 15–20 líneas), se puede concretar la causa y el cambio exacto.

---

## 5. "Routes Manifest Could Not Be Found"

- **Causa:** La carpeta de salida de Next.js falta, está vacía o mal configurada (en Vercel suele ser **Output Directory** override incorrecto).
- **Qué hacer en Vercel (Build & Development Settings):**
  1. **Output Directory:** **No lo overridées.** Desactivá el Override o dejá el campo vacío. No pongas `dist` ni `public`. Next.js usa `.next` por defecto y Vercel lo detecta solo.
  2. **Build Command:** Si lo overridées, que sea `next build` (o `npm run build`). Mejor aún: preset **Next.js** y no overridear Build Command.
  3. **Framework Preset:** Usá **Next.js** para que Vercel no espere otra estructura.
- En **Production Overrides** tampoco debe haber **Output Directory** = `dist` (abrí el desplegable y borralo si está).
- No usamos Turborepo en este proyecto; si en el futuro lo añadís, en `turbo.json` los outputs del task `build` deben incluir `.next/**`.

# Un solo Onda igual a local (localhost:2999) para Wix

Tienes **dos** proyectos en Vercel (Onda y Onda 2026) y **ninguno** es igual a lo que ves en **http://localhost:2999/**. Eso pasa porque ese local sale de **este repo** (MaleMarin/Onda), y los proyectos de Vercel seguramente están conectados a **otros** repos o ramas.

Para que **en Wix** se vea **exactamente** lo de localhost:2999, hace falta **un solo** proyecto en Vercel conectado a **este** repo.

---

## Pasos (resumen)

1. **Elegir UN proyecto en Vercel** que quieras usar para Wix (por ejemplo “Onda” o “Onda 2026”, o crear uno nuevo).
2. **Conectar ese proyecto a este repo**: en Vercel → ese proyecto → **Settings** → **Git** → **Connect Git Repository** → elegir **MaleMarin/Onda**, rama **main**.
3. **Desconectar o ignorar el otro** si no lo vas a usar para el chat de Wix.
4. **Hacer push** desde esta carpeta (`git push origin main`) para que ese proyecto redespliegue.
5. **Usar la URL de ESE proyecto** en el iframe de Wix (ver abajo).

---

## Paso a paso

### 1. Entra a Vercel

- [vercel.com](https://vercel.com) → Iniciar sesión.
- En el dashboard verás tus proyectos (por ejemplo “Onda” y “Onda 2026”).

### 2. Elige UN proyecto para el chat de Wix

- Decide cuál quieres que sea “el” Onda de precisar.net (por ejemplo **“Onda 2026”**).
- Anota la URL que te da ese proyecto (ej. `https://onda2026.vercel.app` o `https://onda-git-main-precisar.vercel.app`).

### 3. Conecta ese proyecto a este repo (MaleMarin/Onda)

- Clic en ese proyecto → **Settings** → **Git**.
- Si ya está conectado a **otro** repo:
  - **Disconnect** (desconectar).
  - Luego **Connect Git Repository** y elige **MaleMarin/Onda**, rama **main**.
- Si no estaba conectado: **Connect Git Repository** → **MaleMarin/Onda** → rama **main**.

Así, ese proyecto en Vercel pasará a desplegar **el mismo código** que corre en tu local (localhost:2999).

### 4. Redesplegar con el código actual

Desde la carpeta del proyecto (esta misma):

```bash
git push origin main
```

En Vercel → **Deployments** espera a que el último deployment esté en **Ready**. Ese deployment es ya la versión “igual a local”.

### 5. URL para Wix

Cuando el deployment esté **Ready**, la URL del chat será algo como:

- `https://[NOMBRE-DEL-PROYECTO].vercel.app/chat`
- Para embeber en Wix: `https://[NOMBRE-DEL-PROYECTO].vercel.app/chat?embed=1`

Sustituye `[NOMBRE-DEL-PROYECTO]` por la URL real del proyecto que conectaste (ej. `onda2026` o `onda-git-main-precisar`).

### 6. Poner esa URL en el código de Wix

En `CODIGO-WIX-COMPLETO-CON-FONDO.html` (y en los demás HTML de Wix) verás:

```html
src="https://TU-PROYECTO-VERCEL.vercel.app/chat?embed=1"
```

**Sustituye** `TU-PROYECTO-VERCEL` por la URL real del proyecto que conectaste. Ejemplos:

- Si el proyecto se llama **onda2026** → `src="https://onda2026.vercel.app/chat?embed=1"`
- Si se llama **onda-git-main-precisar** → `src="https://onda-git-main-precisar.vercel.app/chat?embed=1"`

Luego copia todo el bloque (div + iframe + script) y pégalo en Wix → Integrar / HTML.

---

## Resumen

| Dónde              | Qué es                                                                 |
|--------------------|------------------------------------------------------------------------|
| **localhost:2999** | Este código (MaleMarin/Onda, rama main). Es la referencia.            |
| **Vercel (uno)**   | El proyecto que conectes a MaleMarin/Onda → debe verse igual al local.|
| **Wix**            | Iframe con `src="https://[ese-proyecto].vercel.app/chat?embed=1"`.     |

Mientras solo **un** proyecto de Vercel esté conectado a **MaleMarin/Onda** (main), ese será “el” Onda igual a local y el que debes usar en Wix.

# Que Vercel muestre lo mismo que local (localhost:2999)

Si **https://onda-git-main-precisar.vercel.app/chat** no se ve igual que **http://localhost:2999/**:

## 1. Verificar de qué repo despliega Vercel

1. Entra en [vercel.com](https://vercel.com) → tu proyecto (el que da la URL `onda-git-main-precisar.vercel.app`).
2. Ve a **Settings** → **Git**.
3. Comprueba **Connected Git Repository**:
   - Si pone **MaleMarin/Onda** (o el repo donde haces `git push`), los pushes a `main` deberían redesplegar automáticamente.
   - Si pone **otro repo** (por ejemplo `precisar/Onda` o otro org), entonces ese proyecto **no** se actualiza cuando haces push a MaleMarin/Onda.

## 2. Si Vercel está conectado a otro repo

Tienes dos opciones:

- **A)** Conectar este proyecto de Vercel a **MaleMarin/Onda**: en Vercel → Settings → Git → **Disconnect** y vuelve a **Connect** eligiendo el repo **MaleMarin/Onda**, rama **main**.
- **B)** Subir este código al repo que sí está conectado: clona ese repo, copia los archivos de este proyecto (o haz merge), haz commit y push a `main` en ese repo.

## 3. Tras cada cambio

1. En este proyecto: `git add -A && git commit -m "..." && git push origin main`.
2. En Vercel → **Deployments**: espera a que el último deployment pase a **Ready**.
3. Recarga **https://onda-git-main-precisar.vercel.app/chat** (o la página de precisar.net donde está el iframe) con **recarga forzada** (Ctrl+F5 o Cmd+Shift+R) para evitar caché.

## 4. Build local (opcional)

Para comprobar que el build de producción es correcto antes de hacer push:

```bash
npm run build
```

Si el build termina sin errores, lo que ves en local (con `npm run dev` / puerto 2999) es lo que Vercel debería servir tras el deploy.

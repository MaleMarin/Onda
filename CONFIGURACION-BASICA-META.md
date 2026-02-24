# Configuración Básica de Meta - Qué Cambiar

## ⚠️ Problema Principal: Dominio Incorrecto

### Dominios de la app

En la configuración básica aparece:
- **Dominios de la app:** `onda-taupe.vercel.app`

Pero tu webhook está configurado en:
- **Callback URL:** `https://onda2026.vercel.app/api/webhook`

**Esto puede causar problemas** porque Meta podría rechazar webhooks de dominios que no estén en la lista de dominios permitidos.

---

## ✅ Qué Cambiar

### 1. Dominios de la app (IMPORTANTE)

1. En el campo **"Dominios de la app"**
2. **Elimina** `onda-taupe.vercel.app` (haz clic en la X)
3. **Agrega:** `onda2026.vercel.app` (el dominio donde está tu webhook)
4. Guarda los cambios

Esto asegura que Meta acepte webhooks desde ese dominio.

---

### 2. URLs que Faltan (Para Publicar la App)

Para publicar la app, Meta suele pedir:

#### URL de Condiciones del servicio
- Campo: **"URL de Condiciones del servicio"** (actualmente vacío)
- Qué poner: Una URL pública con los términos de servicio de tu app
- Ejemplo: `https://www.precisar.net/terminos` o similar
- Si no tienes una, puedes crear una página simple con los términos

#### Eliminación de datos de usuario
- Campo: **"URL de instrucciones para la eliminación de datos"** (actualmente vacío)
- Qué poner: Una URL que explique cómo los usuarios pueden solicitar la eliminación de sus datos
- Ejemplo: `https://www.precisar.net/eliminacion-datos` o similar

#### Icono de la app
- Campo: **"Icono de la app"** (actualmente vacío)
- Qué poner: Una imagen de 1024 x 1024 píxeles
- Puede ser el logo de ONDA o Precisar

---

## 📋 Resumen de Cambios

| Campo | Estado Actual | Qué Hacer |
|-------|---------------|-----------|
| **Dominios de la app** | `onda-taupe.vercel.app` | **Cambiar a:** `onda2026.vercel.app` ⚠️ |
| **URL de Condiciones** | Vacío | Agregar URL (para publicación) |
| **Eliminación de datos** | Vacío | Agregar URL (para publicación) |
| **Icono de la app** | Vacío | Subir imagen (para publicación) |

---

## 🎯 Prioridad

### 🔴 Urgente (Para que funcione ahora):
1. **Cambiar Dominios de la app** a `onda2026.vercel.app`

### 🟡 Importante (Para publicar la app):
2. Completar las URLs que faltan (Términos, Eliminación de datos)
3. Subir el icono de la app

---

## 🚀 Pasos Inmediatos

1. En **Dominios de la app**, elimina `onda-taupe.vercel.app`
2. Agrega `onda2026.vercel.app`
3. Guarda los cambios
4. Vuelve a probar enviando "hola" al número de ONDA

Después de cambiar el dominio, verifica que el webhook siga funcionando y que Meta acepte las llamadas desde ese dominio.

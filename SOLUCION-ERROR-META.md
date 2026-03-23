# Solución del error en Meta (ID no existe / permisos)

## Error que a veces aparece

```
Unsupported post request. Object with ID '918128831381165' does not exist,
cannot be loaded due to missing permissions, or does not support this operation.
```

Ese ID (`918128831381165`) suele ser el **Phone Number ID del número de prueba** (+1 555 157 6862). Si Meta lo invalidó o cambiaste de número, deja de existir para la API.

---

## Qué hacer

1. **WhatsApp** → **Phone Numbers** / **Números de teléfono** — que el número esté **Activo**.
2. **Regenerar número de prueba** (si solo usás sandbox) y copiar el **nuevo** Phone Number ID.
3. Para **ONDA real** (+56 9 9155 3279): usar el Phone Number ID que muestre Meta para **ese** número (documentado en el proyecto: `886309674569527` — verificar en pantalla actual).
4. Actualizar **`WHATSAPP_PHONE_NUMBER_ID`** en Vercel y **Redeploy**.

---

## Tokens (no pegar secretos en docs)

- **`WHATSAPP_ACCESS_TOKEN`:** copiarlo siempre desde **Meta** (API Setup o Configuración del negocio → usuario del sistema). Los tokens en documentación quedan **obsoletos**; no uses valores copiados de archivos viejos del repo.

---

## Si el error persiste

- Revisar permisos `whatsapp_business_messaging` y `whatsapp_business_management`.
- Esperar unos minutos y reintentar (propagación Meta).

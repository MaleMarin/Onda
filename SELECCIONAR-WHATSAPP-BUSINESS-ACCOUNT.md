# Cómo ver "messages" en Webhooks de Meta

## Lo que te pasa

- Cuando entras a **Webhooks**, a veces aparece **"User"** (o otro producto) seleccionado.
- Con eso seleccionado, en la lista **no sale "messages"**.
- **"messages"** solo aparece cuando está activo **"WhatsApp Business Account"**.

Por eso a veces no ves "messages": hay que tener seleccionado el producto correcto.

---

## Qué hacer cada vez que entres a Webhooks

### 1. Ir a Webhooks

Menú izquierdo → **Productos** → **Webhooks**.

### 2. Elegir el producto correcto

Arriba de la página suele haber un selector que dice algo como:

- **"Seleccionar producto"** / **"Select product"**

Ahí debe estar una lista desplegable con opciones como:

- User  
- **WhatsApp Business Account**  
- (otros productos)

Tienes que elegir **"WhatsApp Business Account"**.

### 3. Comprobar que "messages" aparece

- Con **WhatsApp Business Account** seleccionado, la lista de campos del webhook cambia.
- En esa lista debe aparecer **"messages"**.
- Si no aparece, vuelve a revisar que el producto seleccionado sea **WhatsApp Business Account**.

### 4. Suscribir "messages"

- Busca la fila **"messages"**.
- Activa el interruptor (que quede en **Suscritos** / azul).
- Haz clic en **"Verificar y guardar"** (o "Verify and save") si lo hay.

### 5. Al cerrar y volver

- Cuando cierres la página y vuelvas a **Webhooks**, el selector puede volver a **"User"** u otro valor.
- **Vuelve a seleccionar "WhatsApp Business Account"** para ver de nuevo "messages" y comprobar que sigue suscrito.

---

## Resumen

| Selector en Webhooks | ¿Aparece "messages"? |
|----------------------|------------------------|
| **User** (o otro)    | No                     |
| **WhatsApp Business Account** | Sí            |

Siempre que quieras revisar o activar "messages":

1. Entra a **Webhooks**.
2. Selecciona **WhatsApp Business Account**.
3. En la lista verás **messages**; actívalo y guarda.

Así "messages" solo está cuando el botón/selector de **WhatsApp Business Account** está activo; en "User" no está y por eso no lo ves en la lista.

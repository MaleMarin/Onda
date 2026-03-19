# Índice vectorial en Firebase (Firestore) para Onda

Para que las búsquedas con `searchPrivateDocs` funcionen, Firestore debe tener un **índice vectorial** sobre la colección `embeddings_onda` y el campo `vector`.

## Dimensiones del vector

Los embeddings se generan con **OpenAI `text-embedding-3-small`**, que produce vectores de **1536 dimensiones**. El índice debe crearse con esa misma dimensión.

---

## Cómo crear el índice en la consola de Firebase / Google Cloud

### Opción A: Google Cloud Console (recomendado)

1. Entra en **[Google Cloud Console](https://console.cloud.google.com)** y selecciona el proyecto de Firebase que usas para Onda.
2. Ve a **Firestore** → **Bases de datos** (o **[Databases](https://console.cloud.google.com/firestore/databases)**).
3. Elige la base de datos por defecto `(default)` (o la que uses).
4. En el menú lateral, abre **Índices** (**Indexes**).
5. Pestaña **Composites** (o **Manual**).
6. Pulsa **Crear índice** (**Create index**).
7. Elige **Crear índice vectorial** (**Create vector index**).
8. Completa:
   - **Collection ID:** `embeddings_onda`
   - **Campo vectorial (Vector field path):** `vector`
   - **Dimensiones (Dimensions):** `1536`
   - **Tipo de índice:** deja el valor por defecto (por ejemplo **Flat**).
9. Guarda. La creación del índice puede tardar varios minutos. Verás un ✓ cuando esté listo.

### Opción B: Firebase Console

1. Entra en **[Firebase Console](https://console.firebase.google.com)** y selecciona el proyecto.
2. Ve a **Firestore Database**.
3. En la pestaña **Indexes**, si no ves la opción de índice vectorial, usa la **Google Cloud Console** (pasos de la Opción A), ya que el índice vectorial a veces se gestiona desde ahí.

### Opción C: gcloud CLI

Con la [gcloud CLI](https://cloud.google.com/sdk/docs/install) instalada y autenticada:

```bash
gcloud firestore indexes composite create \
  --collection-group=embeddings_onda \
  --query-scope=COLLECTION \
  --field-config=field-path=vector,vector-config='{"dimension":"1536","flat":"{}"}' \
  --database="(default)"
```

(Si tu versión de gcloud usa `alpha`, prueba antes: `gcloud alpha firestore indexes composite create`.)

Si tu base de datos no es la por defecto, sustituye `(default)` por el ID de tu base de datos.

---

## Comprobar que el índice está activo

- En **Indexes** de Firestore, el índice debe aparecer con estado **Enabled** (o un icono de vector).
- Si llamas a `searchPrivateDocs` antes de que el índice esté listo, Firestore puede devolver un error indicando que falta un índice; créalo y espera a que termine de construirse.

---

## Resumen

| Campo      | Valor        |
|-----------|--------------|
| Colección | `embeddings_onda` |
| Campo     | `vector`     |
| Dimensiones | `1536`     |
| Modelo de embeddings | OpenAI `text-embedding-3-small` |

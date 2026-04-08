# Reglas de flujo — Cómo funciona el bot Onda

Resumen de la lógica de bienvenida y persistencia. Origen: `app/chat/ChatPageContent.tsx` (hook interno `useUserCheck()`).

---

## Claves en localStorage

| Clave | Uso |
|-------|-----|
| `onda_visited` | "1" = usuario ya abrió el chat alguna vez (ya no es "nuevo"). |
| `onda_chat_restore` | JSON con mensajes, eje y `savedAt`. Se usa para restaurar la conversación si sigue en la misma sesión. |
| `onda_preferida` | Última Onda elegida (A_MANO, CIVITA, PROFES). Para bienvenida personalizada y botón "Continuar". |
| `onda_ultimo_tema` | Título corto del último tema tratado (máx. 5 palabras). Para la Memoria Temática. |

---

## Umbrales de tiempo

- **Restore válido:** guardado hace menos de **7 días** (`RESTORE_MAX_AGE_MS`).
- **Misma sesión:** mismo día calendario **y** menos de **12 horas** desde `savedAt` (`SAME_SESSION_MS`).
- Si pasaron más de 12 h o es otro día → **no** se restaura; se muestra saludo de “nuevo día” y se borra `onda_chat_restore`.

---

## Flujo al cargar el chat

```
¿Existe onda_visited?
│
├─ NO → Usuario NUEVO
│        • Guardar onda_visited = "1"
│        • Mensaje: getMainWelcome()
│          ("¡Hola! [Buenos días/tardes/noches] + bienvenida a Onda + 3 Ondas + ¿Por qué Onda te gustaría empezar hoy? ✨")
│        • No restaurar. Mostrar los 3 botones de ejes.
│
└─ SÍ → Usuario CONOCIDO
         │
         ¿Hay onda_chat_restore válido (< 7 días) y con mensajes?
         │
         ├─ SÍ → ¿Misma sesión? (mismo día y < 12 h desde savedAt)
         │        │
         │        ├─ SÍ → RESTAURAR
         │        │        • Cargar mensajes guardados (ordenados por timestamp)
         │        │        • Restaurar eje (inferido o el guardado)
         │        │        • No mostrar mensaje de bienvenida (scroll al final)
         │        │
         │        └─ NO → Nuevo día o > 12 h
         │                 • Borrar onda_chat_restore
         │                 • Mensaje según prioridad:
         │                   1) Si hay onda_ultimo_tema → getWelcomeWithTema(tema)
         │                   2) Si no, si hay onda_preferida → getWelcomeWithPreferredEje(eje)
         │                   3) Si no → getGreetingNewDay(últimoEje)
         │                 • Mostrar los 3 botones (el preferido resaltado como "Continuar")
         │
         └─ NO (sin restore o expirado) → Conocido sin historial reciente
                  • Mensaje según prioridad:
                    1) Si hay onda_ultimo_tema → getWelcomeWithTema(tema)
                    2) Si no, si hay onda_preferida → getWelcomeWithPreferredEje(eje)
                    3) Si no → getShortWelcome()
                  • Mostrar los 3 botones (el preferido resaltado como "Continuar")
```

---

## Textos de bienvenida (qué ve el usuario)

| Caso | Función | Ejemplo de mensaje |
|------|---------|--------------------|
| **Usuario nuevo** | `getMainWelcome()` | "¡Hola! Buenos días. Te doy la bienvenida a Onda 🌊… (3 Ondas, formatos) ¿Por qué Onda te gustaría empezar hoy? ✨" |
| **Conocido, saludo corto** | `getShortWelcome()` | "¡Hola! Buenas tardes. ¿En qué onda trabajamos hoy? Estoy aquí para lo que necesites — elige una y seguimos. 👇" |
| **Con tema guardado** | `getWelcomeWithTema(tema)` | "¡Hola! Buenas tardes. Qué bueno verte. ¿Seguimos trabajando en [tema] o prefieres que busquemos nuevas evidencias hoy? 👇" |
| **Con Onda preferida** | `getWelcomeWithPreferredEje(eje)` | "¡Hola de nuevo! Buenas tardes. Veo que la última vez trabajamos en Onda A Mano. ¿Quieres continuar ahí o prefieres explorar una nueva hoy? 👇" |
| **Nuevo día (con/sin última Onda)** | `getGreetingNewDay(lastEje?)` | "¡Hola de nuevo hoy! Buenas tardes. Qué bueno verte de nuevo este miércoles. ¿Listo para seguir con Onda Civita? ¿Qué onda activamos hoy? 👇" |

El saludo según hora (`getTimeGreeting()`) puede ser: Buenos días. / Buenas tardes. / Buenas noches. / ¡Buen lunes! (lunes mañana) / ¡Buen viernes noche! (viernes noche).

---

## Qué pasa después de la bienvenida

1. **Usuario elige una Onda** (A Mano, Civita o Profes)  
   → Se guarda en `onda_preferida`.  
   → Si elige una Onda **distinta** a la que había en `onda_preferida`, se **borra** `onda_ultimo_tema` (reset de Memoria Temática).

2. **Cada cierto tiempo** (al cambiar mensajes/eje) se guarda en `onda_chat_restore` el estado actual (mensajes, eje, `savedAt`) para poder restaurar en la misma sesión.

3. **Al final de cada respuesta del bot** se genera un título corto del tema (Memoria Temática) y se guarda en `onda_ultimo_tema`.

---

## Resumen en una frase

**Nuevo:** bienvenida larga y 3 Ondas. **Conocido misma sesión (< 12 h, mismo día):** se restaura la conversación. **Conocido nuevo día o sin restore:** saludo personalizado (tema → Onda preferida → saludo corto o nuevo día) y 3 botones, con la Onda preferida resaltada como "Continuar".

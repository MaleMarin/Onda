# Menús de las tres Ondas

Referencia de las opciones de menú que ve el usuario en el chat ONDA. Definición en código: `content/shared.ts` → `A_MANO_OPTIONS`, `CIVITA_OPTIONS`, `PROFES_OPTIONS`, `IA_SUBMENU_OPTIONS`.

---

## 🔴 Onda A Mano  
*Vida digital cotidiana, criterio e IA.*

| ID   | Opción |
|------|--------|
| A_M1 | 🔍 Entender una noticia o un texto |
| A_M2 | 🔥 Despejar una duda (posible estafa) |
| A_M3 | 🖐 Estoy viviendo algo incómodo |
| A_M4 | 🔔 Radar de alertas |
| A_M5 | 👀 Entrenar mi ojo |
| A_M6 | 🤖 Aprender a usar IA *(abre submenú)* |
| A_M7 | 🎧 Descubrir algo que valga la pena |
| A_M8 | 🌿 Tomar aire — Cine, Música, Artes |
| A_M9 | 💬 Dar mi opinión |
| A_M10 | ✨ Compartir Onda |

### Submenú IA (A_M6 — Aprender a usar IA)

| ID   | Opción |
|------|--------|
| IA_ST | 📚 IA para estudiar y aprender |
| IA_TR | 🧑‍💼 IA para trabajar y organizar |
| IA_CR | 🎨 IA para creatividad |
| IA_DD | 🧩 IA en el día a día |
| IA_IC | 🧾 Indicaciones para usar IA con criterio |

---

## 🟢 Onda Civita  
*Vida pública, instituciones y ciudadanía.*

| ID    | Opción |
|-------|--------|
| C_N1  | 🏛 Entender una noticia o decisión pública |
| C_I2  | 🏦 Entender una institución o cargo |
| C_D3  | 📜 Mis derechos y reglas del juego |
| C_E4  | 💰 Economía en simple |
| C_M5  | 🌱 Medio ambiente y territorio |
| C_H6  | 🕐 Historia y contexto |
| C_P7  | 🗳 Formas de participar |
| C_C8  | 🤝 Convivencia y respeto |
| C_E9  | 📚 Ver ejemplos de temas |
| C_T10 | 💻 Tecnología e Innovación |

---

## 🟣 Onda Profes  
*Docencia y proyectos educativos con IA.*

| ID   | Opción |
|------|--------|
| P_A1 | 🧩 Diseñar actividad con IA crítica |
| P_T2 | ✏️ Transformar tarea tradicional |
| P_E3 | 🎓 Ejemplos por nivel educativo |
| P_R4 | 📐 Rúbricas y criterios de evaluación |
| P_I5 | 📢 Indicaciones para estudiantes |
| P_T6 | 🧑‍🏫 Talleres para grupos diversos |
| P_X7 | 🤖 Explicar IA a un curso |
| P_L8 | 📂 Proyectos largos con IA |
| P_S9 | 📚 Recursos sugeridos |

---

## Resumen por Onda

| Onda     | Opciones principales | Submenú        |
|----------|----------------------|----------------|
| A Mano   | 10                   | IA (5 opciones)|
| Civita   | 10                   | —              |
| Profes   | 9                    | —              |

Las intros (3 preguntas por ítem) y los `internalPrompt` están en `content/menuQuestions.ts` (formatMenuIntro) y en cada entrada de `content/shared.ts`.

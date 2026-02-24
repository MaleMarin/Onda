# Fuentes donde ONDA debe buscar información

Además de **Gemini** y **OpenAI ChatGPT**, ONDA puede consultar estas fuentes para dar respuestas más precisas y citables.

---

## 1. Educación Mediática y Ciudadanía Digital

| Nombre | Tipo | URL | Uso en ONDA | Notas |
|--------|------|-----|-------------|--------|
| UNESCO – Alfabetización Mediática e Informacional (AMI) | web | https://www.unesco.org/en/media-information-literacy | A Mano, Profes | Marco global AMI |
| UNESCO – Currículum AMI (versión electrónica) | web | https://www.unesco.org/mil4teachers/en/curriculum | Profes | Currículum para docentes |
| EducaMídia (Brasil) | web | https://educamidia.org.br/ | A Mano, Profes | Educación midiática |
| EducaMídia 60+ (Adultos mayores) | web | https://60mais.educamidia.org.br/ | A Mano | Enfoque adultos mayores |
| Portal Ciudadanía Digital (Mineduc, Chile) | web | https://ciudadaniadigital.mineduc.cl/ | Civita, Profes | Chile, educación formal |
| Educarchile (recursos pedagógicos) | web | https://www.educarchile.cl/ | Profes | Recursos Chile |

---

## 2. Verificación de Datos y Noticias Globales

| Nombre | Tipo | URL | Uso en ONDA | Notas |
|--------|------|-----|-------------|--------|
| International Fact-Checking Network (IFCN) | web | https://www.poynter.org/ifcn/ | A Mano, Civita | Red global de fact-checkers |
| Reuters Fact Check | web | https://www.reuters.com/fact-check/ | A Mano, Civita | Verificación noticias |
| Associated Press (AP) News | web | https://www.ap.org/ | A Mano, Civita | Agencia, noticias |
| AFP Fact Check | web | https://factcheck.afp.com/ | A Mano, Civita | Verificación AFP |
| Google Fact Check Explorer | web | https://toolbox.google.com/factcheck/explorer | A Mano, Civita | Búsqueda de verificaciones |

---

## 3. Bibliotecas Digitales e Historia de la Humanidad

| Nombre | Tipo | URL | Uso en ONDA | Notas |
|--------|------|-----|-------------|--------|
| Biblioteca Digital Mundial (Library of Congress) | web | https://www.loc.gov/collections/world-digital-library/ | Civita, Profes | Patrimonio mundial |
| Internet Archive | web | https://archive.org/ | A Mano, Civita | Archivo web y medios |
| Wayback Machine | web | https://archive.org/web/ | A Mano, Civita | Historial de páginas |
| Europeana | web | https://www.europeana.eu/ | Civita, Profes | Cultura europea |
| HathiTrust Digital Library | web | https://www.hathitrust.org/ | Civita, Profes | Libros digitales |
| Project Gutenberg | web | https://www.gutenberg.org/ | Civita, Profes | Libros de dominio público |
| Biblioteca Virtual Miguel de Cervantes | web | https://www.cervantesvirtual.com/ | Civita, Profes | Literatura en español |
| Gallica (BnF) | web | https://gallica.bnf.fr/ | Civita, Profes | Biblioteca Nacional de Francia |

---

## 4. Repositorios Históricos en Chile y Latinoamérica

| Nombre | Tipo | URL | Uso en ONDA | Notas |
|--------|------|-----|-------------|--------|
| Memoria Chilena | web | http://www.memoriachilena.gob.cl/ | Civita, Profes | Patrimonio Chile |
| Biblioteca Nacional Digital de Chile | web | http://www.bibliotecanacionaldigital.gob.cl/ | Civita, Profes | Chile |
| Biblioteca Pública Digital de Chile | web | http://www.bpdigital.cl/ | Civita, Profes | Chile |
| Biblioteca Digital del Banco de la República (Colombia) | web | https://www.banrepcultural.org/biblioteca-digital | Civita, Profes | Colombia, Latinoamérica |

---

## 5. Enciclopedias y Bases de Datos Académicas

| Nombre | Tipo | URL | Uso en ONDA | Notas |
|--------|------|-----|-------------|--------|
| Enciclopedia Britannica | web | https://www.britannica.com/ | Civita, Profes | Referencia general |
| JSTOR | web | https://www.jstor.org/ | Profes, Civita | Artículos académicos (suscripción) |
| Gale Primary Sources | web | https://www.gale.com/primary-sources | Profes, Civita | Fuentes primarias (suscripción) |
| History Reference Source (EBSCO) | web | https://www.ebsco.com/products/research-databases/history-reference-source | Profes, Civita | Historia (suscripción) |

---

## Uso de esta lista en ONDA

1. **Prompt**: incluir en el system prompt que el modelo priorice y cite estas fuentes cuando sea relevante (p. ej. “Para AMI y educación midiática consultá UNESCO, EducaMídia, Ciudadanía Digital Mineduc; para verificación de noticias, IFCN, Reuters, AFP, Google Fact Check; para patrimonio y referencias, las bibliotecas y enciclopedias listadas”).
2. **RAG**: indexar (scraping o APIs si existen) contenido de estas URLs y recuperar fragmentos antes de generar la respuesta.
3. **Citas**: en la respuesta, indicar “Según [UNESCO AMI]…”, “Verificado en [Reuters Fact Check]…”, “Fuente: [URL]”.

**Nota**: Algunas fuentes (JSTOR, Gale, EBSCO) requieren suscripción; se pueden usar para orientar al usuario (“Podés buscar en JSTOR…”) aunque el bot no acceda directamente.

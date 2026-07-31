# CM Agent Starter

Kit para crear un **agente Community Manager**: un chat web (una URL con clave) que escribe
contenido en la voz de una marca y que, con un solo prompt ("armame la parrilla de septiembre"),
**genera la parrilla del mes como Google Slides** copiando un template de marca y subiéndola a una
**carpeta de Drive**.

## Cómo empezar
1. Abre esta carpeta en **Claude Code**.
2. Lee **`BUILD-WITH-CLAUDE.md`** y pégale a Claude el prompt de ahí. Claude construye y adapta todo.
3. Sigue **`SETUP.md`** para las credenciales (Claude API, Google OAuth, carpeta y template de Drive).

## Estructura
- `server.js` — servidor (chat + herramienta de parrilla).
- `slidesTemplate.js` — copia el template y rellena las fichas por tokens `{{...}}`.
- `authorize.js` — obtiene el refresh token de Google (una vez).
- `public/index.html` — la interfaz de chat (re-brandéala).
- `knowledge/persona.md` — el "cerebro" / voz de marca (rellénalo con tu cliente).
- `scripts/buildTemplate.example.js` — referencia para construir el deck-plantilla con placeholders.
- `.env.example`, `render.yaml` — configuración y despliegue.

## Lo que cada persona pone de su lado
Sus propias credenciales: llave de **Claude API**, **OAuth de Google** (con acceso a **su** carpeta),
**GitHub** y **Render**. Las claves no se comparten; solo se comparte este código + las guías.

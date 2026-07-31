# CÓMO USAR ESTE KIT CON CLAUDE CODE

Este es un **kit de arranque** para crear un agente Community Manager como el de referencia:
un **chat web** que escribe contenido en la voz de una marca y que, con un solo prompt
("armame la parrilla de septiembre"), **genera la parrilla del mes como Google Slides y la sube
a una carpeta de Drive**.

Abre esta carpeta en **Claude Code** y **pégale el siguiente prompt**. Claude hará el resto,
pidiéndote lo que necesite.

---

## 👉 PROMPT PARA PEGAR EN CLAUDE CODE

> Quiero construir un agente Community Manager para el cliente **[NOMBRE DEL CLIENTE]**, usando
> el kit de esta carpeta (`cm-agent-starter`). El agente debe: (1) chatear en la voz de la marca,
> y (2) al pedirle "la parrilla de <mes>", generar el contenido del mes y armarlo como Google
> Slides copiando un template de marca, subiéndolo a **esta carpeta de Drive: [LINK DE LA CARPETA]**.
>
> Guíame paso a paso y hazlo tú donde puedas. En orden:
>
> 1. **Material del cliente.** Te voy a compartir su web, redes y una carpeta de Drive con material
>    (brand book, parrillas, ejemplos de posts). Léelo TODO y captura su voz. Si algo no me lo has
>    pedido, pídemelo.
> 2. **Cerebro.** Reescribe `knowledge/persona.md` con la voz real de la marca: ADN, tono, territorios,
>    la taxonomía para parrillas (territorios, objetivos, pilares, línea de negocio) y **ejemplos reales
>    de captions**. Nada genérico.
> 3. **Template de la parrilla.** Necesitamos un deck de Google Slides que sirva de plantilla, con una
>    "ficha" que use placeholders `{{FECHA}} {{HORA}} {{CANAL}} {{FORMATO}} {{OBJETIVO}} {{TERRITORIO}}
>    {{PILAR}} {{COPY}} {{CAPTION}} {{IDEA}}`. Usa `scripts/buildTemplate.example.js` como referencia
>    para construirlo (o adáptalo si el cliente ya tiene un deck de marca). Deja su ID a mano.
> 4. **Credenciales.** Ayúdame a conseguir y configurar (ver `SETUP.md`): mi llave de Claude API, mi
>    OAuth de Google (con `authorize.js`), el `DRIVE_FOLDER_ID` de la carpeta de arriba y el
>    `PARRILLA_TEMPLATE_ID` del template. Habilita la **Google Slides API** y la **Drive API** en mi
>    proyecto de Google Cloud.
> 5. **Marca visual.** Ajusta el nombre, colores y textos de `public/index.html`, y `BRAND_NAME` en `.env`.
> 6. **Probar local.** `npm install`, crea el `.env`, `npm start`, y prueba el chat y "armame la parrilla
>    de <mes>". Verifica que el PPT quede en mi carpeta con el diseño correcto.
> 7. **Desplegar.** Publica el repo en GitHub y despliégalo en Render (Blueprint, plan free), con las
>    variables del `.env` como secretos. Dame la URL pública + la clave de acceso para mi equipo.

---

## Notas para Claude (contexto técnico)
- **Arquitectura:** Express (`server.js`) + Claude API. El chat usa streaming; la parrilla usa un flujo
  NO-streaming con `tool_choice` forzado (evita que el modelo "anuncie" sin ejecutar).
- **Parrilla:** `server.js` genera 12-14 fichas con la herramienta `crear_parrilla_pptx`;
  `slidesTemplate.js` **copia** `PARRILLA_TEMPLATE_ID`, **duplica** la ficha por post y hace
  `replaceAllText` de los tokens `{{...}}` (scoped por página). Ajusta el mapa de tokens en
  `slidesTemplate.js` si tu template usa otros.
- **Ficha = slide que contiene `{{COPY}}`.** Las slides intro (sin ese token) quedan intactas.
- **Credenciales:** el servidor escribe en Drive con un **refresh token OAuth** (no service account:
  una service account no puede crear archivos en un Drive personal). Ver `SETUP.md`.
- **Requiere** habilitar **Google Slides API** y **Google Drive API** en el proyecto de Google Cloud.
- El `.env` NO se sube (está en `.gitignore`). En Render las variables van como secretos.

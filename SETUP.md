# SETUP — Credenciales y despliegue

El agente usa **tus** cuentas (no se comparten con nadie). Necesitas 4 cosas:

## 1. Llave de Claude API
`console.anthropic.com` → **API Keys** → Create Key. Cárgale créditos en **Plans & Billing**.
> Ojo: esto es la **API**, distinto de una suscripción Claude.ai. La API se paga por uso aparte.
→ va en `ANTHROPIC_API_KEY`.

## 2. Carpeta de Drive (destino)
Crea/elige la carpeta donde caerán las parrillas. Copia el ID del link
(`drive.google.com/drive/folders/ESTE_ID`) → `DRIVE_FOLDER_ID`.

## 3. Template de la parrilla (Google Slides)
Un deck de Google Slides con:
- Slides de intro que quieras (portada, etc.) — quedan intactas.
- **Una ficha** con placeholders de texto: `{{FECHA}} {{HORA}} {{CANAL}} {{FORMATO}} {{OBJETIVO}}
  {{TERRITORIO}} {{PILAR}} {{COPY}} {{CAPTION}} {{IDEA}}`.
Puedes construirlo con `scripts/buildTemplate.example.js` (ajústalo a tu diseño) o a mano.
Copia el ID del deck → `PARRILLA_TEMPLATE_ID`.

## 4. OAuth de Google (para escribir en tu Drive)
Se usa OAuth (no service account). En `console.cloud.google.com`:
1. Crea un **proyecto**.
2. **APIs y servicios → Biblioteca** → habilita **Google Drive API** y **Google Slides API**.
3. **Pantalla de consentimiento OAuth** → tipo *External* → agrega tu correo como *Test user* y
   **publica la app** (para que el token no caduque).
4. **Credenciales → Crear credenciales → ID de cliente OAuth → App de escritorio** → descarga el JSON.
5. Consigue el **refresh token** corriendo el script de autorización una vez:
   ```bash
   CJSON="/ruta/al/client_secret_....json" OUT=/tmp/token.json node authorize.js
   ```
   Se abre el navegador, autorizas con tu cuenta, y se guarda el token en `/tmp/token.json`.
   Del JSON toma `client_id` y `client_secret`; del token toma `refresh_token`.
   → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`.
> La carpeta destino y el template deben ser accesibles por la cuenta que autoriza.

---

## Correr local
```bash
npm install
cp .env.example .env    # y rellena las variables
npm start               # → http://localhost:3000
```
Prueba el chat y "armame la parrilla de septiembre".

## Desplegar (Render)
1. Sube el repo a **GitHub** (privado).
2. **render.com** → New → **Blueprint** → elige el repo (lee `render.yaml`).
3. Define las variables (secretas) en el dashboard: `ANTHROPIC_API_KEY`, `ACCESS_PASSWORD`,
   `BRAND_NAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
   `DRIVE_FOLDER_ID`, `PARRILLA_TEMPLATE_ID`.
4. Apply → espera **Live** → comparte la URL + la clave de acceso con tu equipo.

Para actualizar: editas `persona.md` (voz) o el template en Drive (diseño) → `git push` → Render redespliega.

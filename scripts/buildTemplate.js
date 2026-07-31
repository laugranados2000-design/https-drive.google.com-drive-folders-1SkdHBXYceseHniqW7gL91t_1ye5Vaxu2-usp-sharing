// Crea el deck de Google Slides que sirve de template para la parrilla mensual:
// una portada (queda intacta) + una "ficha" con los placeholders {{...}} que
// slidesTemplate.js duplica y rellena por post. Lo mueve a DRIVE_FOLDER_ID.
// Uso: node scripts/buildTemplate.js
import 'dotenv/config';
import { google } from 'googleapis';

const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth });
const slides = google.slides({ version: 'v1', auth: oauth });

const PT = 'PT';
const dim = (magnitude) => ({ magnitude, unit: PT });
const pos = (x, y) => ({ translateX: x, translateY: y, scaleX: 1, scaleY: 1, unit: PT });

const BRAND_RED = { red: 0.784, green: 0.063, blue: 0.180 };   // #C8102E
const BRAND_GOLD = { red: 0.949, green: 0.655, blue: 0.106 };  // #F2A71B
const WHITE = { red: 1, green: 1, blue: 1 };
const DARK = { red: 0.15, green: 0.12, blue: 0.08 };

function textBox({ pageId, id, x, y, w, h, text, fontSize = 12, bold = false, color = DARK, fill }) {
  const reqs = [
    { createShape: { objectId: id, shapeType: 'TEXT_BOX', elementProperties: { pageObjectId: pageId, size: { width: dim(w), height: dim(h) }, transform: pos(x, y) } } },
    { insertText: { objectId: id, text } },
    { updateTextStyle: { objectId: id, style: { fontSize: dim(fontSize), bold, foregroundColor: { opaqueColor: { rgbColor: color } }, fontFamily: 'Poppins' }, fields: 'fontSize,bold,foregroundColor,fontFamily' } },
  ];
  if (fill) reqs.push({ updateShapeProperties: { objectId: id, shapeProperties: { shapeBackgroundFill: { solidFill: { color: { rgbColor: fill } } } }, fields: 'shapeBackgroundFill' } });
  return reqs;
}

async function main() {
  if (!process.env.DRIVE_FOLDER_ID) throw new Error('Falta DRIVE_FOLDER_ID en .env');

  const created = await slides.presentations.create({ requestBody: { title: `TEMPLATE — Parrilla Florhuila` } });
  const presentationId = created.data.presentationId;
  const introId = created.data.slides[0].objectId;
  console.log('Presentación creada:', presentationId);

  // ── Slide 1: portada (sin {{COPY}}, así que NUNCA se toca al generar parrillas) ──
  const introReqs = [
    { updatePageProperties: { objectId: introId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: BRAND_RED } } } }, fields: 'pageBackgroundFill' } },
    ...textBox({ pageId: introId, id: 'introTitle', x: 60, y: 190, w: 480, h: 80, text: 'PARRILLA MENSUAL\nArroz Florhuila 🍚', fontSize: 28, bold: true, color: WHITE }),
    ...textBox({ pageId: introId, id: 'introSub', x: 60, y: 270, w: 480, h: 40, text: 'El arroz de los colombianos', fontSize: 14, color: BRAND_GOLD }),
  ];
  await slides.presentations.batchUpdate({ presentationId, requestBody: { requests: introReqs } });

  // ── Slide 2: la "ficha" (contiene {{COPY}} → slidesTemplate.js la detecta y duplica) ──
  const fichaRes = await slides.presentations.batchUpdate({ presentationId, requestBody: { requests: [{ createSlide: { slideLayoutReference: { predefinedLayout: 'BLANK' } } }] } });
  const fichaId = fichaRes.data.replies[0].createSlide.objectId;

  const fichaReqs = [
    { updatePageProperties: { objectId: fichaId, pageProperties: { pageBackgroundFill: { solidFill: { color: { rgbColor: WHITE } } } }, fields: 'pageBackgroundFill' } },
    // Header: fecha/hora
    ...textBox({ pageId: fichaId, id: 'fecha', x: 30, y: 24, w: 260, h: 28, text: '{{FECHA}} · {{HORA}}', fontSize: 14, bold: true, color: WHITE, fill: BRAND_RED }),
    ...textBox({ pageId: fichaId, id: 'canalFormato', x: 300, y: 24, w: 270, h: 28, text: '{{CANAL}} — {{FORMATO}}', fontSize: 12, bold: true, color: DARK, fill: BRAND_GOLD }),
    // Tags: objetivo / territorio / pilar
    ...textBox({ pageId: fichaId, id: 'objetivo', x: 30, y: 58, w: 175, h: 26, text: 'Objetivo: {{OBJETIVO}}', fontSize: 10, color: DARK }),
    ...textBox({ pageId: fichaId, id: 'territorio', x: 210, y: 58, w: 175, h: 26, text: 'Territorio: {{TERRITORIO}}', fontSize: 10, color: DARK }),
    ...textBox({ pageId: fichaId, id: 'pilar', x: 390, y: 58, w: 175, h: 26, text: 'Pilar: {{PILAR}}', fontSize: 10, color: DARK }),
    // Copy
    ...textBox({ pageId: fichaId, id: 'copyLabel', x: 30, y: 96, w: 200, h: 20, text: 'COPY / GUION', fontSize: 10, bold: true, color: BRAND_RED }),
    ...textBox({ pageId: fichaId, id: 'copyBody', x: 30, y: 118, w: 540, h: 130, text: '{{COPY}}', fontSize: 12, color: DARK }),
    // Caption
    ...textBox({ pageId: fichaId, id: 'captionLabel', x: 30, y: 256, w: 200, h: 20, text: 'CAPTION', fontSize: 10, bold: true, color: BRAND_RED }),
    ...textBox({ pageId: fichaId, id: 'caption', x: 30, y: 278, w: 540, h: 70, text: '{{CAPTION}}', fontSize: 11, color: DARK }),
    // Idea visual
    ...textBox({ pageId: fichaId, id: 'ideaLabel', x: 30, y: 356, w: 200, h: 20, text: 'IDEA VISUAL', fontSize: 10, bold: true, color: BRAND_RED }),
    ...textBox({ pageId: fichaId, id: 'ideaBody', x: 30, y: 378, w: 540, h: 60, text: '{{IDEA}}', fontSize: 11, color: DARK }),
  ];
  await slides.presentations.batchUpdate({ presentationId, requestBody: { requests: fichaReqs } });

  // Mover al Drive del cliente (Shared Drive → requiere supportsAllDrives)
  const file = await drive.files.get({ fileId: presentationId, fields: 'parents', supportsAllDrives: true });
  await drive.files.update({
    fileId: presentationId,
    addParents: process.env.DRIVE_FOLDER_ID,
    removeParents: (file.data.parents || []).join(','),
    supportsAllDrives: true,
  });

  console.log('\n✅ Template listo:', `https://docs.google.com/presentation/d/${presentationId}/edit`);
  console.log('PARRILLA_TEMPLATE_ID=' + presentationId);
}

main().catch((e) => { console.error('ERROR', e?.response?.data || e); process.exit(1); });

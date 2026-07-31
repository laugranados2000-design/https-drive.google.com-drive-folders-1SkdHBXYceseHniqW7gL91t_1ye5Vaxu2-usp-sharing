// Copia el template de marca (Google Slides) y rellena una ficha por post usando
// placeholders {{...}} vía la Google Slides API. Slides intro quedan intactas.
// Requiere en .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN,
// DRIVE_FOLDER_ID (carpeta destino) y PARRILLA_TEMPLATE_ID (el deck plantilla).
import { google } from 'googleapis';

const TEMPLATE_ID = process.env.PARRILLA_TEMPLATE_ID || '';

function clients() {
  const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return { drive: google.drive({ version: 'v3', auth: oauth }), slides: google.slides({ version: 'v1', auth: oauth }) };
}
const textOf = (el) => (el.shape?.text?.textElements || []).map(te => te.textRun?.content || '').join('');
// Una "ficha" es una slide que contiene el placeholder {{COPY}}.
const isFicha = (sl) => (sl.pageElements || []).some(e => textOf(e).includes('{{COPY}}'));
const abbr = (c) => c.replace(/instagram/i, 'IG').replace(/facebook/i, 'FB').replace(/tik ?tok/i, 'TikTok');

export function templateConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
            process.env.GOOGLE_REFRESH_TOKEN && process.env.DRIVE_FOLDER_ID && TEMPLATE_ID);
}

export async function crearParrillaTemplate(mes, posts) {
  const { drive, slides } = clients();
  const copy = await drive.files.copy({
    fileId: TEMPLATE_ID,
    requestBody: { name: `Parrilla ${mes}`, parents: [process.env.DRIVE_FOLDER_ID] },
    supportsAllDrives: true, fields: 'id',
  });
  const pid = copy.data.id;

  let pres = (await slides.presentations.get({ presentationId: pid })).data;
  let fichas = pres.slides.filter(isFicha);
  if (!fichas.length) throw new Error('El template no tiene fichas con placeholder {{COPY}}.');
  if (posts.length > fichas.length) {
    const src = fichas[fichas.length - 1].objectId;
    const dup = Array.from({ length: posts.length - fichas.length }, () => ({ duplicateObject: { objectId: src } }));
    await slides.presentations.batchUpdate({ presentationId: pid, requestBody: { requests: dup } });
    pres = (await slides.presentations.get({ presentationId: pid })).data;
    fichas = pres.slides.filter(isFicha);
  }

  const reqs = [];
  posts.forEach((post, i) => {
    const sl = fichas[i]; if (!sl) return;
    const canalArr = Array.isArray(post.canal) ? post.canal : (post.canal ? [post.canal] : []);
    const canal = canalArr.map(c => abbr(String(c).split(':')[0].trim())).join(' · ');
    const formato = post.formato || (canalArr[0] ? String(canalArr[0]).split(':')[1]?.trim() : '') || '';
    const copyText = Array.isArray(post.copy) ? post.copy.join('\n') : String(post.copy || '');
    // Ajusta / agrega tokens según los placeholders de TU template:
    const map = {
      '{{FECHA}}': post.fecha || '', '{{HORA}}': post.hora || '2:30 PM', '{{CANAL}}': canal, '{{FORMATO}}': formato,
      '{{OBJETIVO}}': post.objetivo || '', '{{TERRITORIO}}': post.territorio || '', '{{PILAR}}': post.pilar || '',
      '{{COPY}}': copyText, '{{CAPTION}}': post.caption || '', '{{IDEA}}': post.visual || post.idea || '',
    };
    for (const [token, val] of Object.entries(map))
      reqs.push({ replaceAllText: { containsText: { text: token, matchCase: true }, replaceText: val, pageObjectIds: [sl.objectId] } });
  });
  fichas.slice(posts.length).forEach(sl => reqs.push({ deleteObject: { objectId: sl.objectId } }));

  await slides.presentations.batchUpdate({ presentationId: pid, requestBody: { requests: reqs } });
  return { link: `https://docs.google.com/presentation/d/${pid}/edit`, id: pid, piezas: posts.length };
}

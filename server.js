// ── Agente Community Manager (starter genérico) ────────────────────────────────
// Chat web + generación de parrilla mensual como Google Slides en un folder de Drive.
// Personaliza: knowledge/persona.md (voz de marca) y las variables del .env.
// ───────────────────────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { crearParrillaTemplate, templateConfigured } from './slidesTemplate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env'), override: true });

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-sonnet-4-6';
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || '';
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 8192);
const BRAND = process.env.BRAND_NAME || 'la marca';

if (!process.env.ANTHROPIC_API_KEY) { console.error('❌ Falta ANTHROPIC_API_KEY en .env'); process.exit(1); }
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e?.stack || e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e?.stack || e));

const PERSONA = readFileSync(join(__dirname, 'knowledge', 'persona.md'), 'utf8');

const SYSTEM_PROMPT =
  `Eres el community manager oficial de la marca ${BRAND}. Escribes sus posts en la voz de la marca, ` +
  `respondes preguntas y propones contenido. Sigue al pie de la letra el documento maestro de voz y reglas de marca.\n\n` +
  `## PARRILLAS EN PPT\n` +
  `Tienes la herramienta "crear_parrilla_pptx". Úsala SOLO cuando el usuario pida armar/crear la parrilla de un mes. ` +
  `LLÁMALA DE INMEDIATO en ese turno con 12-14 piezas completas en "posts" (no anuncies que la vas a generar; ejecútala). ` +
  `NO escribas la parrilla como texto. Reglas para armar el mes:\n` +
  `- Distribuye las fechas a lo largo del mes; TODAS las fechas deben caer dentro del mes solicitado, con el día correcto.\n` +
  `- Varía formatos y canales; aprovecha fechas/ocasiones reales del mes.\n` +
  `- Usa los pilares/territorios/objetivos que define el documento maestro de marca.\n` +
  `- Cada ficha: fecha, hora, canal, formato, objetivo, territorio, pilar, copy (texto en pantalla línea por línea), caption e idea creativa.\n` +
  `- Aplica TODA la voz de marca del documento maestro.\n` +
  `Tras recibir el enlace, dáselo al usuario con una frase corta y cálida.\n\n` +
  `Responde siempre en español (salvo que pidan otro idioma).\n\n` +
  `=== DOCUMENTO MAESTRO ===\n${PERSONA}`;

// Herramienta: crear parrilla del mes → Google Slides en Drive
const TOOLS = [{
  name: 'crear_parrilla_pptx',
  description: 'Genera la parrilla del mes copiando el template de marca y rellenando una ficha por post. Devuelve el enlace. Úsala solo cuando el usuario pida la parrilla de un mes; genera tú las 12-14 piezas y pásalas en "posts".',
  input_schema: {
    type: 'object',
    properties: {
      mes: { type: 'string', description: 'Mes y año, ej. "Noviembre 2026".' },
      posts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fecha: { type: 'string', description: 'ej. "Miércoles 5 de noviembre".' },
            hora: { type: 'string', description: 'ej. "2:30 PM".' },
            canal: { type: 'array', items: { type: 'string' }, description: 'Plataformas y formato, ej. ["Instagram: Carrusel","Facebook: Galería"].' },
            formato: { type: 'string', description: 'Formato principal (Carrusel/Reel/Post/Story).' },
            objetivo: { type: 'string', description: 'Objetivo del post (según el documento maestro).' },
            territorio: { type: 'string', description: 'Territorio de contenido (según el documento maestro).' },
            pilar: { type: 'string', description: 'Pilar/driver de marca (según el documento maestro).' },
            copy: { type: 'array', items: { type: 'string' }, description: 'Texto en pantalla / guión, línea por línea.' },
            caption: { type: 'string' },
            visual: { type: 'string', description: 'Idea creativa / referencia visual breve.' },
          },
          required: ['fecha', 'territorio', 'objetivo', 'pilar', 'formato', 'copy', 'caption'],
        },
      },
    },
    required: ['mes', 'posts'],
  },
}];

async function execCrearParrilla(input) {
  if (!templateConfigured()) return { ok: false, error: 'Falta configurar Google/Drive en el servidor (.env).' };
  const mes = String(input.mes || 'Mes').trim();
  const posts = Array.isArray(input.posts) ? input.posts : [];
  if (!posts.length) return { ok: false, error: 'No recibí las piezas de la parrilla.' };
  const r = await crearParrillaTemplate(mes, posts);
  return { ok: true, mes, piezas: r.piezas, link: r.link };
}

const app = express();
app.use(express.json({ limit: '1mb' }));
function checkAuth(req, res, next) {
  if (!ACCESS_PASSWORD) return next();
  if ((req.get('x-access-key') || '') === ACCESS_PASSWORD) return next();
  return res.status(401).json({ error: 'unauthorized' });
}
app.get('/api/health', (_req, res) => res.json({ ok: true, brand: BRAND, model: MODEL, authRequired: !!ACCESS_PASSWORD, personaChars: PERSONA.length, driveReady: templateConfigured() }));
app.post('/api/login', (req, res) => {
  if (!ACCESS_PASSWORD) return res.json({ ok: true });
  return (req.body?.password === ACCESS_PASSWORD) ? res.json({ ok: true }) : res.status(401).json({ ok: false });
});

app.post('/api/chat', checkAuth, async (req, res) => {
  const { message, history = [] } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (p) => { if (res.writableEnded) return; try { res.write(`data: ${JSON.stringify(p)}\n\n`); res.flush?.(); } catch {} };

  const convo = [...(Array.isArray(history) ? history.slice(-20) : []), { role: 'user', content: message }];
  const sys = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
  const MESES = /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)/i;
  const wantsParrilla = /(parrilla|calendario)/i.test(message) && MESES.test(message);

  try {
    if (wantsParrilla) {
      send({ text: '⏳ Estoy armando tu parrilla del mes y subiéndola a Drive. Tarda ~1-2 minutos, no cierres la ventana…\n\n' });
      const resp = await anthropic.messages.create({ model: MODEL, max_tokens: 8192, system: sys, tools: TOOLS, tool_choice: { type: 'tool', name: 'crear_parrilla_pptx' }, messages: convo });
      const tu = resp.content.find((b) => b.type === 'tool_use');
      if (!tu) { send({ text: 'No pude generar la parrilla esta vez. ¿Me la pides de nuevo?' }); }
      else {
        const r = await execCrearParrilla(tu.input);
        send({ text: r.ok ? `¡Listo! 🎉 Tu Parrilla de ${r.mes} (${r.piezas} piezas) ya quedó en tu carpeta de Drive:\n\n${r.link}` : `No pude subir el archivo: ${r.error}` });
      }
    } else {
      const stream = anthropic.messages.stream({ model: MODEL, max_tokens: MAX_TOKENS, system: sys, messages: convo });
      for await (const chunk of stream) if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') send({ text: chunk.delta.text });
      await stream.finalMessage();
    }
  } catch (err) { console.error('[chat] error:', err?.stack || err); send({ error: err?.message || 'error interno' }); }
  send('[DONE]'); res.end();
});

app.use(express.static(join(__dirname, 'public')));
app.listen(PORT, '0.0.0.0', () => console.log(`\n✦ Agente CM (${BRAND}) → http://localhost:${PORT}  · Drive: ${templateConfigured() ? 'ok' : 'no configurado'}\n`));

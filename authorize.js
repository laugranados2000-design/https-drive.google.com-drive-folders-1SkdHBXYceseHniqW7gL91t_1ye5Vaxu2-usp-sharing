// Autorización OAuth de una sola vez para que el agente pueda subir a Drive.
// Abre el navegador, el usuario aprueba, y guardamos el refresh_token.
import { google } from 'googleapis';
import http from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';

const CJSON = process.env.CJSON;
const OUT = process.env.OUT || '/tmp/donapepa-token.json';
const PORT = 4756;

const cred = JSON.parse(readFileSync(CJSON, 'utf8')).installed;
const redirect = `http://localhost:${PORT}`;
const oauth = new google.auth.OAuth2(cred.client_id, cred.client_secret, redirect);

const url = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive'],
});

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, redirect);
    const code = u.searchParams.get('code');
    if (!code) { res.end('Sin código.'); return; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h2>¡Listo! 🎉</h2><p>Autorización completada. Puedes cerrar esta pestaña y volver a Claude.</p>');
    const { tokens } = await oauth.getToken(code);
    writeFileSync(OUT, JSON.stringify(tokens, null, 2));
    console.log('DONE has_refresh=' + !!tokens.refresh_token);
    setTimeout(() => process.exit(0), 300);
  } catch (e) {
    console.log('ERROR ' + (e?.message || e));
    res.end('Error: ' + (e?.message || e));
    setTimeout(() => process.exit(1), 300);
  }
});

server.listen(PORT, () => {
  console.log('AUTH_URL ' + url);
  exec(`open "${url}"`); // abre el navegador en macOS
});

const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const production = process.env.NODE_ENV === 'production';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'registrations.json');

if (ADMIN_PASSWORD.length < 12 || SESSION_SECRET.length < 32) {
  console.warn('AVISO: configure ADMIN_PASSWORD (mínimo 12 caracteres) e SESSION_SECRET (mínimo 32 caracteres) no .env antes de publicar.');
}
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', { mode: 0o600 });

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }));

function readRegistrations() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function saveRegistrations(rows) {
  const temp = DATA_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(rows, null, 2), { mode: 0o600 });
  fs.renameSync(temp, DATA_FILE);
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(payload) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
}
function makeToken() {
  const payload = JSON.stringify({ admin: true, exp: Date.now() + 8 * 60 * 60 * 1000 });
  const encoded = Buffer.from(payload).toString('base64url');
  return encoded + '.' + sign(encoded);
}
function isAdmin(req) {
  if (!SESSION_SECRET) return false;
  const token = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('kw_admin='));
  if (!token) return false;
  const raw = decodeURIComponent(token.slice('kw_admin='.length));
  const parts = raw.split('.');
  if (parts.length !== 2 || !safeEqual(sign(parts[0]), parts[1])) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return data.admin === true && data.exp > Date.now();
  } catch { return false; }
}
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Acesso restrito. Entre no painel novamente.' });
  next();
}

app.post('/api/register', rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false }), (req, res) => {
  const username = String(req.body.username || '').trim();
  const hasDiscord = req.body.hasDiscord;
  const willingToTalk = req.body.willingToTalk;
  if (username.length < 2 || username.length > 40 || !/^[\p{L}\p{N}_ .-]+$/u.test(username)) {
    return res.status(400).json({ error: 'Informe um nome de usuário válido (2 a 40 caracteres).' });
  }
  if (hasDiscord !== true) return res.status(400).json({ error: 'Discord é obrigatório.' });
  if (typeof willingToTalk !== 'boolean') return res.status(400).json({ error: 'Responda à pergunta sobre conversar.' });
  const rows = readRegistrations();
  if (rows.some(r => r.username.toLocaleLowerCase('pt-BR') === username.toLocaleLowerCase('pt-BR'))) {
    return res.status(409).json({ error: 'Já existe uma inscrição com esse nome de usuário.' });
  }
  const entry = {
    id: crypto.randomUUID(),
    username,
    hasDiscord: true,
    willingToTalk,
    createdAt: new Date().toISOString()
  };
  rows.push(entry);
  saveRegistrations(rows);
  res.status(201).json({ message: 'Inscrição registrada! Boa sorte no sorteio.' });
});

app.post('/api/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false }), (req, res) => {
  if (!ADMIN_PASSWORD || !SESSION_SECRET) return res.status(503).json({ error: 'Painel não configurado. Defina ADMIN_PASSWORD e SESSION_SECRET no ambiente do servidor.' });
  if (!safeEqual(req.body.password || '', ADMIN_PASSWORD)) return res.status(401).json({ error: 'Senha incorreta.' });
  res.setHeader('Set-Cookie', `kw_admin=${encodeURIComponent(makeToken())}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${production ? '; Secure' : ''}`);
  res.json({ message: 'Acesso autorizado.' });
});
app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `kw_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production ? '; Secure' : ''}`);
  res.json({ message: 'Sessão encerrada.' });
});
app.get('/api/admin/registrations', requireAdmin, (req, res) => {
  const rows = readRegistrations().sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json(rows);
});
app.get('/api/admin/export.csv', requireAdmin, (req, res) => {
  const rows = readRegistrations();
  const cell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const csv = ['Nome de usuário,Tem Discord,Está disposto a conversar,Data (UTC)',
    ...rows.map(r => [r.username, r.hasDiscord ? 'Sim' : 'Não', r.willingToTalk ? 'Sim' : 'Não', r.createdAt].map(cell).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inscricoes-kvinx-world.csv"');
  res.send('\uFEFF' + csv);
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`KVINX WORLD rodando em http://localhost:${PORT}`));

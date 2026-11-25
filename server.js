import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { createAIRouter } from './server/ai/ai-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (fs.existsSync(path.join(__dirname, '.env')) && process.loadEnvFile) process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.disable('x-powered-by');
app.use('/api/ai', createAIRouter());
app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy chức năng.' }));

app.use('/documents', express.static(path.join(__dirname, 'public', 'documents')));
app.use('/assets', express.static(path.join(__dirname, 'assets'), { dotfiles: 'deny', index: false }));
app.use('/public/assets', express.static(path.join(__dirname, 'public/assets'), { dotfiles: 'deny', index: false }));
app.get(['/source/strategy.md', '/source/data/about-company.md'], (req, res) => res.sendFile(path.join(__dirname, req.path)));
app.get(['/', '/index.html', '/toan-van.html'], (req, res) => res.sendFile(path.join(__dirname, req.path === '/' ? 'index.html' : req.path)));
app.use((req, res, next) => {
  if (/^\/(?:server|scripts|src|source|node_modules|data)(?:\/|$)/i.test(req.path) || /(?:^|\/)\./.test(req.path) || /\.(?:json|js|ts|mjs|cjs|env|md|txt)$/i.test(req.path)) return res.status(404).end();
  next();
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/assets/') || req.path.startsWith('/documents/') || /\.[a-z0-9]+$/i.test(req.path)) {
    res.status(404).end();
    return;
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

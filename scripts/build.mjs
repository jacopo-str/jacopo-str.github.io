// Génère dist/ à partir de src/ et site.config.json. Aucune dépendance.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'src'), dist, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let html = readFileSync(join(dist, 'index.html'), 'utf8');
// Blocs optionnels : supprimés si la valeur de configuration est vide.
html = html.replace(/<!--if:(\w+)-->([\s\S]*?)<!--\/if:\1-->/g, (_, k, body) => (cfg[k] ? body : ''));
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
  if (!(k in cfg)) throw new Error(`Variable de configuration inconnue : ${k}`);
  return esc(cfg[k]);
});
writeFileSync(join(dist, 'index.html'), html);

const base = cfg.siteUrl.replace(/\/$/, '');
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
writeFileSync(join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.w3.org/2001/sitemap/0.9"><url><loc>${base}/</loc></url></urlset>\n`);
writeFileSync(join(dist, '.nojekyll'), '');
if (!existsSync(join(dist, 'og.png'))) console.warn('⚠ og.png manquant');
if (!cfg.email) console.warn('⚠ email vide : section e-mail masquée (site.config.json)');
console.log('Build OK →', dist);

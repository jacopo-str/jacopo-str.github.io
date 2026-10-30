// Génère dist/ à partir de src/ et site.config.json. Aucune dépendance.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'src'), dist, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function render(file) {
  let html = readFileSync(join(dist, file), 'utf8');
  // Blocs optionnels : supprimés si la valeur de configuration est vide.
  html = html.replace(/<!--if:(\w+)-->([\s\S]*?)<!--\/if:\1-->/g, (_, k, body) => (cfg[k] ? body : ''));
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in cfg)) throw new Error(`Variable de configuration inconnue : ${k}`);
    return esc(cfg[k]);
  });
  // Versionne CSS/JS par empreinte du contenu : un changement est visible immédiatement malgré le cache.
  const prefix = file.includes('/') ? '../' : '';
  for (const f of ['style.css', 'main.js']) {
    const v = createHash('sha256').update(readFileSync(join(dist, f))).digest('hex').slice(0, 8);
    html = html.replace(`"${prefix}${f}"`, `"${prefix}${f}?v=${v}"`);
  }
  writeFileSync(join(dist, file), html);
}
render('index.html');
render('en/index.html');

const base = cfg.siteUrl.replace(/\/$/, '');
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
const alt = (u) => `<xhtml:link rel="alternate" hreflang="fr" href="${base}/"/><xhtml:link rel="alternate" hreflang="en" href="${base}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${base}/"/>`;
writeFileSync(join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n<url><loc>${base}/</loc>${alt()}</url>\n<url><loc>${base}/en/</loc>${alt()}</url>\n</urlset>\n`);
writeFileSync(join(dist, '.nojekyll'), '');
for (const f of ['og.png', 'og-en.png']) if (!existsSync(join(dist, f))) console.warn(`⚠ ${f} manquant`);
if (!cfg.email) console.warn('⚠ email vide : section e-mail masquée (site.config.json)');
console.log('Build OK →', dist);

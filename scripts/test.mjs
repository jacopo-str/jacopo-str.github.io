// Vérifications statiques sur dist/ : structure, liens, métadonnées, confidentialité.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const html = readFileSync(join(dist, 'index.html'), 'utf8');
let fails = 0;
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) fails++; };

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
ok(anchors.every((a) => ids.has(a)), `${anchors.length} ancres internes résolues`);
const locals = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1].split('?')[0]);
ok(locals.every((f) => existsSync(join(dist, f))), `${locals.length} fichiers locaux présents (${[...new Set(locals)].join(', ')})`);
ok(/<html lang="fr">/.test(html), 'lang="fr"');
ok((html.match(/<h1[ >]/g) || []).length === 1, 'un seul <h1>');
for (const p of ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'])
  ok(new RegExp(`(name|property)="${p}"`).test(html), `meta ${p}`);
ok(html.includes(`${cfg.siteUrl}/og.png`), 'og:image absolue');
ok(!/\{\{|<!--\/?if:/.test(html), 'aucune variable non résolue');
ok(!/<img(?![^>]*\balt=)/.test(html), 'images avec alt');
ok(!/https?:\/\/(?!(?:www\.)?w3\.org|schema\.org|jacopo-str\.github\.io|github\.com\/jacopo-str)/.test(html.replace(/<svg[\s\S]*?<\/svg>/g,'')), 'aucune ressource externe tierce');
ok([...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].every((m) => /rel="[^"]*noopener/.test(m[0])), 'liens externes avec noopener');
ok(!html.includes('mailto:') || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cfg.email), 'e-mail valide ou absent');

ok(![...html.matchAll(/<(li|p|h[1-6]|a|button)([^>]*)>\s*<\/\1>/g)].some((m) => !/aria-live/.test(m[2])), 'aucun élément vide (hors zone aria-live)');
ok(!/<h[23][^>]*>[^<]*<\/h[23]>\s*<\/(section|article)>/.test(html), 'aucun titre sans contenu');
ok([...html.matchAll(/<img [^>]*>/g)].every((m) => /width="\d+"/.test(m[0]) && /height="\d+"/.test(m[0]) && /alt="[^"]{10,}"/.test(m[0])), 'images : dimensions et alt descriptif');
ok([...html.matchAll(/<section[^>]*id="([^"]+)"/g)].every((m) => new RegExp('href="#' + m[1] + '"').test(html)), 'chaque section est atteignable par un lien');
// Confidentialité : tous les fichiers de dist
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dist);
const bad = [/\/home\/\w+/, /\bC:\\Users/, /gh[pous]_[A-Za-z0-9]{20,}/, /github_pat_/, /sk-[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /BEGIN [A-Z ]*PRIVATE KEY/, /api[_-]?key\s*[:=]/i, /\.env\b/, /ATLAS_NEXT_STEPS|SECURITY_AUDIT/, /Athena|atlas-bmax|tailscale\.net/i];
const text = files.filter((f) => !/\.(png|ico)$/.test(f));
for (const re of bad) ok(!text.some((f) => re.test(readFileSync(f, 'utf8'))), `confidentialité : motif ${re}`);
const emails = text.flatMap((f) => readFileSync(f, 'utf8').match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []);
ok(emails.every((e) => e === cfg.email), `e-mails dans le build : ${emails.length ? [...new Set(emails)].join(', ') : 'aucun'}`);
const kb = files.reduce((s, f) => s + statSync(f).size, 0) / 1024;
ok(kb < 600, `poids total ${kb.toFixed(0)} Ko`);
console.log(fails ? `\n${fails} échec(s)` : '\nTous les contrôles passent');
process.exit(fails ? 1 : 0);

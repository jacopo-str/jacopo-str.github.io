// Vérifications statiques sur dist/ : structure, liens, métadonnées FR/EN, absence de français dans l'anglais, confidentialité.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const base = cfg.siteUrl.replace(/\/$/, '');
let fails = 0;
const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) fails++; };

const pages = {
  fr: { file: 'index.html', url: `${base}/`, og: 'og.png', locale: 'fr_FR' },
  en: { file: 'en/index.html', url: `${base}/en/`, og: 'og-en.png', locale: 'en_US' },
};
const htmls = {};
for (const [lg, pg] of Object.entries(pages)) {
  const html = (htmls[lg] = readFileSync(join(dist, pg.file), 'utf8'));
  const dir = dirname(join(dist, pg.file));
  console.log(`\n== ${lg.toUpperCase()} (${pg.file})`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  ok(anchors.every((a) => ids.has(a)), `${anchors.length} ancres internes résolues`);
  const locals = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1].split('?')[0]).filter((f) => !f.startsWith('/'));
  ok(locals.every((f) => existsSync(join(dir, f))), `${locals.length} fichiers locaux présents`);
  ok(new RegExp(`<html lang="${lg}">`).test(html), `lang="${lg}"`);
  ok((html.match(/<h1[ >]/g) || []).length === 1, 'un seul <h1>');
  for (const p of ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card'])
    ok(new RegExp(`(name|property)="${p}"`).test(html), `meta ${p}`);
  ok(html.includes(`<link rel="canonical" href="${pg.url}">`), `canonical = ${pg.url}`);
  ok(html.includes(`hreflang="fr" href="${base}/"`) && html.includes(`hreflang="en" href="${base}/en/"`) && html.includes(`hreflang="x-default" href="${base}/"`), 'hreflang fr / en / x-default');
  ok(html.includes(`property="og:url" content="${pg.url}"`), 'og:url cohérente');
  ok(html.includes(`property="og:locale" content="${pg.locale}"`), `og:locale ${pg.locale}`);
  ok(html.includes(`content="${base}/${pg.og}"`) && existsSync(join(dist, pg.og)), `image de partage ${pg.og}`);
  ok(!/\{\{|<!--\/?if:/.test(html), 'aucune variable non résolue');
  ok(![...html.matchAll(/<(li|p|h[1-6]|a|button)([^>]*)>\s*<\/\1>/g)].some((m) => !/aria-live/.test(m[2])), 'aucun élément vide (hors zone aria-live)');
  ok(!/<h[23][^>]*>[^<]*<\/h[23]>\s*<\/(section|article)>/.test(html), 'aucun titre sans contenu');
  ok([...html.matchAll(/<img [^>]*>/g)].every((m) => /width="\d+"/.test(m[0]) && /height="\d+"/.test(m[0]) && /alt="[^"]{10,}"/.test(m[0])), 'images : dimensions et alt descriptif');
  ok([...html.matchAll(/<section[^>]*id="([^"]+)"/g)].every((m) => new RegExp('href="#' + m[1] + '"').test(html)), 'chaque section est atteignable par un lien');
  ok(!/https?:\/\/(?!(?:www\.)?w3\.org|schema\.org|jacopo-str\.github\.io|github\.com\/jacopo-str|static\.cloudflareinsights\.com\/beacon\.min\.js)/.test(html.replace(/<svg[\s\S]*?<\/svg>/g, '')), 'aucune ressource externe tierce (hors balise Cloudflare Web Analytics)');
  ok((html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length === 1 && /<script[^>]*beacon\.min\.js[^>]*><\/script>\s*<!-- End Cloudflare Web Analytics -->\s*<\/body>/.test(html), 'Cloudflare Web Analytics : une seule balise, juste avant </body>');
  ok([...html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].every((m) => /rel="[^"]*noopener/.test(m[0])), 'liens externes avec noopener');
  ok(/<ul class="lang"[^>]*aria-label=/.test(html) && html.includes('aria-current="true"'), 'sélecteur de langue accessible (aria-label, aria-current)');
}

console.log('\n== Parité FR / EN');
const sig = (h) => ({
  ids: [...h.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]).sort().join(','),
  img: (h.match(/<img /g) || []).length, sec: (h.match(/<section/g) || []).length,
  art: (h.match(/<article/g) || []).length, li: (h.match(/<li[ >]/g) || []).length, btn: (h.match(/<(a|button)[ >]/g) || []).length,
});
const sf = sig(htmls.fr), se = sig(htmls.en);
for (const k of Object.keys(sf)) ok(sf[k] === se[k], `même ${k} : ${k === 'ids' ? 'ids identiques' : sf[k] + ' = ' + se[k]}`);

console.log('\n== Aucun français résiduel dans la version anglaise');
const en = htmls.en.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
const attrs = [...en.matchAll(/\b(?:alt|aria-label|title|content)="([^"]*)"/g)].map((m) => m[1]).join(' \n ');
const text = en.replace(/<[^>]+>/g, ' ') + ' \n ' + attrs;
const allowed = /Université Côte d'Azur|Côte d'Azur|Licence 2|Jacopo|Open Food Facts|Français/g;
const cleaned = text.replace(allowed, ' ');
const accents = cleaned.match(/[àâäçéèêëîïôöûùüœÀÉÈÊ]/g) || [];
ok(accents.length === 0, `aucune lettre accentuée hors noms propres (${accents.length})`);
const fr = /\b(le|la|les|des|une|pour|avec|sur|mon|mes|dans|est|sont|ou|nous|vous|votre|je|j'ai|ma|ses|aux|du|au|qui|que)\b/gi;
const hits = [...new Set(cleaned.match(fr) || [])];
ok(hits.length === 0, `aucun mot français courant ${hits.join(',')}`);
const frTerms = ['Projets', 'Contact :', 'Copier', 'Envoyer', 'Haut de page', 'Aller au contenu', 'Voir mes', 'Prochain défi', 'Étudiant'];
ok(!frTerms.some((t) => en.includes(t)), 'aucun libellé de navigation/bouton français');
const frText = htmls.fr.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
ok(!/\b(Request|Computer science|Copy address|Send an email)\b/.test(frText), 'aucun anglais résiduel dans la version française');
ok(/jacopo\.devprojects@gmail\.com/.test(htmls.en) && /20,600/.test(htmls.en) && /1,500/.test(htmls.en) && /8&nbsp;GB/.test(htmls.en) && /i5-1135G7/.test(htmls.en) && /F515EA/.test(htmls.en), 'informations clés conservées (e-mail, chiffres ATLAS, machine)');

const oldEn = ['year 2', 'single 8', 'partial PC build', 'model development', 'good conditions', 'class="eyebrow">Work<', 'Control core', 'tools,<br>'];
ok(!oldEn.some((t) => htmls.en.includes(t)), 'formulations anglaises corrigées : aucune ancienne tournure');
ok(/Second-year Computer Science student/.test(htmls.en) && /on an 8&nbsp;GB laptop/.test(htmls.en) && /used desktop PC or individual components/.test(htmls.en) && /Running and experimenting with local AI models/.test(htmls.en), 'nouvelles formulations anglaises présentes');
ok(!/développer des modèles/.test(htmls.fr), 'FR : ne suggère pas de développer des modèles');

console.log('\n== Sitemap / robots');
const sm = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
ok(sm.includes(`<loc>${base}/</loc>`) && sm.includes(`<loc>${base}/en/</loc>`) && sm.includes('hreflang="en"'), 'sitemap FR + EN avec hreflang');
ok(readFileSync(join(dist, 'robots.txt'), 'utf8').includes('sitemap.xml'), 'robots.txt référence le sitemap');

console.log('\n== Confidentialité');
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dist);
const bad = [/\/home\/\w+/, /\bC:\\Users/, /gh[pous]_[A-Za-z0-9]{20,}/, /github_pat_/, /sk-[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /BEGIN [A-Z ]*PRIVATE KEY/, /api[_-]?key\s*[:=]/i, /\.env\b/, /ATLAS_NEXT_STEPS|SECURITY_AUDIT/, /Athena|atlas-bmax|tailscale\.net/i];
const textFiles = files.filter((f) => !/\.(png|ico|webp)$/.test(f));
for (const re of bad) ok(!textFiles.some((f) => re.test(readFileSync(f, 'utf8'))), `motif ${re}`);
const emails = textFiles.flatMap((f) => readFileSync(f, 'utf8').match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []);
ok(emails.every((e) => e === cfg.email), `e-mails dans le build : ${emails.length ? [...new Set(emails)].join(', ') : 'aucun'}`);
const kb = files.reduce((s, f) => s + statSync(f).size, 0) / 1024;
ok(kb < 700, `poids total ${kb.toFixed(0)} Ko`);
console.log(fails ? `\n${fails} échec(s)` : '\nTous les contrôles passent');
process.exit(fails ? 1 : 0);

// Tests de navigateur FR/EN (nécessite Playwright et Chromium).
// Usage : PLAYWRIGHT=/chemin/vers/playwright/index.mjs CHROMIUM=/usr/bin/chromium node scripts/e2e.mjs <url-du-site> [préfixe-captures]
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const U = process.argv[2].replace(/\/$/, ''); const shots = process.argv[3];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
let bad = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✘ ') + m); if (!c) bad++; };
const path = (p) => new URL(p.url()).pathname;
async function ctx(locale, extra = {}) { const c = await b.newContext({ locale, permissions: ['clipboard-read', 'clipboard-write'], ...extra }); c.errs = []; return c; }
async function page(c) { const p = await c.newPage(); p.on('pageerror', e => c.errs.push(String(e))); p.on('console', m => m.type() === 'error' && c.errs.push(m.text())); p.on('requestfailed', r => c.errs.push('req ' + r.url())); return p; }
const inView = (p, id) => p.evaluate((i) => { const r = document.getElementById(i).getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }, id);

console.log('— Détection de langue');
for (const [loc, exp] of [['fr-FR', '/'], ['fr-CA', '/'], ['en-US', '/en/'], ['en-GB', '/en/'], ['de-DE', '/en/'], ['es-ES', '/en/']]) {
  const c = await ctx(loc); const p = await page(c); await p.goto(U + '/', { waitUntil: 'networkidle' });
  ok(path(p) === exp, `navigateur ${loc} → ${path(p)} (attendu ${exp})`); await c.close();
}
console.log('— Choix manuel conservé');
{ const c = await ctx('en-US'); const p = await page(c); await p.goto(U + '/'); await p.waitForURL('**/en/');
  await p.click('.lang a[data-lang="fr"]'); await p.waitForURL(u => u.pathname === '/');
  ok(path(p) === '/' && await p.getAttribute('html', 'lang') === 'fr', 'EN → clic FR : page française');
  await p.reload({ waitUntil: 'networkidle' }); ok(path(p) === '/', 'rechargement : reste en français malgré navigateur anglais');
  const p2 = await c.newPage(); await p2.goto(U + '/'); await p2.waitForTimeout(500); ok(path(p2) === '/', 'nouvel onglet : choix FR conservé');
  await p2.click('.lang a[data-lang="en"]'); await p2.waitForURL('**/en/'); ok(path(p2) === '/en/', 'FR → clic EN : page anglaise');
  await p2.goto(U + '/'); await p2.waitForURL('**/en/'); ok(path(p2) === '/en/', 'retour à la racine : choix EN conservé'); await c.close(); }
{ const c = await ctx('fr-FR'); const p = await page(c); await p.goto(U + '/en/', { waitUntil: 'networkidle' });
  ok(path(p) === '/en/', 'accès direct /en/ avec navigateur français : pas de redirection forcée');
  ok(await p.getAttribute('html', 'lang') === 'en', 'lang="en"'); await p.reload({ waitUntil: 'networkidle' }); ok(path(p) === '/en/', 'rechargement /en/ OK'); await c.close(); }
console.log('— Conservation de la section');
{ const c = await ctx('fr-FR'); const p = await page(c); await p.goto(U + '/#machine', { waitUntil: 'networkidle' });
  await p.click('.lang a[data-lang="en"]'); await p.waitForURL('**/en/#machine'); await p.waitForTimeout(500);
  ok(p.url().endsWith('/en/#machine') && await inView(p, 'machine'), 'FR#machine → EN#machine, section visible');
  await p.click('.lang a[data-lang="fr"]'); await p.waitForURL(u => u.pathname === '/' && u.hash === '#machine'); await p.waitForTimeout(500);
  ok(p.url().endsWith('/#machine') && await inView(p, 'machine'), 'EN#machine → FR#machine, section visible');
  await p.goto(U + '/en/#contact'); await p.click('.lang a[data-lang="fr"]'); await p.waitForURL(u => u.pathname === '/'); await p.waitForTimeout(500);
  ok(p.url().endsWith('/#contact') && await inView(p, 'contact'), 'EN#contact → FR#contact, section visible'); await c.close(); }
console.log('— Clavier / accessibilité');
{ const c = await ctx('fr-FR'); const p = await page(c); await p.goto(U + '/', { waitUntil: 'networkidle' });
  await p.focus('.lang a[data-lang="en"]'); await p.keyboard.press('Enter'); await p.waitForURL('**/en/'); ok(path(p) === '/en/', 'Tab/Entrée sur EN fonctionne');
  const info = await p.evaluate(() => [...document.querySelectorAll('.lang a')].map(a => [a.textContent, a.lang, a.getAttribute('aria-label'), a.getAttribute('aria-current')]));
  ok(JSON.stringify(info) === JSON.stringify([['FR', 'fr', 'Français', null], ['EN', 'en', 'English', 'true']]), 'sélecteur : langue, aria-label, aria-current ' + JSON.stringify(info)); await c.close(); }

for (const [lg, url, E] of [['EN', '/en/', { burgerClose: 'Close menu', copied: 'Address copied ✓', subj: /subject=Hardware%20support/, zoom: 'Enlarge: ', lbClose: 'Close image' }],
                            ['FR', '/', { burgerClose: 'Fermer le menu', copied: 'Adresse copiée ✓', subj: /subject=Soutien/, zoom: 'Agrandir : ', lbClose: "Fermer l'image" }]]) {
  console.log(`— Rendu, contenu et interactions ${lg}`);
  for (const [n, vp, mob] of [['mobile 375', { width: 375, height: 812 }, true], ['tablette 768', { width: 768, height: 1024 }, false], ['desktop 1440', { width: 1440, height: 900 }, false]]) {
    const c = await ctx(lg === 'EN' ? 'en-US' : 'fr-FR', { viewport: vp, isMobile: mob, hasTouch: mob }); const p = await page(c); await p.goto(U + url, { waitUntil: 'networkidle' });
    for (const i of await p.$$('.shots img')) await i.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
    const m = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1) && !e.closest('.sr-only') && !e.closest('dialog'); }).map(e => e.tagName + '.' + e.className).slice(0, 5);
      const clipped = [...document.querySelectorAll('.btn,.chips li,.status,.tag,.lang a,.menu a,.proj-top h3')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30));
      return { sw: document.documentElement.scrollWidth, vw, wide, clipped, broken: [...document.querySelectorAll('.shots img')].filter(i => !i.naturalWidth).length, nimg: document.querySelectorAll('.shots img').length, langSel: !!document.querySelector('.lang a').offsetParent };
    });
    ok(m.sw <= m.vw, `${lg} ${n} : pas de défilement horizontal (${m.sw}/${m.vw})`); ok(m.wide.length === 0, `${lg} ${n} : aucun élément qui déborde ${m.wide}`);
    ok(m.clipped.length === 0, `${lg} ${n} : aucun texte tronqué ${m.clipped}`); ok(m.broken === 0, `${lg} ${n} : ${m.nimg} captures chargées`); ok(m.langSel, `${lg} ${n} : sélecteur FR/EN visible sans ouvrir le menu`);
    if (mob) { await p.click('.burger'); ok(await p.getAttribute('.burger', 'aria-label') === E.burgerClose, `${lg} burger : "${E.burgerClose}"`); await p.click('#menu a[href="#contact"]'); }
    await p.click('#copy-mail'); await p.waitForTimeout(400);
    ok(await p.textContent('#copy-mail') === E.copied, `${lg} ${n} : retour de copie "${E.copied}"`); ok(await p.evaluate(() => navigator.clipboard.readText()) === 'jacopo.devprojects@gmail.com', `${lg} ${n} : adresse copiée`);
    ok(E.subj.test(await p.getAttribute('a.btn.primary[href^="mailto"]', 'href')), `${lg} ${n} : mailto avec objet`);
    const z = (await p.$$('.zoom'))[0]; await z.scrollIntoViewIfNeeded(); ok((await z.getAttribute('aria-label')).startsWith(E.zoom), `${lg} ${n} : zoom "${E.zoom}"`);
    await z.click(); ok(await p.evaluate((x) => document.querySelector('dialog').open && document.querySelector('.lb-close').getAttribute('aria-label') === x, E.lbClose), `${lg} ${n} : lightbox`); await p.keyboard.press('Escape');
    ok(c.errs.length === 0, `${lg} ${n} : aucune erreur JS/réseau ${c.errs}`);
    if (shots && lg === 'EN') { await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'))); await p.screenshot({ path: `${shots}-${mob ? 'mob' : n.split(' ')[0]}.png`, fullPage: true }); }
    await c.close();
  }
}
console.log('— Cartes de projets réellement affichées (défilement réel)');
const EXPECTED = ['ATLAS', 'Investors', 'SILLON', 'MealForge', 'CatchMe', 'Dress-Me', 'gesture-window-control', 'sql-exercism'];
for (const [lg, url] of [['FR', '/'], ['EN', '/en/']]) for (const [n, vp, mob] of [['mobile', { width: 375, height: 812 }, true], ['desktop', { width: 1440, height: 900 }, false]]) {
  const c = await ctx(lg === 'EN' ? 'en-US' : 'fr-FR', { viewport: vp, isMobile: mob, hasTouch: mob }); const p = await page(c); await p.goto(U + url, { waitUntil: 'networkidle' });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 250) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(60); }
  await p.waitForTimeout(900);
  const cards = await p.evaluate(() => [...document.querySelectorAll('#projets article.card')].map((a) => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { name: (a.querySelector('h3') || {}).textContent, w: Math.round(r.width), h: Math.round(r.height), op: cs.opacity, vis: cs.visibility, disp: cs.display, text: a.innerText.length }; }));
  const names = cards.map((x) => x.name);
  ok(JSON.stringify(names).includes('ATLAS') && EXPECTED.slice(1).every((e) => names.includes(e)) && cards.length === 8, `${lg} ${n} : 8 cartes présentes (${cards.length})`);
  ok(cards.every((x) => x.op === '1' && x.vis === 'visible' && x.disp !== 'none' && x.w > 200 && x.h > 120 && x.text > 60), `${lg} ${n} : toutes visibles, opaques et non vides ` + JSON.stringify(cards.filter((x) => !(x.op === '1' && x.w > 200 && x.h > 120 && x.text > 60))));
  const stuck = await p.evaluate(() => document.querySelectorAll('.reveal:not(.in)').length); ok(stuck === 0, `${lg} ${n} : aucun élément resté masqué (${stuck})`);
  await c.close();
}
console.log('— Fichiers de partage et SEO');
for (const f of ['og.png', 'og-en.png', 'sitemap.xml', 'robots.txt']) { const r = await fetch(`${U}/${f}`); ok(r.ok, `${f} → ${r.status}`); }
await b.close(); console.log(bad ? `\n${bad} échec(s)` : '\nTous les tests de navigateur passent'); process.exit(bad ? 1 : 0);

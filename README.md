# Portfolio — Jacopo

Site statique bilingue (HTML/CSS/JS, sans dépendance) déployé sur GitHub Pages.

- **Français** : `src/index.html` → https://jacopo-str.github.io/
- **English** : `src/en/index.html` → https://jacopo-str.github.io/en/
- `site.config.json` : e-mail, GitHub, LinkedIn, URL du site (un champ vide masque le bouton correspondant).
- `src/main.js` : menu, copie de l'adresse, agrandissement des captures, sélecteur de langue. Les textes dynamiques FR/EN sont dans le dictionnaire `T`.
- `npm test` : build dans `dist/` + contrôles statiques (liens, SEO FR/EN, hreflang, parité FR/EN, absence de français dans l'anglais, confidentialité).
- `scripts/e2e.mjs` : tests de navigateur (Playwright) : détection de langue, choix conservé, section conservée, mobile/desktop, copie, zoom.
  `PLAYWRIGHT=<chemin>/playwright/index.mjs node scripts/e2e.mjs http://localhost:4173`
- `npm run serve` : aperçu local sur http://localhost:4173
- Déploiement : GitHub Actions (`.github/workflows/pages.yml`) à chaque push sur `main`.

## Langues
Toute modification de contenu se fait dans **les deux** fichiers (mêmes `id`, mêmes sections : `npm test` vérifie la parité).
À la première visite de la racine, un navigateur non francophone est redirigé vers `/en/` ; le choix fait avec le sélecteur FR/EN est mémorisé (localStorage) et prime. `/en/` n'est jamais redirigé.

Aucun code des dépôts privés n'est inclus.

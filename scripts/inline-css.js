/*
 * Étape de build Netlify (voir netlify.toml).
 * Intègre style.css directement dans index.html au moment du déploiement :
 * le navigateur n'a plus à attendre une 2e requête avant d'afficher la page.
 *
 * Le dépôt garde style.css comme seule source à modifier : ce script ne
 * change que la copie déployée sur Netlify, jamais les fichiers du dépôt.
 * En local ou sur GitHub Pages, index.html charge style.css normalement.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'style.css');

const LINK = '<link rel="stylesheet" href="style.css">';

const html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes(LINK)) {
    console.error(`[inline-css] Balise introuvable dans index.html : ${LINK}`);
    process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')       // commentaires
    .replace(/\s+/g, ' ')                    // espaces multiples
    .replace(/\s*([{};:,>])\s*/g, '$1')      // espaces autour de la ponctuation
    .replace(/;}/g, '}')
    .trim();

if (css.includes('</style')) {
    console.error('[inline-css] style.css contient « </style », intégration annulée.');
    process.exit(1);
}

fs.writeFileSync(htmlPath, html.replace(LINK, `<style>${css}</style>`));
console.log(`[inline-css] style.css intégré dans index.html (${css.length} caractères).`);

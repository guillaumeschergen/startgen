/*
 * Build Netlify (voir netlify.toml) : prépare le dossier dist/ publié.
 *
 * 1. Ne copie QUE les fichiers utiles au site (liste ci-dessous). Les images
 *    d'origine (plus de 30 Mo, inutilisées par la page), les scripts et les notes
 *    internes ne sont donc plus téléchargeables : personne ne peut épuiser le quota
 *    de bande passante Netlify en les téléchargeant en boucle.
 * 2. Intègre style.css dans index.html (une requête bloquante en moins).
 *
 * Le dépôt n'est pas modifié. Pour publier un nouveau fichier, l'ajouter à PUBLISH.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');

const PUBLISH = [
    'index.html',
    'style.css',
    'img',
    'fonts',
    'favicon-32.png',
    'apple-touch-icon.png',
    'robots.txt',
    'sitemap.xml',
    'google5a49fdac82acf81e.html',   // vérification Google Search Console : ne pas retirer
    '_headers',
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of PUBLISH) {
    const src = path.join(root, item);
    if (!fs.existsSync(src)) {
        console.error(`[build] Fichier à publier introuvable : ${item}`);
        process.exit(1);
    }
    fs.cpSync(src, path.join(out, item), { recursive: true });
}

// --- Intégration du CSS ---
const LINK = '<link rel="stylesheet" href="style.css">';
const htmlPath = path.join(out, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes(LINK)) {
    console.error(`[build] Balise introuvable dans index.html : ${LINK}`);
    process.exit(1);
}
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
if (css.includes('</style')) {
    console.error('[build] style.css contient « </style », intégration annulée.');
    process.exit(1);
}
fs.writeFileSync(htmlPath, html.replace(LINK, `<style>${css}</style>`));

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`[build] dist/ prêt : ${count(out)} fichiers publiés, CSS intégré (${css.length} caractères).`);

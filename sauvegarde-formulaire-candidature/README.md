# Sauvegarde du formulaire de candidature StartGen LLN

Le formulaire « Rejoins l'équipe » (section `#candidature`) a été retiré du site le 20/11/2026
par le commit `5f393f4` sur `main`.

Cette sauvegarde vit **uniquement** sur la branche `sauvegarde/formulaire-candidature`
(tag `sauvegarde-formulaire-candidature-2026-11-20`). Elle n'est pas sur `main`,
donc elle n'est jamais publiée avec le site.

## Contenu

| Dossier | Ce qu'il contient |
|---|---|
| `version-2026-11-20/` | Version exacte retirée du site (celle du commit `cc6e295`) |
| `version-publiee-2026-11-02/` | Version d'origine publiée avant la refonte (commit `11df19d`), pour référence |

Chaque dossier contient :

- `candidature.html` : la section complète, avec les champs (nom, prénom, e-mail, département, motivation, CV),
  la configuration d'envoi FormSubmit (`action="https://formsubmit.co/startgenlln@gmail.com"`,
  `enctype="multipart/form-data"`, champs cachés `_captcha`, `_subject`, `_template`, piège anti-spam `_honey`)
  et la zone de dépôt du CV ;
- `candidature.css` : les styles propres au formulaire (dépôt du CV, choix du département, logo) ;
- `candidature.js` : le script du dépôt de CV (affichage du fichier, contrôle PDF et 5 Mo max.) ;
- `icones-svg.html` (version 2026-11-20) : les icônes SVG utilisées seulement par le formulaire.

## Restaurer le formulaire

### Méthode 1 (la plus simple) : annuler le commit de retrait

Depuis une copie à jour du dépôt :

```bash
git switch main
git pull
git revert 5f393f4
git push
```

Le formulaire, son script, ses styles et les liens « Postule pour notre équipe » reviennent,
sans toucher aux modifications faites après le retrait.
En cas de conflit (si la page a beaucoup changé entre-temps), utiliser la méthode 2.

### Méthode 2 : recoller les morceaux à la main

1. Récupérer les fichiers de sauvegarde :
   `git checkout sauvegarde-formulaire-candidature-2026-11-20 -- sauvegarde-formulaire-candidature/`
   (ne pas les committer sur `main` : supprimer le dossier une fois les copies faites).
2. Dans `index.html`, remplacer le commentaire `<!-- FORMULAIRE DE CANDIDATURE : retiré le 20/11/2026 ... -->`
   par le contenu de `version-2026-11-20/candidature.html`.
3. Coller le contenu de `version-2026-11-20/icones-svg.html` dans le `<svg style="display:none">` en haut du `<body>`.
4. Ajouter le contenu de `version-2026-11-20/candidature.css` à la fin de `style.css`.
5. Coller le contenu de `version-2026-11-20/candidature.js` dans le `<script>` en bas de page
   (ou dans une nouvelle balise `<script>` juste avant `</body>`).
6. Remettre des liens vers `#candidature` là où c'est utile (bouton du hero, menu, pied de page).
7. Tester : choisir un département, un CV PDF de moins de 5 Mo, puis envoyer une candidature de test.

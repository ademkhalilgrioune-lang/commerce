# Déploiement — version optimisée

## Ce qui est déjà fait dans ce zip
- ✅ `server/node_modules` déjà installé, **production uniquement** (pas de nodemon), `sharp` inclus
- ✅ Images produits déjà compressées en `.webp` (3,2 Mo → 1,6 Mo)
- ✅ `client/dist` déjà buildé (bundle découpé vendor/app, sourcemaps désactivées)
- ✅ `.gitignore` en place partout
- ✅ Compression gzip, cache long terme sur `/uploads`, fuite de fichier corrigée

## ⚠️ Étape obligatoire avant de lancer
1. Renseigne `server/.env` à partir de `server/.env.example` (DB, JWT_SECRET, Stripe, Redis, SMTP...)
2. Renseigne `client/.env` à partir de `client/.env.example` (URL de l'API) — puis si tu changes cette valeur, relance `npm run build` dans `client/`
3. Exécute `database/schema.sql` sur ta base MySQL si ce n'est pas déjà fait
4. Applique `server/scripts/update-photos-webp.sql` sur ta base pour que les produits pointent vers les nouvelles images `.webp`

## ⚠️ Important : node_modules du serveur est spécifique à CETTE machine
`sharp` et `bcrypt` contiennent des binaires natifs compilés pour **Linux x64**.
- Si ton hébergeur est aussi Linux x64 (la grande majorité des VPS/Docker/Render/Railway) → ça fonctionne tel quel.
- Si ton hébergeur est différent (Windows, ARM/Mac M1-M2 en local, Alpine musl...) →
  supprime `server/node_modules` et relance `npm install --omit=dev` **sur cette machine-là**.
  En cas de doute, c'est le choix le plus sûr.

## Lancer le serveur
```
cd server
node server.js
```
Le client (`client/dist`) est un site statique : sers-le avec Nginx, Vercel, Netlify, ou
`npm install -g serve && serve -s dist` pour tester rapidement en local.

## Prochain upload de produit
Rien à faire : chaque nouvelle photo uploadée passe automatiquement par la compression
sharp → webp (route `POST/PUT /api/produits`). Le script `optimiser-images-existantes.js`
n'est utile que si tu importes des images en masse par un autre moyen que l'interface admin.

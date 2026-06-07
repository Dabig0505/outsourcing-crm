# Outsourcing Support — CRM

Application de gestion des interventions techniques (techniciens, clients, contrats récurrents, fiches d'intervention).

**Stack :** React + Vite · Tailwind CSS · Firebase (Firestore + Storage) · déploiement Vercel (plus tard).

---

## Lancer l'application en local

```bash
npm install      # une seule fois
npm run dev      # démarre le serveur de développement
```

Ouvrez ensuite l'adresse affichée (en général http://localhost:5173).

Autres commandes :

```bash
npm run build    # construit la version de production (dossier dist/)
npm run preview  # prévisualise la version de production
```

---

## ⚙️ Configuration Firebase (à faire AVANT la Phase 2)

L'application a besoin d'un projet Firebase pour stocker les données. Voici les étapes,
à faire une seule fois. **On reste 100 % sur le plan gratuit (Spark)** — aucune carte bancaire.

### 1. Créer le projet

1. Allez sur https://console.firebase.google.com/
2. Cliquez **« Ajouter un projet »** → nommez-le par ex. `outsourcing-crm`.
3. Désactivez Google Analytics (inutile ici) → **Créer le projet**.

### 2. Créer la base de données Firestore

1. Menu de gauche → **Build > Firestore Database** → **Créer une base de données**.
2. Choisissez **« Démarrer en mode production »**.
3. Région : choisissez **`eur3 (europe-west)`** (proche du Maroc).
4. Cliquez **Activer**.

### 3. Activer le stockage des photos (Storage)

1. Menu de gauche → **Build > Storage** → **Commencer**.
2. Acceptez les règles par défaut → choisissez la même région → **OK**.

### 4. Récupérer la configuration de l'application web

1. Dans **Paramètres du projet** (la roue dentée ⚙️ en haut à gauche) → onglet **Général**.
2. Section **« Vos applications »** → cliquez l'icône **`</>`** (Web).
3. Surnom de l'app : `outsourcing-crm-web` → **Enregistrer l'application** (ne cochez PAS Hosting).
4. Firebase affiche un bloc `const firebaseConfig = { ... }`. **Gardez cet écran ouvert**, on en a besoin juste après.

### 5. Renseigner les clés dans le projet

1. À la racine du projet, copiez le fichier `.env.example` et renommez la copie en **`.env`**.
2. Recopiez chaque valeur du bloc `firebaseConfig` dans le `.env`, en face de la bonne variable.

   Exemple de correspondance :

   | Bloc Firebase        | Variable dans `.env`                  |
   | -------------------- | ------------------------------------- |
   | `apiKey`             | `VITE_FIREBASE_API_KEY`               |
   | `authDomain`         | `VITE_FIREBASE_AUTH_DOMAIN`           |
   | `projectId`          | `VITE_FIREBASE_PROJECT_ID`            |
   | `storageBucket`      | `VITE_FIREBASE_STORAGE_BUCKET`        |
   | `messagingSenderId`  | `VITE_FIREBASE_MESSAGING_SENDER_ID`   |
   | `appId`              | `VITE_FIREBASE_APP_ID`                |

> ⚠️ Le fichier `.env` contient vos clés : il est volontairement ignoré par git
> et ne sera jamais publié. Ne le partagez pas.

Une fois le `.env` rempli, prévenez-moi : on enchaîne sur la **Phase 2 (connexion par PIN)**.

---

## 🔒 Sécurité (App Check)

L'app n'utilise pas l'authentification Firebase (connexion maison par PIN). Pour
empêcher qu'un inconnu accède à la base avec la clé API, on active **App Check** :
Firebase vérifie un jeton (reCAPTCHA v3) prouvant que la requête vient bien de
votre application. **100 % gratuit.**

> 🟢 Important : tant que la clé reCAPTCHA n'est pas renseignée, App Check reste
> inactif et l'app continue de fonctionner normalement. Suivez les étapes dans
> l'ordre — **n'activez l'« enforcement » et les règles strictes qu'à la fin**,
> une fois que tout est vérifié (sinon risque de blocage temporaire).

### Étape 1 — Créer une clé reCAPTCHA v3
1. Allez sur https://www.google.com/recaptcha/admin/create
2. **Libellé** : `outsourcing-crm`. **Type** : reCAPTCHA **v3**.
3. **Domaines** : ajoutez `localhost` (pour le développement) et plus tard votre
   domaine Vercel (ex. `mon-app.vercel.app`).
4. Validez → vous obtenez une **Clé de site** et une **Clé secrète**.

### Étape 2 — Enregistrer App Check dans Firebase
1. Console Firebase → menu **Build > App Check**.
2. Onglet **Apps** → sélectionnez votre application web → **Enregistrer**.
3. Fournisseur : **reCAPTCHA v3** → collez la **Clé secrète** de l'étape 1 → Enregistrer.

### Étape 3 — Renseigner la clé de site dans le projet
Dans votre fichier `.env` :
```
VITE_RECAPTCHA_SITE_KEY=la_cle_de_site_de_l_etape_1
```
Relancez `npm run dev` et utilisez l'app (connectez-vous, naviguez) pour générer
des requêtes.

> Si l'app ne se connecte plus en local : ajoutez bien `localhost` aux domaines de
> la clé reCAPTCHA (étape 1), ou utilisez un **jeton de debug** (voir plus bas).

### Étape 4 — Vérifier puis verrouiller (à faire en dernier)
1. Console Firebase → **App Check > APIs > Cloud Firestore** : vérifiez que des
   requêtes **« vérifiées »** apparaissent (preuve que les jetons fonctionnent).
2. Assurez-vous que les règles Firestore sont bien celles du fichier
   [`firestore.rules`](firestore.rules) (règles passantes — la protection vient
   d'App Check, pas des règles, car l'app n'utilise pas Firebase Auth).
   Console → **Firestore Database > Règles** → coller → **Publier** si besoin.
3. Toujours dans **App Check > APIs > Cloud Firestore** → cliquez **Appliquer
   (Enforce)**. À partir de là, seuls les accès via votre app sont autorisés.

> ❗ N'utilisez PAS `request.app != null` dans les règles : selon le transport du
> SDK, cela bloque des requêtes pourtant légitimes. La méthode fiable est
> l'**enforcement** côté API (bouton « Appliquer » ci-dessus).

> ⚠️ Après cette étape, les **scripts de développement** (`scripts/…`) ne
> fonctionneront plus (ils n'ont pas de jeton App Check) — c'est normal.
> En cas de blocage, remettez temporairement la règle `allow read, write: if true;`
> dans la console le temps de corriger.

### (Optionnel) Jeton de debug en local
Si reCAPTCHA pose souci en local : mettez `VITE_APPCHECK_DEBUG_TOKEN=true` dans
`.env`, lancez l'app, copiez le **jeton de debug** affiché dans la console du
navigateur, et enregistrez-le dans Firebase (**App Check > Apps > … > Gérer les
jetons de debug**). Reportez ensuite ce jeton dans `VITE_APPCHECK_DEBUG_TOKEN`.

### Déploiement Vercel
Pensez à recopier **toutes** les variables `VITE_*` (Firebase + `VITE_RECAPTCHA_SITE_KEY`)
dans les *Environment Variables* de Vercel, et à ajouter votre domaine Vercel aux
domaines de la clé reCAPTCHA (étape 1).

---

## Structure du projet

```
src/
├── components/        composants réutilisables (boutons, formulaires…)
├── context/           état global (technicien connecté, rôle…)
├── firebase/
│   ├── config.js      initialisation Firebase (lit le .env)
│   └── collections.js noms des collections Firestore
├── hooks/             logique réutilisable
├── pages/
│   ├── admin/         écrans administrateur (bureau)
│   └── technician/    écrans technicien (mobile)
└── utils/             fonctions utilitaires (hachage PIN, dates, PDF…)
```

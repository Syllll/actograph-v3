# Comptes et licences ActoGraph v3 — vue d'ensemble

Document à destination des humains (produit, support, développement). Il décrit la
réalité observée dans la codebase du monorepo `app-et-site` : comment un compte est
créé, comment il se connecte, et comment une licence ouvre l'accès à l'application.

Ce document n'extrapole pas : tout ce qui est décrit ici se vérifie dans le code.
Lorsqu'une zone n'est pas implémentée ou reste à connecter, c'est dit explicitement.

---

## 1. Périmètre des deux projets

Le dépôt `app-et-site` regroupe deux produits distincts qui collaborent mais ne
partagent pas la même base de code :

| Projet | Rôle | Stack | Base de comptes |
|---|---|---|---|
| `actograph-v3` | Application desktop (Electron), web et mobile (Capacitor) d'analyse comportementale | NestJS + TypeORM + Quasar/Vue 3, SQLite (desktop) ou PostgreSQL (web) | Comptes locaux à l'instance, JWT |
| `actograph-site` | Site vitrine, espace client et administration ; serveur de licences et de cloud pour les clients | NestJS 11 + MikroORM 7 + PostgreSQL, Quasar 2 SSR | Comptes centralisés (legacy v1 + v3) |

Le site est l'autorité pour les licences : il émet les clés, les stocke, et répond
aux requêtes de validation envoyées par l'application desktop. L'application, elle,
détient une licence **locale** (fichier `access.json`) qu'elle vérifie auprès du
site à chaque démarrage quand internet est disponible.

### Autorité de licence

- Le site expose `POST /public/api/license` (controller `LicensePublicController`)
  protégé par un mot de passe partagé (`LEGACY_LICENSE_PASSWORD`). L'app desktop
  appelle cette route avec la clé saisie par l'utilisateur pour la valider et
  récupérer ses métadonnées (type, dates, propriétaire).
- L'app desktop stocke ensuite la licence dans son propre schéma local
  (`licenses`, entité `License` du module `security`) et l'active (`enabled=true`).
  Une seule licence est active à la fois par utilisateur local.

---

## 2. Deux systèmes de comptes coexistent (site)

Le site gère deux populations d'utilisateurs avec deux historiques différents.
C'est la source principale de complexité.

### 2.1 Comptes legacy v1 (FOSUser, importés)

Issus de l'ancien site Symfony. Ils proviennent du script ETL
`../../actograph-site/api/scripts/etl-legacy.ts` qui migre MySQL → PostgreSQL.

Caractéristiques (entité `User` de `actograph-site`) :

- `username` / `usernameCanonical` : identifiant historique libre (ex. `mlemoal`)
- `email` / `emailCanonical`
- `legacyPassword` : hash **SHA-512 + salt** (FOSUserBundle)
- `legacySalt` : sel du hash legacy
- `enabled` : compte actif ou non
- `userJwt` : relation optionnelle vers un compte web moderne (voir 2.2)

Tant que le compte n'a jamais été migré, il n'a pas de `userJwt` lié.

### 2.2 Comptes web v3 (`user_jwt`)

Comptes modernes, à identifiant **email**, avec mot de passe **bcrypt**. Ils sont
créés :

- à l'achat d'une licence (Pennylane) ;
- au téléchargement étudiant (`/get`) ;
- par l'administration ;
- à la première connexion réussie d'un compte legacy (migration on login).

Un `User` legacy peut recevoir un `userJwt` lié : on parle alors de **compte
migré**. La règle est stricte (cf. `LegacyLoginService` et `LegacyAuthService`) :

> Dès qu'un `userJwt` est lié à un `User`, le mot de passe bcrypt de ce `userJwt`
> est la seule source de vérité. Le hash SHA-512 legacy n'est plus accepté, même
> via un ancien alias (email ou username v1). On évite ainsi la création d'un
> second `user_jwt`.

### 2.3 Comptes locaux desktop (application `actograph-v3`)

Indépendants des comptes du site. En mode Electron, l'API crée au démarrage un
utilisateur local `_pc-{osUser}` (où `osUser` est le nom de session OS), avec un
mot de passe dérivé déterministe (`deriveElectronLocalPassword`). L'application
front se connecte automatiquement avec ce compte local au lancement
(`../front/src/pages/gateway/Loading.vue`) ; l'utilisateur ne saisit rien.

Ce compte local porte la licence activée sur cette machine ; il n'est pas
transféré sur le site.

### 2.4 Comptes mobiles (application mobile Capacitor)

L'app mobile ne gère pas de compte local. Elle se connecte directement au site
via le contrat legacy `POST /api/auth-tokens` (voir 4.3) avec email + mot de passe
du compte site (legacy ou v3). Les credentials sont conservés côté natif
(`Preferences` + `SecureStoragePlugin` pour le mot de passe) pour permettre la
reconnexion automatique.

---

## 3. Catalogue de licences et produits

Source de vérité : `../../actograph-site/api/src/core/store/store-products.ts`.

Trois produits sont vendus via Pennylane (devis → facture) :

| Slug | Type de licence | Prix HT | Durée | Renouvelable | Particularités |
|---|---|---|---|---|---|
| `support` | `Support` | 200 € | 365 j | oui | Abonnement annuel pro |
| `ultimate` | `Ultimate` | 950 € | 1460 j (4 ans) | non | Licence permanente, `hasTimeLimit=false` |
| `ultimate-education` | `Ultimate` | 650 € | 1460 j | non | Tarif éducation, mêmes garanties que Ultimate |

En plus, le devis **entreprise** (`enterprise`) est un `Ultimate` multi-postes :
- minimum 10 sièges, maximum 500 ;
- remise par paliers (15 % à 10, 30 % à 30, 45 % à 50 sièges) ;
- la licence émise est de type `ultimate`, avec N sièges (`LicenseSeat`).

L'enum côté app desktop (`../api/src/core/security/entities/license.entity.ts`) connaît trois
types : `Student`, `Ultimate`, `Support`. Le type `Student` n'est pas un produit
payant : il correspond à l'accès gratuit étudiant (voir 5.1).

### Entité `License` (site, `../../actograph-site/api/src/core/legacy/entities/license.entity.ts`)

Champ notable : `key` (hash SHA-512 + salt fixe hérité), `seedHex` (graine pour
re-dériver la clé en clair), `generatorVersion`, `owner` (relation vers `User`),
`template` (modèle génératif), `isValid`, `autoAccess`, `renewable`, `hasTimeLimit`,
`dateMode` (`Duration` ou `Date`), `startDate`, `endDate`, `duration`.

La clé n'est **jamais** stockée en clair. La révélation admin ou propriétaire
re-dérive la clé depuis `seedHex` via le binaire natif `key_generator` (C++) et
vérifie l'intégrité contre le hash stocké (`LicenseService.revealPlainKey`).

---

## 4. Les quatre flux de connexion

### 4.1 Connexion web (site, `POST /auth/login`)

Implémentée par `LegacyLoginService.login`. Étapes :

1. **Chemin direct** : on cherche un `user_jwt` par `username` exact et on
   valide en bcrypt. Si OK, on retourne un token JWT.
2. Sinon, on résout le `User` par email, username, ou variantes canonical.
3. Si le `User` a déjà un `userJwt` lié (compte migré) : on valide en bcrypt sur
   ce `userJwt` (alias email/username v1 acceptés). Pas de retour au SHA-512.
4. Sinon, on valide le hash legacy SHA-512 + salt (`LegacyHashService.isPasswordValid`).
5. Si succès legacy : **migration on login** — création d'un `user_jwt` bcrypt
   lié au `User` existant, dans une transaction avec verrou pessimiste. Le hash
   legacy est conservé pour l'historique mais n'est plus autoritaire.

L'identifiant de connexion est **libre** : email ou username v1. Après le premier
login réussi, `userJwt.username` est aligné sur les alias du compte, les deux
formes restent valides (cf. `../../actograph-site/docs/auth-comptes.md`).

### 4.2 Connexion desktop (application Electron)

L'utilisateur ne saisit pas d'identifiant. Au démarrage :

1. L'API crée/sélectionne l'utilisateur local `_pc-{osUser}` (cf. 2.3).
2. Le front `../front/src/pages/gateway/Loading.vue` attend que l'API réponde à `say-hi`, puis
   appelle `auth.methods.login(localUserName, deriveElectronLocalPassword(...))`.
3. Le front appelle `security/electron/determine-access` pour savoir quel accès
   activer (voir 5.2).

Il n'y a pas de « mot de passe desktop » à connaître ; la sécurité repose sur la
licence (clé) et non sur le compte local.

### 4.3 Connexion mobile et clients desktop v1 (legacy `POST /api/auth-tokens`)

Contrat historique conservé pour la compatibilité (clients Qt v1 et app mobile
Capacitor). Implémenté par `LegacyAuthService.authenticate` :

1. Résout le `User` par `userJwt.username`, puis par email/username.
2. Si le `User` a un `userJwt` lié : valide en bcrypt sur ce `userJwt`. Sinon,
   fallback SHA-512 + salt (compte non migré).
3. Comptes désactivés (`enabled=false`) ou supprimés : rejetés.
4. En cas de succès, `ensureCloudIdentity` attribue un `username` persistant
   `v3-{uuid}` aux comptes web-only (pour préserver les noms importés et donner
   un espace de noms isolé aux comptes purement web).
5. Crée un `AuthToken` (valeur aléatoire 50 bytes base64), valide 6 heures,
   renvoyé dans le header `X-Auth-Token`.

### 4.4 Réinitialisation de mot de passe

Côté site et app, c'est le même tuyau `auth-jwt` : `POST /auth-jwt/password-forgot`
génère un token et envoie un email, `POST /auth-jwt/recuperation` (site) ou
`reset-password` applique le nouveau mot de passe. La page `../../actograph-site/front/src/pages/auth/ResetPassword.vue`
est partagée entre l'achat, le téléchargement étudiant et le « mot de passe
oublié ».

---

## 5. Les flux de création de compte et d'activation

### 5.1 Téléchargement étudiant (`/get`)

Page `../../actograph-site/front/src/pages/public/Get.vue` → `POST /billing/student-downloads`
(`StudentDownloadService.create`).

Pour chaque soumission :

1. Une ligne `student_download` est **toujours** journalisée (admin
   Téléchargements étudiants). Le hash IP (SHA-256 + secret) est stocké.
2. Si aucun `User` n'existe pour cet email : on crée `User` + `user_jwt`
   (username = email), et on émet un **token de définition de mot de passe**
   envoyé par email (`sendPasswordResetEmail` avec `purpose: 'setup'`).
3. Si le `User` existe déjà (v1, achat, second téléchargement) : on journalise
   seulement, **pas de second compte, pas de mail de bienvenue**.

Réponse : `{ id, downloadUrl, passwordSetup }` où `passwordSetup` vaut
`sent` | `already_registered` | `send_failed`.

Points clés :
- Aucune licence payante, aucun passage Pennylane.
- L'échec SMTP ne bloque pas le téléchargement (`send_failed`). L'utilisateur
  utilise alors « Mot de passe oublié ».
- Un second passage n'envoie pas de second mail (`already_registered`).
- Le reçu s'affiche sur `/get` (statut `passwordSetup`).

### 5.2 Activation desktop — accès étudiant vs accès licence

Une fois l'utilisateur local connecté (cf. 4.2), le front interroge
`security/electron/determine-access` qui lit le fichier local `access.json`
dans le dossier de config de l'app :

- **Pas de fichier** → `nextStep: 'choose-access-type'` → page
  `../front/src/pages/gateway/ChooseVersion.vue`. L'utilisateur choisit :
  - *Étudiant* → `POST /security/electron/activate-student` écrit
    `access.json = { type: 'student' }`. Accès gratuit, pas de clé.
  - *Pro* → page `../front/src/pages/gateway/ActivatePro.vue` : saisie d'une clé au format
    `xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx`. `POST /security/electron/activate-license`
    valide la clé (checksum + vérification serveur) et écrit
    `access.json = { type: 'license', key }`.
- **Fichier `student`** → `nextStep: 'use-student-access'` → l'app continue en
  mode étudiant (`useLicense.setStudentAccess`).
- **Fichier `license`** → `nextStep: 'use-license-access'` → l'API vérifie la
  clé auprès du site (`checkKeyOnActoGraphWebsiteServer`), met à jour ou crée
  la licence locale (`updateOrCreateAndEnableLicense`), et valide
  (`license.isValid()`). Si internet est indisponible, l'app retombe sur la
  licence locale stockée (`loadStoredLicenseOrThrow`) si elle est encore valide.
- **Clé invalide** → `nextStep: 'invalid-license'` → dialogue puis retour à
  `choose-version`.

`security/electron/reset-access` supprime `access.json` (retour au choix de
version).

### 5.3 Achat Pennylane (site)

Flux `SaleService` (côté site) :

1. **Création du devis** (`POST /billing/quotes`) : enregistre une `Sale`
   (`status=quote_pending`), crée ou réutilique un client Pennylane, émet un
   devis Pennylane, l'envoie par email à l'acheteur. Retourne un `accessToken`
   HMAC pour suivre la vente sur `/{locale}/store/sales/{id}?token=...`.
2. **Suivi public** (`GET /billing/sales/:id`, `POST .../accept`,
   `POST .../refresh`) : la page `../../actograph-site/front/src/pages/store/SaleStatus.vue` permet d'accepter le devis,
   rafraîchir le statut Pennylane, télécharger les PDF devis/facture.
3. **Acceptation → facture** (`acceptAndInvoice`) : passe le devis à `accepted`
   chez Pennylane, crée la facture, l'envoie par email (et au PA si FR + SIRET).
4. **Paiement → émission de licence** (`fulfillIfPaid` / `fulfillExclusive`) :
   dès que la facture est payée (`pennylanePaid=true` ou `status=paid`), la
   `Sale` est verrouillée par un mutex en mémoire, on appelle
   `findOrCreateLicenseOwner` puis `LicenseService.createLicense`.
   - `findOrCreateLicenseOwner` : récupère un `User` existant par email, ou en
     crée un nouveau avec un `legacyPassword` aléatoire + un `user_jwt` bcrypt
     **désactivé** (`activated=false`) porteur d'un token de définition de mot
     de passe. Le titulaire recevra le lien pour choisir son mot de passe.
   - `attachWebLogin` : n'agit **que sur un User nouvellement créé**. Sur un
     User existant, on n'y touche pas (un `user_jwt` aléatoire casserait la
     connexion legacy).
5. **Définition du mot de passe** : la page `../../actograph-site/front/src/pages/store/SaleStatus.vue` expose un bouton
   « Définir mon mot de passe » tant que `needsPasswordSetup=true`. L'action
   appelle `POST /billing/sales/:id/password-setup` qui échange le jeton de
   suivi contre un token de setup, puis redirige vers `ResetPassword` avec
   `token` et `email`. Une fois le mot de passe choisi, `userJwt.activated`
   passe à `true`.

L'admin peut forcer l'émission (`adminFulfill`), marquer une facture payée
(`adminMarkPaid`), renvoyer les documents (`adminSend`), synchroniser
(`adminSync`). Une tâche cron `syncOpenSales` rafraîchit périodiquement les
ventes non terminées.

### 5.4 Création admin (site)

`POST /users-admin` (controller `AdminUserController`) crée un `User` + un
`user_jwt` lié avec mot de passe en clair (hashé en bcrypt). L'admin peut
également créer des licences directement via `POST /licenses-admin`
(`LicenseService.createLicense`) : génère une clé unique via `key_generator`,
l'enregistre hashée + `seedHex`, crée les sièges si `seatCount > 0`, et
affecte la licence (propriétaire et/ou organisation).

---

## 6. Gestion des licences côté site

### 6.1 Affectations et sièges

Une licence peut être attribuée à trois niveaux (entités du module
`../../actograph-site/api/src/core/licenses`) :

- **Propriétaire** (`License.owner`) : relation directe héritée de v1.
- **Affectation** (`LicenseAssignment`) : lien explicite licence ↔ user et/ou
  organisation, avec un rôle (`Owner`, `Member`, `Billing`). Révocable
  (`revokedAt`) sans suppression.
- **Siège** (`LicenseSeat`) : pour les licences multi-postes d'organisation.
  Chaque siège est `available` / `occupied` / `released` et peut être attribué
  à un utilisateur.

Une organisation (`Organization`) peut avoir un parent (arborescence
entreprise → service / département), avec un type (`Company`, `School`,
`Department`).

### 6.2 « Mes licences » (`GET /licenses/mine`)

`LicenseService.listMine` regroupe sans doublon les licences où l'utilisateur est :
- propriétaire historique (`License.owner`),
- ou affectation active (`LicenseAssignment` non révoquée, rôle ≠ `Billing`),
- ou occupant d'un siège (`LicenseSeat` occupé).

Chaque ligne renvoie l'id de licence, la licence (sans clé, sans `seedHex`) et
l'organisation éventuelle. La page `../../actograph-site/front/src/pages/account/AccountLicenses.vue` affiche le type,
l'organisation, la date d'achat, l'échéance (calculée depuis `startDate` +
`duration` en mode `Duration`), le statut (`valid` / `upcoming` / `expired`),
et un bouton pour révéler la clé.

### 6.3 Révélation de clé

- **Propriétaire** : `GET /licenses/:id/key` (`LicenseService.revealMyKey`).
  Vérifie que l'utilisateur est propriétaire, affectation active (hors
  `Billing`), ou occupant de siège. Re-dérive la clé et la renvoie en clair.
- **Admin** : `GET /licenses-admin/:id/key` (`revealPlainKey`) sans contrôle
  d'appartenance.

La révélation re-dérive depuis `seedHex` via `key_generator` et vérifie
l'intégrité contre le hash stocké ; échec `UnprocessableEntityException` si
les deux ne correspondent pas.

### 6.4 Validité d'une licence

Calcul partagé (`licenseEndDate`, `licenseStatus` côté front,
`License.isValid()` côté app desktop) :

- Si `hasTimeLimit=false` → licence permanente, statut `valid`.
- Sinon, en mode `Duration` : `endDate = startDate + duration` jours.
- En mode `Date` : `endDate` est stockée.
- Statuts : `upcoming` (début dans le futur), `valid` (entre début et fin),
  `expired` (après la fin).

Côté app desktop, `License.isValid()` applique la même logique et lève une
`InternalServerErrorException` si une date/durée obligatoire manque.

---

## 7. Invariants et limites importantes

Ces points sont des **limites observées dans le code**, pas des choix de doc :

- **Pas de licence flottante.** Révoquer une affectation ou libérer un siège
  sur le site ne désactive **pas** une installation desktop déjà activée par
  clé. Le site organise les droits web, l'app desktop valide une clé locale.
  L'administration et la FAQ l'explicitent (cf. `../../actograph-site/docs/audit-parcours-2026-09-09.md`).
- **Propriété ≠ affectation.** Ce sont deux relations distinctes. Supprimer une
  affectation n'efface pas la propriété historique de la licence.
- **Un seul `user_jwt` par `User`.** La migration on login et le refus du
  fallback SHA-512 sur compte migré existent précisément pour éviter un second
  `user_jwt`.
- **`attachWebLogin` n'agit que sur un User neuf.** Jamais sur un User
  existant (sinon casserait la connexion legacy). Le flux étudiant
  (`StudentDownloadService`) reproduit la même prudence.
- **Clé jamais stockée en clair.** Toujours hashée (SHA-512 + salt fixe) avec
  `seedHex` pour re-dériver. La révélation échoue si le seed manque ou si la
  clé re-dérivée ne correspond pas.
- **Comptes désactivés rejetés partout** (web, legacy auth-tokens, cloud).
- **Le jeton cloud dure 6 h** (`TOKEN_VALIDITY_MS`), conservé pour la compat
  v1. Les chemins, statuts, headers et structures JSON historiques sont
  inchangés.
- **Domaine `actograph.io` non rebasculé.** Les applications consultent encore
  `https://actograph.io/api`. Le raccordement du domaine reste nécessaire pour
  que les installations existantes bénéficient des corrections (cf.
  `../../actograph-site/docs/audit-parcours-2026-09-09.md`).
- **Inscription libre désactivée.** `../../actograph-site/front/src/pages/auth/Register.vue` existe
  mais la route `/{locale}/auth/register` redirige vers la connexion. L'entrée
  étudiante est `/get`, l'entrée payante est le devis Pennylane.
- **L'admin par défaut.** Au démarrage de l'API (site), si `ADMINUSER_LOGIN`
  et `ADMINUSER_PASSWORD` sont définis, un utilisateur admin est créé
  automatiquement.

---

## 8. Récapitulatif des parcours par persona

| Persona | Entrée | Compte créé | Accès application |
|---|---|---|---|
| Étudiant | `/get` (site) | `User` + `user_jwt` désactivé si email inconnu ; email de setup envoyé | Activation « Étudiant » dans l'app desktop, pas de clé |
| Particulier / pro | Devis Pennylane (site) puis paiement | `User` + `user_jwt` désactivé si email inconnu ; setup via `SaleStatus` | Clé révélée dans l'espace client, saisie dans l'app desktop (`activate-license`) |
| Entreprise | Devis entreprise (≥ 10 sièges) | Idem + sièges `LicenseSeat` | Chaque siège attribué à un utilisateur par l'admin |
| Compte legacy v1 | Connexion web ou auth-tokens | Migration on login → `user_jwt` lié | Identifiants v1 toujours acceptés comme alias |
| Admin | Création admin | `User` + `user_jwt` activé | N/A (espace admin du site) |
| Desktop seul | Lancement de l'app | `_pc-{osUser}` local automatique | Choix étudiant ou saisie de clé au premier lancement |
| Mobile | Connexion dans l'app | Aucun compte local ; utilise un compte site | Token `auth-tokens` 6 h, reconnexion auto |

---

## Sources dans la codebase

- `../README.md`, `../LICENSE`, `authentification.md`
- `../api/src/core/security/` (entité `License`, `SecurityService`, `Electron`)
- `../api/src/core/users/users.module.ts` (création de l'utilisateur local)
- `../packages/core/src/utils/electron-local-auth.ts`
- `../front/src/pages/gateway/` (ChooseVersion, ActivatePro, Loading)
- `../front/src/composables/use-startup-loading.ts`, `use-license.ts`
- `../mobile/src/services/actograph-auth.service.ts`
- `../../actograph-site/README.md`, `../../actograph-site/docs/auth-comptes.md`,
  `../../actograph-site/docs/audit-parcours-2026-09-09.md`
- `../../actograph-site/api/src/core/users/` (`User`, `LegacyLoginService`,
  `UserRepository`, `jwt.strategy.ts`)
- `../../actograph-site/api/src/core/legacy/` (`License`, `LegacyAuthService`,
  `LegacyLicenseService`, `LicensePublicController`, `AuthTokenController`)
- `../../actograph-site/api/src/core/licenses/` (`LicenseService`,
  `LicenseAssignment`, `LicenseSeat`, `Organization`)
- `../../actograph-site/api/src/core/billing/` (`SaleService`,
  `StudentDownloadService`, entité `Sale`)
- `../../actograph-site/api/src/core/store/store-products.ts`
- `../../actograph-site/front/src/pages/public/Get.vue`,
  `../../actograph-site/front/src/pages/store/SaleStatus.vue`,
  `../../actograph-site/front/src/pages/account/AccountLicenses.vue`,
  `../../actograph-site/front/src/pages/auth/Login.vue`


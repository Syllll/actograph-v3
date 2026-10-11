# Authentification

Référence revue le 11 octobre 2026. Le bureau utilise deux sessions indépendantes : le **JWT de l'API locale** pour les données SQLite, et le **token cloud actograph.io** pour les transferts de chroniques. L'activation étudiant/pro est encore un autre mécanisme, décrit dans [comptes et licences](comptes-et-licences.md).

## Session locale de l'application

En Electron, l'API crée/sélectionne le compte local `_pc-{osUser}` et le frontend le connecte automatiquement avec le mot de passe dérivé par `deriveElectronLocalPassword`. L'utilisateur n'a pas de formulaire de connexion locale à remplir. `front/src/pages/gateway/Loading.vue` attend le backend, appelle le login puis détermine l'accès étudiant/pro.

En production, Electron démarre le sous-processus, attend son IPC `backend-ready` et vérifie sa santé HTTP. L'API écoute sur la boucle locale et vérifie aussi le secret `ACTOGRAPH_DESKTOP_TOKEN` fourni par Electron. Ce secret protège la session du processus et ne remplace pas les contrôles JWT des routes métier. Voir [architecture](architecture.md).

### Contrat JWT

```text
POST /auth-jwt/login
Corps : { username, password }
Réponse : { token, ... }

POST /auth-jwt/refreshToken
Corps : { token }
Réponse : { token, ... }
```

Les appels métier portent `Authorization: Bearer <token>`. L'API signe les JWT avec `JWT_SECRET` et une durée d'une heure (`3600s`). Le module `auth-jwt` est dans `api/src/general/auth-jwt/` ; les contrôleurs métier vérifient les rôles et l'accès aux données de l'utilisateur.

### Stockage et renouvellement

`front/lib-improba/composables/use-auth/index.ts` stocke le JWT dans **`localStorage`, clé `token`**, puis configure Axios. Malgré les noms historiques `setCookiesWithToken` et `getTokenFromCookiesAndSaveIntoAxios`, le stockage principal n'est plus un cookie.

`attemptLogin` conserve un repli de compatibilité vers l'ancien cookie nommé `APP_NAME`, puis écrit le token renouvelé dans localStorage. La déconnexion retire la clé `token`, supprime l'ancien cookie et arrête le timer de refresh.

Le refresh intervient au rétablissement de la session, dans le parcours des intercepteurs et via un timer proactif de **25 minutes**. Un échec de refresh silencieux ne déconnecte pas immédiatement sur une erreur transitoire ; l'intercepteur traite les erreurs d'authentification des requêtes. Les mots de passe locaux sont hashés avec `bcryptjs`, 10 rounds.

### Comptes web de l'API application

Le mode web de cette API expose également inscription et récupération de mot de passe pour **sa propre base de comptes** :

| Action | Route | Corps du client frontend |
|---|---|---|
| Inscription | `POST /auth-jwt/register` | `{ username, password }` |
| Mot de passe oublié | `POST /auth-jwt/password-forgot` | `{ username, resetPasswordUrl }` |
| Nouveau mot de passe | `POST /auth-jwt/recuperation` | `{ token, password }` |

Ces routes ne réinitialisent pas un compte actograph.io. Les contrats du client sont dans `front/src/services/users/auth.service.ts` ; ne pas inventer une route locale `/auth-jwt/reset-password`.

## Cloud actograph.io

Le compte cloud est hébergé sur l'API du site et partagé avec les usages cloud. La modale bureau `CloudLoginDialog` appelle `actographAuthService`, indépendamment du composable `use-auth` local.

### Connexion cloud

```text
POST https://actograph.io/api/auth-tokens
Corps : { login, password }
Réponse : { value, createdAt, id }
```

`login` accepte l'email ou l'identifiant historique. `value` est un **token opaque du contrat cloud**, utilisé via `X-Auth-Token`, pas le JWT local ni le JWT de l'espace client web.

Le service conserve token, identifiant et mot de passe dans les clés `actograph_cloud_*` de localStorage pour renouveler la session. La déconnexion efface ces valeurs. En Electron de production, `desktopFetch` fait passer les requêtes cloud via le bridge du processus principal ; en web/dev, il utilise `fetch`.

Le nuage connecté du tiroir ouvre `CloudDisconnectDialog` avec confirmation. « Changer de compte » dans `CloudSyncDialog` déconnecte puis propose une nouvelle connexion. Les transferts de chroniques passent par `use-cloud` et `actographCloudService` ; la synchronisation des relevés vers SQLite ne fait pas de transfert cloud.

### Mot de passe oublié dans la modale cloud

| Étape | Endpoint site | Corps |
|---|---|---|
| Demande d'email | `POST https://actograph.io/api/auth/forgot-password` | `{ username }` |
| Nouveau mot de passe | `POST https://actograph.io/api/auth/reset-password` | `{ token, password }` |

L'email est envoyé à l'adresse du compte. L'utilisateur colle le lien ou le token dans la modale, définit son mot de passe puis revient à la connexion cloud. Le JWT web éventuellement renvoyé par la réinitialisation n'est pas enregistré comme session cloud. Utiliser ces endpoints, plutôt que les routes `auth-jwt` de l'API locale.

### Accès pro et compte cloud

La clé pro et le compte cloud sont deux objets distincts. Les clés de versions antérieures peuvent être saisies dans la page d'activation ; les comptes anciens restent accessibles par email ou identifiant historique. L'accès étudiant ne demande pas de clé. Voir [validation des licences](license-validation.md) pour les contrôles et les conditions du repli hors ligne.

## Dépannage et sources

- Backend indisponible : vérifier le superviseur, les logs et la connexion locale avant les identifiants.
- JWT local expiré : contrôler `JWT_SECRET`, le refresh, la clé localStorage `token` et la réponse de l'API application.
- Cloud refusé : contrôler l'identifiant et les réponses des endpoints actograph.io ; la connexion locale ne prouve pas la connexion cloud.
- Un mot de passe cloud oublié se traite dans `CloudLoginDialog`, pas dans les pages de récupération de l'API locale.

Sources principales : `front/src/pages/gateway/Loading.vue`, `front/lib-improba/composables/use-auth/`, `front/src/services/users/auth.service.ts`, `front/src/services/cloud/actograph-auth.service.ts`, `front/src/services/cloud/actograph-cloud.service.ts`, `front/src/utils/desktop-fetch.ts` et `api/src/general/auth-jwt/`.

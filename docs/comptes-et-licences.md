# Comptes et licences de l'application bureau

Référence produit/support revue contre le code de `main` le 11 octobre 2026. Ce guide décrit le bureau ActoGraph, son accès local et sa connexion actograph.io. La gestion des achats, comptes web, affectations et sièges appartient au dépôt du site ; sa documentation reste la référence pour ces traitements.

## Trois mécanismes distincts

| Mécanisme | Rôle | Stockage / autorité |
|---|---|---|
| Compte local Electron | Posséder les chroniques et autoriser les opérations de l'API locale | SQLite, JWT application |
| Accès étudiant ou licence pro | Déterminer le mode d'utilisation de l'application | `access.json`, licence locale SQLite et serveur de licences |
| Compte cloud actograph.io | Envoyer et récupérer des chroniques | API site, session cloud du frontend |

Le compte local est connecté automatiquement. Il ne crée pas de compte sur le site. Activer une clé pro ne connecte pas automatiquement le cloud, et se connecter au cloud ne remplace pas l'activation locale.

## Démarrage et compte local

Electron attend l'API embarquée supervisée. L'API sélectionne/crée le compte `_pc-{osUser}` avec un mot de passe dérivé (`deriveElectronLocalPassword`). `Loading.vue` se connecte à l'API locale et appelle `/security/electron/determine-access`.

La session combine le JWT métier et, en production, le secret de processus `ACTOGRAPH_DESKTOP_TOKEN`. L'utilisateur n'a pas de mot de passe local à saisir. Voir [authentification](authentification.md) et [architecture](architecture.md).

## Premier accès

Sans fichier `access.json`, l'application affiche le choix d'accès :

- **Étudiant** : `POST /security/electron/activate-student` écrit `{ "type": "student" }`. Accès gratuit, sans clé.
- **Pro** : saisie d'une clé au format `xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx`, puis `POST /security/electron/activate-license`.

L'activation pro vérifie successivement le checksum, le validateur PKV et le serveur de licences configuré par `ACTOGRAPH_API`. Après réussite, elle écrit atomiquement `{ "type": "license", "key": "..." }` dans `access.json`. Un refus conserve l'accès précédent. Les builds officiels injectent le PKV privé ; les sources publiques contiennent des bouchons de développement. Voir [validation des licences](license-validation.md).

## Accès déjà enregistré et hors ligne

Avec `type: student`, l'application poursuit en mode étudiant. Avec `type: license`, l'API contrôle la clé auprès du serveur, actualise la licence locale et vérifie sa validité.

En cas d'indisponibilité réseau, une licence **déjà enregistrée** peut être réutilisée si la copie SQLite reste valide. Une réponse distante malformée ou un refus explicite ne déclenche pas ce repli. L'activation initiale d'une nouvelle clé requiert donc une connexion au serveur.

`POST /security/electron/reset-access` retire le choix local et revient au parcours d'activation. Cette opération ne supprime pas le compte site ni les chroniques locales.

Les métadonnées de licence comprennent le propriétaire. Le menu de compte bureau affiche le nom lisible via `getLicenseOwnerLabel` : prénom/nom, puis identifiant ou email si nécessaire, avec compatibilité pour les anciens noms enregistrés en texte simple.

## Connexion cloud

Depuis le tiroir, « Se connecter au cloud » ouvre `CloudLoginDialog`. La connexion utilise l'email ou l'identifiant historique et le mot de passe du compte site, via `/api/auth-tokens`. Le token opaque sert au contrat `X-Auth-Token` des échanges de chroniques.

Le mot de passe oublié se traite dans cette modale, via `/api/auth/forgot-password` puis `/api/auth/reset-password`. Ces routes sont distinctes de `/auth-jwt/*` dans l'API locale. La confirmation de déconnexion efface la session cloud ; elle ne retire pas l'accès étudiant/pro.

Voir [authentification cloud](authentification.md#cloud-actographio) et [chroniques](chronic.md#cloud).

## Parcours usuels

| Situation | Action bureau |
|---|---|
| Étudiant souhaitant travailler localement | Installer puis choisir Étudiant ; créer une chronique sans connexion cloud |
| Professionnel disposant d'une clé | Choisir Pro et activer la clé avec accès réseau |
| Utilisateur d'une version antérieure | Saisir la clé existante pour le pro ; utiliser son email/identifiant historique pour le cloud |
| Licence déjà activée, réseau indisponible | Poursuivre si la licence locale reste valide |
| Mot de passe cloud oublié | Utiliser la récupération dans `CloudLoginDialog` |
| Changement de compte cloud | Action « Changer de compte » de la modale cloud |

Pour les conditions contractuelles, consulter [LICENSE](../LICENSE). Le code du bureau ne définit pas à lui seul les règles d'achat, d'affectation ou de révocation côté site.

## Sources à maintenir

- `front/src/pages/gateway/Loading.vue`, `ChooseVersion.vue`, `ActivatePro.vue`.
- `front/src/composables/use-license.ts` et `front/src/pages/userspace/_components/drawer/Index.vue`.
- `front/src/utils/license-owner-label.ts`.
- `api/src/core/security/`, notamment les contrôles de licence et l'écriture atomique de l'accès.
- `front/src/services/cloud/` et `front/src/pages/userspace/home/_components/cloud/`.

Dans le checkout regroupant app et site, le site se trouve dans le dossier voisin `../website/`. Consulter son `docs/auth-comptes.md`, `docs/admin-api.md` et ses guides d'achat pour les règles site actuelles. Les anciens chemins `app-et-site/actograph-site` et les instantanés de ses parcours ne sont pas une référence de l'architecture de ce dépôt.

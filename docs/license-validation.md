# Validation des licences : code public et implémentation privée

Le dépôt ActoGraph est public. Les implémentations PKV utilisées pour vérifier
les clés de licence sont fournies séparément au moment de construire les versions
bureau officielles.

## Ce que contient le dépôt public

`api/src/core/security/services/key-testor.ts` expose le contrat du validateur et
le calcul du checksum. Deux fonctions contiennent seulement des bouchons de
développement :

- `pkvGetKeyByte` renvoie `0`.
- `pkvCheckKey` renvoie `KeyStatus.GOOD`.

Ce second retour est un bouchon, pas l'algorithme de validation de production.
Il ne faut donc pas supprimer l'appel à `SecurityService.checkKey` au motif
qu'il accepte toutes les clés lorsqu'on lit uniquement les sources publiques.

Le reste du parcours est public : contrôleur Nest, validation du checksum,
appel du validateur, appel au serveur de licences, contrôle de la réponse et
écriture du fichier d'accès. La gestion Electron du démarrage du serveur est
indépendante de la validité d'une clé.

## Construction d'une version bureau officielle

Le job bureau de `.github/workflows/publish.yml` utilise l'environnement GitHub
`deploy`. Avant la compilation TypeScript et le bundling de l'API, il fournit
les secrets suivants à `scripts/inject-key-validator.cjs` :

| Secret GitHub | Variable transmise au script | Fonction remplacée |
|---|---|---|
| `PKVGETKEYBYTE` | `PKV_GET_KEY_BYTE` | `pkvGetKeyByte` |
| `PKVCHECKKEY` | `PKV_CHECK_KEY` | `pkvCheckKey` |

Les secrets contiennent les **corps des fonctions**, selon le contrat historique
du pipeline. Ils ne doivent jamais être ajoutés au dépôt, aux notes de release,
aux tests ou aux logs. Le script ne journalise ni les secrets ni le code injecté.

L'injection modifie uniquement le checkout temporaire de la CI. Les
implémentations privées sont ensuite compilées dans l'API embarquée ; les sources
du dépôt et les tags conservent les bouchons publics.

Le script échoue avant d'écrire le fichier si un secret est vide ou si une
signature attendue a changé. Cela empêche de publier silencieusement un
installeur conservant un bouchon. Les littéraux `$` des corps de fonctions sont
conservés tels quels.

Un build local exécuté sans cette injection utilise les bouchons et ne reproduit
donc pas entièrement la vérification PKV des installeurs officiels.

## Parcours d'activation

`Electron.activateLicense` effectue successivement :

1. `checkKeyChecksum` : vérification publique du format et du checksum.
2. `checkKey` : vérification PKV, avec l'implémentation privée dans les builds CI.
3. `checkKeyOnActoGraphWebsiteServer` : contrôle distant auprès du serveur
   configuré par `ACTOGRAPH_API` et validation de la structure de sa réponse.
4. Écriture atomique de `access.json`, seulement si tous les contrôles réussissent.

Un refus local ou distant conserve le fichier d'accès précédent. Le checksum
seul ne suffit pas pour activer une licence. Les erreurs de connexion au serveur,
les réponses malformées et les refus de clé sont distingués dans le formulaire.

L'activation d'une nouvelle clé nécessite la validation distante. Au démarrage,
une licence déjà enregistrée peut continuer à fonctionner hors ligne si la
licence stockée en SQLite reste valide ; une réponse distante malformée ou un
refus explicite ne déclenche pas ce repli.

## Tests

- `node --test scripts/inject-key-validator.test.cjs` : injection avec des
  exemples synthétiques, secrets manquants, signatures modifiées et littéraux `$`.
- `cd api && yarn test` : refus du validateur, réponse distante malformée et
  activation réussie, en vérifiant la conservation du fichier d'accès sur échec.

Les tests publics utilisent des doubles de test et ne contiennent pas les
algorithmes privés.

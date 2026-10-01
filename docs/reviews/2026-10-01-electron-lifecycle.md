# Correction du démarrage et de la récupération Electron

Le premier lancement et les relances utilisaient deux boucles distinctes. Une
ligne stdout émise avant Nest faisait réussir prématurément le démarrage du fils.
La sortie d'un ancien fils pouvait ensuite effacer la référence de son remplaçant.
La page de chargement restait en erreur après récupération du serveur.

Le superviseur `front/src-electron/backend-supervisor.ts` possède désormais chaque
fils et partage une seule promesse pour le démarrage initial, les demandes IPC,
le réveil et la récupération après crash. La disponibilité est signalée par IPC
après `listen`, puis vérifiée par HTTP. Les trois essais attendent la fermeture du
fils précédent. L'arrêt IPC ferme Nest et SQLite avant une éventuelle escalade
SIGTERM/SIGKILL. La fermeture et l'installation d'une mise à jour attendent cet
arrêt. Aucune relance n'est autorisée après le début de la fermeture.

La page de chargement sérialise ses initialisations, reprend après récupération,
retire ses abonnements au démontage et propose Réessayer/Afficher les journaux.
Les erreurs d'authentification et d'accès sont prises en charge dans la page.
Les anciens fichiers access.json incomplets ramènent au choix d'accès.

L'instance Electron est unique. L'API de bureau écoute sur 127.0.0.1 et exige un
secret de session obtenu via le preload, en plus du JWT local. Le dossier de
configuration du fils provient du userData du père ; un accès valide stocké dans
un ancien dossier est recopié atomiquement si le nouveau dossier ne contient
pas encore access.json. Un marqueur rend cette migration unique et empêche de
réimporter l'ancien accès après « Changer de licence ». Les fenêtres privilégiées
sont limitées au fichier de l'application, tous les IPC valident leur émetteur,
et webSecurity est activé en production. Le développement servi en HTTP conserve
son accès aux vidéos file:. Les appels cloud passent par un relais IPC limité à
https://actograph.io/api/, afin de préserver connexion et transferts multipart.
Les URL de pop-out conservent le chemin file: au lieu de reconstruire l'origine
opaque « null ».

La validation des licences vérifie la structure des réponses, borne l'appel au
site à dix secondes et distingue refus explicite, panne distante et panne locale.
Le 404 « License not found » est un refus de clé ; les autres 404 restent des
erreurs de service. Le checksum local et le serveur distant sont les deux
contrôles utilisés : l'ancien checkKey sans validation réelle n'est plus appelé.
L'écriture d'access.json utilise un fichier temporaire et un renommage atomique.

## Validation

- Suites Jest complètes : frontend 131 tests / 19 suites, API 52 tests / 8 suites,
  tous verts après intégration des commits distants de main.
- TypeScript API, Vue et main/preload Electron : sans erreur.
- Build Nest et bundle esbuild API : réussis.
- ESLint des fichiers touchés, y compris src-electron (ignoré par défaut).
- `cd api && node test/desktop/lifecycle.cjs`, avec la version Node correspondant
  au module better-sqlite3 installé : vraie API Nest, migrations sur SQLite
  temporaire, handshake IPC, authentification de session, préflight CORS,
  connexion locale, activation étudiante, crash et récupération, arrêt des fils.
  Le même parcours a réussi sur le bundle de production avec `--bundle`.
- Les tests du superviseur couvrent appels concurrents, sortie avant disponibilité,
  attente de fermeture, messages anciens, arrêt pendant démarrage, fils qui ne
  termine pas, panne de santé transitoire et limite des trois tentatives.
- Tests des réponses de licence, erreurs du formulaire, fichiers d'accès corrompus,
  récupération de la page, URLs privilégiées et transfert cloud multipart.

## Review

Le test d'intégration a détecté un ordre de middlewares incorrect : le contrôle de
session précédait CORS et bloquait les préflights. CORS est désormais enregistré
avant ce contrôle ; les préflights sont acceptés, les requêtes réelles sans
secret sont refusées. Les erreurs de réponse de licence ne permettent pas de
contourner le contrôle distant en utilisant une licence locale.

La review a également vérifié l'absence de relance lors de la fermeture, le refus
de nouveaux fils si un ancien ne termine pas, la garde d'installation d'une mise
à jour non téléchargée, le démontage des abonnements, la diffusion des statuts aux fenêtres secondaires
et les URLs des pop-outs.

Le CORS de développement accepte uniquement les origines de boucle locale,
indépendamment du port Quasar. Le fils dispose aussi de son propre délai d’arrêt
si le père disparaît.

La validation native des fenêtres, vidéos, installeurs et mises à jour sur
Windows/macOS reste nécessaire avant publication d'une nouvelle version : cet
environnement ne dispose pas de serveur graphique ni de ces systèmes.

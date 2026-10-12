# Fiabilisation de la mise à jour bureau

Le retour de Valérie décrit un clic sur le bouton de redémarrage sans effet
visible, suivi d'une fermeture et d'une relance manuelles. Son système et les
journaux de cette session ne sont pas connus. Le correctif traite les défauts
reproduits dans le code, sans attribuer avec certitude son incident à macOS.

## Comportement corrigé

Le contrôleur `front/src-electron/update-controller.ts` possède l'état de la
mise à jour. Sur macOS, l'événement `update-downloaded` d'electron-updater 6.3.9
signale que le ZIP peut être transmis à Squirrel.Mac. Seul l'événement natif
`update-downloaded` autorise désormais l'installation. Windows et Linux
conservent leur confirmation de téléchargement habituelle.

Le serveur local reste actif pendant le téléchargement et la préparation.
Une erreur invalide la disponibilité de la mise à jour. Après deux minutes
de préparation sans confirmation, la fenêtre affiche un message et permet
de continuer à utiliser l'application. Elle indique de fermer complètement
et relancer ActoGraph pour réessayer : une nouvelle demande dans le même
processus pourrait réutiliser une promesse native bloquée. Une confirmation
tardive après cet échec ne réactive pas silencieusement le bouton.

Une seule promesse possède l'installation et attend l'arrêt du serveur.
Les clics répétés ne créent plus de demandes concurrentes. Si l'installation
échoue après l'arrêt du serveur, l'application se ferme proprement pour
permettre une relance manuelle. Un délai de trente secondes couvre aussi
un redémarrage qui n'aboutit pas.

La fenêtre affiche les phases de préparation et d'installation. Les erreurs
restent visibles et donnent accès aux journaux. Elle récupère l'état du
processus principal à sa réouverture, privilégie les événements récents sur
une réponse IPC ancienne et retire ses abonnements au démontage.
Les abonnements du processus principal sont installés avant le chargement
de Vue, qui demande sa première vérification au montage.

## Validation

- Frontend : 25 suites, 177 tests réussis, dont 12 nouveaux tests du cycle de
  mise à jour et 4 tests exécutant le script et le rendu du vrai composant Vue.
- API : 9 suites, 55 tests réussis avec `yarn test --runInBand`. Un lancement
  direct de Jest sans Yarn omet les variables `npm_package_*` et fait échouer
  le test préexistant de la page HTML ; la commande prévue par le dépôt passe.
- Core : 20 suites, 161 tests réussis.
- Graph : 39 suites, 316 tests réussis.
- Contrôle TypeScript Electron et ESLint des fichiers modifiés : réussis.
- Contrôle Vue/TypeScript : réussi.
- Build Quasar Electron non empaqueté : réussi, avec build Nest, bundle API,
  reconstruction des modules natifs, interface, main et preload.
- Tests du script d'injection du validateur privé : réussis.

Les tests simulent les confirmations et les erreurs natives. La validation
d'une vraie mise à jour entre deux versions sur Windows et macOS reste à
effectuer sur ces systèmes. La version 3.0.185 corrige les mises à jour qu'elle
effectuera ensuite ; le passage depuis la 3.0.184 utilise encore l'ancien code
tant que le nouvel exécutable n'a pas démarré.

## Vérification native utile

Sur Mac Intel et Apple Silicon, vérifier que la préparation précède le bouton
de redémarrage et que l'application reste utilisable pendant cette phase.
Après téléchargement, vérifier la fermeture et la relance avec le nouveau
numéro de version. Sur Windows, vérifier également l'installation silencieuse
et la relance. Dans tous les cas, tenter plusieurs clics et rouvrir la fenêtre
de mise à jour après l'avoir fermée pendant un téléchargement.
